import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { loadConfig, getConfigPath, type OcoderConfig } from "../core/config.js"
import { Session } from "../core/session.js"
import { chatCompletion, chatCompletionStream } from "../providers/openai-compatible.js"
import { runShell } from "../tools/shell.js"

const C = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
}

export async function runCli(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp()
    return
  }

  const config = await loadConfig()

  if (args[0] === "config") {
    console.log(await getConfigPath())
    return
  }

  if (args[0] === "run") {
    const message = args.slice(1).join(" ").trim()
    if (!message) throw new Error("Usage: ocoder run <message>")
    await runSingleTurn(config, message)
    return
  }

  await runInteractive(config)
}

async function runSingleTurn(config: OcoderConfig, message: string): Promise<void> {
  const session = new Session(config.agent.systemPrompt)
  session.addUser(message)
  const answer = await chatCompletion(config, session.export())
  console.log(answer)
}

async function runInteractive(config: OcoderConfig): Promise<void> {
  const rl = readline.createInterface({ input, output })
  const session = new Session(config.agent.systemPrompt)

  printHeader(config)
  let showThinking = false

  let turn = 0
  while (turn < config.agent.maxTurns) {
    const text = (await rl.question(`${C.green}${C.bold}you${C.reset}${C.dim}>${C.reset} `)).trim()
    if (!text) continue
    if (text === "/exit") break

    if (text === "/config") {
      printInfo(`config: ${await getConfigPath()}`)
      continue
    }

    if (text === "/reset") {
      session.messages = [{ role: "system", content: config.agent.systemPrompt }]
      printInfo("session reset")
      continue
    }
    if (text === "/thinking") {
      showThinking = !showThinking
      printInfo(`thinking ${showThinking ? "shown" : "hidden"}`)
      continue
    }

    if (text.startsWith("/shell ")) {
      if (!config.shell.enabled) {
        printError("shell tool disabled in config")
        continue
      }
      const command = text.slice(7).trim()
      printShellHeader(command)
      const result = await runShell(command, config.shell.timeoutMs)
      printShellResult(result.stdout, result.stderr, result.code)
      continue
    }

    session.addUser(text)
    const stopSpinner = startSpinner("thinking")

    try {
      let printed = false
      const answer = await chatCompletionStream(config, session.export(), (delta) => {
        if (!printed) {
          stopSpinner()
          process.stdout.write(`${C.cyan}${C.bold}ocoder${C.reset}${C.dim}>${C.reset} `)
          printed = true
        }
        process.stdout.write(delta)
      }).catch(async () => {
        const fallback = await chatCompletion(config, session.export())
        return fallback
      })
      stopSpinner()
      if (printed) process.stdout.write("\n")
      session.addAssistant(answer)
      if (!printed) {
        printAssistantStructured(answer, showThinking)
      } else if (showThinking) {
        const thinking = splitAssistantBlocks(answer).filter((b) => b.type === "thinking").map((b) => b.content).join("\n")
        if (thinking.trim()) printBox("thinking", thinking, C.dim)
      }
    } catch (error: unknown) {
      stopSpinner()
      const message = error instanceof Error ? error.message : String(error)
      printError(message)
    }

    turn += 1
    printStatus(turn, config.agent.maxTurns)
  }

  printInfo("goodbye")
  rl.close()
}

function printHelp(): void {
  console.log(`ocoder - AI coding agent\n\nUsage:\n  ocoder                Start interactive mode\n  ocoder run <message>  One-shot response\n  ocoder config         Print config file path\n  ocoder --help         Show help`)
}

function printHeader(config: OcoderConfig): void {
  const border = `${C.blue}+--------------------------------------------------+${C.reset}`
  console.log(border)
  console.log(`${C.blue}|${C.reset} ${C.cyan}${C.bold}OCODER${C.reset}  ${C.dim}AI coding agent${C.reset}${" ".repeat(27)}${C.blue}|${C.reset}`)
  console.log(`${C.blue}|${C.reset} model: ${C.dim}${config.provider.model}${C.reset}${" ".repeat(Math.max(1, 36 - config.provider.model.length))}${C.blue}|${C.reset}`)
  console.log(`${C.blue}|${C.reset} commands: ${C.dim}/exit /reset /thinking /shell /config${C.reset}${" ".repeat(2)}${C.blue}|${C.reset}`)
  console.log(border)
  printStatus(0, config.agent.maxTurns)
}

