function participantPlanHtml(plan, esc) {
  if (!(plan || []).length) return ''
  return `<details class="participantPlan" open><summary>Répartition · ${plan.length} participant${plan.length > 1 ? '·es' : '·e'}</summary><ol>${plan.map(item => `<li><b>${esc(item.label)}</b> · ${esc(item.object || 'matériel disponible')} — ${esc(item.cue || 'geste sonore')}${item.variation ? ` · ${esc(item.variation)}` : ''}</li>`).join('')}</ol></details>`
}

export function publicHubHtml(library, esc, participants = 1) {
  const records=(library.records||[]).length, fabs=(library.fabrications||[]).length, games=(library.games||[]).length, acts=(library.pedagogyActivities||[]).length
  return `<div class="publicHub">
    <div class="sectionhead"><div><h2>Bibliothèque publique</h2><p class="hint">Recettes Internet sourcées, séparées de ta base privée.</p></div></div>
    <div class="publicStats"><span><b>${records}</b> recettes</span><span><b>${fabs}</b> fabrications</span><span><b>${games}</b> jeux</span><span><b>${acts}</b> activités</span></div>
    <label>Participant·es<input id="publicPeople" type="number" min="1" max="99" inputmode="numeric" value="${Math.max(1, Number(participants) || 1)}"></label>
    <p class="hint">Les jeux et ateliers publics répartissent un rôle sonore par personne.</p>
    <div class="publicActions">
      <button id="publicRandomGame" type="button">Jeu surprise</button>
      <button id="publicRandomUniverse" type="button">Univers aléatoire</button>
      <button id="publicBuildWorkshop" type="button">Atelier public</button>
    </div>
  </div>`
}

export function fabricationsHtml(library, esc) {
  const rows=(library.fabrications||[]).map(f=>`<article class="card publicCard">
    <b>${esc(f.name)}</b>
    <span>${esc(f.use||'Usage à tester')}</span>
    <small>${esc((f.materials||[]).join(' · '))}</small>
    <details><summary>Fabrication</summary><p>${esc(f.assembly||'')}</p><p class="hint">${esc(f.level||'')} · ${esc(f.status||'')}</p><a href="${esc(f.sourceUrl||'#')}" target="_blank" rel="noopener noreferrer">Source ↗</a></details>
    <button type="button" data-public-fab="${esc(f.id)}">Jouer avec</button>
  </article>`).join('')
  return `<div class="sectionhead"><div><h2>Fabrications</h2><p class="hint">Dispositifs simples documentés sur le Web. Rien n’est marqué “possédé” automatiquement.</p></div></div><div class="cards">${rows||'<div class="empty">Aucune fabrication publique.</div>'}</div>`
}

export function activitiesHtml(library, esc) {
  const rows=(library.pedagogyActivities||[]).map(a=>`<article class="card publicCard">
    <b>${esc(a.title)}</b><span>${esc(a.goal||'')}</span><small>${a.durationMin||0} min · ${(a.gameIds||[]).map(esc).join(' · ')}</small>
    <button type="button" data-public-activity="${esc(a.id)}">Lancer</button>
  </article>`).join('')
  return `<div class="sectionhead"><div><h2>Activités pédagogiques</h2><p class="hint">Générées avec la bibliothèque publique et, quand c’est possible, ton matériel réel.</p></div></div><div class="cards">${rows||'<div class="empty">Aucune activité publique.</div>'}</div>`
}

export function publicGameHtml(game, esc, {reveal=false}={}) {
  if(!game)return '<div class="empty"><b>Jeu indisponible</b></div>'
  const source=(game.publicRecords||[])[0]?.sourceUrl||game.sourceUrl||game.solution?.source||''
  return `<div class="playChallenge publicGame">
    <div class="dialoghead"><div><b>${esc(game.title)}</b><small>Bibliothèque publique · ${esc(game.gameType||'jeu')}</small></div><button type="button" class="ghost" data-play-close>×</button></div>
    <div class="challenge"><strong>${esc(game.prompt||'')}</strong><p>${esc(game.instruction||'')}</p></div>
    ${participantPlanHtml(game.participantPlan, esc)}
    ${(game.hints||[]).length?`<div class="playHints"><b>Pistes</b>${game.hints.slice(0,4).map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}
    ${reveal&&game.solution?`<div class="playSolution"><b>Solution</b><p>Objets / matières : ${esc((game.solution.objects||[]).map(x=>x.name).join(', ')||'—')}</p><p>Geste : ${esc(game.solution.gesture||'')}</p>${(game.solution.tips||[]).map(x=>`<p>${esc(x)}</p>`).join('')}${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">Voir la source ↗</a>`:''}</div>`:''}
    <div class="row"><button type="button" data-public-game="solution" class="ghost">Voir solution</button><button type="button" data-public-game="again">Autre</button></div>
  </div>`
}

export function publicWorkshopHtml(program, esc) {
  const rows=(program?.activities||[]).map((a,i)=>`<article class="challenge"><strong>${i+1}. ${esc(a.title)}</strong><small>${a.durationMin} min</small><p>${esc(a.goal||'')}</p><p>${esc(a.game?.prompt||'')}</p>${participantPlanHtml(a.game?.participantPlan, esc)}</article>`).join('')
  return `<div class="playWorkshop"><div class="dialoghead"><div><b>Atelier public</b><small>${program?.totalMinutes||0} min · ${program?.participants||1} participant·es · recettes sourcées</small></div><button type="button" class="ghost" data-play-close>×</button></div>${rows||'<div class="empty">Programme indisponible.</div>'}</div>`
}
