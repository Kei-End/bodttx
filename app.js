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

const scenarioSelect = document.getElementById('scenarioSelect');
const scenarioUpload = document.getElementById('scenarioUpload');
const loginForm = document.getElementById('loginForm');
const loginView = document.getElementById('loginView');
const exerciseView = document.getElementById('exerciseView');
const displayNameInput = document.getElementById('displayName');
const participantLabel = document.getElementById('participantLabel');
const scenarioTitle = document.getElementById('scenarioTitle');
const scenarioSummary = document.getElementById('scenarioSummary');
const questionNumber = document.getElementById('questionNumber');
const questionText = document.getElementById('questionText');
const questionContext = document.getElementById('questionContext');
const answerList = document.getElementById('answerList');
const decisionInsight = document.getElementById('decisionInsight');
const pillarBars = document.getElementById('pillarBars');
const secondaryImpactGrid = document.getElementById('secondaryImpactGrid');
const decisionLog = document.getElementById('decisionLog');
const nationalScore = document.getElementById('nationalScore');
const confidenceScore = document.getElementById('confidenceScore');
const nationalBand = document.getElementById('nationalBand');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');
const miniPillarGrid = document.getElementById('miniPillarGrid');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const resetSessionBtn = document.getElementById('resetSessionBtn');

let scenarioLibrary = [];
let activeScenario = null;
let state = {
  participant: '',
  index: 0,
  answers: {}
};

async function boot() {
  const files = ['scenarios/sample-scenario.json'];
  const loaded = await Promise.all(files.map(async (path) => {
    const res = await fetch(path);
    return res.json();
  }));
  scenarioLibrary = loaded;
  populateScenarioSelect();
  hydrateSession();
  renderStaticDashboardShell();
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
  const saved = sessionStorage.getItem('boardroomTTXSession');
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    if (parsed && parsed.participant) {
      state = parsed;
      const scenario = scenarioLibrary.find(s => s.meta.id === parsed.scenarioId);
      if (scenario) {
        activeScenario = scenario;
        showExercise();
        renderAll();
      }
    }
  } catch (e) {
    console.warn('Failed to restore session', e);
  }
}

function persistSession() {
  if (!activeScenario) return;
  sessionStorage.setItem('boardroomTTXSession', JSON.stringify({
    ...state,
    scenarioId: activeScenario.meta.id
  }));
}

function resetSession() {
  sessionStorage.removeItem('boardroomTTXSession');
  state = { participant: '', index: 0, answers: {} };
  activeScenario = null;
  exerciseView.classList.add('hidden');
  loginView.classList.remove('hidden');
}

function showExercise() {
  loginView.classList.add('hidden');
  exerciseView.classList.remove('hidden');
}

function renderStaticDashboardShell() {
  miniPillarGrid.innerHTML = PILLARS.map(p => `
    <div class="mini-card">
      <strong>${p.label}</strong>
      <div class="meter"><span id="mini-${p.key}"></span></div>
      <div class="meter-label"><span>Exposure</span><span id="mini-label-${p.key}">0</span></div>
    </div>
  `).join('');

  pillarBars.innerHTML = PILLARS.map(p => `
    <div class="pillar-row">
      <header><span>${p.label}</span><span id="pillar-val-${p.key}">0</span></header>
      <div class="pillar-bar"><span id="pillar-bar-${p.key}"></span></div>
    </div>
  `).join('');

  secondaryImpactGrid.innerHTML = SECONDARY.map(s => `
    <div class="secondary-card">
      <strong>${s.label}</strong>
      <div class="meter"><span id="secondary-bar-${s.key}"></span></div>
      <div class="meter-label"><span>Pressure</span><span id="secondary-val-${s.key}">0</span></div>
    </div>
  `).join('');
}

function renderAll() {
  participantLabel.textContent = state.participant;
  scenarioTitle.textContent = activeScenario.meta.title;
  scenarioSummary.textContent = activeScenario.meta.summary;
  renderQuestion();
  renderDashboard();
}

function renderQuestion() {
  const question = activeScenario.questions[state.index];
  questionNumber.textContent = `Question ${state.index + 1} of ${activeScenario.questions.length}`;
  questionText.textContent = question.text;
  questionContext.textContent = question.context || 'Consider the trade-off across national interest, operational continuity, and public confidence.';
  progressText.textContent = `${state.index + 1} / ${activeScenario.questions.length}`;
  progressBar.style.width = `${((state.index + 1) / activeScenario.questions.length) * 100}%`;
  prevBtn.disabled = state.index === 0;
  nextBtn.textContent = state.index === activeScenario.questions.length - 1 ? 'Finish Review' : 'Next';

  const selectedAnswerId = state.answers[question.id]?.answerId;
  answerList.innerHTML = question.answers.map(answer => {
    const selected = selectedAnswerId === answer.id;
    return `
      <label class="answer-card ${selected ? 'selected' : ''}">
        <input type="radio" name="answer" value="${answer.id}" ${selected ? 'checked' : ''} />
        <div class="answer-title">${answer.label}</div>
        <div class="answer-desc">${answer.description}</div>
        <div class="answer-tag-row">
          <span class="tag">Leadership signal: ${answer.leadershipSignal}</span>
          <span class="tag">Tempo: ${answer.tempo}</span>
          <span class="tag">Visibility: ${answer.visibility}</span>
        </div>
      </label>
    `;
  }).join('');

  Array.from(answerList.querySelectorAll('label')).forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.querySelector('input').value;
      selectAnswer(question, id);
    });
  });

  if (selectedAnswerId) {
    const selected = question.answers.find(a => a.id === selectedAnswerId);
    renderInsight(selected);
  } else {
    decisionInsight.textContent = 'Select an answer to see the likely trade-off and consequence pattern.';
  }
}

