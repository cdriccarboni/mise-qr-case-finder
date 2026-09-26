import { TABLES, emptyData, readData, planImport, mergeData, saveReviewedRow, newId } from './data-bruitage.js'
import { parseImportFile, downloadWorkbook, SUPPORTED_IMPORT } from './data-import.js'

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const esc = escapeHtml
export async function openDataBruitage({ db, changed, files = [] }) {
  const dialog = document.createElement('dialog'); dialog.className = 'dataDialog'
  document.body.append(dialog)
  let data = await readData(db), selectedTable = 'objects', staged = null, closed = false
  dialog.innerHTML = `<div class="form"><div class="dialoghead"><div><b>Data Bruitage · base globale</b><small>Objets, sons et documents de tous les usages et projets</small></div><button data-close class="ghost">Fermer</button></div>
    <p class="hint">Les imports restent sur cet appareil. Chaque conflit conserve la version locale et rejoint « À vérifier ».</p>
    <div class="row"><button data-import>Importer des fichiers</button><button data-export>Exporter XLSX</button></div>
    <input data-files type="file" accept=".xlsx,.xls,.csv,.json,.txt,.pdf,.docx" multiple hidden>
    <p data-status role="status"></p><div data-preview></div>
    <label>Table<select data-table>${Object.entries(TABLES).map(([key, label]) => `<option value="${key}">${esc(label)}</option>`).join('')}</select></label>
    <label>Filtrer<input data-filter placeholder="Nom, texte ou identifiant"></label>
    <button data-new class="ghost">Ajouter une ligne</button><div data-rows></div><div data-editor></div></div>`
  const $ = selector => dialog.querySelector(selector)
  const status = message => { $('[data-status]').textContent = message }
  const reload = async () => { data = await readData(db); renderRows(); await changed() }
  $('[data-close]').onclick = () => dialog.close()
  dialog.addEventListener('close', () => { closed = true; dialog.remove() }, { once: true })
  function renderRows() {
    const query = $('[data-filter]').value.toLocaleLowerCase('fr')
    const rows = data[selectedTable].filter(row => JSON.stringify(row).toLocaleLowerCase('fr').includes(query))
    $('[data-rows]').innerHTML = `<p>${rows.length} ligne(s) · ${data.review.filter(r => r.status === 'pending').length} à vérifier</p>` + rows.slice(0, 100).map((row, index) => `<article class="dataRow"><div><b>${esc(row.name || row.label || row.reason || row.id)}</b><small>${esc(row.excerpt || row.status || row.objectId || '')}</small></div><button data-edit="${index}" class="ghost">${selectedTable === 'review' ? 'Examiner' : 'Modifier'}</button></article>`).join('') + (rows.length > 100 ? '<p>Affichage limité à 100 lignes. Affinez le filtre.</p>' : '')
    dialog.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => editRow(rows[Number(button.dataset.edit)]))
  }
  function editRow(row = {}) {
    const issue = selectedTable === 'review' ? row : null
    const table = issue ? issue.table || 'objects' : selectedTable
    const proposed = issue ? issue.proposed || { id: newId('obj'), name: '', sourceId: issue.sourceId, owned: false } : { id: newId(selectedTable), ...row }
    $('[data-editor]').innerHTML = `<fieldset><legend>${issue ? 'Qualification humaine' : 'Édition de la ligne'}</legend>${issue ? `<p>${esc(issue.reason)}</p><pre class="dataExcerpt">${esc(issue.excerpt || JSON.stringify(issue.proposed, null, 2))}</pre>` : ''}
      <label>Destination<select data-destination>${Object.entries(TABLES).filter(([key]) => key !== 'review').map(([key, label]) => `<option value="${key}" ${key === table ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
      <p class="hint">Modifiez les champs JSON. Un objet ou son requiert id et name. Une relation requiert id, objectId, soundId. Un alias requiert id, label, targetType (objects ou sounds), targetId.</p>
      <label>Données<textarea data-json rows="10">${esc(JSON.stringify(proposed, null, 2))}</textarea></label>
      <div class="row"><button data-save>Valider cette version</button>${issue ? '<button data-dismiss class="ghost">Écarter</button>' : ''}<button data-cancel class="ghost">Annuler</button></div></fieldset>`
    $('[data-cancel]').onclick = () => { $('[data-editor]').innerHTML = '' }
    $('[data-save]').onclick = async () => {
      try {
        const value = JSON.parse($('[data-json]').value), destination = $('[data-destination]').value
        await saveReviewedRow(db, destination, value, issue?.id)
        $('[data-editor]').innerHTML = ''; await reload(); status('Version humaine enregistrée.')
      } catch (error) { status(error.message) }
    }
    if (issue) $('[data-dismiss]').onclick = async () => {
      await db.put('review', { ...issue, status: 'dismissed' }); $('[data-editor]').innerHTML = ''; await reload(); status('Élément écarté.')
    }
  }
  async function previewFiles(list) {
    $('[data-import]').disabled = true
    staged = emptyData(); const errors = []
    try {
      for (const [index, file] of [...list].entries()) {
        if (closed) return
        status(`Lecture locale ${index + 1}/${list.length}…`)
        try {
          if (!SUPPORTED_IMPORT.test(file.name)) throw new Error('Format ignoré')
          const incoming = await parseImportFile(file)
          for (const key of Object.keys(TABLES)) staged[key].push(...incoming[key])
        } catch (error) { errors.push(`${file.name} : ${error.message}`) }
      }
      if (closed) return
      const plan = planImport(await readData(db), staged)
      status(`${plan.counts.added} ajout(s), ${plan.counts.unchanged} identique(s), ${plan.counts.review} conflit(s) à vérifier. ${errors.length} fichier(s) en erreur.`)
      $('[data-preview]').innerHTML = `${errors.map(error => `<p>${esc(error)}</p>`).join('')}<details><summary>Aperçu des lignes</summary><pre class="dataExcerpt">${esc(JSON.stringify(Object.fromEntries(Object.entries(staged).map(([key, rows]) => [TABLES[key], rows.slice(0, 5)])), null, 2))}</pre></details><div class="row"><button data-apply>Importer ce lot localement</button><button data-abandon class="ghost">Abandonner</button></div>`
      $('[data-abandon]').onclick = () => { staged = null; $('[data-preview]').innerHTML = ''; status('Lot abandonné.') }
      $('[data-apply]').onclick = async event => {
        event.currentTarget.disabled = true
        try {
          const counts = await mergeData(db, staged); staged = null; $('[data-preview]').innerHTML = ''; await reload()
          status(`Import terminé : ${counts.added} ajout(s), ${counts.review} conflit(s) à vérifier.`)
        } catch (error) { status(error.message); if ($('[data-apply]')) $('[data-apply]').disabled = false }
      }
    } finally { if (!closed) $('[data-import]').disabled = false }
  }
  $('[data-table]').onchange = event => { selectedTable = event.target.value; $('[data-editor]').innerHTML = ''; renderRows() }
  $('[data-filter]').oninput = renderRows
  $('[data-new]').onclick = () => editRow()
  $('[data-import]').onclick = () => $('[data-files]').click()
  $('[data-files]').onchange = event => { const selected = [...event.target.files]; event.target.value = ''; void previewFiles(selected) }
  $('[data-export]').onclick = async () => { try { downloadWorkbook(await readData(db)); status('XLSX exporté avec toutes les tables et corrections.') } catch (error) { status(error.message) } }
  dialog.showModal(); renderRows()
  if (files.length) await previewFiles(files)
}
