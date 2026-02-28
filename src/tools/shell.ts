import { spawn } from "node:child_process"

export type ShellResult = {
  code: number
  stdout: string
  stderr: string
}

export function runShell(command: string, timeoutMs = 120000): Promise<ShellResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    const timer = setTimeout(() => {
      child.kill("SIGTERM")
      reject(new Error(`Command timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.stdout.on("data", (d: Buffer | string) => {
      stdout += String(d)
    })

    child.stderr.on("data", (d: Buffer | string) => {
      stderr += String(d)
    })

    child.on("error", (err: Error) => {
      clearTimeout(timer)
      reject(err)
    })

    child.on("close", (code: number | null) => {
      clearTimeout(timer)
      resolve({ code: code ?? 0, stdout, stderr })
    })
  })
}