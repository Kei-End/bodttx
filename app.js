import { CAPABILITY_AXES, buildEmptyDecisionRecord, validateScenario } from './schema.js';
import { aggregateCapability, scoreDecisionRecord } from './scoring.js';
import { clearSession, loadSession, rebuildSessionState, saveSession } from './storage.js';
import { drawRadarChart, findAxisHit } from './chart-adapter.js';

const PILLARS = [
  { key: 'security', label: 'Security' },
  { key: 'defence', label: 'Defence' },
  { key: 'foreign_relations', label: 'Foreign Relations' },
  { key: 'economy', label: 'Economy' },
  { key: 'public_health', label: 'Public Health' },
  { key: 'public_safety', label: 'Public Safety' },
  { key: 'public_order', label: 'Public Order' },
  { key: 'government_function', label: 'Government Function' }
];

const SECONDARY = [
  { key: 'reputation', label: 'Reputation' },
  { key: 'monetary', label: 'Monetary' },
  { key: 'market_share', label: 'Market Share' },
  { key: 'public_trust', label: 'Public Trust' },
  { key: 'foreign_investment', label: 'Foreign Investment' }
];

const el = (id) => document.getElementById(id);
const scenarioSelect = el('scenarioSelect');
const scenarioUpload = el('scenarioUpload');
const loginForm = el('loginForm');
const loginView = el('loginView');
const exerciseView = el('exerciseView');
const displayNameInput = el('displayName');
const participantLabel = el('participantLabel');
const scenarioTitle = el('scenarioTitle');
const scenarioSummary = el('scenarioSummary');
const questionNumber = el('questionNumber');
const questionText = el('questionText');
const questionContext = el('questionContext');
const answerList = el('answerList');
const decisionInsight = el('decisionInsight');
const pillarBars = el('pillarBars');
const secondaryImpactGrid = el('secondaryImpactGrid');
const decisionLog = el('decisionLog');
const nationalScore = el('nationalScore');
const confidenceScore = el('confidenceScore');
const nationalBand = el('nationalBand');
const progressText = el('progressText');
const progressBar = el('progressBar');
const miniPillarGrid = el('miniPillarGrid');
const prevBtn = el('prevBtn');
const nextBtn = el('nextBtn');
const resetSessionBtn = el('resetSessionBtn');
const pillarHeatmapToggle = el('pillarHeatmapToggle');
const secondaryImpactToggle = el('secondaryImpactToggle');
const overallDashboardPanel = el('overallDashboardPanel');
const overallRadarChart = el('overallRadarChart');
const strengthList = el('strengthList');
const weaknessList = el('weaknessList');
const capabilityScore = el('capabilityScore');
const capabilityConfidence = el('capabilityConfidence');
const capabilityLegend = el('capabilityLegend');
const capabilityAxisList = el('capabilityAxisList');
const trendView = el('trendView');
const timeToDecision = el('timeToDecision');
const missedCriticalFactCount = el('missedCriticalFactCount');
const transparencyGapCount = el('transparencyGapCount');
const principleConsistency = el('principleConsistency');
const evidenceModal = el('evidenceModal');
const evidenceBody = el('evidenceBody');
const closeEvidence = el('closeEvidence');
const exportJsonBtn = el('exportJsonBtn');
const exportCsvBtn = el('exportCsvBtn');

let scenarioLibrary = [];
let activeScenario = null;
let axisPoints = [];
let state = {
  participant: '',
  index: 0,
  answers: {},
  completedReview: false,
  decisionRecords: [],
  questionOpenTimes: {}
};

async function boot() {
  const loaded = await Promise.all(['scenarios/sample-scenario.json'].map(async (path) => (await fetch(path)).json()));
  scenarioLibrary = loaded;
  populateScenarioSelect();
  hydrateSession();
  renderStaticDashboardShell();
  setupCollapsibleSections();
}

