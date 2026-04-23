import { CAPABILITY_AXES, makeDecisionId } from './decision-schema.js';
import { scoreDecisionCapability } from './capability-scoring.js';
import { drawCapabilityRadar, buildRadarSeries } from './chart-adapter.js';
import { saveSessionV2, loadSessionV2, clearSessionV2, buildExportBundle, exportBundleAsCsv } from './session-store.js';

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
const AXIS_LABELS = ['Situational', 'Principles', 'Ethical/Safety', 'Decisiveness', 'Transparency'];

const $ = (id) => document.getElementById(id);
const scenarioSelect = $('scenarioSelect'); const scenarioUpload = $('scenarioUpload'); const loginForm = $('loginForm');
const loginView = $('loginView'); const exerciseView = $('exerciseView'); const displayNameInput = $('displayName');
const participantLabel = $('participantLabel'); const scenarioTitle = $('scenarioTitle'); const scenarioSummary = $('scenarioSummary');
const questionNumber = $('questionNumber'); const questionText = $('questionText'); const questionContext = $('questionContext');
const answerList = $('answerList'); const decisionInsight = $('decisionInsight'); const pillarBars = $('pillarBars');
const secondaryImpactGrid = $('secondaryImpactGrid'); const decisionLog = $('decisionLog'); const nationalScore = $('nationalScore');
const confidenceScore = $('confidenceScore'); const nationalBand = $('nationalBand'); const progressText = $('progressText');
const progressBar = $('progressBar'); const miniPillarGrid = $('miniPillarGrid'); const prevBtn = $('prevBtn'); const nextBtn = $('nextBtn');
const resetSessionBtn = $('resetSessionBtn'); const overallDashboardPanel = $('overallDashboardPanel');
const overallRadarChart = $('overallRadarChart'); const strengthList = $('strengthList'); const weaknessList = $('weaknessList');
const capabilityScore = $('capabilityScore'); const capabilityConfidence = $('capabilityConfidence');
const axisButtons = $('axisButtons'); const evidenceModal = $('evidenceModal'); const evidenceBody = $('evidenceBody');
const closeEvidenceModalBtn = $('closeEvidenceModalBtn'); const trendList = $('trendList'); const timeToDecisionMetric = $('timeToDecisionMetric');
const missedCriticalFactMetric = $('missedCriticalFactMetric'); const transparencyGapMetric = $('transparencyGapMetric');
const principleConsistencyMetric = $('principleConsistencyMetric'); const radarLegend = $('radarLegend');
const exportJsonBtn = $('exportJsonBtn'); const exportCsvBtn = $('exportCsvBtn');

let scenarioLibrary = []; let activeScenario = null;
let state = { participant: '', index: 0, answers: {}, completedReview: false, decisionRecords: [] };

async function boot() {
  const loaded = await Promise.all(['scenarios/sample-scenario.json'].map(async (path) => (await fetch(path)).json()));
  scenarioLibrary = loaded;
  populateScenarioSelect();
  renderStaticDashboardShell();
  hydrateSession();
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
  const parsed = loadSessionV2();
  if (!parsed?.participant) return;
  state = { ...state, ...parsed };
  const scenario = scenarioLibrary.find((item) => item.meta.id === parsed.scenarioId);
  if (!scenario) return;
  activeScenario = scenario; showExercise(); renderAll();
}

function persistSession() {
  if (!activeScenario) return;
  saveSessionV2({ ...state, scenarioId: activeScenario.meta.id, version: 2 });
}

function resetSession() {
  clearSessionV2();
  state = { participant: '', index: 0, answers: {}, completedReview: false, decisionRecords: [] };
  activeScenario = null;
  exerciseView.classList.add('hidden'); loginView.classList.remove('hidden');
}

function renderStaticDashboardShell() {
  miniPillarGrid.innerHTML = PILLARS.map((p) => `<div class="mini-card"><strong>${p.label}</strong><div class="meter"><span id="mini-${p.key}"></span></div><div class="meter-label"><span>Exposure</span><span id="mini-label-${p.key}">0</span></div></div>`).join('');
  pillarBars.innerHTML = PILLARS.map((p) => `<div class="pillar-row"><header><span>${p.label}</span><span id="pillar-val-${p.key}">0</span></header><div class="pillar-bar"><span id="pillar-bar-${p.key}"></span></div></div>`).join('');
  secondaryImpactGrid.innerHTML = SECONDARY.map((s) => `<div class="secondary-card"><strong>${s.label}</strong><div class="meter"><span id="secondary-bar-${s.key}"></span></div><div class="meter-label"><span>Pressure</span><span id="secondary-val-${s.key}">0</span></div></div>`).join('');
  axisButtons.innerHTML = CAPABILITY_AXES.map((axis, idx) => `<button class="btn btn-ghost axis-btn" data-axis="${axis}">${idx + 1}. ${axis}</button>`).join('');
}

