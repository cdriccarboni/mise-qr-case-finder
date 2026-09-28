import assert from 'node:assert/strict'
import test from 'node:test'
import { handsChallenges, sightUniverses, generateExercises } from '../src/exercise-engine.js'

test('hands challenges only use visible objects and never invent extras', () => {
  const result = handsChallenges(['Chaîne', 'Verre'])
  assert.ok(result.challenges.length >= 1)
  assert.deepEqual(result.seen, ['Chaîne', 'Verre'])
  for (const challenge of result.challenges) {
    const text = challenge.steps.join(' ')
    assert.match(text, /Chaîne|Verre/)
  }
  assert.deepEqual(handsChallenges([]).uncertain[0], 'Rien de visible à utiliser. Je n’invente pas d’objet.')
})

test('sight universes stay limited to seen objects and shuffle frames', () => {
  const first = sightUniverses(['Bouteille', 'Cuillère'])
  const second = sightUniverses(['Bouteille', 'Cuillère'])
  assert.equal(first.scenarios.length, 4)
  assert.equal(second.scenarios.length, 4)
  for (const scene of [...first.scenarios, ...second.scenarios]) {
    for (const step of scene.steps) {
      assert.match(step, /Bouteille|Cuillère/)
      assert.match(step, /pas un objet de plus/)
    }
  }
  assert.equal(sightUniverses([]).scenarios.length, 0)
})

test('generated exercises keep owned objects distinct from invention', () => {
  const pack = generateExercises({ objects: [{ name: 'Grelot' }, { name: 'Papier' }], durationMin: 1, participants: 2, count: 3 })
  assert.equal(pack.exercises.length, 3)
  assert.deepEqual(pack.seen, ['Grelot', 'Papier'])
  for (const exercise of pack.exercises) {
    for (const used of exercise.objectsUsed) assert.ok(['Grelot', 'Papier'].includes(used))
  }
})
