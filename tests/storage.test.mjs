import test from 'node:test';
import assert from 'node:assert/strict';
import { saveSessionV2, loadSessionV2, clearSessionV2, exportBundleAsCsv } from '../session-store.js';

function makeStorage() {
  const data = new Map();
  return {
    getItem: (k) => data.has(k) ? data.get(k) : null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k)
  };
}

test('saves and reloads v2 session', () => {
  global.sessionStorage = makeStorage();
  const payload = { participant: 'CEO', scenarioId: 's1', decisionRecords: [{ decisionId: 'd1' }] };
  saveSessionV2(payload);
  const restored = loadSessionV2();
  assert.equal(restored.participant, 'CEO');
  assert.equal(restored.decisionRecords.length, 1);
  clearSessionV2();
  assert.equal(loadSessionV2(), null);
});

test('exports csv rows', () => {
  const csv = exportBundleAsCsv([{ decisionId: 'd1', scenarioId: 's1', injectId: 'q1', actorId: 'a', selectedOptionId: 'x', scoreBreakdown: { overallScore: 4 }, confidenceBreakdown: { overallConfidence: 0.8 }, validationFlags: ['x'], timestamp: 1 }]);
  assert.ok(csv.includes('overallCapabilityScore'));
  assert.ok(csv.includes('d1'));
});