function showExercise() { loginView.classList.add('hidden'); exerciseView.classList.remove('hidden'); }
function renderAll() { participantLabel.textContent = state.participant; scenarioTitle.textContent = activeScenario.meta.title; scenarioSummary.textContent = activeScenario.meta.summary; renderQuestion(); renderDashboard(); renderCapabilityDashboard(); }

function renderQuestion() {
  const question = activeScenario.questions[state.index];
  const isLast = state.index === activeScenario.questions.length - 1;
  questionNumber.textContent = `Question ${state.index + 1} of ${activeScenario.questions.length}`;
  questionText.textContent = question.text;
  questionContext.textContent = question.context || 'Consider trade-offs and board accountabilities.';
  progressText.textContent = `${state.index + 1} / ${activeScenario.questions.length}`;
  progressBar.style.width = `${((state.index + 1) / activeScenario.questions.length) * 100}%`;
  prevBtn.disabled = state.index === 0;
  nextBtn.textContent = isLast ? 'Finish Review' : 'Next';
  const selectedAnswerId = state.answers[question.id]?.answerId;
  answerList.innerHTML = question.answers.map((answer) => `<label class="answer-card ${selectedAnswerId === answer.id ? 'selected' : ''}"><input type="radio" value="${answer.id}" ${selectedAnswerId === answer.id ? 'checked' : ''}/><div class="answer-title">${answer.label}</div><div class="answer-desc">${answer.description}</div><div class="answer-tag-row"><span class="tag">Leadership signal: ${answer.leadershipSignal}</span><span class="tag">Tempo: ${answer.tempo}</span><span class="tag">Visibility: ${answer.visibility}</span></div></label>`).join('');
  Array.from(answerList.querySelectorAll('label')).forEach((card) => card.addEventListener('click', () => selectAnswer(question, card.querySelector('input').value)));
  if (selectedAnswerId) renderInsight(question.answers.find((a) => a.id === selectedAnswerId));
}

function selectAnswer(question, answerId) {
  const answer = question.answers.find((a) => a.id === answerId);
  state.answers[question.id] = { answerId };
  const injectMeta = { ...activeScenario, ...question };
  const decision = buildDecisionRecord(question, answer);
  const scoring = scoreDecisionCapability(decision, injectMeta, state.decisionRecords);
  decision.scoreBreakdown = scoring;
  decision.confidenceBreakdown = { overallConfidence: scoring.overallConfidence, axes: Object.fromEntries(CAPABILITY_AXES.map((axis) => [axis, scoring.axes[axis].confidence])) };
  decision.validationFlags = scoring.validationFlags;
  state.decisionRecords = state.decisionRecords.filter((record) => record.injectId !== question.id).concat(decision);
  state.completedReview = false;
  persistSession();
  renderQuestion(); renderInsight(answer); renderDashboard(); renderCapabilityDashboard();
}

function buildDecisionRecord(question, answer) {
  const now = Date.now();
  const evidenceRefs = [answer.id, question.id, ...(answer.evidenceRefs || [])];
  return {
    decisionId: makeDecisionId(activeScenario.meta.id, question.id, state.participant),
    scenarioId: activeScenario.meta.id,
    injectId: question.id,
    actorId: state.participant,
    actorRole: state.participant,
    teamId: 'team-default',
    timestamp: now,
    selectedOptionId: answer.id,
    decisionText: answer.label,
    rationaleText: answer.boardReading || answer.description,
    communicationText: answer.communicationText || `Known: disruption exists. Unknown: full scope. Action: ${answer.label}. Guidance: follow official channels. Next update in 30 minutes.`,
    principleRefs: answer.principleRefs || activeScenario.expectedPrinciples?.slice(0, 1) || [],
    namedRisks: answer.namedRisks || ['service continuity'],
    namedUnknowns: answer.namedUnknowns || ['attack scope'],
    namedStakeholders: answer.namedStakeholders || activeScenario.stakeholderGroups || ['customers', 'staff'],
    safetyConsiderations: answer.safetyConsiderations || activeScenario.safetyPriorities || ['life', 'staff'],
    ownerAssignedTo: answer.ownerAssignedTo || 'Crisis Director',
    nextReviewAt: now + 30 * 60 * 1000,
    escalatedTo: answer.escalatedTo || 'National cyber coordination channel',
    facilitatorNotes: answer.facilitatorNotes || '',
    evidenceRefs,
    decisionLatencyMs: (state.index + 1) * 45000,
    validationFlags: [],
    scoreBreakdown: {},
    confidenceBreakdown: {}
  };
}

