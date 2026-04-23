import { CAPABILITY_AXES, ANCHOR_LABELS } from './decision-schema.js';

const DEFAULT_CONFIDENCE_WEIGHTS = {
  evidenceCoverage: 0.25,
  ruleCoverage: 0.25,
  dataCompleteness: 0.25,
  facilitatorOverridePresence: 0.15,
  optionalRaterAgreement: 0.1
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function signalScore(signals) {
  const total = signals.reduce((acc, curr) => acc + (curr ? 1 : 0), 0);
  return clamp(total, 0, 5);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((acc, curr) => acc + curr, 0) / values.length;
}

function includesAny(text, phrases = []) {
  const haystack = String(text || '').toLowerCase();
  return phrases.some((item) => haystack.includes(String(item).toLowerCase()));
}

function scoreSituationalAwareness(decision, inject) {
  const textParts = [decision.decisionText, decision.rationaleText, decision.communicationText].join(' ');
  return signalScore([
    (inject.criticalFactsAvailable || []).every((fact) => includesAny(textParts, [fact])),
    includesAny(textParts, ['already', 'in progress', 'under way', 'ongoing']),
    decision.namedRisks.length > 0,
    decision.namedUnknowns.length > 0,
    includesAny(textParts, ['next', 'likely', 'secondary effect', 'knock-on'])
  ]);
}

function scoreAlignmentWithPrinciples(decision, inject, priorDecisions) {
  const expected = inject.expectedPrinciples || [];
  const text = `${decision.rationaleText} ${decision.facilitatorNotes}`;
  return signalScore([
    decision.principleRefs.length > 0,
    decision.rationaleText.trim().length >= 20,
    priorDecisions.length === 0 || decision.principleRefs.some((p) => priorDecisions.some((d) => d.principleRefs.includes(p))),
    includesAny(text, ['exception', 'trade-off', 'deviation']) || !includesAny(text, ['override']),
    !includesAny(text, ['because obvious', 'trust me', 'just do it']) && (expected.length === 0 || decision.principleRefs.some((p) => expected.includes(p)))
  ]);
}

function scoreEthicalSafetyImpact(decision, inject) {
  const safety = inject.safetyPriorities || [];
  const text = `${decision.decisionText} ${decision.communicationText}`;
  return signalScore([
    includesAny(text, ['life', 'critical safety']) || safety.includes('life'),
    includesAny(text, ['staff', 'stakeholder', 'welfare']) || decision.namedStakeholders.length > 0,
    includesAny(text, ['vulnerable', 'at-risk']) || decision.namedStakeholders.some((s) => /vulnerable/i.test(s)),
    includesAny(text, ['reduce harm', 'minimise harm', 'avoidable harm']) || decision.namedRisks.length > 0,
    includesAny(text, ['mitigation', 'control', 'safeguard']) || decision.safetyConsiderations.length > 0
  ]);
}

function scoreDecisiveness(decision, inject) {
  const deadlineMs = Number(inject.decisionDeadlineSeconds || 0) * 1000;
  const withinDeadline = deadlineMs === 0 || (decision.decisionLatencyMs || 0) <= deadlineMs;
  const reviewed = Boolean(decision.nextReviewAt);
  return signalScore([
    withinDeadline,
    Boolean(decision.ownerAssignedTo),
    Boolean(decision.escalatedTo) || includesAny(decision.facilitatorNotes, ['no escalation needed']),
    reviewed,
    includesAny(decision.facilitatorNotes, ['revised', 'updated']) || includesAny(decision.rationaleText, ['revised']) || !decision.previousDecisionId
  ]);
}

function scoreTransparency(decision, inject) {
  const minimum = inject.minimumTransparencyElements || ['known', 'unknown', 'actions', 'guidance', 'nextUpdate'];
  const text = decision.communicationText.toLowerCase();
  const matchMap = {
    known: /known|confirmed/.test(text),
    unknown: /unknown|not yet known|unconfirmed/.test(text),
    actions: /doing|action|responding|contain/.test(text),
    guidance: /you should|customers should|staff should|guidance/.test(text),
    nextUpdate: /next update|update at|by \d/.test(text)
  };
  return signalScore(minimum.map((item) => Boolean(matchMap[item])));
}

function confidenceForAxis(ruleHits, possibleRules, decision) {
  const evidenceCoverage = clamp((decision.evidenceRefs.length || 0) / 5, 0, 1);
  const ruleCoverage = clamp(possibleRules ? ruleHits / possibleRules : 0, 0, 1);
  const required = [decision.decisionText, decision.rationaleText, decision.communicationText, decision.ownerAssignedTo];
  const dataCompleteness = required.filter(Boolean).length / required.length;
  const facilitatorOverridePresence = decision.facilitatorNotes ? 1 : 0;
  const optionalRaterAgreement = typeof decision.optionalRaterAgreement === 'number' ? clamp(decision.optionalRaterAgreement, 0, 1) : 0.5;
  const conf =
    evidenceCoverage * DEFAULT_CONFIDENCE_WEIGHTS.evidenceCoverage +
    ruleCoverage * DEFAULT_CONFIDENCE_WEIGHTS.ruleCoverage +
    dataCompleteness * DEFAULT_CONFIDENCE_WEIGHTS.dataCompleteness +
    (1 - facilitatorOverridePresence) * DEFAULT_CONFIDENCE_WEIGHTS.facilitatorOverridePresence +
    optionalRaterAgreement * DEFAULT_CONFIDENCE_WEIGHTS.optionalRaterAgreement;
  return Number(conf.toFixed(2));
}

export function scoreDecisionCapability(decision, inject = {}, priorDecisions = []) {
  const axisScores = {
    situationalAwareness: scoreSituationalAwareness(decision, inject),
    alignmentWithPrinciples: scoreAlignmentWithPrinciples(decision, inject, priorDecisions),
    ethicalSafetyImpact: scoreEthicalSafetyImpact(decision, inject),
    decisiveness: scoreDecisiveness(decision, inject),
    transparency: scoreTransparency(decision, inject)
  };

  const axisConfidence = Object.fromEntries(
    CAPABILITY_AXES.map((axis) => [axis, confidenceForAxis(axisScores[axis], 5, decision)])
  );

  const validationFlags = [];
  if ((inject.criticalFactsAvailable || []).some((fact) => !includesAny(`${decision.decisionText} ${decision.rationaleText}`, [fact]))) validationFlags.push('missedCriticalFact');
  if (!decision.ownerAssignedTo) validationFlags.push('noNamedOwner');
  if (!decision.nextReviewAt) validationFlags.push('noReviewTrigger');
  if (!decision.principleRefs.length) validationFlags.push('principleNotReferenced');
  if (!decision.safetyConsiderations.length) validationFlags.push('safetyNotAddressed');
  if ((inject.stakeholderGroups || []).includes('vulnerableGroups') && !decision.namedStakeholders.some((s) => /vulnerable/i.test(s))) validationFlags.push('vulnerableGroupIgnored');
  if (!decision.namedUnknowns.length) validationFlags.push('unknownsNotStated');
  if (!/known|confirmed/i.test(decision.communicationText) || !/unknown|unconfirmed/i.test(decision.communicationText)) validationFlags.push('communicationMissingKnownUnknownSplit');
  if (inject.decisionDeadlineSeconds && (decision.decisionLatencyMs || 0) > inject.decisionDeadlineSeconds * 1000) validationFlags.push('decisionPastDeadline');

  const overallScore = Number(average(Object.values(axisScores)).toFixed(2));
  const overallConfidence = Number(average(Object.values(axisConfidence)).toFixed(2));
  if (overallConfidence < 0.45) validationFlags.push('scoreLowConfidence');
  if (decision.facilitatorNotes) validationFlags.push('facilitatorOverrideUsed');

  return {
    axes: Object.fromEntries(CAPABILITY_AXES.map((axis) => [axis, {
      score: axisScores[axis],
      anchor: ANCHOR_LABELS[axisScores[axis]],
      confidence: axisConfidence[axis]
    }])),
    overallScore,
    overallConfidence,
    validationFlags,
    scoreEvidence: {
      equalAxisWeighting: true,
      equalSignalWeighting: true,
      equalMomentWeighting: true
    }
  };
}
