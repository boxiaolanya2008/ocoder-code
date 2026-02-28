import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"

export type OcoderConfig = {
  provider: {
    type: "openai-compatible"
    baseURL: string
    model: string
    apiKeyEnv: string
  }
  agent: {
    systemPrompt: string
    maxTurns: number
  }
  shell: {
    enabled: boolean
    timeoutMs: number
  }
}

const PRIMARY_CONFIG_DIR = path.join(os.homedir(), ".ocoder")
const FALLBACK_CONFIG_DIR = path.join(process.cwd(), ".ocoder")

const DEFAULT_CONFIG: OcoderConfig = {
  provider: {
    type: "openai-compatible",
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    apiKeyEnv: "OPENAI_API_KEY",
  },
  agent: {
    systemPrompt: "You are Ocoder, an AI coding agent. Be practical, concise, and safe.",
    maxTurns: 30,
  },
  shell: {
    enabled: true,
    timeoutMs: 120000,
  },
}

export async function loadConfig(): Promise<OcoderConfig> {
  const configPath = await resolveConfigPath()
  try {
    const raw = await fs.readFile(configPath, "utf8")
    return deepMerge(DEFAULT_CONFIG, JSON.parse(raw) as Partial<OcoderConfig>)
  } catch {
    await saveConfig(DEFAULT_CONFIG)
    return { ...DEFAULT_CONFIG }
  }
}

export async function saveConfig(config: OcoderConfig): Promise<void> {
  const configPath = await resolveConfigPath()
  await fs.mkdir(path.dirname(configPath), { recursive: true })
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf8")
}

export async function getConfigPath(): Promise<string> {
  return resolveConfigPath()
}

function deepMerge(base: OcoderConfig, patch: Partial<OcoderConfig>): OcoderConfig {
  const out: OcoderConfig = JSON.parse(JSON.stringify(base))
  if (patch.provider) out.provider = { ...out.provider, ...patch.provider }
  if (patch.agent) out.agent = { ...out.agent, ...patch.agent }
  if (patch.shell) out.shell = { ...out.shell, ...patch.shell }
  return out
}

async function resolveConfigPath(): Promise<string> {
  try {
    await fs.mkdir(PRIMARY_CONFIG_DIR, { recursive: true })
    return path.join(PRIMARY_CONFIG_DIR, "config.json")
  } catch {
    await fs.mkdir(FALLBACK_CONFIG_DIR, { recursive: true })
    return path.join(FALLBACK_CONFIG_DIR, "config.json")
  }
}