function renderInsight(answer) {
  decisionInsight.innerHTML = `<strong>${answer.label}</strong><br>${answer.consequence}<br><br><span class="muted">Board reading:</span> ${answer.boardReading}`;
}

function aggregateDetriment() {
  const totals = { pillars: Object.fromEntries(PILLARS.map((p) => [p.key, 0])), secondary: Object.fromEntries(SECONDARY.map((s) => [s.key, 0])), confidence: 0, log: [] };
  activeScenario.questions.forEach((question, idx) => {
    const choice = state.answers[question.id]; if (!choice) return;
    const answer = question.answers.find((a) => a.id === choice.answerId);
    PILLARS.forEach((p) => { totals.pillars[p.key] += answer.weights?.pillars?.[p.key] || 0; });
    SECONDARY.forEach((s) => { totals.secondary[s.key] += answer.weights?.secondary?.[s.key] || 0; });
    totals.confidence += answer.confidence || 0;
    totals.log.push({ title: `Q${idx + 1}: ${question.shortLabel || 'Decision point'}`, choice: answer.label, consequence: answer.consequence });
  });
  return totals;
}

function renderDashboard() {
  const totals = aggregateDetriment();
  const answered = Object.keys(state.answers).length || 1;
  const detriment = Math.round(Object.values(totals.pillars).reduce((a, b) => a + b, 0) / answered);
  nationalScore.textContent = detriment;
  confidenceScore.textContent = Math.max(0, Math.round(totals.confidence / answered));
  nationalBand.textContent = detriment >= 30 ? 'Severe' : detriment >= 20 ? 'Elevated' : detriment >= 10 ? 'Guarded' : 'Low';
  const maxPillar = Math.max(1, ...Object.values(totals.pillars)); const maxSecondary = Math.max(1, ...Object.values(totals.secondary));
  PILLARS.forEach((p) => {
    const value = totals.pillars[p.key]; const width = Math.min(100, (value / maxPillar) * 100); const color = value >= 30 ? 'var(--bad)' : value >= 18 ? 'var(--warn)' : 'var(--good)';
    $(`pillar-val-${p.key}`).textContent = value; $(`pillar-bar-${p.key}`).style.width = `${width}%`; $(`pillar-bar-${p.key}`).style.background = color; $(`mini-${p.key}`).style.width = `${Math.min(100, value)}%`; $(`mini-${p.key}`).style.background = color; $(`mini-label-${p.key}`).textContent = value;
  });
  SECONDARY.forEach((s) => {
    const value = totals.secondary[s.key]; $(`secondary-bar-${s.key}`).style.width = `${Math.min(100, (value / maxSecondary) * 100)}%`; $(`secondary-bar-${s.key}`).style.background = value >= 20 ? 'var(--bad)' : value >= 12 ? 'var(--warn)' : 'var(--good)'; $(`secondary-val-${s.key}`).textContent = value;
  });
  decisionLog.innerHTML = totals.log.length ? totals.log.map((item) => `<div class="log-item"><h5>${item.title}</h5><p><strong>${item.choice}</strong><br>${item.consequence}</p></div>`).join('') : '<div class="log-item"><p>No decisions recorded yet.</p></div>';
}

function axisValuesFromRecord(record) {
  return CAPABILITY_AXES.map((axis) => record?.scoreBreakdown?.axes?.[axis]?.score || 0);
}
function median(values) {
  const ordered = [...values].sort((a, b) => a - b); if (!ordered.length) return 0;
  const mid = Math.floor(ordered.length / 2); return ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2;
}