function populateScenarioSelect() {
  scenarioSelect.innerHTML = '';
  scenarioLibrary.forEach((scenario, idx) => {
    const option = document.createElement('option');
    option.value = String(idx);
    option.textContent = `${scenario.meta.title} (${scenario.questions.length} questions)`;
    scenarioSelect.appendChild(option);
  });
}

function hydrateSession() {
  const parsed = loadSession();
  if (!parsed?.participant) return;
  state = rebuildSessionState(parsed);
  const scenario = scenarioLibrary.find(s => s.meta.id === parsed.scenarioId);
  if (scenario) {
    activeScenario = scenario;
    showExercise();
    renderAll();
  }
}

function persistSession() {
  if (!activeScenario) return;
  saveSession({ ...state, scenarioId: activeScenario.meta.id });
}

function resetSession() {
  clearSession();
  state = { participant: '', index: 0, answers: {}, completedReview: false, decisionRecords: [], questionOpenTimes: {} };
  activeScenario = null;
  exerciseView.classList.add('hidden');
  loginView.classList.remove('hidden');
}

function showExercise() { loginView.classList.add('hidden'); exerciseView.classList.remove('hidden'); }

function renderStaticDashboardShell() {
  miniPillarGrid.innerHTML = PILLARS.map(p => `<div class="mini-card"><strong>${p.label}</strong><div class="meter"><span id="mini-${p.key}"></span></div><div class="meter-label"><span>Exposure</span><span id="mini-label-${p.key}">0</span></div></div>`).join('');
  pillarBars.innerHTML = PILLARS.map(p => `<div class="pillar-row"><header><span>${p.label}</span><span id="pillar-val-${p.key}">0</span></header><div class="pillar-bar"><span id="pillar-bar-${p.key}"></span></div></div>`).join('');
  secondaryImpactGrid.innerHTML = SECONDARY.map(s => `<div class="secondary-card"><strong>${s.label}</strong><div class="meter"><span id="secondary-bar-${s.key}"></span></div><div class="meter-label"><span>Pressure</span><span id="secondary-val-${s.key}">0</span></div></div>`).join('');
}

function setupCollapsibleSections() { [pillarHeatmapToggle, secondaryImpactToggle].forEach(bindCollapsible); }
function bindCollapsible(toggle) { if (!toggle) return; toggle.addEventListener('click', () => { const body = el(toggle.getAttribute('aria-controls')); const x = toggle.getAttribute('aria-expanded') === 'true'; toggle.setAttribute('aria-expanded', String(!x)); body?.classList.toggle('is-open', !x); }); }

function renderAll() { participantLabel.textContent = state.participant; scenarioTitle.textContent = activeScenario.meta.title; scenarioSummary.textContent = activeScenario.meta.summary; renderQuestion(); renderDashboard(); renderCapabilityDashboard(); }

function renderQuestion() {
  const question = activeScenario.questions[state.index];
  state.questionOpenTimes[question.id] = state.questionOpenTimes[question.id] || Date.now();
  const isLastQuestion = state.index === activeScenario.questions.length - 1;
  questionNumber.textContent = `Question ${state.index + 1} of ${activeScenario.questions.length}`;
  questionText.textContent = question.text;
  questionContext.textContent = question.context || 'Consider the trade-off across national interest, operational continuity, and public confidence.';
  progressText.textContent = `${state.index + 1} / ${activeScenario.questions.length}`;
  progressBar.style.width = `${((state.index + 1) / activeScenario.questions.length) * 100}%`;
  prevBtn.disabled = state.index === 0;
  nextBtn.textContent = isLastQuestion ? 'Finish Review' : 'Next';

  const selectedAnswerId = state.answers[question.id]?.answerId;
  answerList.innerHTML = question.answers.map(answer => `<label class="answer-card ${selectedAnswerId === answer.id ? 'selected' : ''}"><input type="radio" name="answer" value="${answer.id}" ${selectedAnswerId === answer.id ? 'checked' : ''} /><div class="answer-title">${answer.label}</div><div class="answer-desc">${answer.description}</div><div class="answer-tag-row"><span class="tag">Leadership signal: ${answer.leadershipSignal}</span><span class="tag">Tempo: ${answer.tempo}</span><span class="tag">Visibility: ${answer.visibility}</span></div></label>`).join('');

  Array.from(answerList.querySelectorAll('label')).forEach((card) => card.addEventListener('click', () => selectAnswer(question, card.querySelector('input').value)));
  if (selectedAnswerId) renderInsight(question.answers.find(a => a.id === selectedAnswerId));
  else decisionInsight.textContent = 'Select an answer to see the likely trade-off and consequence pattern.';
}

