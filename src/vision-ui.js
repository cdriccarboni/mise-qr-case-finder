import { readData, newId, enrichObjects } from './data-bruitage.js'
import { matchDetections, analyseMise, correctionKey, translateLabel } from './vision-matching.js'
import { detectLocal } from './local-vision.js'
import { escapeHtml as esc } from './data-ui.js'
import { FAMILIES } from './constants.js'
import { newLearning } from './learning.js'
import { handsChallenges, generateExercises, sightUniverses } from './exercise-engine.js'

const TITLES = {
  inventory: ['Inventaire rapide', 'Photo, fiche, QR, objet suivant'],
  group: ['Plusieurs objets', 'Une proposition par objet visible. Les personnes sont ignorées.'],
  hands: ['Crée ton bruitage', 'Avec les objets sous la main'],
  universe: ['Univers sonore', 'Avec ce que je vois'],
  control: ['Détection photo', 'Data Bruitage']
}

export async function openLocalPhoto({ file, db, mise, resizePhoto, saved, mode = 'control', durationMin = 1 }) {
  const data = await readData(db)
  const catalogue = enrichObjects(data)
  const learnings = await db.getAll('learnings').catch(() => [])
  const mises = await db.getAll('mises').catch(() => [])
  const dialog = document.createElement('dialog'); dialog.className = 'visionDialog'
  document.body.append(dialog)
  const photo = await resizePhoto(file)
  let closed = false, proposals = [], analysisState = 'pending', saving = false
  const context = mise?.name || (mode === 'inventory' ? 'inventaire' : '')
  const heading = TITLES[mode] || TITLES.control
  const creative = mode === 'hands' || mode === 'universe' || mode === 'group'
  dialog.innerHTML = `<div class="form ${creative ? 'playful' : ''}"><div class="dialoghead"><div><b>${mise && mode === 'control' ? 'Contrôle photo de mise' : esc(heading[0])}</b><small>${esc(mise?.name || heading[1])}</small></div><button data-close class="ghost">Fermer</button></div>
    <div class="visionFrame"><img data-photo class="photoPreview" alt="Photo à analyser"><div data-boxes></div></div>
    <p class="hint">Analyse sur cet appareil. Le pourcentage est un indice, pas une certitude. Rien n’est enregistré sans toi. Une correction mémorisée est une association locale : le modèle n’est pas réentraîné. Les personnes sont ignorées. Un objet sans indice visuel n’est pas inventé.</p>
    <p data-status role="status">Chargement du modèle local… Vous pouvez déjà saisir un objet.</p>
    <div data-creative hidden></div>
    <div class="batchBar"><label>Tout est dans<select data-batch-case><option value="">Choisir un contenant</option>${(data.cases || []).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>
    <label>Ajouter à la mise<select data-batch-mise><option value="">Aucune</option>${mises.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label>
    <button type="button" data-batch-all class="ghost">Créer les fiches dans ce contenant</button></div>
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
        hear: row.querySelector('[data-hear]').value.trim(), imagine: row.querySelector('[data-imagine]').value.trim(),
        family: row.querySelector('[data-family]').value, notes: row.querySelector('[data-notes]').value.trim(),
        caseId: row.querySelector('[data-case]').value,
        validated: row.querySelector('[data-confirm]').checked, rejected: objectId === '__reject', learn: row.querySelector('[data-learn]').checked }
    })
  }
  function summarize() {
    if (!mise) return
    const result = analyseMise(mise, collect(), checked())
    $('[data-summary]').textContent = `Présents : ${result.present.length} · Manquants / non confirmés : ${result.missing.length} · Supplémentaires : ${result.extra.length} · Inconnus : ${result.unknown.length} · À vérifier : ${result.review.length}`
  }
  function fillFromObject(row, object) {
    if (!object) return
    row.querySelector('[data-name]').value = object.name
    row.querySelector('[data-sounds]').value = (object.sounds || []).join('; ')
    row.querySelector('[data-hear]').value = object.hear || ''
    row.querySelector('[data-imagine]').value = object.imagine || ''
    if (object.family) row.querySelector('[data-family]').value = object.family
    if (object.caseId || object.container_id) row.querySelector('[data-case]').value = object.caseId || object.container_id
  }
  function appendProposal(p) {
    const index = proposals.push(p) - 1
    const object = catalogue.find(o => o.id === p.objectId)
    const unknown = !p.objectId && !p.rejected
    const row = document.createElement('fieldset'); row.dataset.row = index; row.className = 'visionProposal'
    row.innerHTML = `<legend>Objet ${index + 1}${p.confidence === undefined ? '' : ` · indice visuel ${Math.round(p.confidence * 100)} %`}</legend>
      <p class="hint">${esc(p.rawLabel ? `${translateLabel(p.rawLabel)} · ${p.evidence}` : 'Saisie humaine')}${p.ambiguous ? ' · Correspondance ambiguë' : ''}${unknown ? ' · Inconnu, à nommer' : ''}${p.objectId ? ' · Déjà dans la base' : ''}</p>
      <label>Correspondance<select data-match><option value="">Nouvel objet / inconnu</option><option value="__reject" ${p.rejected ? 'selected' : ''}>Fausse détection · écarter</option>${catalogue.map(o => `<option value="${esc(o.id)}" ${p.objectId === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select></label>
      <label>Nom corrigé<input data-name value="${esc(p.label || '')}"></label>
      <div class="grid2"><label>Son à entendre<input data-hear value="${esc(object?.hear || '')}"></label><label>Son à imaginer<input data-imagine value="${esc(object?.imagine || '')}"></label></div>
      <label>Usages (séparés par ;)<input data-sounds value="${esc((object?.sounds || []).join('; '))}"></label>
      <div class="grid2"><label>Famille<select data-family>${FAMILIES.map(family => `<option ${((object?.family || 'À classer') === family) ? 'selected' : ''}>${family}</option>`).join('')}</select></label>
      <label>Contenant<select data-case><option value="">Sans contenant</option>${(data.cases || []).map(c => `<option value="${esc(c.id)}" ${(object?.caseId || object?.container_id) === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label></div>
      <label>Notes<textarea data-notes rows="2">${esc(object?.notes || '')}</textarea></label>
      <label class="check"><input data-confirm type="checkbox"><span>${mise ? 'Confirmer et ajouter à la checklist' : 'Confirmer cet objet'}</span></label>
      <label class="check"><input data-learn type="checkbox" ${p.rawLabel ? '' : 'disabled'} ${mode === 'inventory' && p.rawLabel ? 'checked' : ''}><span>Mémoriser cette correction pour la prochaine photo</span></label>`
    $('[data-proposals]').append(row)
    row.querySelector('[data-match]').onchange = event => { fillFromObject(row, catalogue.find(o => o.id === event.target.value)); summarize() }
    row.oninput = summarize
    summarize()
  }
  async function persist(forceCase) {
    if (saving) return
    const reviewed = collect()
    if (forceCase) {
      for (const [index, proposal] of reviewed.entries()) {
        if (proposal.rejected || !proposal.label) continue
        const row = $(`[data-row="${index}"]`)
        row.querySelector('[data-confirm]').checked = true
        proposal.validated = true
        proposal.caseId = forceCase
      }
    }
    const selected = reviewed.filter(p => p.validated && !p.rejected)
    if (selected.some(p => !p.label)) { $('[data-error]').textContent = 'Donnez un nom à chaque objet confirmé.'; return }
    if (!mise && !selected.length && !reviewed.some(p => p.rejected && p.learn)) { $('[data-error]').textContent = 'Confirmez au moins un objet ou mémorisez un rejet.'; return }
    const seenLessons = new Set()
    for (const proposal of reviewed) {
      if (!proposal.learn || !proposal.rawLabel || !(proposal.validated || proposal.rejected)) continue
      const key = correctionKey(proposal.rawLabel, context)
      if (seenLessons.has(key)) proposal.learn = false
      else seenLessons.add(key)
    }
    const lessons = reviewed.filter(p => p.learn && p.rawLabel && (p.validated || p.rejected))
    saving = true; $('[data-save]').disabled = true
    const batchMise = $('[data-batch-mise]').value
    const tx = db.transaction(['objects', 'corrections', 'mises', 'aliases', 'learnings'], 'readwrite')
    const created = []
    try {
      for (const p of selected) {
        const existing = p.objectId ? await tx.objectStore('objects').get(p.objectId) : null
        if (p.objectId && !existing) throw new Error('Objet supprimé depuis l’ouverture. Rouvrez la photo pour actualiser la base.')
        p.objectId = existing?.id || newId('obj')
        const previousCase = existing?.caseId || existing?.container_id || ''
        const caseId = forceCase || p.caseId || ''
        const row = {
          ...(existing || { id: p.objectId, photo, owned: true, tags: [], contexts: [], source: 'photo locale', provenance: 'user-document' }),
          name: p.label, sounds: p.sounds, hear: p.hear, imagine: p.imagine, family: p.family, notes: p.notes,
          caseId, container_id: caseId, humanValidated: true, owned: true,
          provenance: existing?.provenance && existing.provenance !== 'generated' ? existing.provenance : 'user-document',
          detectedName: p.rawLabel || existing?.detectedName || '',
          updatedAt: new Date().toISOString()
        }
        if (previousCase !== caseId) row.locationHistory = [...(existing?.locationHistory || []), { at: row.updatedAt, from: previousCase, to: caseId, method: mode }]
        if (!existing && photo) row.photo = photo
        await tx.objectStore('objects').put(row)
        created.push({ ...row, fresh: !existing })
      }
      for (const p of lessons) {
        await tx.objectStore('corrections').put({ id: correctionKey(p.rawLabel, context), label: p.rawLabel, context, action: p.rejected ? 'reject' : 'match', objectId: p.objectId, humanValidated: true, updatedAt: new Date().toISOString() })
        if (!p.rejected && p.objectId) {
          const aliasId = `alias-${p.rawLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${p.objectId}`
          await tx.objectStore('aliases').put({ id: aliasId, label: p.rawLabel, targetType: 'objects', targetId: p.objectId, humanValidated: true, provenance: 'user-document' })
          await tx.objectStore('learnings').put(newLearning({ kind: 'label-preference', label: p.rawLabel, objectId: p.objectId, context, note: 'Association photo → fiche, sans réentraînement du modèle' }))
          await tx.objectStore('learnings').put(newLearning({ kind: 'photo-object', label: p.rawLabel, objectId: p.objectId, context }))
        }
        if (p.rejected) await tx.objectStore('learnings').put(newLearning({ kind: 'false-detection', label: p.rawLabel, context, note: 'Fausse détection écartée' }))
      }
      let next
      const miseId = mise?.id || batchMise
      if (miseId && selected.length) {
        const current = await tx.objectStore('mises').get(miseId)
        if (current) {
          const confirmed = [...new Set([...(mise && mise.id === miseId ? checked() : current.checked || []), ...selected.map(p => p.objectId)])]
          next = { ...current, objectIds: [...new Set([...(current.objectIds || []), ...selected.map(p => p.objectId)])], checked: mise && mise.id === miseId ? confirmed : current.checked || [], updatedAt: new Date().toISOString() }
          if (mise && mise.id === miseId) {
            next.controlledAt = next.updatedAt
            next.controlPhoto = photo
            next.latestControl = { version: 1, method: 'photo-local', analysisStatus: analysisState, humanValidated: true, controlledAt: next.controlledAt, miseId: mise.id, miseName: mise.name, objectCount: next.objectIds.length, checkedCount: confirmed.length,
              expectedObjects: next.objectIds.map(id => ({ id, name: selected.find(p => p.objectId === id)?.label || catalogue.find(o => o.id === id)?.name || id })), checkedObjectIds: confirmed,
              detectedObjects: reviewed.map(p => ({ ...p, name: p.label })), analysis: analyseMise(mise, reviewed, checked()) }
          }
          await tx.objectStore('mises').put(next)
        }
      }
      await tx.done
      dialog.close()
      await saved(next, created)
    } catch (error) {
      try { tx.abort() } catch { /* already aborted */ }
      await tx.done.catch(() => {})
      if (!closed) { $('[data-error]').textContent = error.message; $('[data-save]').disabled = false }
      saving = false
    }
  }
  $('[data-manual]').onclick = () => appendProposal({ label: '', quantity: 1, validated: false })
  $('[data-batch-all]').onclick = () => {
    const caseId = $('[data-batch-case]').value
    if (!caseId) { $('[data-error]').textContent = 'Choisis d’abord le contenant. Exemple : Caisse grise n°23.'; return }
    $('[data-error]').textContent = ''
    void persist(caseId)
  }
  $$('[data-expected]').forEach(input => input.onchange = () => {
    if (!input.checked) $$('[data-row]').forEach(row => { if (row.querySelector('[data-match]').value === input.value) row.querySelector('[data-confirm]').checked = false })
    summarize()
  })
  $('[data-save]').onclick = () => persist('')
  dialog.showModal(); summarize()
  const image = $('[data-photo]'); image.src = photo
  try {
    await image.decode()
    const detections = await detectLocal(image)
    if (closed || saving) return
    analysisState = 'available'
    const matches = matchDetections(detections, data, context, learnings)
    for (const p of matches) {
      appendProposal(p)
      if (p.bbox) {
        const [x, y, width, height] = p.bbox, box = document.createElement('div'); box.className = 'visionBox'
        Object.assign(box.style, { left: `${x / image.naturalWidth * 100}%`, top: `${y / image.naturalHeight * 100}%`, width: `${width / image.naturalWidth * 100}%`, height: `${height / image.naturalHeight * 100}%` })
        box.textContent = proposals.length; $('[data-boxes]').append(box)
      }
    }
    const visible = matches.filter(item => !item.rejected).map(item => item.objectId ? item.label : translateLabel(item.rawLabel))
    const creativeBox = $('[data-creative]')
    if (mode === 'hands' || mode === 'universe' || mode === 'group') {
      creativeBox.hidden = false
      const hands = handsChallenges(visible)
      const exercises = generateExercises({ objects: visible.map(name => ({ name })), durationMin, participants: 1, count: 4 })
      const universes = sightUniverses(visible)
      creativeBox.innerHTML = `<p class="hint">Objets vus : ${esc(visible.join(', ') || 'aucun')}. Proposition générée, pas une fiche possédée.</p>`
        + (mode !== 'universe' ? hands.challenges.map(item => `<article class="challenge"><strong>${esc(item.title)}</strong><small>${esc(item.duration)} · ${esc(item.provenance === 'generated' ? 'Proposition générée' : '')}</small><p>${item.steps.map(esc).join(' ')}</p></article>`).join('') : '')
        + (mode === 'universe' || mode === 'group' ? `<h3>${esc(universes.intro || '')}</h3>` + (universes.scenarios || []).map(scene => `<article class="challenge"><strong>${esc(scene.title)}</strong><p>${esc(scene.lead)}</p><p>${scene.steps.map(esc).join(' ')}</p><small>Suggestion · pas dans ta base</small></article>`).join('') : '')
        + exercises.exercises.map(item => `<article class="challenge"><strong>${esc(item.title)}</strong><small>${esc(item.duration)} · ${esc(item.disclaimer)}</small><p>${item.steps.map(esc).join(' ')}</p></article>`).join('')
        + [...(hands.uncertain || []), ...(universes.uncertain || []), ...(exercises.uncertain || [])].map(line => `<p class="uncertain">${esc(line)}</p>`).join('')
    }
    $('[data-status]').textContent = matches.length ? `${matches.length} objet(s) proposés localement. Aucune validation automatique.` : 'Aucun objet détecté. Ajoutez les objets omis manuellement.'
  } catch {
    if (!closed && !saving) { analysisState = 'unavailable'; $('[data-status]').textContent = 'Modèle local indisponible. Terminez le chargement de la PWA en ligne puis réessayez. La saisie et les corrections restent disponibles.' }
  }
}