function renderCapabilityDashboard() {
  const records = state.decisionRecords.sort((a, b) => a.timestamp - b.timestamp);
  const latest = records.at(-1);
  if (!latest) { overallDashboardPanel.classList.add('hidden'); return; }

  const participant = axisValuesFromRecord(latest);
  const teamMedian = CAPABILITY_AXES.map((axis) => median(records.map((record) => record.scoreBreakdown.axes[axis].score)));
  const target = CAPABILITY_AXES.map(() => activeScenario.targetCapabilityScore || 4);
  drawCapabilityRadar(overallRadarChart, AXIS_LABELS, buildRadarSeries(participant, teamMedian, target));

  radarLegend.innerHTML = ['Participant', 'Team median', 'Target benchmark'].map((name) => `<span class="pill pill-neutral">${name}</span>`).join(' ');
  capabilityScore.textContent = latest.scoreBreakdown.overallScore.toFixed(2);
  capabilityConfidence.textContent = `${Math.round(latest.scoreBreakdown.overallConfidence * 100)}% confidence`;

  const ranked = CAPABILITY_AXES.map((axis) => ({ axis, score: latest.scoreBreakdown.axes[axis].score })).sort((a, b) => b.score - a.score);
  strengthList.innerHTML = ranked.slice(0, 2).map((item) => `<li>${item.axis}: ${item.score}</li>`).join('');
  weaknessList.innerHTML = ranked.slice(-2).map((item) => `<li>${item.axis}: ${item.score}</li>`).join('');

  trendList.innerHTML = records.map((record, idx) => `<li>Inject ${idx + 1}: capability ${record.scoreBreakdown.overallScore.toFixed(2)} / confidence ${record.scoreBreakdown.overallConfidence.toFixed(2)}</li>`).join('');
  const latencies = records.map((record) => record.decisionLatencyMs || 0);
  timeToDecisionMetric.textContent = `${Math.round(latencies.reduce((a, b) => a + b, 0) / Math.max(1, latencies.length) / 1000)}s`;
  missedCriticalFactMetric.textContent = records.filter((r) => r.validationFlags.includes('missedCriticalFact')).length;
  transparencyGapMetric.textContent = records.filter((r) => r.validationFlags.includes('communicationMissingKnownUnknownSplit')).length;
  principleConsistencyMetric.textContent = `${Math.round((records.filter((r) => !r.validationFlags.includes('principleNotReferenced')).length / records.length) * 100)}%`;

  overallDashboardPanel.classList.remove('hidden');
}

function downloadText(filename, text, contentType) {
  const blob = new Blob([text], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function openEvidence(axis) {
  const latest = state.decisionRecords.sort((a, b) => b.timestamp - a.timestamp)[0]; if (!latest) return;
  const axisData = latest.scoreBreakdown.axes[axis];
  evidenceBody.innerHTML = `<h4>${axis}</h4><p>Score: <strong>${axisData.score}/5</strong> (${axisData.anchor})</p><p>Confidence: ${Math.round(axisData.confidence * 100)}%</p><p>Validation flags: ${(latest.validationFlags || []).join(', ') || 'None'}.</p><p>Evidence refs: ${(latest.evidenceRefs || []).join(', ')}.</p>`;
  evidenceModal.showModal();
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  state = { participant: displayNameInput.value.trim(), index: 0, answers: {}, completedReview: false, decisionRecords: [] };
  activeScenario = scenarioLibrary[Number(scenarioSelect.value)] || scenarioLibrary[0];
  persistSession(); showExercise(); renderAll();
});
scenarioUpload.addEventListener('change', async (e) => {
  const file = e.target.files?.[0]; if (!file) return;
  try { const json = JSON.parse(await file.text()); validateScenario(json); scenarioLibrary.unshift(json); populateScenarioSelect(); scenarioSelect.value = '0'; }
  catch (error) { alert(`Scenario file could not be loaded: ${error.message}`); }
});
function validateScenario(json) {
  if (!json.meta?.id || !json.meta?.title || !Array.isArray(json.questions)) throw new Error('Invalid scenario format.');
  if (json.questions.length < 2 || json.questions.length > 10) throw new Error('Scenario must contain between 2 and 10 questions.');
}

prevBtn.addEventListener('click', () => { state.index = Math.max(0, state.index - 1); state.completedReview = false; persistSession(); renderQuestion(); });
nextBtn.addEventListener('click', () => {
  const isLast = state.index === activeScenario.questions.length - 1;
  if (isLast) {
    if (!activeScenario.questions.every((question) => state.answers[question.id])) { alert('Please answer all decision points before finishing the review.'); return; }
    state.completedReview = true; persistSession(); renderCapabilityDashboard(); return;
  }
  state.index += 1; persistSession(); renderQuestion();
});
resetSessionBtn.addEventListener('click', resetSession);
axisButtons.addEventListener('click', (e) => { const button = e.target.closest('.axis-btn'); if (button) openEvidence(button.dataset.axis); });
closeEvidenceModalBtn.addEventListener('click', () => evidenceModal.close());
exportJsonBtn.addEventListener('click', () => downloadText('boardroom-ttx-session.json', JSON.stringify(buildExportBundle(state, state.decisionRecords), null, 2), 'application/json'));
exportCsvBtn.addEventListener('click', () => downloadText('boardroom-ttx-session.csv', exportBundleAsCsv(state.decisionRecords), 'text/csv'));

boot();
