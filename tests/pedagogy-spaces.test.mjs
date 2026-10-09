import test from 'node:test'
import assert from 'node:assert/strict'
import { PEDAGOGY_SPACES, renderPedagogySpacesHtml } from '../src/pedagogy-spaces.js'

test('pedagogy spaces contains the 4 requested sections: Atelier, Jeux, Pédagogie, Voix', () => {
  assert.ok(PEDAGOGY_SPACES.atelier, 'Section Atelier présente')
  assert.ok(PEDAGOGY_SPACES.jeux, 'Section Jeux présente')
  assert.ok(PEDAGOGY_SPACES.pedagogie, 'Section Pédagogie présente')
  assert.ok(PEDAGOGY_SPACES.voix, 'Section Voix présente')
})

test('Jeux section covers the 10 pedagogical sound games (A to J)', () => {
  const games = PEDAGOGY_SPACES.jeux.games
  assert.equal(games.length, 10, 'Doit contenir exactement 10 jeux sonores')
  const codes = games.map(g => g.code)
  assert.deepEqual(codes, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'])
  for (const g of games) {
    assert.ok(g.title, `Titre présent pour le jeu ${g.code}`)
    assert.ok(g.description, `Description présente pour le jeu ${g.code}`)
    assert.equal(g.rubrique, 'Jeux')
    assert.ok(g.provenance.includes('CD-ROM'), `Provenance documentée pour ${g.code}`)
    assert.equal(g.status, 'intégré')
  }
})

test('Atelier section covers stage knots and rigging practices', () => {
  const acts = PEDAGOGY_SPACES.atelier.activities
  assert.ok(acts.length >= 5)
  const knotCabestan = acts.find(a => a.id.includes('cabestan'))
  assert.ok(knotCabestan, 'Nœud de cabestan présent')
  assert.ok(knotCabestan.steps.length >= 4)
  assert.ok(knotCabestan.targetEquipment.includes('Pied de micro'))
})

test('renderPedagogySpacesHtml renders valid html with navigation tabs', () => {
  const htmlAtelier = renderPedagogySpacesHtml('atelier', s => s)
  assert.match(htmlAtelier, /Atelier sonore & technique/)
  assert.match(htmlAtelier, /data-ped-tab="atelier"/)
  assert.match(htmlAtelier, /data-ped-tab="jeux"/)
  assert.match(htmlAtelier, /Nœud de cabestan/)

  const htmlJeux = renderPedagogySpacesHtml('jeux', s => s)
  assert.match(htmlJeux, /Jeux sonores & écoute/)
  assert.match(htmlJeux, /Jeu A · Fais ce son/)
  assert.match(htmlJeux, /Jeu J · Scène sonore collective/)
  assert.match(htmlJeux, /data-launch-game="A"/)

  const htmlVoix = renderPedagogySpacesHtml('voix', s => s)
  assert.match(htmlVoix, /Voix & écoute vocale/)
  assert.match(htmlVoix, /Création vocale d’étiquettes/)
})