function selectAnswer(question, answerId) {
  const answer = question.answers.find(a => a.id === answerId);
  state.answers[question.id] = { answerId };
  persistSession();
  renderQuestion();
  renderInsight(answer);
  renderDashboard();
}

function renderInsight(answer) {
  decisionInsight.innerHTML = `
    <strong>${answer.label}</strong><br>
    ${answer.consequence}<br><br>
    <span class="muted">Board reading:</span> ${answer.boardReading}
  `;
}

function aggregateScores() {
  const totals = {
    pillars: Object.fromEntries(PILLARS.map(p => [p.key, 0])),
    secondary: Object.fromEntries(SECONDARY.map(s => [s.key, 0])),
    confidence: 0,
    log: []
  };

  activeScenario.questions.forEach((question, idx) => {
    const chosen = state.answers[question.id];
    if (!chosen) return;
    const answer = question.answers.find(a => a.id === chosen.answerId);
    PILLARS.forEach(p => totals.pillars[p.key] += (answer.weights?.pillars?.[p.key] || 0));
    SECONDARY.forEach(s => totals.secondary[s.key] += (answer.weights?.secondary?.[s.key] || 0));
    totals.confidence += (answer.confidence || 0);
    totals.log.push({
      title: `Q${idx + 1}: ${question.shortLabel || 'Decision point'}`,
      choice: answer.label,
      consequence: answer.consequence
    });
  });

  return totals;
}

function renderDashboard() {
  const totals = aggregateScores();
  const maxPillar = Math.max(1, ...Object.values(totals.pillars));
  const maxSecondary = Math.max(1, ...Object.values(totals.secondary));
  const answeredCount = Object.keys(state.answers).length;
  const detriment = Math.round(Object.values(totals.pillars).reduce((a,b) => a + b, 0) / Math.max(1, answeredCount));
  const confidence = Math.max(0, Math.round(totals.confidence / Math.max(1, answeredCount)));

  nationalScore.textContent = detriment;
  confidenceScore.textContent = confidence;
  nationalBand.textContent = detriment >= 30 ? 'Severe' : detriment >= 20 ? 'Elevated' : detriment >= 10 ? 'Guarded' : 'Low';

  PILLARS.forEach(p => {
    const value = totals.pillars[p.key];
    const width = Math.min(100, (value / maxPillar) * 100);
    const color = value >= 30 ? 'var(--bad)' : value >= 18 ? 'var(--warn)' : 'var(--good)';
    document.getElementById(`pillar-val-${p.key}`).textContent = value;
    document.getElementById(`pillar-bar-${p.key}`).style.width = `${width}%`;
    document.getElementById(`pillar-bar-${p.key}`).style.background = color;
    document.getElementById(`mini-${p.key}`).style.width = `${Math.min(100, value)}%`;
    document.getElementById(`mini-${p.key}`).style.background = color;
    document.getElementById(`mini-label-${p.key}`).textContent = value;
  });

  SECONDARY.forEach(s => {
    const value = totals.secondary[s.key];
    const width = Math.min(100, (value / maxSecondary) * 100);
    const color = value >= 20 ? 'var(--bad)' : value >= 12 ? 'var(--warn)' : 'var(--good)';
    document.getElementById(`secondary-bar-${s.key}`).style.width = `${width}%`;
    document.getElementById(`secondary-bar-${s.key}`).style.background = color;
    document.getElementById(`secondary-val-${s.key}`).textContent = value;
  });

  decisionLog.innerHTML = totals.log.length
    ? totals.log.map(item => `
        <div class="log-item">
          <h5>${item.title}</h5>
          <p><strong>${item.choice}</strong><br>${item.consequence}</p>
        </div>
      `).join('')
    : '<div class="log-item"><p>No decisions recorded yet.</p></div>';
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  state.participant = displayNameInput.value.trim();
  state.index = 0;
  state.answers = {};
  activeScenario = scenarioLibrary[Number(scenarioSelect.value)] || scenarioLibrary[0];
  persistSession();
  showExercise();
  renderAll();
});

scenarioUpload.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    validateScenario(json);
    scenarioLibrary.unshift(json);
    populateScenarioSelect();
    scenarioSelect.value = '0';
  } catch (err) {
    alert(`Scenario file could not be loaded: ${err.message}`);
  }
});

function validateScenario(json) {
  if (!json.meta?.id || !json.meta?.title || !Array.isArray(json.questions)) {
    throw new Error('Invalid scenario format.');
  }
  if (json.questions.length < 2 || json.questions.length > 10) {
    throw new Error('Scenario must contain between 2 and 10 questions.');
  }
}

prevBtn.addEventListener('click', () => {
  state.index = Math.max(0, state.index - 1);
  persistSession();
  renderQuestion();
});

nextBtn.addEventListener('click', () => {
  state.index = Math.min(activeScenario.questions.length - 1, state.index + 1);
  persistSession();
  renderQuestion();
});

resetSessionBtn.addEventListener('click', resetSession);

boot();
