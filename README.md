# 🚀 OCODER-CODE

<div align="center">

![OCODER Banner](https://capsule-render.vercel.app/api?type=waving&color=0:06B6D4,100:8B5CF6&height=200&section=header&text=OCODER-CODE&fontSize=80&animation=fadeIn&fontAlignY=35)

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/AI-Coding%20Assistant-purple?style=for-the-badge" alt="AI Coding">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

> 🤖 AI-powered coding assistant for modern developers

</div>

---

## ✨ Features

### 🎯 Core Features
- **AI-Powered Chat** - Natural language interaction with DeepSeek AI
- **File Operations** - Create, read, edit, and manage files
- **Shell Commands** - Execute terminal commands safely
- **Diff Management** - View and apply file changes
- **Task Management** - Track and manage coding tasks
- **Session Persistence** - Save and resume conversations

### 🛠️ Tool Ecosystem
| Tool | Description |
|------|-------------|
| `Read` | Read file contents |
| `Write` | Create new files |
| `Edit` | Modify existing files |
| `Bash` | Execute shell commands |
| `Glob` | Find files by pattern |
| `Grep` | Search file contents |
| `ApplyDiff` | Apply diff patches |

### 🎨 Modern CLI Experience
- **Gradient ASCII Art Banner** - Stunning terminal visuals
- **Interactive Prompts** - Using @clack/prompts
- **Rich Status Displays** - Boxen-powered UI components
- **Token Statistics** - Usage tracking with charts
- **Command Auto-completion** - Tab completion support

---

## 🚦 Quick Start

```bash
# Clone the repository
git clone https://github.com/boxiaolanya2008/ocoder-code.git
cd ocoder-code

# Install dependencies
npm install

<<<<<<< HEAD
# Start interactive mode
=======
```

```txt

start :

>>>>>>> fcbd5c7798d6204bc5e11b268ec4e84eaca00140
npm run dev
```

<<<<<<< HEAD
---

## 📖 Usage

### Interactive Mode
```bash
npm run dev
```

### Single Message Mode
```bash
npm run dev -- chat -M "Hello, create a hello world file"
```

### Available Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/status` | Show session and token stats |
| `/clear` | Clear conversation history |
| `/compact` | Compact context window |
| `/sessions` | List saved sessions |
| `/exit` | Exit the CLI |

---

## 🏗️ Architecture

```
src/
├── api.ts              # API client (DeepSeek)
├── cli-modern.ts       # Modern CLI with Commander.js
├── config.ts           # Configuration management
├── repl/
│   └── index.ts        # Interactive REPL loop
├── tools/
│   ├── index.ts        # Tool definitions
│   ├── executor.ts     # Tool execution engine
│   ├── diff.ts         # Diff operations
│   └── taskmanager.ts  # Task management
├── session.ts          # Session persistence
└── ui/
    ├── modern.ts       # Modern UI components
    ├── facade.ts       # CLI facade (singleton)
    ├── renderer.ts     # Markdown renderer
    └── modules/        # UI modules
        ├── task.ts     # Task UI
        ├── file.ts     # File UI
        ├── diff.ts     # Diff UI
        ├── chat.ts     # Chat UI
        ├── todo.ts     # Todo UI
        ├── log.ts      # Log UI
        └── tokenStats.ts # Token statistics
```

---

## ⚙️ Configuration

Create a `.env` file:

```env
DEEPSEEK_API_KEY=your-api-key-here
```

Or configure via the interactive setup:

```bash
npm run dev -- --setup
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js |
| **Language** | TypeScript |
| **CLI Framework** | Commander.js |
| **AI API** | DeepSeek Chat |
| **UI Components** | Chalk, Boxen, @clack/prompts |
| **Validation** | Zod |
| **Markdown** | Marked, cli-highlight |

---

## 📊 Token Statistics

The CLI tracks your API usage with beautiful visualizations:

```
┌─────────────────────────────────────┐
│  Token Usage                        │
│                                     │
│  Calls:        42                   │
│  Total:        156,892              │
│  Prompt:       145,201 (92.5%)      │
│  Completion:   11,691 (7.5%)        │
│                                     │
│  Distribution                       │
│  ████████████████░░░░░░░░░░ 92%     │
│  ███░░░░░░░░░░░░░░░░░░░░░░░ 8%      │
└─────────────────────────────────────┘
```

---

## 🎭 Visual Preview

```
   ██████╗ ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ ██╗  ██╗██╗   ██╗
  ██╔═══██╗██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔═══██╗██║ ██╔╝██║   ██║
  ██║   ██║██████╔╝██████╔╝█████╗  ██╔██╗ ██║██║   ██║█████╔╝ ██║   ██║
  ██║   ██║██╔═══╝ ██╔═══╝ ██╔══╝  ██║╚██╗██║██║   ██║██╔═██╗ ██║   ██║
  ╚██████╔╝██║     ██║     ███████╗██║ ╚████║╚██████╔╝██║  ██╗╚██████╔╝
   ╚═════╝ ╚═╝     ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝

   OCODER - AI-powered coding assistant

╭──────────────────────────────────────────────────────────╮
│  Session Started                                         │
│                                                          │
│  Model   deepseek-chat                                   │
│  ID      session_xxx...                                  │
│                                                          │
│  Type /help for commands                                 │
╰──────────────────────────────────────────────────────────╯

❯ 
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [DeepSeek](https://deepseek.com) - AI API
- [Chalk](https://github.com/chalk/chalk) - Terminal styling
- [Boxen](https://github.com/sindresorhus/boxen) - Boxes for CLI
- [@clack/prompts](https://github.com/nickcis/clack) - Interactive prompts

---

<div align="center">

Made with ❤️ by [boxiaolanya2008](https://github.com/boxiaolanya2008)

</div>