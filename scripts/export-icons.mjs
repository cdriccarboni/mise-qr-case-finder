import { spawnSync } from 'node:child_process'

const run = spawnSync('python3', [new URL('./build-wordmark.py', import.meta.url).pathname], { stdio: 'inherit' })
if (run.status !== 0) process.exit(run.status ?? 1)
