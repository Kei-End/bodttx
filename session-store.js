const SESSION_KEY_V2 = 'boardroomTTXSession.v2';

export function saveSessionV2(payload) {
  sessionStorage.setItem(SESSION_KEY_V2, JSON.stringify(payload));
}

export function loadSessionV2() {
  const saved = sessionStorage.getItem(SESSION_KEY_V2);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.warn('Invalid v2 session payload', error);
    return null;
  }
}

export function clearSessionV2() {
  sessionStorage.removeItem(SESSION_KEY_V2);
  sessionStorage.removeItem('boardroomTTXSession');
}

export function buildExportBundle(state, decisionRecords) {
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: '2',
    state,
    decisionRecords
  };
}

export function exportBundleAsCsv(decisionRecords) {
  const headers = [
    'decisionId', 'scenarioId', 'injectId', 'actorId', 'selectedOptionId',
    'overallCapabilityScore', 'overallConfidence', 'flags', 'timestamp'
  ];
  const rows = decisionRecords.map((record) => [
    record.decisionId,
    record.scenarioId,
    record.injectId,
    record.actorId,
    record.selectedOptionId,
    record.scoreBreakdown?.overallScore ?? '',
    record.confidenceBreakdown?.overallConfidence ?? '',
    (record.validationFlags || []).join('|'),
    record.timestamp
  ]);
  return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
}

export { SESSION_KEY_V2 };
