const assert = require('node:assert/strict');
const test = require('node:test');
const { evaluateCaptchaResponse } = require('../services/captchaPolicy');

const allowedHostnames = new Set(['www.inkvictusstudio.com', 'inkvictusstudio.com']);

test('mobile CAPTCHA accepts the dedicated action at the mobile score threshold', () => {
  const result = evaluateCaptchaResponse({
    success: true,
    score: 0.1,
    action: 'mobile_register',
    hostname: 'www.inkvictusstudio.com',
  }, {
    expectedAction: ['mobile_register', 'register'],
    minimumScore: 0.1,
    allowedHostnames,
  });

  assert.equal(result.valid, true);
});

test('CAPTCHA selects the score threshold from Google verified action', () => {
  const result = evaluateCaptchaResponse({
    success: true,
    score: 0.1,
    action: 'mobile_register',
    hostname: 'www.inkvictusstudio.com',
  }, {
    expectedAction: ['register', 'mobile_register'],
    minimumScore: 0.3,
    minimumScoreByAction: { mobile_register: 0.1 },
    allowedHostnames,
  });

  assert.equal(result.valid, true);
  assert.equal(result.diagnostic.minimumScore, 0.1);
});

test('browser registration cannot inherit the lower mobile score threshold', () => {
  const result = evaluateCaptchaResponse({
    success: true,
    score: 0.1,
    action: 'register',
    hostname: 'www.inkvictusstudio.com',
  }, {
    expectedAction: ['register', 'mobile_register'],
    minimumScore: 0.3,
    minimumScoreByAction: { mobile_register: 0.1 },
    allowedHostnames,
  });

  assert.equal(result.valid, false);
  assert.equal(result.diagnostic.minimumScore, 0.3);
});

test('mobile CAPTCHA temporarily accepts the previous register action during rollout', () => {
  const result = evaluateCaptchaResponse({
    success: true,
    score: 0.2,
    action: 'register',
    hostname: 'inkvictusstudio.com',
  }, {
    expectedAction: ['mobile_register', 'register'],
    minimumScore: 0.1,
    allowedHostnames,
  });

  assert.equal(result.valid, true);
});

test('browser registration still rejects scores below the browser threshold', () => {
  const result = evaluateCaptchaResponse({
    success: true,
    score: 0.2,
    action: 'register',
    hostname: 'www.inkvictusstudio.com',
  }, {
    expectedAction: 'register',
    minimumScore: 0.3,
    allowedHostnames,
  });

  assert.equal(result.valid, false);
});

test('CAPTCHA rejects a valid-looking token from an unapproved hostname', () => {
  const result = evaluateCaptchaResponse({
    success: true,
    score: 0.9,
    action: 'mobile_register',
    hostname: 'attacker.example',
  }, {
    expectedAction: 'mobile_register',
    minimumScore: 0.1,
    allowedHostnames,
  });

  assert.equal(result.valid, false);
});
