import { CAPABILITY_AXES } from './schema.js';

function hasAny(values) {
  return Array.isArray(values) && values.length > 0;
}

function includesAny(haystack = [], needles = []) {
  if (!needles.length) return false;
  const normalized = haystack.map(v => String(v).toLowerCase());
  return needles.some((needle) => normalized.includes(String(needle).toLowerCase()));
}

function scoreFromSignals(signals) {
  const ratio = signals.length ? signals.filter(Boolean).length / signals.length : 0;
  return Math.round(ratio * 5);
}

export function scoreSituationalAwareness(record, scenario, signal) {
  const inject = scenario.questions.find(q => q.id === record.injectId) || {};
  const factsAvailable = inject.criticalFactsAvailable || scenario.criticalFactsAvailable || [];
  return scoreFromSignals([
    includesAny(record.evidenceRefs, factsAvailable) || hasAny(record.evidenceRefs),
    signal.identifiedActionsUnderway,
    hasAny(record.namedRisks),
    hasAny(record.namedUnknowns),
    signal.anticipatedNextEffects
  ]);
}

export function scoreAlignmentWithPrinciples(record, scenario, signal) {
  const expectedPrinciples = scenario.expectedPrinciples || [];
  return scoreFromSignals([
    hasAny(record.principleRefs),
    hasAny(record.rationaleText?.split(' ').filter(Boolean)),
    includesAny(record.principleRefs, expectedPrinciples) || expectedPrinciples.length === 0,
    signal.documentedExceptionsClearly,
    !signal.unsupportedConclusions
  ]);
}

export function scoreEthicalSafetyImpact(record, scenario) {
  const priorities = scenario.safetyPriorities || [];
  return scoreFromSignals([
    includesAny(record.safetyConsiderations, ['life']) || priorities.length === 0,
    includesAny(record.safetyConsiderations, ['staff', 'stakeholders']),
    includesAny(record.safetyConsiderations, ['vulnerableGroups']),
    hasAny(record.safetyConsiderations),
    hasAny(record.namedRisks)
  ]);
}

export function scoreDecisiveness(record, scenario, signal) {
  const withinWindow = !scenario.decisionDeadlineSeconds ||
    ((new Date(record.timestamp).getTime() - signal.injectOpenedAtMs) / 1000) <= scenario.decisionDeadlineSeconds;
  return scoreFromSignals([
    withinWindow,
    Boolean(record.ownerAssignedTo),
    Boolean(record.escalatedTo),
    Boolean(record.nextReviewAt),
    signal.revisedCoherently
  ]);
}

export function scoreTransparency(record) {
  const msg = (record.communicationText || '').toLowerCase();
  return scoreFromSignals([
    msg.includes('known') || msg.includes('confirmed'),
    msg.includes('unknown') || hasAny(record.namedUnknowns),
    msg.includes('action') || msg.includes('doing'),
    msg.includes('should') || msg.includes('guidance'),
    msg.includes('next update') || Boolean(record.nextReviewAt)
  ]);
}

export function deriveValidationFlags(record, scenario, confidenceBreakdown, scoreBreakdown) {
  const flags = [];
  const critical = scenario.criticalFactsAvailable || [];
  if (critical.length && !includesAny(record.evidenceRefs, critical)) flags.push('missedCriticalFact');
  if (!record.ownerAssignedTo) flags.push('noNamedOwner');
  if (!record.nextReviewAt) flags.push('noReviewTrigger');
  if (!hasAny(record.principleRefs)) flags.push('principleNotReferenced');
  if (!hasAny(record.safetyConsiderations)) flags.push('safetyNotAddressed');
  if (!includesAny(record.safetyConsiderations, ['vulnerableGroups'])) flags.push('vulnerableGroupIgnored');
  if (!hasAny(record.namedUnknowns)) flags.push('unknownsNotStated');
  const msg = (record.communicationText || '').toLowerCase();
  if (!(msg.includes('known') && msg.includes('unknown'))) flags.push('communicationMissingKnownUnknownSplit');
  if (scenario.decisionDeadlineSeconds && record.decisionLatencySeconds > scenario.decisionDeadlineSeconds) flags.push('decisionPastDeadline');
  if (confidenceBreakdown.overall < 0.45) flags.push('scoreLowConfidence');
  if (record.facilitatorNotes) flags.push('facilitatorOverrideUsed');
  if ((scoreBreakdown.ethicalSafetyImpact || 0) <= 2 && !includesAny(record.safetyConsiderations, ['vulnerableGroups'])) {
    if (!flags.includes('vulnerableGroupIgnored')) flags.push('vulnerableGroupIgnored');
  }
  return flags;
}

