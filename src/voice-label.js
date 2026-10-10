import QRCode from 'qrcode'
import { entityUrl, shortId } from './qr-link.js'
import { escapeHtml as esc } from './data-ui.js'

export const LABEL_FORMATS = [
  { id: '40x30', name: 'Petite étiquette autocollante', w: 40, h: 30, unit: 'mm' },
  { id: '50x30', name: 'Étiquette standard', w: 50, h: 30, unit: 'mm' },
  { id: '80x50', name: 'Grande étiquette de caisse', w: 80, h: 50, unit: 'mm' },
  { id: 'a4', name: 'Planche A4 (multi-étiquettes)', w: 210, h: 297, unit: 'mm', grid: '3x8' },
  { id: 'custom', name: 'Format personnalisé', w: 60, h: 40, unit: 'mm' }
]

const RECENTS_KEY = 'mises-label-recents-v1'

export function getSavedLabels() {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveLabelRecord(label) {
  const existing = getSavedLabels()
  const updated = [label, ...existing.filter(l => l.id !== label.id)].slice(0, 30)
  localStorage.setItem(RECENTS_KEY, JSON.stringify(updated))
  return updated
}

/**
 * Analyse une commande vocale en français pour en extraire les lignes et options
 * Exemples :
 * "Crée une étiquette MICRO BRUITAGE ATELIER SPARE"
 * -> lines: ["MICRO BRUITAGE", "ATELIER", "SPARE"], isSpare: true, entityType: "label"
 * "Nouvelle caisse rose pour les micros de bruitage"
 * -> lines: ["CAISSE ROSE", "MICROS DE BRUITAGE"], entityType: "Caisse"
 * "Ajouter une pochette SPARE dans la boîte atelier"
 * -> lines: ["POCHETTE SPARE", "BOÎTE ATELIER", "SPARE"], entityType: "Pochette", parentName: "boîte atelier"
 */
export function parseVoiceLabelCommand(spokenText = '', allCases = []) {
  let text = String(spokenText || '').trim().replace(/[.?!;:,]+$/, '').trim()

  // Détection SPARE
  const isSpare = /\bspare\b/i.test(text) || /\b(?:de\s+)?secours\b/i.test(text)

  // Détection de type de conteneur
  let entityType = 'label'
  const containerMatch = text.match(/\b(caisse|valise|bo[îi]te|pochette|trousse|bac|flight-case)\b/i)
  if (containerMatch) {
    const raw = containerMatch[1].toLowerCase()
    entityType = raw.startsWith('bo') ? 'Boîte' : raw[0].toUpperCase() + raw.slice(1)
  } else if (/\b(micro|câble|cable|objet|boîtier|boitier)\b/i.test(text)) {
    entityType = 'Objet'
  }

  // Détection de conteneur parent via "dans"
  let parentName = ''
  let parentCaseId = ''
  const inMatch = text.match(/\bdans\s+(?:la\s+|le\s+|l['’])?([^,\.]+)/i)
  if (inMatch) {
    parentName = inMatch[1].trim()
    const pNorm = parentName.toLowerCase()
    const found = allCases.find(c => {
      const cNorm = String(c.name || '').toLowerCase()
      return cNorm.includes(pNorm) || pNorm.includes(cNorm)
    })
    if (found) parentCaseId = found.id
  }

  // Nettoyage des phrases introductives
  const triggers = [
    /^(?:crée|créer|faire|nouvelle|nouveau|ajoute|ajouter|imprime|imprimer)\s+(?:une\s+|un\s+|l['’])?(?:étiquette|etiquette)?\s*(?:de\s+|pour\s+|intitulée\s+)?/i,
    /^(?:étiquette|etiquette)\s+(?:de\s+|pour\s+)?/i
  ]
  let cleaned = text
  for (const trigger of triggers) {
    if (trigger.test(cleaned)) {
      cleaned = cleaned.replace(trigger, '').trim()
      break
    }
  }

  // Découpage intelligent en lignes
  let lines = []
  if (cleaned.includes('\n')) {
    lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean)
  } else if (cleaned.includes(' · ') || cleaned.includes(' - ') || cleaned.includes(' / ') || cleaned.includes(',')) {
    lines = cleaned.split(/\s*[,·\-\/]\s*/).map(l => l.trim()).filter(Boolean)
  } else {
    const keywords = ['ATELIER', 'SPARE', 'RÉGIE', 'REGIE', 'PLATEAU', 'CAISSE', 'BOITE', 'BOÎTE', 'POCHETTE', 'TROUSSE', 'VOL', 'SALLE', 'SECOURS', 'TEST']
    let remaining = cleaned
    const foundKeywords = []
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i')
      const match = remaining.match(regex)
      if (match) {
        foundKeywords.push({ kw: match[0].toUpperCase(), index: match.index })
      }
    }

    if (foundKeywords.length > 0) {
      foundKeywords.sort((a, b) => a.index - b.index)
      let lastIndex = 0
      const segments = []
      for (const item of foundKeywords) {
        const pre = remaining.slice(lastIndex, item.index).trim()
        if (pre) segments.push(pre)
        segments.push(item.kw)
        lastIndex = item.index + item.kw.length
      }
      const post = remaining.slice(lastIndex).trim()
      if (post) segments.push(post)
      lines = segments
    } else {
      const words = cleaned.split(/\s+/).filter(Boolean)
      if (words.length <= 4) {
        lines = [words.join(' ')]
      } else {
        const mid = Math.ceil(words.length / 2)
        lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
      }
    }
  }

  lines = lines
    .map(l => l.replace(/^[.\s,;:!]+|[.\s,;:!]+$/g, '').trim().toUpperCase())
    .filter(Boolean)

  const permanentId = `lbl-${crypto.randomUUID()}`

  return {
    id: permanentId,
    rawText: text,
    title: lines[0] || 'ÉTIQUETTE',
    lines: lines.length ? lines : ['ÉTIQUETTE'],
    isSpare,
    category: isSpare ? 'SPARE' : 'MATÉRIEL',
    entityType,
    parentName,
    parentCaseId,
    format: '50x30',
    createdAt: new Date().toISOString()
  }
}

/**
 * Génère le QR Code pour l'étiquette
 */
export async function makeLabelQr(permanentId, origin = location.href) {
  const url = entityUrl(origin, 'label', permanentId)
  return QRCode.toDataURL(url, {
    width: 480,
    margin: 2,
    errorCorrectionLevel: 'M'
  })
}

/**
 * Ouvre le dialogue de création vocale d'étiquette
 */
export function openVoiceLabelCreator({ db, allCases = [], allObjects = [], onPrint, origin = location.href, onSave }) {
  const dialog = document.createElement('dialog')
  dialog.className = 'voiceLabelDialog'
  document.body.append(dialog)

  let currentLabel = {
    id: `lbl-${crypto.randomUUID()}`,
    lines: ['MICRO BRUITAGE', 'ATELIER', 'SPARE'],
    title: 'MICRO BRUITAGE',
    isSpare: true,
    category: 'SPARE',
    entityType: 'label',
    parentCaseId: '',
    format: '50x30',
    qrDataUrl: '',
    createdAt: new Date().toISOString()
  }

  let isListening = false
  let recognition = null

  async function updateQr() {
    currentLabel.qrDataUrl = await makeLabelQr(currentLabel.id, origin)
    renderPreview()
  }

  function renderPreview() {
    const previewContainer = dialog.querySelector('[data-label-preview-content]')
    if (!previewContainer) return

    const format = LABEL_FORMATS.find(f => f.id === currentLabel.format) || LABEL_FORMATS[1]

    if (currentLabel.format === 'a4') {
      // Rendu planche A4
      const qrImg = currentLabel.qrDataUrl ? `<img src="${currentLabel.qrDataUrl}" alt="QR" class="a4LabelQr">` : ''
      const singleLabel = `
        <div class="a4MiniLabel ${currentLabel.isSpare ? 'isSpare' : ''}">
          <div class="a4MiniText">
            ${currentLabel.lines.map(l => `<strong>${esc(l)}</strong>`).join('')}
            ${currentLabel.isSpare ? '<span class="spareBadge">SPARE</span>' : ''}
          </div>
          ${qrImg}
        </div>
      `
      previewContainer.innerHTML = `
        <div class="a4SheetPreview">
          <div class="a4Grid">
            ${Array.from({ length: 18 }).map(() => singleLabel).join('')}
          </div>
          <small class="hint">Aperçu planche A4 · 18 étiquettes prêtes pour impression</small>
        </div>
      `
      return
    }

    // Rendu étiquette individuelle
    previewContainer.innerHTML = `
      <div class="voiceLabelCard ${currentLabel.isSpare ? 'isSpare' : ''}" style="aspect-ratio: ${format.w} / ${format.h}">
        <div class="voiceLabelHeader">
          <span class="voiceLabelBrand">MISES!</span>
          <span class="voiceLabelId">${esc(shortId(currentLabel.id))}</span>
        </div>
        <div class="voiceLabelBody">
          <div class="voiceLabelLines">
            ${currentLabel.lines.map(line => `<div class="voiceLabelLine">${esc(line)}</div>`).join('')}
          </div>
          <div class="voiceLabelQrWrap">
            ${currentLabel.qrDataUrl ? `<img class="voiceLabelQrImg" src="${currentLabel.qrDataUrl}" alt="QR Code">` : 'QR'}
          </div>
        </div>
        <div class="voiceLabelFooter">
          ${currentLabel.isSpare ? '<span class="spareBadge">SPARE</span>' : ''}
        </div>
      </div>
    `
  }

  function renderDialog() {
    dialog.innerHTML = `
      <div class="voiceLabelContainer">
        <div class="dialoghead">
          <div>
            <b>Création vocale d’étiquettes</b>
            <small>Dictez votre étiquette ou saisissez le texte</small>
          </div>
          <button data-close class="ghost" type="button" aria-label="Fermer">×</button>
        </div>

        <div class="voicePromptHero">
          <p class="voiceInstruction">
            Prononcez par exemple :<br>
            <strong>« Crée une étiquette MICRO BRUITAGE ATELIER SPARE »</strong>
          </p>
          <div class="voiceControls">
            <button type="button" data-mic class="voiceMicButton ${isListening ? 'listening' : ''}">
              <span class="micIcon">🎙</span>
              <span data-mic-label>${isListening ? 'Écoute en cours… Touchez pour arrêter' : 'Toucher pour parler'}</span>
            </button>
          </div>
          <p data-live-transcript class="liveTranscript hint" role="status">
            ${isListening ? 'Parlez distinctement en français…' : 'Ou saisissez directement le texte ci-dessous.'}
          </p>
        </div>

        <div class="voiceLabelEditor">
          <div class="voiceInputArea">
            <label>
              Texte de l’étiquette (une ligne par ligne affichée) :
              <textarea data-text-input rows="4" placeholder="MICRO BRUITAGE&#10;ATELIER&#10;SPARE">${currentLabel.lines.join('\n')}</textarea>
            </label>
            <div class="voiceOptionsGrid">
              <label class="check">
                <input type="checkbox" data-spare-toggle ${currentLabel.isSpare ? 'checked' : ''}>
                <span>Mention SPARE (matériel de secours)</span>
              </label>
              <label>
                Type d’élément :
                <select data-entity-type>
                  <option value="label" ${currentLabel.entityType === 'label' ? 'selected' : ''}>Étiquette libre</option>
                  <option value="Caisse" ${currentLabel.entityType === 'Caisse' ? 'selected' : ''}>Caisse</option>
                  <option value="Boîte" ${currentLabel.entityType === 'Boîte' ? 'selected' : ''}>Boîte</option>
                  <option value="Pochette" ${currentLabel.entityType === 'Pochette' ? 'selected' : ''}>Pochette</option>
                  <option value="Trousse" ${currentLabel.entityType === 'Trousse' ? 'selected' : ''}>Trousse</option>
                  <option value="Valise" ${currentLabel.entityType === 'Valise' ? 'selected' : ''}>Valise</option>
                  <option value="Objet" ${currentLabel.entityType === 'Objet' ? 'selected' : ''}>Objet</option>
                </select>
              </label>
              <label>
                Conteneur parent :
                <select data-parent-case>
                  <option value="">Aucun (racine)</option>
                  ${allCases.map(c => `<option value="${c.id}" ${c.id === currentLabel.parentCaseId ? 'selected' : ''}>${esc(c.name || 'Contenant')}</option>`).join('')}
                </select>
              </label>
            </div>
          </div>

          <div class="voicePreviewArea">
            <div data-label-preview-content></div>
          </div>
        </div>

        <div class="voiceActionsRow">
          <button type="button" data-print class="printAction">
            🖨 IMPRIMER
          </button>
          <button type="button" data-modify class="ghost">
            ✏ MODIFIER
          </button>
          <button type="button" data-save-label class="ghost">
            💾 ENREGISTRER
          </button>
          <button type="button" data-close class="ghost">
            Fermer
          </button>
        </div>

        <div class="voiceRecentsSection">
          <details>
            <summary>Réimpression d’étiquettes récentes</summary>
            <div data-recents-list class="recentsList"></div>
          </details>
        </div>
      </div>
    `

    renderPreview()
    renderRecents()
    bindEvents()
  }

  function renderRecents() {
    const list = dialog.querySelector('[data-recents-list]')
    if (!list) return
    const recents = getSavedLabels()
    if (!recents.length) {
      list.innerHTML = '<small class="hint">Aucune étiquette récemment enregistrée.</small>'
      return
    }
    list.innerHTML = recents.map(r => `
      <div class="recentLabelItem">
        <div>
          <strong>${esc(r.lines?.[0] || 'ÉTIQUETTE')}</strong>
          <small>${esc((r.lines || []).slice(1).join(' · '))} · ${esc(shortId(r.id))}</small>
        </div>
        <button type="button" class="ghost" data-load-recent="${esc(r.id)}">Charger</button>
      </div>
    `).join('')

    list.querySelectorAll('[data-load-recent]').forEach(btn => {
      btn.onclick = () => {
        const found = recents.find(r => r.id === btn.dataset.loadRecent)
        if (found) {
          currentLabel = { ...found }
          renderDialog()
          updateQr()
        }
      }
    })
  }

  function bindEvents() {
    dialog.querySelectorAll('[data-close]').forEach(btn => {
      btn.onclick = () => {
        stopSpeech()
        dialog.close()
        dialog.remove()
      }
    })

    const micBtn = dialog.querySelector('[data-mic]')
    if (micBtn) {
      micBtn.onclick = () => {
        if (isListening) stopSpeech()
        else startSpeech()
      }
    }

    const textInput = dialog.querySelector('[data-text-input]')
    if (textInput) {
      textInput.oninput = () => {
        const text = textInput.value
        currentLabel.lines = text.split('\n').map(l => l.trim()).filter(Boolean)
        currentLabel.isSpare = /\bspare\b/i.test(text)
        const spareToggle = dialog.querySelector('[data-spare-toggle]')
        if (spareToggle) spareToggle.checked = currentLabel.isSpare
        renderPreview()
      }
    }

    const spareToggle = dialog.querySelector('[data-spare-toggle]')
    if (spareToggle) {
      spareToggle.onchange = () => {
        currentLabel.isSpare = spareToggle.checked
        renderPreview()
      }
    }

    const entityTypeSelect = dialog.querySelector('[data-entity-type]')
    if (entityTypeSelect) {
      entityTypeSelect.onchange = () => {
        currentLabel.entityType = entityTypeSelect.value
      }
    }

    const parentCaseSelect = dialog.querySelector('[data-parent-case]')
    if (parentCaseSelect) {
      parentCaseSelect.onchange = () => {
        currentLabel.parentCaseId = parentCaseSelect.value
      }
    }

    const formatSelect = dialog.querySelector('[data-format-select]')
    if (formatSelect) {
      formatSelect.onchange = () => {
        currentLabel.format = formatSelect.value
        renderPreview()
      }
    }

    const printBtn = dialog.querySelector('[data-print]')
    if (printBtn) {
      printBtn.onclick = () => {
        saveLabelRecord(currentLabel)
        if (typeof onPrint === 'function') {
          onPrint(currentLabel)
        } else {
          window.print()
        }
      }
    }

    const saveBtn = dialog.querySelector('[data-save-label]')
    if (saveBtn) {
      saveBtn.onclick = async () => {
        const typeSelect = dialog.querySelector('[data-entity-type]')
        if (typeSelect) currentLabel.entityType = typeSelect.value
        const parentSelect = dialog.querySelector('[data-parent-case]')
        if (parentSelect) currentLabel.parentCaseId = parentSelect.value

        saveLabelRecord(currentLabel)
        renderRecents()

        let createdEntity = null
        if (db) {
          if (['Caisse', 'Boîte', 'Pochette', 'Trousse', 'Valise', 'Bac', 'Contenant'].includes(currentLabel.entityType)) {
            const caseRecord = {
              id: `case-${crypto.randomUUID()}`,
              name: currentLabel.lines[0] || 'Contenant',
              type: currentLabel.entityType,
              parentId: currentLabel.parentCaseId || null,
              spare: currentLabel.isSpare,
              source: 'voix',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
            await db.put('cases', caseRecord)
            createdEntity = { kind: 'case', data: caseRecord }
          } else if (currentLabel.entityType === 'Objet') {
            const objRecord = {
              id: `obj-${crypto.randomUUID()}`,
              name: currentLabel.lines[0] || 'Objet',
              nickname: currentLabel.lines.length > 1 ? currentLabel.lines[1] : '',
              aliases: currentLabel.lines.length > 1 ? [currentLabel.lines[1]] : [],
              spare: currentLabel.isSpare,
              caseId: currentLabel.parentCaseId || '',
              container_id: currentLabel.parentCaseId || '',
              quantity: 1,
              state: 'Bon état',
              sounds: [currentLabel.lines[0] || 'Objet'],
              owned: true,
              provenance: 'user-document',
              source: 'voix',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
            await db.put('objects', objRecord)
            createdEntity = { kind: 'object', data: objRecord }
          }
        }

        if (typeof onSave === 'function') await onSave(currentLabel, createdEntity)
        const status = dialog.querySelector('[data-live-transcript]')
        if (status) status.textContent = 'Enregistré dans l’inventaire et prêt pour réimpression.'
      }
    }

    const modifyBtn = dialog.querySelector('[data-modify]')
    if (modifyBtn) {
      modifyBtn.onclick = () => {
        const textInput = dialog.querySelector('[data-text-input]')
        if (textInput) {
          textInput.focus()
          textInput.select()
        }
      }
    }
  }

  function startSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      const status = dialog.querySelector('[data-live-transcript]')
      if (status) status.textContent = 'Reconnaissance vocale non disponible sur cet appareil. Utilisez la saisie manuelle.'
      return
    }

    try {
      recognition = new SpeechRecognition()
      recognition.lang = 'fr-FR'
      recognition.continuous = false
      recognition.interimResults = true

      isListening = true
      updateMicUI()

      recognition.onresult = (event) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        const status = dialog.querySelector('[data-live-transcript]')
        if (status) status.textContent = `« ${transcript} »`

        if (event.results[0].isFinal) {
          const parsed = parseVoiceLabelCommand(transcript, allCases)
          currentLabel.lines = parsed.lines
          currentLabel.isSpare = parsed.isSpare
          currentLabel.entityType = parsed.entityType
          currentLabel.parentCaseId = parsed.parentCaseId
          const textarea = dialog.querySelector('[data-text-input]')
          if (textarea) textarea.value = parsed.lines.join('\n')
          const spareToggle = dialog.querySelector('[data-spare-toggle]')
          if (spareToggle) spareToggle.checked = parsed.isSpare
          const typeSelect = dialog.querySelector('[data-entity-type]')
          if (typeSelect) typeSelect.value = parsed.entityType
          const parentSelect = dialog.querySelector('[data-parent-case]')
          if (parentSelect) parentSelect.value = parsed.parentCaseId
          renderPreview()
        }
      }

      recognition.onerror = (err) => {
        console.warn('Speech error:', err)
        stopSpeech()
        const status = dialog.querySelector('[data-live-transcript]')
        if (status) status.textContent = 'Écoute interrompue. Vous pouvez saisir le texte au clavier.'
      }

      recognition.onend = () => {
        stopSpeech()
      }

      recognition.start()
    } catch (e) {
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
    const micBtn = dialog.querySelector('[data-mic]')
    const micLabel = dialog.querySelector('[data-mic-label]')
    if (micBtn) micBtn.classList.toggle('listening', isListening)
    if (micLabel) micLabel.textContent = isListening ? 'Écoute en cours… Touchez pour arrêter' : 'Toucher pour parler'
  }

  dialog.showModal()
  renderDialog()
  updateQr()

  return dialog
}
