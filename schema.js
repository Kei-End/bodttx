export const CAPABILITY_AXES = [
  { key: 'situationalAwareness', label: 'Situational Awareness' },
  { key: 'alignmentWithPrinciples', label: 'Alignment with Principles' },
  { key: 'ethicalSafetyImpact', label: 'Ethical / Safety Impact' },
  { key: 'decisiveness', label: 'Decisiveness' },
  { key: 'transparency', label: 'Transparency' }
];

export const SCORE_ANCHORS = {
  0: 'absent_or_harmful',
  1: 'weak_late_unclear',
  2: 'partial_major_gaps',
  3: 'adequate_defensible',
  4: 'strong_clear_well_reasoned',
  5: 'anticipatory_clear_evidence_based'
};

export const SESSION_VERSION = 'v2';

export function validateScenario(json) {
  if (!json?.meta?.id || !json?.meta?.title || !Array.isArray(json.questions)) {
    throw new Error('Invalid scenario format.');
  }
  if (json.questions.length < 2 || json.questions.length > 10) {
    throw new Error('Scenario must contain between 2 and 10 questions.');
  }
  json.questions.forEach((question) => {
    if (!question.id || !question.text || !Array.isArray(question.answers) || question.answers.length === 0) {
      throw new Error(`Question ${question.id || '(unknown)'} is missing required fields.`);
    }
  });
  return true;
}

export function buildEmptyDecisionRecord(partial = {}) {
  return {
    decisionId: '',
    scenarioId: '',
    injectId: '',
    actorId: '',
    actorRole: '',
    teamId: '',
    timestamp: new Date().toISOString(),
    selectedOptionId: '',
    decisionText: '',
    rationaleText: '',
    communicationText: '',
    principleRefs: [],
    namedRisks: [],
    namedUnknowns: [],
    namedStakeholders: [],
    safetyConsiderations: [],
    ownerAssignedTo: '',
    nextReviewAt: '',
    escalatedTo: '',
    facilitatorNotes: '',
    evidenceRefs: [],
    scoreBreakdown: {},
    confidenceBreakdown: {},
    validationFlags: [],
    ...partial
  };
}
