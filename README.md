# Ocoder

From-scratch AI coding agent CLI (not copied from OpenCode).

## Quick start

1. `cd D:\31702\ocoder-code\ocoder`
2. `npm install`
3. Set API key: `setx OPENAI_API_KEY "<your_key>"` (Windows)
4. Run: `npm run dev`

## Commands

- `ocoder` interactive mode
- `ocoder run "explain this repo"` single-turn
- `ocoder config` print config file path
- interactive shortcuts: `/shell`, `/reset`, `/config`, `/exit`

## Roadmap

- Structured tool-calling protocol
- Multi-agent planner/executor
- Better TUI (panes, diffs, progress)
- Workspace sandbox and approvals
