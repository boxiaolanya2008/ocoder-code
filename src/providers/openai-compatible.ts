import type { OcoderConfig } from "../core/config.js"
import type { ChatMessage } from "../core/session.js"

type OpenAICompatResponse = {
  choices?: Array<{ message?: { content?: string } }>
}

export async function chatCompletion(config: OcoderConfig, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env[config.provider.apiKeyEnv]
  if (!apiKey) {
    throw new Error(`Missing API key: set ${config.provider.apiKeyEnv}`)
  }

  const url = `${config.provider.baseURL.replace(/\/$/, "")}/chat/completions`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.provider.model,
      messages,
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Provider error (${response.status}): ${body}`)
  }

  const data = (await response.json()) as OpenAICompatResponse
  return data.choices?.[0]?.message?.content || ""
}

export async function chatCompletionStream(
  config: OcoderConfig,
  messages: ChatMessage[],
  onDelta: (delta: string) => void,
): Promise<string> {
  const apiKey = process.env[config.provider.apiKeyEnv]
  if (!apiKey) throw new Error(`Missing API key: set ${config.provider.apiKeyEnv}`)

  const url = `${config.provider.baseURL.replace(/\/$/, "")}/chat/completions`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.provider.model,
      messages,
      temperature: 0.2,
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "")
    throw new Error(`Provider stream error (${response.status}): ${body}`)
  }

  const decoder = new TextDecoder()
  const reader = response.body.getReader()
  let buffer = ""
  let full = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith("data:")) continue
      const payload = trimmed.slice(5).trim()
      if (payload === "[DONE]") continue
      try {
        const parsed = JSON.parse(payload) as any
        const delta = parsed?.choices?.[0]?.delta?.content
        if (typeof delta === "string" && delta.length > 0) {
          full += delta
          onDelta(delta)
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }
  return full
}
