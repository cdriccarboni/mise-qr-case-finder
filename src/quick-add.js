import { casePathString, caseDisplayName } from './containers.js'
import { escapeHtml as esc } from './data-ui.js'

/**
 * Mémorisation intelligente des correspondances :
 * Si l'utilisateur saisit ou dicte "ELVIS", propose automatiquement la catégorie
 * et l'emplacement habituel de ce surnom.
 */
export function findSmartCompletions(query, objects = [], cases = []) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return null

  // 1. Recherche exacte dans les surnoms, alias et noms
  for (const obj of objects) {
    const nick = String(obj.nickname || '').toLowerCase()
    const name = String(obj.name || '').toLowerCase()
    const aliases = (obj.aliases || []).map(a => String(a).toLowerCase())

    if (nick === q || aliases.includes(q) || name === q) {
      return {
        name: obj.name,
        nickname: obj.nickname || (nick === q ? query.toUpperCase() : ''),
        category: obj.category || (obj.name.toLowerCase().includes('micro') ? 'Micro' : 'Matériel'),
        family: obj.family || 'Son & micros',
        caseId: obj.caseId || obj.container_id || '',
        suggestedCaseId: obj.caseId || obj.container_id || '',
        suggestedSounds: obj.sounds || [],
        spare: Boolean(obj.spare)
      }
    }
  }

  // 2. Recherche partielle par inclusion
  for (const obj of objects) {
    const nick = String(obj.nickname || '').toLowerCase()
    const name = String(obj.name || '').toLowerCase()
    const cat = String(obj.category || '').toLowerCase()

    if (name.includes(q) || nick.includes(q) || cat.includes(q)) {
      return {
        name: obj.name,
        nickname: obj.nickname || '',
        category: obj.category || (name.includes('micro') ? 'Micro' : 'Matériel'),
        family: obj.family || 'Son & micros',
        caseId: obj.caseId || obj.container_id || '',
        suggestedCaseId: obj.caseId || obj.container_id || '',
        suggestedSounds: obj.sounds || [],
        spare: Boolean(obj.spare)
      }
    }
  }

  // 3. Vocabulaire spectacle vivant courant
  if (/elvis/i.test(q)) {
    return { name: 'Micro bruitage', nickname: 'ELVIS', category: 'Micro', family: 'Son & micros', spare: false, suggestedSounds: ['voix', 'acoustique'] }
  }
  if (/petite\s+di|boite\s+de\s+direct|direct/i.test(q)) {
    return { name: 'Boîte de direct', nickname: 'PETITE DI', category: 'Accessoire son', family: 'Son & micros', spare: false, suggestedSounds: ['ligne'] }
  }
  if (/spare/i.test(q)) {
    return { name: 'Micro bruitage', nickname: 'SPARE', category: 'Micro', family: 'Son & micros', spare: true, suggestedSounds: [] }
  }
  if (/micro/i.test(q)) {
    return { name: 'Micro', nickname: '', category: 'Micro', family: 'Son & micros', spare: false, suggestedSounds: ['voix', 'acoustique'] }
  }

  return null
}

/**
 * Dialogue d'ajout ultrarapide d'un objet (adapté utilisation debout / régie)
 */
