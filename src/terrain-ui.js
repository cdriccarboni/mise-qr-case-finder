export function answerBlock(answer, esc) {
  if (!answer) return ''
  const owned = (answer.owned || []).map(item => `<article class="ownedCard"><b>${esc(item.title)}</b><span>${esc(item.location || '')}</span><p>${esc(item.detail || '')}</p><small>Possédé · dans ta base</small></article>`).join('')
  const suggested = (answer.suggested || []).map(item => `<article class="suggestCard"><b>${esc(item.title)}</b><p>${esc(item.detail || '')}</p><small>${esc(item.source || 'Suggestion · pas dans ta base')}</small></article>`).join('')
  const uncertain = (answer.uncertain || []).map(item => `<p class="uncertain">${esc(item)}</p>`).join('')
  const action = answer.action === 'scan-exercise' ? `<button type="button" id="doScanExercise">Photographier et proposer l’exercice</button>` : ''
  return `<section class="assistant" data-assistant><p>${esc(answer.lead || '')}</p>${owned ? `<h3>Dans ta base</h3>${owned}` : ''}${suggested ? `<h3>Autres possibilités, pas dans ta base</h3>${suggested}` : ''}${uncertain ? `<h3>Incertain</h3>${uncertain}` : ''}${action}</section>`
}
export function vibeBlock(result, esc) {
  if (!result) return ''
  const proposals = (result.proposals || []).map(item => `<article class="challenge"><strong>${esc(item.id)} · ${esc(item.title)}</strong><p>${esc(item.rhythm || '')}</p>${item.lines.length ? item.lines.map(line => `<p class="ownedCard"><b>${esc(line.label)}</b><br>${line.hear ? `Entendre (fiche) : ${esc(line.hear)}<br>` : ''}${line.imagine ? `Imaginer (fiche) : ${esc(line.imagine)}<br>` : ''}<span>${esc(line.gestureLabel)} : ${esc(line.gesture)}</span></p><button type="button" data-vibe-useful="1" data-object="${esc(line.objectId)}" data-universe="${esc(result.universe?.id || '')}">Utile</button><button type="button" class="ghost" data-vibe-useful="0" data-object="${esc(line.objectId)}" data-universe="${esc(result.universe?.id || '')}">Pas pertinent</button>`).join('') : '<p class="uncertain">Pas d’objet possédé pour cette piste.</p>'}</article>`).join('')
  const extra = (result.ifYouHave || []).map(item => `<article class="suggestCard"><b>${esc(item.title)}</b><p>${esc(item.detail || '')}</p><small>${esc(item.source || 'Suggestion')}</small></article>`).join('')
  const uncertain = (result.uncertain || []).map(item => `<p class="uncertain">${esc(item)}</p>`).join('')
  return `<p class="hint">Moteur local « ${esc(result.engine || '')} ». Hors ligne. ${result.universe ? `Univers : ${esc(result.universe.title)}.` : ''} Les gestes sont des suggestions. Seules les lignes « possédé » citent ta base.</p>${proposals}${extra ? `<h3>Autres possibilités si tu disposes de…</h3>${extra}` : ''}${uncertain}`
}
export function exerciseBlock(pack, esc) {
  const items = (pack.exercises || []).map(item => `<article class="challenge"><strong>${esc(item.title)}</strong><small>${esc(item.duration)} · ${esc(item.participants)} pers. · ${esc(item.level)}</small><p>${item.steps.map(esc).join(' ')}</p><small>${esc(item.disclaimer)}</small></article>`).join('')
  const uncertain = (pack.uncertain || []).map(item => `<p class="uncertain">${esc(item)}</p>`).join('')
  return `${items}${uncertain}<p class="hint">${esc(pack.disclaimer || 'Proposition générée. Ce n’est pas une fiche de ta base.')}</p>`
}