export function computeConfidence(record, optionalRaterAgreement = null) {
  const evidenceCoverage = Math.min(1, (record.evidenceRefs?.length || 0) / 3);
  const ruleCoverage = Math.min(1, (record.principleRefs?.length || 0) / 2);
  const dataCompleteness = Math.min(1, [
    record.decisionText,
    record.rationaleText,
    record.communicationText,
    record.ownerAssignedTo,
    record.nextReviewAt
  ].filter(Boolean).length / 5);
  const facilitatorOverridePresence = record.facilitatorNotes ? 0.65 : 1;
  const raterAgreement = optionalRaterAgreement ?? 0.75;
  const overall = (evidenceCoverage + ruleCoverage + dataCompleteness + facilitatorOverridePresence + raterAgreement) / 5;
  return { evidenceCoverage, ruleCoverage, dataCompleteness, facilitatorOverridePresence, optionalRaterAgreement: raterAgreement, overall };
}

export function scoreDecisionRecord(record, scenario, signal = {}) {
  const resolvedSignal = {
    injectOpenedAtMs: signal.injectOpenedAtMs || Date.now(),
    identifiedActionsUnderway: Boolean(signal.identifiedActionsUnderway),
    anticipatedNextEffects: Boolean(signal.anticipatedNextEffects),
    documentedExceptionsClearly: Boolean(signal.documentedExceptionsClearly),
    unsupportedConclusions: Boolean(signal.unsupportedConclusions),
    revisedCoherently: Boolean(signal.revisedCoherently)
  };

  const scoreBreakdown = {
    situationalAwareness: scoreSituationalAwareness(record, scenario, resolvedSignal),
    alignmentWithPrinciples: scoreAlignmentWithPrinciples(record, scenario, resolvedSignal),
    ethicalSafetyImpact: scoreEthicalSafetyImpact(record, scenario),
    decisiveness: scoreDecisiveness(record, scenario, resolvedSignal),
    transparency: scoreTransparency(record)
  };

  const axisConfidence = {};
  CAPABILITY_AXES.forEach((axis) => {
    axisConfidence[axis.key] = computeConfidence(record).overall;
  });
  const confidenceBreakdown = {
    axes: axisConfidence,
    ...computeConfidence(record)
  };

  const validationFlags = deriveValidationFlags(record, scenario, confidenceBreakdown, scoreBreakdown);

  return {
    scoreBreakdown,
    confidenceBreakdown,
    validationFlags,
    overallCapability: Number((Object.values(scoreBreakdown).reduce((a, b) => a + b, 0) / CAPABILITY_AXES.length).toFixed(2))
  };
}

export function aggregateCapability(records) {
  if (!records.length) {
    return {
      axisAverages: Object.fromEntries(CAPABILITY_AXES.map(axis => [axis.key, 0])),
      overallCapability: 0,
      overallConfidence: 0
    };
  }
  const axisAverages = Object.fromEntries(CAPABILITY_AXES.map(axis => [axis.key, 0]));
  let conf = 0;
  records.forEach((record) => {
    CAPABILITY_AXES.forEach(axis => {
      axisAverages[axis.key] += record.scoreBreakdown?.[axis.key] || 0;
    });
    conf += record.confidenceBreakdown?.overall || 0;
  });
  CAPABILITY_AXES.forEach(axis => {
    axisAverages[axis.key] = Number((axisAverages[axis.key] / records.length).toFixed(2));
  });

  return {
    axisAverages,
    overallCapability: Number((Object.values(axisAverages).reduce((a, b) => a + b, 0) / CAPABILITY_AXES.length).toFixed(2)),
    overallConfidence: Number((conf / records.length).toFixed(2))
  };
}