function printStatus(turn: number, maxTurns: number): void {
  console.log(`${C.dim}[turn ${turn}/${maxTurns}]${C.reset}`)
}

function printAssistant(text: string): void {
  console.log(`${C.cyan}${C.bold}ocoder${C.reset}${C.dim}>${C.reset} ${text}`)
}

function printAssistantStructured(text: string, showThinking: boolean): void {
  const blocks = splitAssistantBlocks(text)
  if (blocks.length === 1 && blocks[0]?.type === "final") {
    printAssistant(blocks[0].content)
    return
  }

  console.log(`${C.cyan}${C.bold}ocoder${C.reset}${C.dim}>${C.reset}`)
  for (const block of blocks) {
    if (!block.content.trim()) continue
    if (block.type === "thinking") {
      if (!showThinking) continue
      printBox("thinking", block.content, C.dim)
      continue
    }
    if (block.type === "tool") {
      printBox("tool", block.content, C.blue)
      continue
    }
    printBox("answer", block.content, C.cyan)
  }
}

function printInfo(text: string): void {
  console.log(`${C.dim}${text}${C.reset}`)
}

function printError(text: string): void {
  console.log(`${C.red}${text}${C.reset}`)
}

function printShellHeader(command: string): void {
  printBox("shell", `$ ${command}`, C.blue)
}

function printShellResult(stdout: string, stderr: string, code: number): void {
  if (stdout.trim()) printBox("stdout", stdout.trimEnd(), C.cyan)
  if (stderr.trim()) printBox("stderr", stderr.trimEnd(), C.red)
  printBox("exit", String(code), code === 0 ? C.green : C.red)
}

function printBox(title: string, body: string, color: string): void {
  const top = `${color}+-- ${title} ${"-".repeat(Math.max(0, 50 - title.length))}+${C.reset}`
  const bottom = `${color}+${"-".repeat(56)}+${C.reset}`
  console.log(top)
  for (const line of body.split("\n")) {
    console.log(`${color}|${C.reset} ${line}`)
  }
  console.log(bottom)
}

function splitAssistantBlocks(text: string): Array<{ type: "thinking" | "tool" | "final"; content: string }> {
  const blocks: Array<{ type: "thinking" | "tool" | "final"; content: string }> = []
  let rest = text

  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi
  let match: RegExpExecArray | null
  while ((match = thinkRegex.exec(text)) !== null) {
    const full = match[0]
    const content = match[1] ?? ""
    const idx = rest.indexOf(full)
    if (idx > 0) {
      const before = rest.slice(0, idx).trim()
      if (before) blocks.push({ type: "final", content: before })
    }
    blocks.push({ type: "thinking", content: content.trim() })
    rest = rest.slice(idx + full.length)
  }

  const finalTail = rest.trim()
  if (!blocks.length) {
    const toolLike = looksLikeToolPayload(text)
    return [{ type: toolLike ? "tool" : "final", content: text.trim() }]
  }
  if (finalTail) blocks.push({ type: "final", content: finalTail })
  return blocks
}

function looksLikeToolPayload(text: string): boolean {
  const t = text.trim()
  return t.startsWith("{") && t.includes("\"tool\"") && t.includes("\"input\"")
}

function startSpinner(label: string): () => void {
  const frames = ["-", "\\", "|", "/"]
  let i = 0
  const timer = setInterval(() => {
    process.stdout.write(`\r${C.cyan}${frames[i % frames.length]} ${label}...${C.reset}`)
    i += 1
  }, 80)

  return () => {
    clearInterval(timer)
    process.stdout.write("\r\x1b[2K")
  }
}
