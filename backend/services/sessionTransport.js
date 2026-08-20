const {
  IS_PRODUCTION,
  REFRESH_TOKEN_TTL_DAYS,
  REFRESH_COOKIE_SAME_SITE,
} = require('../config/runtime');

const REFRESH_COOKIE_NAME = 'inkvistar_refresh';

function parseCookies(req) {
  return String(req.headers.cookie || '').split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return cookies;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: REFRESH_COOKIE_SAME_SITE,
  path: '/api/auth',
  maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
});

function isMobileLoginRequest(req) {
  return req.body?.clientType === 'mobile' && !req.headers.origin;
}

function getRefreshToken(req) {
  return req.body?.refreshToken || parseCookies(req)[REFRESH_COOKIE_NAME] || null;
}

function deliverRefreshToken(req, res, refreshToken, clientType) {
  if (clientType === 'mobile' && isMobileLoginRequest(req)) return { refreshToken };
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions());
  return {};
}

function rotateRefreshTokenResponse(req, res, refreshToken) {
  if (req.body?.refreshToken) return { refreshToken };
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions());
  return {};
}

function clearRefreshCookie(res) {
  const options = cookieOptions();
  delete options.maxAge;
  res.clearCookie(REFRESH_COOKIE_NAME, options);
}

module.exports = {
  clearRefreshCookie,
  deliverRefreshToken,
  getRefreshToken,
  isMobileLoginRequest,
  rotateRefreshTokenResponse,
};
