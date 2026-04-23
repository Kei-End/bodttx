import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { rebuildSessionState } from '../storage.js';

const goldSession = JSON.parse(fs.readFileSync(new URL('./fixtures/gold-path-session.json', import.meta.url)));

test('rebuildSessionState restores decision records from saved session', () => {
  const rebuilt = rebuildSessionState(goldSession);
  assert.equal(rebuilt.participant, 'Chief Executive');
  assert.equal(rebuilt.decisionRecords.length, 1);
  assert.equal(rebuilt.decisionRecords[0].injectId, 'q1');
});