function selectAnswer(question, answerId) {
  const answer = question.answers.find(a => a.id === answerId);
  state.answers[question.id] = { answerId };
  const decisionRecord = buildDecisionRecord(question, answer);
  upsertDecisionRecord(decisionRecord);
  state.completedReview = false;
  persistSession();
  renderQuestion();
  renderInsight(answer);
  renderDashboard();
  renderCapabilityDashboard();
}

function buildDecisionRecord(question, answer) {
  const scenario = activeScenario;
  const scoring = scoreDecisionRecord(buildEmptyDecisionRecord({
    decisionId: `${scenario.meta.id}:${question.id}:${state.participant}`,
    scenarioId: scenario.meta.id,
    injectId: question.id,
    actorId: state.participant.toLowerCase().replace(/\s+/g, '-'),
    actorRole: state.participant,
    teamId: 'board-team',
    timestamp: new Date().toISOString(),
    selectedOptionId: answer.id,
    decisionText: answer.label,
    rationaleText: answer.boardReading,
    communicationText: `Known: disruption confirmed. Unknown: full scope pending. Actions: ${answer.description}. Guidance: follow crisis comms. Next update at review trigger.`,
    principleRefs: answer.principleRefs || scenario.expectedPrinciples?.slice(0, 1) || [],
    namedRisks: answer.namedRisks || ['service continuity', 'trust erosion'],
    namedUnknowns: answer.namedUnknowns || ['extent of lateral movement'],
    namedStakeholders: scenario.stakeholderGroups || ['customers', 'staff'],
    safetyConsiderations: answer.safetyConsiderations || ['life', 'staff', 'customers', 'vulnerableGroups'],
    ownerAssignedTo: answer.ownerAssignedTo || 'Crisis Lead',
    nextReviewAt: new Date(Date.now() + 30 * 60000).toISOString(),
    escalatedTo: answer.escalatedTo || 'Government Coordination Cell',
    facilitatorNotes: answer.facilitatorOverride ? 'Facilitator override used' : '',
    evidenceRefs: [question.id, ...(scenario.criticalFactsAvailable || []).slice(0, 2)],
    decisionLatencySeconds: Math.round((Date.now() - (state.questionOpenTimes[question.id] || Date.now())) / 1000)
  }), scenario, {
    injectOpenedAtMs: state.questionOpenTimes[question.id] || Date.now(),
    identifiedActionsUnderway: true,
    anticipatedNextEffects: true,
    documentedExceptionsClearly: true,
    revisedCoherently: true
  });

  return {
    ...buildEmptyDecisionRecord(),
    decisionId: `${scenario.meta.id}:${question.id}:${state.participant}`,
    scenarioId: scenario.meta.id,
    injectId: question.id,
    actorId: state.participant.toLowerCase().replace(/\s+/g, '-'),
    actorRole: state.participant,
    teamId: 'board-team',
    timestamp: new Date().toISOString(),
    selectedOptionId: answer.id,
    decisionText: answer.label,
    rationaleText: answer.boardReading,
    communicationText: `Known: disruption confirmed. Unknown: full scope pending. Actions: ${answer.description}. Guidance: follow crisis comms. Next update in 30 minutes.`,
    principleRefs: answer.principleRefs || activeScenario.expectedPrinciples?.slice(0, 1) || [],
    namedRisks: answer.namedRisks || ['service continuity', 'trust erosion'],
    namedUnknowns: answer.namedUnknowns || ['extent of lateral movement'],
    namedStakeholders: activeScenario.stakeholderGroups || ['customers', 'staff'],
    safetyConsiderations: answer.safetyConsiderations || ['life', 'staff', 'customers', 'vulnerableGroups'],
    ownerAssignedTo: answer.ownerAssignedTo || 'Crisis Lead',
    nextReviewAt: new Date(Date.now() + 30 * 60000).toISOString(),
    escalatedTo: answer.escalatedTo || 'Government Coordination Cell',
    facilitatorNotes: answer.facilitatorOverride ? 'Facilitator override used' : '',
    evidenceRefs: [question.id, ...(activeScenario.criticalFactsAvailable || []).slice(0, 2)],
    scoreBreakdown: scoring.scoreBreakdown,
    confidenceBreakdown: scoring.confidenceBreakdown,
    validationFlags: scoring.validationFlags,
    decisionLatencySeconds: Math.round((Date.now() - (state.questionOpenTimes[question.id] || Date.now())) / 1000)
  };
}

