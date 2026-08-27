function evaluateCaptchaResponse(data = {}, {
  expectedAction,
  minimumScore = 0.3,
  minimumScoreByAction = {},
  allowedHostnames = new Set(),
} = {}) {
  const hostname = String(data.hostname || '').trim().toLowerCase();
  const score = Number(data.score);
  const expectedActions = (Array.isArray(expectedAction) ? expectedAction : [expectedAction])
    .filter(Boolean);
  const actionMatches = expectedActions.length === 0 || expectedActions.includes(data.action);
  const hostnameMatches = allowedHostnames instanceof Set
    ? allowedHostnames.has(hostname)
    : Array.from(allowedHostnames || []).includes(hostname);
  const actionMinimumScore = Number(minimumScoreByAction?.[data.action]);
  const effectiveMinimumScore = Number.isFinite(actionMinimumScore)
    ? actionMinimumScore
    : minimumScore;

  return {
    valid: data.success === true
      && Number.isFinite(score)
      && score >= effectiveMinimumScore
      && actionMatches
      && hostnameMatches,
    diagnostic: {
      success: data.success === true,
      score: Number.isFinite(score) ? score : null,
      minimumScore: effectiveMinimumScore,
      action: data.action || null,
      expectedAction: expectedActions,
      hostname: hostname || null,
      errorCodes: data['error-codes'] || [],
    },
  };
}

module.exports = { evaluateCaptchaResponse };
