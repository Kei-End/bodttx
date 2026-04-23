import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scoreDecisionCapability } from '../capability-scoring.js';

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/capability-fixture.json', import.meta.url)));

test('scores all five axes with confidence and flags', () => {
  const result = scoreDecisionCapability(fixture.decision, fixture.scenario, []);
  assert.equal(Object.keys(result.axes).length, 5);
  assert.ok(result.overallScore >= 3);
  assert.ok(result.overallConfidence > 0 && result.overallConfidence <= 1);
  assert.equal(result.validationFlags.includes('noNamedOwner'), false);
});

test('adds low-confidence flags when decision is sparse', () => {
  const sparse = {
    ...fixture.decision,
    decisionText: 'Do it',
    rationaleText: '',
    communicationText: '',
    principleRefs: [],
    namedUnknowns: [],
    ownerAssignedTo: '',
    nextReviewAt: null,
    safetyConsiderations: [],
    evidenceRefs: []
  };
  const result = scoreDecisionCapability(sparse, fixture.scenario, []);
  assert.equal(result.validationFlags.includes('noNamedOwner'), true);
  assert.equal(result.validationFlags.includes('principleNotReferenced'), true);
});
