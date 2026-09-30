/** UI jeux / atelier / défi — tactile, identité MISES!, pas enfantine. */

function participantPlanHtml(plan, esc) {
  if (!(plan || []).length) return ''
  const rows = plan.map(item => `<li><b>${esc(item.label)}</b> · ${esc(item.object || 'matériel disponible')} — ${esc(item.cue || 'geste sonore')}${item.variation ? ` · ${esc(item.variation)}` : ''}</li>`).join('')
  return `<details class="participantPlan" open><summary>Répartition · ${plan.length} participant${plan.length > 1 ? '·es' : '·e'}</summary><ol>${rows}</ol></details>`
}

export function playHubHtml(summary, caseName, esc, participants = 1) {
  const foley = summary.foleyCount || 0
  const games = summary.gameTypeCount || 0
  const objects = summary.objectCount || 0
  return `<div class="playHub">
    <div class="dialoghead"><div><b>Jouer avec ${esc(caseName || 'cet inventaire')}</b>
    <small>Chiffres calculés depuis le matériel disponible</small></div>
    <button type="button" class="ghost" data-play-close>×</button></div>
    <p class="playStats"><b>${foley}</b> bruitage${foley > 1 ? 's' : ''} · <b>${games}</b> type${games > 1 ? 's' : ''} de jeu · <b>${objects}</b> objet${objects > 1 ? 's' : ''}</p>
    <label>Participant·es<input id="playPeople" type="number" min="1" max="99" inputmode="numeric" value="${Math.max(1, Number(participants) || 1)}"></label>
    <p class="hint">MISES! répartit un rôle sonore par personne, même si plusieurs personnes partagent le même objet.</p>
    <div class="playCtas">
      <button type="button" data-play-action="challenge">Défi</button>
      <button type="button" data-play-action="workshop">Atelier</button>
      <button type="button" data-play-action="universe">Univers</button>
      <button type="button" data-play-action="random-universe">Univers aléatoire</button>
      <button type="button" data-play-action="public">Jeux publics</button>
      <button type="button" data-play-action="surprise" class="ghost">Surprise</button>
    </div>
    <p class="hint">Aucun objet absent ou indisponible n’entre dans ces propositions.</p>
  </div>`
}