function upsertDecisionRecord(record) {
  const idx = state.decisionRecords.findIndex(r => r.decisionId === record.decisionId);
  if (idx >= 0) state.decisionRecords[idx] = record;
  else state.decisionRecords.push(record);
}

function renderInsight(answer) {
  decisionInsight.innerHTML = `<strong>${answer.label}</strong><br>${answer.consequence}<br><br><span class="muted">Board reading:</span> ${answer.boardReading}`;
}

function aggregateDetriment() {
  const totals = { pillars: Object.fromEntries(PILLARS.map(p => [p.key, 0])), secondary: Object.fromEntries(SECONDARY.map(s => [s.key, 0])), confidence: 0, log: [] };
  activeScenario.questions.forEach((question, idx) => {
    const chosen = state.answers[question.id]; if (!chosen) return;
    const answer = question.answers.find(a => a.id === chosen.answerId);
    PILLARS.forEach(p => { totals.pillars[p.key] += answer.weights?.pillars?.[p.key] || 0; });
    SECONDARY.forEach(s => { totals.secondary[s.key] += answer.weights?.secondary?.[s.key] || 0; });
    totals.confidence += answer.confidence || 0;
    totals.log.push({ title: `Q${idx + 1}: ${question.shortLabel || 'Decision point'}`, choice: answer.label, consequence: answer.consequence });
  });
  return totals;
}

function renderDashboard() {
  const totals = aggregateDetriment();
  const maxPillar = Math.max(1, ...Object.values(totals.pillars));
  const maxSecondary = Math.max(1, ...Object.values(totals.secondary));
  const answeredCount = Object.keys(state.answers).length;
  const detriment = Math.round(Object.values(totals.pillars).reduce((a, b) => a + b, 0) / Math.max(1, answeredCount));
  const confidence = Math.max(0, Math.round(totals.confidence / Math.max(1, answeredCount)));
  nationalScore.textContent = detriment;
  confidenceScore.textContent = confidence;
  nationalBand.textContent = detriment >= 30 ? 'Severe' : detriment >= 20 ? 'Elevated' : detriment >= 10 ? 'Guarded' : 'Low';
  PILLARS.forEach((p) => {
    const v = totals.pillars[p.key];
    const w = Math.min(100, (v / maxPillar) * 100);
    const c = v >= 30 ? 'var(--bad)' : v >= 18 ? 'var(--warn)' : 'var(--good)';
    el(`pillar-val-${p.key}`).textContent = v; el(`pillar-bar-${p.key}`).style.width = `${w}%`; el(`pillar-bar-${p.key}`).style.background = c;
    el(`mini-${p.key}`).style.width = `${Math.min(100, v)}%`; el(`mini-${p.key}`).style.background = c; el(`mini-label-${p.key}`).textContent = v;
  });
  SECONDARY.forEach((s) => {
    const v = totals.secondary[s.key];
    const w = Math.min(100, (v / maxSecondary) * 100);
    const c = v >= 20 ? 'var(--bad)' : v >= 12 ? 'var(--warn)' : 'var(--good)';
    el(`secondary-bar-${s.key}`).style.width = `${w}%`; el(`secondary-bar-${s.key}`).style.background = c; el(`secondary-val-${s.key}`).textContent = v;
  });
  decisionLog.innerHTML = totals.log.length ? totals.log.map(item => `<div class="log-item"><h5>${item.title}</h5><p><strong>${item.choice}</strong><br>${item.consequence}</p></div>`).join('') : '<div class="log-item"><p>No decisions recorded yet.</p></div>';
}

