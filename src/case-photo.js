import QRCode from 'qrcode'
import { entityUrl, shortId } from './qr-link.js'
import { CONTAINER_TYPES, caseDisplayName } from './containers.js'
import { escapeHtml as esc } from './data-ui.js'

/**
 * Analyse la couleur dominante d'une image pour suggérer un nom pertinent (ex: CAISSE ROSE)
 */
export function detectCaseColorName(canvas) {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const w = canvas.width
    const h = canvas.height
    // Échantillonner la zone centrale (40% de la largeur et hauteur)
    const startX = Math.floor(w * 0.3)
    const startY = Math.floor(h * 0.3)
    const sampleW = Math.max(10, Math.floor(w * 0.4))
    const sampleH = Math.max(10, Math.floor(h * 0.4))

    const data = ctx.getImageData(startX, startY, sampleW, sampleH).data
    let totalR = 0, totalG = 0, totalB = 0, count = 0

    // Pas de 4 pixels pour la vitesse
    for (let i = 0; i < data.length; i += 16) {
      totalR += data[i]
      totalG += data[i + 1]
      totalB += data[i + 2]
      count++
    }

    if (!count) return 'CAISSE'

    const r = totalR / count
    const g = totalG / count
    const b = totalB / count

    // Conversion RGB -> HSL
    const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255
    const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm)
    let hHue = 0, sSat = 0, lLight = (max + min) / 2

    if (max !== min) {
      const d = max - min
      sSat = lLight > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case rNorm: hHue = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break
        case gNorm: hHue = (bNorm - rNorm) / d + 2; break
        case bNorm: hHue = (rNorm - gNorm) / d + 4; break
      }
      hHue *= 60
    }

    // Heuristiques de couleur en spectacle vivant
    if (lLight < 0.22) return 'CAISSE NOIRE'
    if (lLight > 0.85) return 'CAISSE BLANCHE'
    if (sSat < 0.15) return 'CAISSE GRISE'

    // Rose / Magenta (teinte autour de 300° - 355° ou rouge clair)
    if (hHue >= 300 && hHue <= 360) return 'CAISSE ROSE'
    if (hHue >= 0 && hHue < 18 && sSat > 0.2 && lLight > 0.45) return 'CAISSE ROSE'
    if (hHue >= 0 && hHue < 18) return 'CAISSE ROUGE'
    if (hHue >= 18 && hHue < 45) return 'CAISSE ORANGE'
    if (hHue >= 45 && hHue < 70) return 'CAISSE JAUNE'
    if (hHue >= 70 && hHue < 165) return 'CAISSE VERTE'
    if (hHue >= 165 && hHue < 260) return 'CAISSE BLEUE'
    if (hHue >= 260 && hHue < 300) return 'CAISSE VIOLETTE'

    return 'CAISSE'
  } catch {
    return 'CAISSE'
  }
}

/**
 * Ouvre le parcours de création d'une caisse à partir d'une photo
 */