export function openQuickAddObject({ photoDataUrl = '', allObjects = [], allCases = [], defaultCaseId = '', db, onSaved, onNextPhoto }) {
  const dialog = document.createElement('dialog')
  dialog.className = 'quickAddDialog'
  document.body.append(dialog)

  let name = ''
  let nickname = ''
  let caseId = defaultCaseId || (allCases[0]?.id || '')
  let isSpare = false
  let isListening = false
  let recognition = null

  function applyCompletions(text) {
    const smart = findSmartCompletions(text, allObjects, allCases)
    if (smart) {
      if (smart.name) name = smart.name
      if (smart.nickname) nickname = smart.nickname
      if (smart.caseId && !defaultCaseId) caseId = smart.caseId
      if (smart.spare !== undefined) isSpare = smart.spare
      renderFields()
    }
  }

  function renderFields() {
    const nameInput = dialog.querySelector('[data-quick-name]')
    const nickInput = dialog.querySelector('[data-quick-nick]')
    const caseSelect = dialog.querySelector('[data-quick-case]')
    const spareCheck = dialog.querySelector('[data-quick-spare]')

    if (nameInput && nameInput.value !== name) nameInput.value = name
    if (nickInput && nickInput.value !== nickname) nickInput.value = nickname
    if (caseSelect && caseSelect.value !== caseId) caseSelect.value = caseId
    if (spareCheck) spareCheck.checked = isSpare
  }

  function render() {
    dialog.innerHTML = `
      <div class="form quickAddForm">
        <div class="dialoghead">
          <div>
            <b>Ajout ultrarapide</b>
            <small>Enregistrement en quelques secondes</small>
          </div>
          <button data-close class="ghost" type="button">×</button>
        </div>

        ${photoDataUrl ? `
          <div class="quickPhotoWrap">
            <img src="${photoDataUrl}" alt="Photo de l’objet" class="quickPhotoThumb">
          </div>
        ` : ''}

        <div class="quickInputs">
          <label>
            Nom ou surnom :
            <div class="inputWithVoice">
              <input data-quick-name value="${esc(name)}" placeholder="Ex : Micro bruitage ou ELVIS" autofocus>
              <button type="button" data-quick-mic class="ghost voiceButton ${isListening ? 'listening' : ''}" title="Dicter">
                🎙
              </button>
            </div>
            <small data-quick-status class="hint">Dictez ou tapez le nom. Si vous entrez ELVIS, MISES! complète la fiche.</small>
          </label>

          <label>
            Surnom / Alias (optionnel) :
            <input data-quick-nick value="${esc(nickname)}" placeholder="ELVIS, PETITE DI, SPARE…">
          </label>

          <label>
            Caisse ou pochette de destination :
            <select data-quick-case>
              <option value="">Sans contenant</option>
              ${allCases.map(c => `
                <option value="${c.id}" ${c.id === caseId ? 'selected' : ''}>
                  ${esc(casePathString(c.id, allCases) || caseDisplayName(c))}
                </option>
              `).join('')}
            </select>
          </label>

          <label class="check">
            <input type="checkbox" data-quick-spare ${isSpare ? 'checked' : ''}>
            <span>Statut SPARE (matériel de secours)</span>
          </label>
        </div>

        <div class="quickActions">
          <button data-quick-save class="ctaBig">
            ⚡ [ENREGISTRER EN 1 CLIC]
          </button>
          ${onNextPhoto ? `
            <button data-quick-next class="ctaBig ghost">
              📷 [ENREGISTRER ET SUIVANT]
            </button>
          ` : ''}
          <button data-close class="ghost" type="button">
            Annuler
          </button>
        </div>
      </div>
    `

    bindEvents()
  }

  function bindEvents() {
    dialog.querySelectorAll('[data-close]').forEach(btn => {
      btn.onclick = () => {
        stopSpeech()
        dialog.close()
        dialog.remove()
      }
    })

    const nameInput = dialog.querySelector('[data-quick-name]')
    if (nameInput) {
      nameInput.oninput = () => {
        name = nameInput.value.trim()
        applyCompletions(name)
      }
    }

    const nickInput = dialog.querySelector('[data-quick-nick]')
    if (nickInput) {
      nickInput.oninput = () => {
        nickname = nickInput.value.trim()
        if (/\bspare\b/i.test(nickname)) {
          isSpare = true
          const check = dialog.querySelector('[data-quick-spare]')
          if (check) check.checked = true
        }
      }
    }

    const caseSelect = dialog.querySelector('[data-quick-case]')
    if (caseSelect) {
      caseSelect.onchange = () => {
        caseId = caseSelect.value
      }
    }

    const spareCheck = dialog.querySelector('[data-quick-spare]')
    if (spareCheck) {
      spareCheck.onchange = () => {
        isSpare = spareCheck.checked
      }
    }

    const micBtn = dialog.querySelector('[data-quick-mic]')
    if (micBtn) {
      micBtn.onclick = () => {
        if (isListening) stopSpeech()
        else startSpeech()
      }
    }

    const saveBtn = dialog.querySelector('[data-quick-save]')
    if (saveBtn) {
      saveBtn.onclick = async () => {
        await doSave()
        dialog.close()
        dialog.remove()
      }
    }

    const nextBtn = dialog.querySelector('[data-quick-next]')
    if (nextBtn) {
      nextBtn.onclick = async () => {
        await doSave()
        dialog.close()
        dialog.remove()
        if (typeof onNextPhoto === 'function') onNextPhoto()
      }
    }
  }

  async function doSave() {
    const finalName = name || nickname || 'Objet sans nom'
    const newObj = {
      id: `obj-${crypto.randomUUID()}`,
      name: finalName,
      nickname: nickname || '',
      aliases: nickname ? [nickname] : [],
      spare: isSpare || /\bspare\b/i.test(finalName) || /\bspare\b/i.test(nickname),
      caseId: caseId || '',
      container_id: caseId || '',
      photo: photoDataUrl || '',
      quantity: 1,
      state: 'Bon état',
      sounds: [finalName],
      tags: nickname ? [nickname] : [],
      contexts: [],
      source: 'ajout rapide',
      provenance: 'user-document',
      owned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (caseId) {
      newObj.locationHistory = [{
        at: newObj.updatedAt,
        from: '',
        to: caseId,
        method: 'ajout rapide'
      }]
    }

    await db.put('objects', newObj)
    if (typeof onSaved === 'function') await onSaved(newObj)
    return newObj
  }

  function startSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    try {
      recognition = new SpeechRecognition()
      recognition.lang = 'fr-FR'
      recognition.continuous = false
      recognition.interimResults = false

      isListening = true
      updateMicUI()

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim()
        name = transcript
        const nameInput = dialog.querySelector('[data-quick-name]')
        if (nameInput) nameInput.value = name
        applyCompletions(name)
      }

      recognition.onerror = () => stopSpeech()
      recognition.onend = () => stopSpeech()
      recognition.start()
    } catch {
      stopSpeech()
    }
  }

  function stopSpeech() {
    isListening = false
    try { recognition?.stop() } catch {}
    recognition = null
    updateMicUI()
  }

  function updateMicUI() {
    const micBtn = dialog.querySelector('[data-quick-mic]')
    if (micBtn) micBtn.classList.toggle('listening', isListening)
  }

  dialog.showModal()
  render()
  return dialog
}