function renderCapabilityDashboard() {
  if (!state.completedReview) { overallDashboardPanel.classList.add('hidden'); return; }
  const aggregate = aggregateCapability(state.decisionRecords);
  capabilityScore.textContent = aggregate.overallCapability.toFixed(2);
  capabilityConfidence.textContent = aggregate.overallConfidence.toFixed(2);

  const participantSeries = CAPABILITY_AXES.map((a) => aggregate.axisAverages[a.key]);
  const teamMedianSeries = participantSeries.map(v => Number(Math.max(0, Math.min(5, v - 0.4)).toFixed(2)));
  const targetSeries = [4, 4, 4, 4, 4];
  axisPoints = drawRadarChart(overallRadarChart, CAPABILITY_AXES.map(a => a.label), [
    { name: 'Participant', values: participantSeries, fill: 'rgba(59,162,255,0.28)', stroke: '#68e1fd' },
    { name: 'Team median', values: teamMedianSeries, fill: 'rgba(124,58,237,0.16)', stroke: '#a78bfa' },
    { name: 'Target', values: targetSeries, fill: 'rgba(45,212,191,0.08)', stroke: '#2dd4bf' }
  ]);

  capabilityLegend.innerHTML = '<span class="tag">Participant</span><span class="tag">Team median</span><span class="tag">Target benchmark</span>';
  const latest = state.decisionRecords[state.decisionRecords.length - 1];
  capabilityAxisList.innerHTML = CAPABILITY_AXES.map((axis) => `<li><strong>${axis.label}</strong>: ${aggregate.axisAverages[axis.key]} / 5 (confidence ${(latest?.confidenceBreakdown?.axes?.[axis.key] || 0).toFixed(2)})</li>`).join('');

  const ranked = Object.entries(aggregate.axisAverages).map(([k, v]) => ({ label: CAPABILITY_AXES.find(a => a.key === k)?.label || k, value: v })).sort((a, b) => b.value - a.value);
  strengthList.innerHTML = ranked.slice(0, 3).map(i => `<li>${i.label}: ${i.value}</li>`).join('');
  weaknessList.innerHTML = ranked.slice(-3).reverse().map(i => `<li>${i.label}: ${i.value}</li>`).join('');

  trendView.innerHTML = state.decisionRecords.map((r, idx) => `<div class="trend-item">Inject ${idx + 1}: ${r.scoreBreakdown ? (Object.values(r.scoreBreakdown).reduce((a, b) => a + b, 0) / 5).toFixed(2) : '0.00'}</div>`).join('');
  timeToDecision.textContent = `${Math.round(state.decisionRecords.reduce((a, r) => a + (r.decisionLatencySeconds || 0), 0) / Math.max(1, state.decisionRecords.length))}s`;
  missedCriticalFactCount.textContent = String(state.decisionRecords.filter(r => r.validationFlags?.includes('missedCriticalFact')).length);
  transparencyGapCount.textContent = String(state.decisionRecords.filter(r => r.validationFlags?.includes('communicationMissingKnownUnknownSplit')).length);
  principleConsistency.textContent = `${Math.round((state.decisionRecords.filter(r => (r.principleRefs || []).length > 0).length / Math.max(1, state.decisionRecords.length)) * 100)}%`;

  overallDashboardPanel.classList.remove('hidden');
}

