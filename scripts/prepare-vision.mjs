import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const manifest = JSON.parse(await readFile(new URL('./vision-model.json', import.meta.url)))
const directory = new URL('../public/models/coco-ssd/', import.meta.url)
await mkdir(directory, { recursive: true })
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
for (const [name, expected] of Object.entries(manifest.hashes)) {
  const target = new URL(name, directory)
  let bytes = await readFile(target).catch(() => null)
  if (bytes && hash(bytes) === expected) continue
  const response = await fetch(new URL(name, manifest.base), { signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`Modèle local : téléchargement impossible (${response.status})`)
  bytes = Buffer.from(await response.arrayBuffer())
  if (hash(bytes) !== expected) throw new Error(`Modèle local : empreinte incorrecte pour ${name}`)
  await writeFile(target, bytes)
}
console.log('Modèle COCO-SSD local vérifié.')