export async function openCasePhotoCreator({ file, photoDataUrl, allCases = [], db, onCreated, onAddObjects, onPrintLabel, onShowCase }) {
  const dialog = document.createElement('dialog')
  dialog.className = 'casePhotoDialog'
  document.body.append(dialog)

  // Charger l'image dans un canvas pour analyser la couleur
  const img = new Image()
  await new Promise(resolve => {
    img.onload = resolve
    img.src = photoDataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = Math.min(600, img.width)
  canvas.height = Math.round((canvas.width / img.width) * img.height)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)

  const detectedName = detectCaseColorName(canvas)

  let state = {
    step: 'create', // 'create' | 'created'
    name: detectedName,
    type: 'Caisse',
    parentId: '',
    itemCount: '',
    createdCase: null,
    qrDataUrl: ''
  }

  function render() {
    if (state.step === 'create') {
      dialog.innerHTML = `
        <div class="form casePhotoForm">
          <div class="dialoghead">
            <div>
              <b>Nouvelle caisse détectée</b>
              <small>Création rapide de contenant</small>
            </div>
            <button data-close class="ghost" type="button">×</button>
          </div>

          <div class="casePhotoHero">
            <img class="casePhotoThumb" src="${photoDataUrl}" alt="Photo de la caisse">
          </div>

          <div class="caseDetectedFields">
            <label>
              Nom :
              <input data-case-name value="${esc(state.name)}" placeholder="CAISSE ROSE" autofocus>
            </label>

            <div class="grid2">
              <label>
                Catégorie :
                <select data-case-type>
                  ${CONTAINER_TYPES.map(t => `<option value="${t}" ${t === state.type ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
              </label>

              <label>
                Nombre d’objets :
                <input data-case-count type="number" min="0" placeholder="à renseigner" value="${state.itemCount}">
              </label>
            </div>

            <label>
              Contenant parent (optionnel, pour rangement dans une autre caisse) :
              <select data-case-parent>
                <option value="">Aucun (contenant principal)</option>
                ${allCases.map(c => `<option value="${c.id}" ${c.id === state.parentId ? 'selected' : ''}>${esc(caseDisplayName(c))}</option>`).join('')}
              </select>
            </label>
          </div>

          <div class="row">
            <button data-submit-case class="createAction">
              [CRÉER LA CAISSE]
            </button>
            <button data-close class="ghost" type="button">
              Annuler
            </button>
          </div>
        </div>
      `
    } else {
      // Step 'created'
      const c = state.createdCase
      dialog.innerHTML = `
        <div class="form casePhotoCreated">
          <div class="dialoghead">
            <div>
              <b>Caisse créée avec succès !</b>
              <small>${esc(caseDisplayName(c))}</small>
            </div>
            <button data-close class="ghost" type="button">×</button>
          </div>

          <div class="caseCreatedPreview">
            <img class="caseQrSuccess" src="${state.qrDataUrl}" alt="QR code de ${esc(c.name)}">
            <p>
              <strong>${esc(c.name)}</strong> · ${esc(shortId(c.id))}<br>
              <small class="hint">Identifiant permanent enregistré dans la base.</small>
            </p>
          </div>

          <div class="caseCreatedActions">
            <button data-action="add-objects" class="ctaBig">
              ➕ [AJOUTER DES OBJETS]
            </button>
            <button data-action="print-label" class="ctaBig ghost">
              🖨 [IMPRIMER L’ÉTIQUETTE]
            </button>
            <button data-action="show-qr" class="ctaBig ghost">
              ▣ [VOIR LE QR CODE]
            </button>
          </div>

          <button data-close class="ghost" type="button">Terminer</button>
        </div>
      `
    }

    bindEvents()
  }

  function bindEvents() {
    dialog.querySelectorAll('[data-close]').forEach(btn => {
      btn.onclick = () => {
        dialog.close()
        dialog.remove()
      }
    })

    const nameInput = dialog.querySelector('[data-case-name]')
    if (nameInput) nameInput.oninput = () => { state.name = nameInput.value.trim() }

    const typeSelect = dialog.querySelector('[data-case-type]')
    if (typeSelect) typeSelect.onchange = () => { state.type = typeSelect.value }

    const parentSelect = dialog.querySelector('[data-case-parent]')
    if (parentSelect) parentSelect.onchange = () => { state.parentId = parentSelect.value }

    const countInput = dialog.querySelector('[data-case-count]')
    if (countInput) countInput.oninput = () => { state.itemCount = countInput.value }

    const submitBtn = dialog.querySelector('[data-submit-case]')
    if (submitBtn) {
      submitBtn.onclick = async () => {
        const id = `case-${crypto.randomUUID()}`
        const caseRecord = {
          id,
          name: state.name || 'CAISSE',
          type: state.type || 'Caisse',
          parentId: state.parentId || null,
          photo: photoDataUrl,
          total: state.itemCount ? Number(state.itemCount) : null,
          part: null,
          source: 'photo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        await db.put('cases', caseRecord)
        if (typeof onCreated === 'function') await onCreated(caseRecord)

        const url = entityUrl(location.href, 'case', id)
        const qrDataUrl = await QRCode.toDataURL(url, { width: 440, margin: 2, errorCorrectionLevel: 'M' })

        state.createdCase = caseRecord
        state.qrDataUrl = qrDataUrl
        state.step = 'created'
        render()
      }
    }

    const addObjectsBtn = dialog.querySelector('[data-action="add-objects"]')
    if (addObjectsBtn) {
      addObjectsBtn.onclick = () => {
        dialog.close()
        dialog.remove()
        if (typeof onAddObjects === 'function') onAddObjects(state.createdCase)
      }
    }

    const printLabelBtn = dialog.querySelector('[data-action="print-label"]')
    if (printLabelBtn) {
      printLabelBtn.onclick = () => {
        dialog.close()
        dialog.remove()
        if (typeof onPrintLabel === 'function') onPrintLabel(state.createdCase)
      }
    }

    const showQrBtn = dialog.querySelector('[data-action="show-qr"]')
    if (showQrBtn) {
      showQrBtn.onclick = () => {
        dialog.close()
        dialog.remove()
        if (typeof onShowCase === 'function') onShowCase(state.createdCase.id)
      }
    }
  }

  dialog.showModal()
  render()
  return dialog
}
