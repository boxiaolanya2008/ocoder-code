export type ChatRole = "system" | "user" | "assistant"

export type ChatMessage = {
  role: ChatRole
  content: string
}

export class Session {
  messages: ChatMessage[]

  constructor(systemPrompt: string) {
    this.messages = [{ role: "system", content: systemPrompt }]
  }

  addUser(content: string): void {
    this.messages.push({ role: "user", content })
  }

  addAssistant(content: string): void {
    this.messages.push({ role: "assistant", content })
  }

  export(): ChatMessage[] {
    return [...this.messages]
  }
}