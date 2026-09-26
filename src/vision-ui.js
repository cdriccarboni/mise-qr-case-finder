import { readData, newId, enrichObjects } from './data-bruitage.js'
import { matchDetections, analyseMise, correctionKey } from './vision-matching.js'
import { detectLocal } from './local-vision.js'
import { escapeHtml as esc } from './data-ui.js'

export async function openLocalPhoto({ file, db, mise, resizePhoto, saved }) {
  const data = await readData(db), catalogue = enrichObjects(data)
  const dialog = document.createElement('dialog'); dialog.className = 'visionDialog'
  document.body.append(dialog)
  const photo = await resizePhoto(file)
  let closed = false, proposals = [], analysisState = 'pending', saving = false
  // Context is explicit and stable: corrections never cross between unrelated mises.
  const context = mise?.name || ''
  dialog.innerHTML = `<div class="form"><div class="dialoghead"><div><b>${mise ? 'Contrôle photo de mise' : 'Détection photo · bêta locale'}</b><small>${esc(mise?.name || 'Data Bruitage · tous les objets')}</small></div><button data-close class="ghost">Fermer</button></div>
    <div class="visionFrame"><img data-photo class="photoPreview" alt="Photo à analyser"><div data-boxes></div></div>
    <p class="hint">Analyse sur cet appareil. Les objets spécialisés peuvent être omis. Corrigez les propositions et cochez uniquement les objets réellement vérifiés. Le score est un indice, pas une certitude.</p>
    <p data-status role="status">Chargement du modèle local… Vous pouvez déjà saisir un objet.</p>
    <div data-proposals></div><button data-manual class="ghost">+ Objet omis / saisie manuelle</button>
    ${mise ? `<h3>Checklist humaine</h3><div data-checklist>${(mise.objectIds || []).map(id => `<label class="check"><input data-expected type="checkbox" value="${esc(id)}" ${(mise.checked || []).includes(id) ? 'checked' : ''}><span>${esc(catalogue.find(o => o.id === id)?.name || id)}</span></label>`).join('')}</div><p data-summary role="status"></p>` : ''}
    <p data-error role="alert"></p><button data-save>Enregistrer les validations</button></div>`
  const $ = selector => dialog.querySelector(selector)
  const $$ = selector => [...dialog.querySelectorAll(selector)]
  dialog.addEventListener('close', () => { closed = true; dialog.remove() }, { once: true })
  $('[data-close]').onclick = () => dialog.close()
  const checked = () => $$('[data-expected]:checked').map(input => input.value)
  function collect() {
    return proposals.map((p, i) => {
      const row = $(`[data-row="${i}"]`), objectId = row.querySelector('[data-match]').value
      return { ...p, objectId: objectId === '__reject' ? '' : objectId, label: row.querySelector('[data-name]').value.trim(),
        sounds: row.querySelector('[data-sounds]').value.split(';').map(s => s.trim()).filter(Boolean),
        validated: row.querySelector('[data-confirm]').checked, rejected: objectId === '__reject', learn: row.querySelector('[data-learn]').checked }
    })
  }
  function summarize() {
    if (!mise) return
    const result = analyseMise(mise, collect(), checked())
    $('[data-summary]').textContent = `Présents : ${result.present.length} · Manquants / non confirmés : ${result.missing.length} · Supplémentaires : ${result.extra.length} · Inconnus : ${result.unknown.length} · À vérifier : ${result.review.length}`
  }
  function appendProposal(p) {
    const index = proposals.push(p) - 1, object = catalogue.find(o => o.id === p.objectId)
    const row = document.createElement('fieldset'); row.dataset.row = index; row.className = 'visionProposal'
    row.innerHTML = `<legend>Objet ${index + 1}${p.confidence === undefined ? '' : ` · ${Math.round(p.confidence * 100)} %`}</legend>
      <p class="hint">${esc(p.rawLabel ? `${p.rawLabel} · ${p.evidence}` : 'Saisie humaine')}${p.ambiguous ? ' · Correspondance ambiguë' : ''}</p>
      <label>Correspondance<select data-match><option value="">Nouvel objet / inconnu</option><option value="__reject" ${p.rejected ? 'selected' : ''}>Fausse détection · écarter</option>${catalogue.map(o => `<option value="${esc(o.id)}" ${p.objectId === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select></label>
      <label>Nom corrigé<input data-name value="${esc(p.label || '')}"></label><label>Sons / usages (séparés par ;)<input data-sounds value="${esc((object?.sounds || []).join('; '))}"></label>
      <label class="check"><input data-confirm type="checkbox"><span>${mise ? 'Confirmer et ajouter à la checklist' : 'Confirmer cet objet'}</span></label>
      <label class="check"><input data-learn type="checkbox" ${p.rawLabel ? '' : 'disabled'}><span>Mémoriser cette correction pour ce contexte</span></label>`
    $('[data-proposals]').append(row)
    row.querySelector('[data-match]').onchange = event => {
      const object = catalogue.find(o => o.id === event.target.value)
      if (object) { row.querySelector('[data-name]').value = object.name; row.querySelector('[data-sounds]').value = (object.sounds || []).join('; ') }
      summarize()
    }
    row.oninput = summarize
    summarize()
  }
  $('[data-manual]').onclick = () => appendProposal({ label: '', quantity: 1, validated: false })
  $$('[data-expected]').forEach(input => input.onchange = () => {
    // Explicit unchecking overrides earlier photo confirmation for the same object.
    if (!input.checked) $$('[data-row]').forEach(row => { if (row.querySelector('[data-match]').value === input.value) row.querySelector('[data-confirm]').checked = false })
    summarize()
  })
  $('[data-save]').onclick = async () => {
    if (saving) return
    const reviewed = collect(), selected = reviewed.filter(p => p.validated && !p.rejected)
    if (selected.some(p => !p.label)) { $('[data-error]').textContent = 'Donnez un nom à chaque objet confirmé.'; return }
    if (!mise && !selected.length && !reviewed.some(p => p.rejected && p.learn)) { $('[data-error]').textContent = 'Confirmez au moins un objet ou mémorisez un rejet.'; return }
    // One generic class may correspond to different objects in a single image.
    const lessons = reviewed.filter(p => p.learn && p.rawLabel && (p.validated || p.rejected))
    const keys = lessons.map(p => correctionKey(p.rawLabel, context))
    if (new Set(keys).size !== keys.length) { $('[data-error]').textContent = 'Mémorisez une seule correction par classe visuelle pour ce contexte.'; return }
    saving = true; $('[data-save]').disabled = true
    const tx = db.transaction(['objects', 'corrections', 'mises'], 'readwrite')
    try {
      for (const p of selected) {
        const existing = p.objectId ? await tx.objectStore('objects').get(p.objectId) : null
        if (p.objectId && !existing) throw new Error('Objet supprimé depuis l’ouverture. Rouvrez la photo pour actualiser la base.')
        p.objectId = existing?.id || newId('obj')
        await tx.objectStore('objects').put({ ...(existing || { id: p.objectId, photo, owned: true, tags: [], contexts: [], source: 'photo locale' }), name: p.label, sounds: p.sounds, humanValidated: true, updatedAt: new Date().toISOString() })
      }
      for (const p of reviewed.filter(p => p.learn && p.rawLabel && (p.validated || p.rejected))) await tx.objectStore('corrections').put({ id: correctionKey(p.rawLabel, context), label: p.rawLabel, context, action: p.rejected ? 'reject' : 'match', objectId: p.objectId, humanValidated: true, updatedAt: new Date().toISOString() })
      let next
      if (mise) {
        const current = await tx.objectStore('mises').get(mise.id)
        if (!current) throw new Error('Mise supprimée depuis l’ouverture.')
        const confirmed = [...new Set([...checked(), ...selected.map(p => p.objectId)])]
        next = { ...current, objectIds: [...new Set([...current.objectIds, ...selected.map(p => p.objectId)])], checked: confirmed, updatedAt: new Date().toISOString(), controlledAt: new Date().toISOString(), controlPhoto: photo }
        next.latestControl = { version: 1, method: 'photo-local', analysisStatus: analysisState, humanValidated: true, controlledAt: next.controlledAt, miseId: mise.id, miseName: mise.name, objectCount: next.objectIds.length, checkedCount: confirmed.length,
          expectedObjects: next.objectIds.map(id => ({ id, name: selected.find(p => p.objectId === id)?.label || catalogue.find(o => o.id === id)?.name || id })), checkedObjectIds: confirmed,
          detectedObjects: reviewed.map(p => ({ ...p, name: p.label })), analysis: analyseMise(mise, reviewed, checked()) }
        await tx.objectStore('mises').put(next)
      }
      await tx.done; dialog.close(); await saved(next)
    } catch (error) {
      try { tx.abort() } catch { /* transaction may already be aborted */ }
      await tx.done.catch(() => {}); if (!closed) { $('[data-error]').textContent = error.message; $('[data-save]').disabled = false }; saving = false
    }
  }
  dialog.showModal(); summarize()
  const image = $('[data-photo]'); image.src = photo
  try {
    await image.decode()
    const detections = await detectLocal(image)
    if (closed || saving) return
    analysisState = 'available'
    const matches = matchDetections(detections, data, context)
    for (const p of matches) {
      appendProposal(p)
      if (p.bbox) {
        const [x, y, width, height] = p.bbox, box = document.createElement('div'); box.className = 'visionBox'
        Object.assign(box.style, { left: `${x / image.naturalWidth * 100}%`, top: `${y / image.naturalHeight * 100}%`, width: `${width / image.naturalWidth * 100}%`, height: `${height / image.naturalHeight * 100}%` })
        box.textContent = proposals.length; $('[data-boxes]').append(box)
      }
    }
    $('[data-status]').textContent = matches.length ? `${matches.length} objet(s) proposés localement. Aucune validation automatique.` : 'Aucun objet détecté. Ajoutez les objets omis manuellement.'
  } catch {
    if (!closed && !saving) { analysisState = 'unavailable'; $('[data-status]').textContent = 'Modèle local indisponible. Terminez le chargement de la PWA en ligne puis réessayez. La saisie et les corrections restent disponibles.' }
  }
}
