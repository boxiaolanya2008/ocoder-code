#!/usr/bin/env node

import { runCli } from "./ui/cli.js"

runCli(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  console.error(message)
  process.exit(1)
})