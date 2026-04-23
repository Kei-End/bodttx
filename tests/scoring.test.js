import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildEmptyDecisionRecord, validateScenario } from '../schema.js';
import { scoreDecisionRecord, aggregateCapability } from '../scoring.js';

const scenario = JSON.parse(fs.readFileSync(new URL('./fixtures/scenario-fragment.json', import.meta.url)));

test('validateScenario accepts extended schema', () => {
  assert.equal(validateScenario(scenario), true);
});

test('scoreDecisionRecord returns axis scores and confidence', () => {
  const record = buildEmptyDecisionRecord({
    decisionId: 'd1',
    scenarioId: scenario.meta.id,
    injectId: 'qx',
    actorId: 'ceo',
    decisionText: 'Option',
    rationaleText: 'Reasoned statement',
    communicationText: 'Known facts. Unknown blast radius. Actions underway. Stakeholders should wait. Next update in 30 minutes.',
    principleRefs: ['life-safety-first'],
    namedRisks: ['service continuity'],
    namedUnknowns: ['blast radius'],
    safetyConsiderations: ['life', 'vulnerableGroups', 'staff'],
    ownerAssignedTo: 'Crisis Lead',
    nextReviewAt: new Date().toISOString(),
    escalatedTo: 'Gov',
    evidenceRefs: ['fact-a'],
    decisionLatencySeconds: 120
  });

  const scored = scoreDecisionRecord(record, scenario, {
    injectOpenedAtMs: Date.now() - 120000,
    identifiedActionsUnderway: true,
    anticipatedNextEffects: true,
    documentedExceptionsClearly: true,
    revisedCoherently: true
  });

  assert.equal(Object.keys(scored.scoreBreakdown).length, 5);
  assert.ok(scored.overallCapability >= 0 && scored.overallCapability <= 5);
  assert.ok(scored.confidenceBreakdown.overall > 0);
});

test('aggregateCapability averages multiple records', () => {
  const records = [
    { scoreBreakdown: { situationalAwareness: 5, alignmentWithPrinciples: 4, ethicalSafetyImpact: 4, decisiveness: 3, transparency: 4 }, confidenceBreakdown: { overall: 0.8 } },
    { scoreBreakdown: { situationalAwareness: 3, alignmentWithPrinciples: 3, ethicalSafetyImpact: 2, decisiveness: 2, transparency: 3 }, confidenceBreakdown: { overall: 0.6 } }
  ];
  const agg = aggregateCapability(records);
  assert.equal(agg.axisAverages.situationalAwareness, 4);
  assert.equal(agg.overallConfidence, 0.7);
});
