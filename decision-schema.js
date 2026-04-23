export const CAPABILITY_AXES = [
  'situationalAwareness',
  'alignmentWithPrinciples',
  'ethicalSafetyImpact',
  'decisiveness',
  'transparency'
];

export const ANCHOR_LABELS = {
  0: 'absent_or_harmful',
  1: 'weak_late_unclear',
  2: 'partial_major_gaps',
  3: 'adequate_defensible',
  4: 'strong_clear_well_reasoned',
  5: 'anticipatory_clear_evidence_based'
};

export const VALIDATION_FLAGS = [
  'missedCriticalFact',
  'noNamedOwner',
  'noReviewTrigger',
  'principleNotReferenced',
  'safetyNotAddressed',
  'vulnerableGroupIgnored',
  'unknownsNotStated',
  'communicationMissingKnownUnknownSplit',
  'decisionPastDeadline',
  'scoreLowConfidence',
  'facilitatorOverrideUsed'
];

/**
 * @typedef {Object} DecisionRecord
 * @property {string} decisionId
 * @property {string} scenarioId
 * @property {string} injectId
 * @property {string} actorId
 * @property {string} actorRole
 * @property {string} teamId
 * @property {number} timestamp
 * @property {string} selectedOptionId
 * @property {string} decisionText
 * @property {string} rationaleText
 * @property {string} communicationText
 * @property {string[]} principleRefs
 * @property {string[]} namedRisks
 * @property {string[]} namedUnknowns
 * @property {string[]} namedStakeholders
 * @property {string[]} safetyConsiderations
 * @property {string} ownerAssignedTo
 * @property {number|null} nextReviewAt
 * @property {string} escalatedTo
 * @property {string} facilitatorNotes
 * @property {string[]} evidenceRefs
 * @property {Object} scoreBreakdown
 * @property {Object} confidenceBreakdown
 * @property {string[]} validationFlags
 */

export function makeDecisionId(scenarioId, injectId, actorId) {
  return `${scenarioId}::${injectId}::${actorId}::${Date.now()}`;
}
