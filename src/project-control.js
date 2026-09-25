// Project context never scopes or copies the global Data Bruitage catalogue.
export function readProjectContext(search, href) {
  const params = new URLSearchParams(search)
  let returnUrl = ''
  try {
    const url = new URL(params.get('return') || '', href)
    const current = new URL(href)
    if (params.get('return') && ['http:', 'https:'].includes(url.protocol) && url.origin === current.origin && !url.username && !url.password) returnUrl = url.href
  } catch { /* An invalid return address must not block field work. */ }
  return {
    projectId: (params.get('projectId') || '').trim(),
    projectName: (params.get('projectName') || '').trim(),
    projectType: (params.get('projectType') || '').trim(),
    companyId: (params.get('companyId') || '').trim(),
    returnUrl
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
