import { mkdir, writeFile } from 'node:fs/promises'
import { exportBinder, exportIndexCsv } from '../src/data-import.js'
import { fictionalData } from './fictional-data.mjs'

const data = fictionalData()
const directory = new URL('../public/exemples/', import.meta.url)
await mkdir(directory, { recursive: true })
await writeFile(new URL('classeur-fictif.xlsx', directory), Buffer.from(exportBinder(data)))
await writeFile(new URL('index-fictif.csv', directory), exportIndexCsv(data))
await writeFile(new URL('LISEZMOI.txt', directory), `Jeu de données FICTIF pour MISES !.
Aucun document, nom ou inventaire réel.
Le classeur XLSX se réimporte sans perdre les sources ni les relations.
Le CSV est l’index : son à entendre et son à imaginer sont deux colonnes.
`)
console.log('Exemple fictif écrit dans public/exemples/')
