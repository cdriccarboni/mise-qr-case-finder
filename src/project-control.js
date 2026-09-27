// Project context never scopes or copies the global Data Bruitage catalogue.
// ART only passes a link. No company record is hardcoded here.
const ID_RE = /^[A-Za-z0-9_-]+$/
const CONTROL_RE = /[\u0000-\u001F\u007F]/g

export function cleanToken(raw, max) {
  const value = String(raw || '').trim()
  if (!value || value.length > max || !ID_RE.test(value)) return ''
  return value
}

export function cleanProjectName(raw) {
  return String(raw || '').replace(CONTROL_RE, '').trim().slice(0, 120)
}

export function sanitizeReturnUrl(raw, href) {
  const value = String(raw || '').trim()
  if (!value || value.length > 2048) return ''
  try {
    const url = new URL(value, href)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    if (url.username || url.password) return ''
    return url.href
  } catch {
    return ''
  }
}

export function readProjectContext(search, href) {
  const params = new URLSearchParams(search)
  const returnRaw = params.get('returnUrl') || params.get('return') || ''
  return {
    projectId: cleanToken(params.get('projectId'), 80),
    projectName: cleanProjectName(params.get('projectName')),
    projectType: cleanToken(params.get('projectType'), 40),
    companyId: cleanToken(params.get('companyId'), 80),
    source: cleanToken(params.get('source'), 40),
    returnUrl: sanitizeReturnUrl(returnRaw, href)
  }
}

export function planProjectOpen(mises, project) {
  if (!project?.projectId) return { action: 'none' }
  const list = Array.isArray(mises) ? mises : []
  const byRecent = (a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
  const linked = list.filter(m => m?.projectId === project.projectId).sort(byRecent)
  if (linked.length) return { action: 'open', mise: linked[0] }
  const unlinked = list.filter(m => m && !m.projectId).sort(byRecent)
  if (unlinked.length) return { action: 'attach', candidates: unlinked }
  return { action: 'create', name: project.projectName || 'Mise' }
}

export function makeArtLinkExport({ projectId, projectName, objectCount, caseCount, updatedAt } = {}) {
  return {
    version: 1,
    kind: 'mises-art-summary',
    projectId: projectId || null,
    projectName: projectName || '',
    objectCount: Number.isFinite(objectCount) && objectCount >= 0 ? objectCount : 0,
    caseCount: Number.isFinite(caseCount) && caseCount >= 0 ? caseCount : 0,
    updatedAt: updatedAt || null
  }
}

export function normalizeDetectedObjects(payload) {
  const items = Array.isArray(payload) ? payload : payload?.detectedObjects ?? payload?.objects ?? payload?.detections
  if (!Array.isArray(items)) throw new Error('Réponse d’analyse non exploitable')
  return items.map(item => {
    const label = typeof item === 'string' ? item : item?.label ?? item?.name ?? item?.class
    if (typeof label !== 'string' || !label.trim()) throw new Error('Proposition sans nom exploitable')
    const category = typeof item === 'object' && typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'autre'
    const quantityRaw = typeof item === 'object' ? item.quantity : 1
    const quantity = Number.isSafeInteger(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1
    const confidence = typeof item === 'object' ? item.confidence ?? item.score : undefined
    return {
      label: label.trim(),
      category,
      quantity,
      ...(typeof confidence === 'number' && Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? { confidence } : {}),
      validated: false
    }
  })
}

export async function requestPhotoAnalysis(file, signal) {
  const body = new FormData()
  body.append('file', file, file.name)
  const response = await fetch('/api/staging-analyse', { method: 'POST', body, signal })
  if (!response.ok) throw new Error(`Service d’analyse indisponible (HTTP ${response.status})`)
  return normalizeDetectedObjects(await response.json())
}

export function makeControlSummary(mise, objects, details = {}, now = new Date().toISOString()) {
  const ids = [...new Set(mise.objectIds || [])]
  const checked = [...new Set(mise.checked || [])].filter(id => ids.includes(id))
  return {
    version: 1,
    method: details.method || 'manual',
    analysisStatus: details.analysisStatus || 'not-requested',
    analysisError: details.analysisError || null,
    analysedAt: details.analysedAt || null,
    controlledAt: now,
    projectId: mise.projectId || null,
    projectName: mise.projectName || '',
    projectType: mise.projectType || '',
    ...(mise.companyId ? { companyId: mise.companyId } : {}),
    miseId: mise.id,
    miseName: mise.name,
    objectCount: ids.length,
    checkedCount: checked.length,
    expectedObjects: ids.map(id => ({ id, name: objects.find(o => o.id === id)?.name || id })),
    checkedObjectIds: checked,
    detectedObjects: (details.detectedObjects || []).map(o => ({ ...o })),
    file: details.file || null,
    humanValidated: true
  }
}

export function makeProjectSummary(mise) {
  const ids = [...new Set(mise.objectIds || [])]
  return {
    version: 1,
    projectId: mise.projectId,
    projectName: mise.projectName || '',
    projectType: mise.projectType || '',
    ...(mise.companyId ? { companyId: mise.companyId } : {}),
    miseId: mise.id,
    miseName: mise.name,
    objectCount: ids.length,
    checkedCount: [...new Set(mise.checked || [])].filter(id => ids.includes(id)).length,
    detectedObjects: (mise.latestControl?.detectedObjects || [])
      .filter(item => item?.validated)
      .map(item => ({
        label: item.label,
        category: item.category || 'autre',
        quantity: Number.isSafeInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1,
        ...(typeof item.confidence === 'number' ? { confidence: item.confidence } : {})
      })),
    controlledAt: mise.controlledAt || null,
    updatedAt: mise.updatedAt
  }
}