export function challengeHtml(challenge, esc, { reveal = false, hintIndex = 0 } = {}) {
  if (!challenge) return `<div class="empty"><b>Pas de défi</b><span>Filtre trop étroit ou inventaire vide.</span></div>`
  const hints = challenge.hints || []
  const shown = hints.slice(0, hintIndex)
  const sol = challenge.solution
  return `<div class="playChallenge">
    <div class="dialoghead"><div><b>${esc(challenge.title)}</b><small>Type ${esc(challenge.gameType)} · inventaire réel</small></div>
    <button type="button" class="ghost" data-play-close>×</button></div>
    <div class="challenge"><strong>${esc(challenge.prompt)}</strong>
      <p>${esc(challenge.instruction || '')}</p>
      ${challenge.timerSec ? `<p><b>Timer optionnel :</b> ${challenge.timerSec} s</p>` : ''}
      ${challenge.choices?.length ? `<ul class="playChoices">${challenge.choices.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      ${challenge.cards?.length && challenge.gameType === 'F' ? `<ul class="playChoices">${challenge.cards.map(c => `<li>${esc(c.name)}${c.layer === 'game-data' ? ' · ?' : ''}</li>`).join('')}</ul>` : ''}
    </div>
    ${participantPlanHtml(challenge.participantPlan, esc)}
    ${shown.length ? `<div class="playHints"><b>Indices</b>${shown.map(h => `<p>${esc(h)}</p>`).join('')}</div>` : ''}
    ${reveal && sol ? `<div class="playSolution"><b>Solution</b>
      <p>Objets : ${esc((sol.objects || []).map(o => o.name).join(', ') || '—')}</p>
      <p>Geste : ${esc(sol.gesture || '')}</p>
      ${(sol.tips || []).map(t => `<p>${esc(t)}</p>`).join('')}
      <small>Source : ${esc(sol.source || '')}</small>
    </div>` : ''}
    <div class="row playActions">
      <button type="button" data-chal="hint" class="ghost">Indice</button>
      <button type="button" data-chal="solution" class="ghost">Voir solution</button>
      <button type="button" data-chal="validate">Validé</button>
      <button type="button" data-chal="next" class="ghost">Autre défi</button>
      <button type="button" data-chal="free" class="ghost">Variante libre</button>
    </div>
  </div>`
}

export function workshopSetupHtml(caseName, esc, participants = 1) {
  return `<div class="playWorkshopSetup">
    <div class="dialoghead"><div><b>Préparer un atelier</b><small>${esc(caseName || 'Inventaire filtré')}</small></div>
    <button type="button" class="ghost" data-play-close>×</button></div>
    <label>Durée<select id="wsDuration"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">60 min</option></select></label>
    <label>Univers (facultatif)<input id="wsUniverse" placeholder="forêt, port, cuisine…"></label>
    <label>Participant·es<input id="wsGroup" type="number" min="1" max="99" inputmode="numeric" value="${Math.max(1, Number(participants) || 1)}"></label>
    <div class="row"><button type="button" data-ws="build">Générer le programme</button></div>
  </div>`
}

export function workshopProgramHtml(workshop, esc) {
  if (!workshop) return `<div class="empty"><b>Atelier impossible</b><span>Pas assez d’objets disponibles.</span></div>`
  const rows = (workshop.activities || []).map((a, i) => `<article class="challenge" data-ws-step="${i}">
    <strong>${i + 1}. ${esc(a.title)}</strong>
    <small>${a.minutes} min · ${esc(a.gameType)} · ${(a.objectsUseful || []).map(esc).join(', ') || '—'}</small>
    <p>${esc(a.prompt)}</p>
    ${participantPlanHtml(a.participantPlan || a.challenge?.participantPlan, esc)}
  </article>`).join('')
  return `<div class="playWorkshop">
    <div class="dialoghead"><div><b>Programme · ${workshop.duration} min</b>
    <small>Total activités ${workshop.totalMinutes} min · ${workshop.summary?.objectCount || 0} objets · ${workshop.groupSize || 1} participant·es</small></div>
    <button type="button" class="ghost" data-play-close>×</button></div>
    ${rows}
    <div class="row playCtas">
      <button type="button" data-ws="launch">Lancer</button>
      <button type="button" data-ws="regen" class="ghost">Régénérer</button>
    </div>
  </div>`
}

export function workshopConductorHtml(workshop, index, esc) {
  const steps = workshop?.activities || []
  const step = steps[index]
  if (!step) return `<div class="empty"><b>Fin de séance</b><span>Atelier terminé.</span></div>`
  const next = steps[index + 1]
  return `<div class="playConductor">
    <div class="dialoghead"><div><b>Conducteur · ${esc(step.title)}</b>
    <small>Étape ${index + 1}/${steps.length} · ${step.minutes} min</small></div>
    <button type="button" class="ghost" data-play-close>×</button></div>
    <div class="challenge">
      <strong>${esc(step.conductor?.activity || step.title)}</strong>
      <p>${esc(step.conductor?.consigne || step.instruction || step.prompt)}</p>
      <p><b>Objets utiles :</b> ${esc((step.conductor?.objects || step.objectsUseful || []).join(', ') || '—')}</p>
      <p><b>Durée :</b> ${step.minutes} min</p>
      ${participantPlanHtml(step.participantPlan || step.conductor?.participantPlan || step.challenge?.participantPlan, esc)}
      ${next ? `<p class="hint">Ensuite : ${esc(next.title)}</p>` : '<p class="hint">Dernière activité.</p>'}
    </div>
    <div class="row">
      <button type="button" data-ws-nav="prev" class="ghost" ${index === 0 ? 'disabled' : ''}>Précédente</button>
      <button type="button" data-ws-nav="next">${next ? 'Suivante' : 'Terminer'}</button>
    </div>
  </div>`
}
