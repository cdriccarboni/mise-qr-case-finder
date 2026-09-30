import assert from 'node:assert/strict'
import test from 'node:test'
import { buildParticipantPlan, participantCount } from '../src/participant-plan.js'

test('participant count is bounded and normalized', () => {
  assert.equal(participantCount(0), 1)
  assert.equal(participantCount('12'), 12)
  assert.equal(participantCount(500), 99)
})

test('every participant receives a sound role even with fewer objects', () => {
  const plan = buildParticipantPlan({
    participants: 12,
    roles: [
      { object: 'Chaîne', cue: 'cliquetis' },
      { object: 'Papier', cue: 'froissement' }
    ],
    context: 'ambiance'
  })
  assert.equal(plan.length, 12)
  assert.deepEqual(plan.map(item => item.participant), [1,2,3,4,5,6,7,8,9,10,11,12])
  assert.ok(plan.every(item => item.object))
  assert.ok(plan.every(item => item.cue))
  assert.ok(plan.slice(2).some(item => item.variation))
})
