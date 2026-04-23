import { SESSION_VERSION } from './schema.js';

const SESSION_KEY = `boardroomTTXSession:${SESSION_VERSION}`;

export function loadSession() {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (!saved) return null;
  return JSON.parse(saved);
}

export function saveSession(payload) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export function clearSession() {
  Object.keys(sessionStorage)
    .filter((key) => key.startsWith('boardroomTTXSession:'))
    .forEach((key) => sessionStorage.removeItem(key));
}

export function rebuildSessionState(saved) {
  return {
    participant: saved?.participant || '',
    index: saved?.index || 0,
    answers: saved?.answers || {},
    completedReview: Boolean(saved?.completedReview),
    decisionRecords: saved?.decisionRecords || [],
    questionOpenTimes: saved?.questionOpenTimes || {}
  };
}

export { SESSION_KEY };