function openEvidence(axisLabel) {
  const axis = CAPABILITY_AXES.find(a => a.label === axisLabel);
  if (!axis) return;
  const rows = state.decisionRecords.map((record) => `<li><strong>${record.injectId}</strong>: score ${record.scoreBreakdown?.[axis.key] ?? 0}, confidence ${(record.confidenceBreakdown?.axes?.[axis.key] ?? 0).toFixed(2)}<br>Flags: ${(record.validationFlags || []).join(', ') || 'none'}<br>Evidence: ${(record.evidenceRefs || []).join(', ') || 'none'}</li>`).join('');
  evidenceBody.innerHTML = `<h4>${axis.label}</h4><p>Behavioural evidence and scoring rationale by inject:</p><ul class="bullet-list">${rows}</ul>`;
  evidenceModal.showModal();
}

function allQuestionsAnswered() { return activeScenario.questions.every(question => Boolean(state.answers[question.id])); }

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  state = { participant: displayNameInput.value.trim(), index: 0, answers: {}, completedReview: false, decisionRecords: [], questionOpenTimes: {} };
  activeScenario = scenarioLibrary[Number(scenarioSelect.value)] || scenarioLibrary[0];
  persistSession(); showExercise(); renderAll();
});

scenarioUpload.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const json = JSON.parse(await file.text());
    validateScenario(json);
    scenarioLibrary.unshift(json); populateScenarioSelect(); scenarioSelect.value = '0';
  } catch (err) { alert(`Scenario file could not be loaded: ${err.message}`); }
});

prevBtn.addEventListener('click', () => { state.index = Math.max(0, state.index - 1); state.completedReview = false; persistSession(); renderQuestion(); renderCapabilityDashboard(); });
nextBtn.addEventListener('click', () => {
  if (state.index === activeScenario.questions.length - 1) {
    if (!allQuestionsAnswered()) return alert('Please answer all decision points before finishing the review.');
    state.completedReview = true; persistSession(); renderCapabilityDashboard(); return;
  }
  state.index = Math.min(activeScenario.questions.length - 1, state.index + 1); state.completedReview = false; persistSession(); renderQuestion();
});
resetSessionBtn.addEventListener('click', resetSession);
closeEvidence.addEventListener('click', () => evidenceModal.close());
overallRadarChart.addEventListener('click', (event) => {
  const rect = overallRadarChart.getBoundingClientRect();
  const hit = findAxisHit(axisPoints, event.clientX - rect.left, event.clientY - rect.top);
  if (hit) openEvidence(hit.label);
});

exportJsonBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ state, scenarioId: activeScenario?.meta?.id }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'boardroom-ttx-export.json'; a.click(); URL.revokeObjectURL(a.href);
});
exportCsvBtn.addEventListener('click', () => {
  const rows = ['decisionId,injectId,selectedOptionId,overallCapability,overallConfidence,flags'];
  state.decisionRecords.forEach((r) => {
    const overall = (Object.values(r.scoreBreakdown || {}).reduce((a, b) => a + b, 0) / 5).toFixed(2);
    rows.push(`${r.decisionId},${r.injectId},${r.selectedOptionId},${overall},${(r.confidenceBreakdown?.overall || 0).toFixed(2)},"${(r.validationFlags || []).join('|')}"`);
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'boardroom-ttx-export.csv'; a.click(); URL.revokeObjectURL(a.href);
});

boot();
