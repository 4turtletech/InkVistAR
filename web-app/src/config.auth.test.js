jest.mock('axios', () => {
  const axios = jest.fn(() => Promise.resolve({ data: { success: true } }));
  axios.defaults = {};
  axios.interceptors = { request: { use: jest.fn() }, response: { use: jest.fn() } };
  axios.create = jest.fn(() => ({ post: jest.fn() }));
  return axios;
});

let config;
let axios;
let refresh;
let request;
let failedResponse;
const jwt = (seconds, id = 'token') => `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds, jti: id }))}.signature`;
const unauthorized = token => ({ response: { status: 401 }, config: {
  url: 'http://localhost:3001/api/customer/profile/71', headers: { Authorization: `Bearer ${token}` },
} });

beforeEach(() => {
  jest.resetModules();
  localStorage.clear();
  localStorage.setItem('user', JSON.stringify({ id: 71, type: 'customer' }));
  config = require('./config');
  axios = require('axios');
  refresh = axios.create.mock.results[0].value.post;
  request = axios.interceptors.request.use.mock.calls[0][0];
  failedResponse = axios.interceptors.response.use.mock.calls[0][1];
});

test('renews expired/near-expiry access tokens before sending a request', async () => {
  const fresh = jwt(900);
  config.setAccessToken(jwt(10));
  refresh.mockResolvedValue({ data: { accessToken: fresh } });
  const result = await request({ url: '/api/customer/profile/71', headers: {} });
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(result.headers.Authorization).toBe(`Bearer ${fresh}`);
});

test('a 401 replaces the rejected token even if its local expiry has not passed', async () => {
  const old = jwt(900, 'old');
  const fresh = jwt(900, 'new');
  config.setAccessToken(old);
  refresh.mockResolvedValue({ data: { accessToken: fresh } });
  await failedResponse(unauthorized(old));
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(axios).toHaveBeenCalledWith(expect.objectContaining({ headers: { Authorization: `Bearer ${fresh}` }, _authRetried: true }));
});

test('concurrent and delayed 401s share one renewal and reuse the newer token', async () => {
  const old = jwt(900, 'old');
  const fresh = jwt(900, 'new');
  config.setAccessToken(old);
  refresh.mockResolvedValue({ data: { accessToken: fresh } });
  await Promise.all([failedResponse(unauthorized(old)), failedResponse(unauthorized(old))]);
  await failedResponse(unauthorized(old));
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(axios).toHaveBeenCalledTimes(3);
});

test.each([500, 503, undefined])('transient refresh failure (%s) retains the session for retry', async status => {
  config.setAccessToken(jwt(-10));
  const error = { response: status ? { status } : undefined };
  refresh.mockRejectedValue(error);
  await expect(request({ url: '/api/customer/profile/71', headers: {} })).rejects.toBe(error);
  expect(localStorage.getItem('user')).not.toBeNull();
  expect(await config.getSocketAccessToken()).toBeNull();
  expect(localStorage.getItem('user')).not.toBeNull();
  refresh.mockResolvedValue({ data: { accessToken: jwt(900) } });
  await expect(request({ url: '/api/customer/profile/71', headers: {} })).resolves.toHaveProperty('headers.Authorization');
});

test('a genuinely revoked refresh session clears local login state', async () => {
  config.setAccessToken(jwt(-10));
  refresh.mockRejectedValue({ response: { status: 401 } });
  await expect(request({ url: '/api/customer/profile/71', headers: {} })).rejects.toBeDefined();
  expect(localStorage.getItem('user')).toBeNull();
});

test('refresh finishing after logout cannot restore local credentials', async () => {
  let resolve;
  refresh.mockReturnValue(new Promise(done => { resolve = done; }));
  const pending = request({ url: '/api/customer/profile/71', headers: {} });
  config.clearWebSession();
  resolve({ data: { accessToken: jwt(900), user: { id: 71 } } });
  await expect(pending).rejects.toThrow('Session changed');
  expect(localStorage.getItem('user')).toBeNull();
  expect(config.getAccessToken()).toBeNull();
});

test('login and already-retried requests never enter a refresh loop', async () => {
  await request({ url: '/api/login', headers: {} });
  const error = unauthorized(jwt(-1));
  error.config._authRetried = true;
  await expect(failedResponse(error)).rejects.toBe(error);
  expect(refresh).not.toHaveBeenCalled();
});

test('cookie rotation is coordinated between tabs when Web Locks is available', async () => {
  const lock = jest.fn((name, callback) => callback());
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: lock } });
  try {
    refresh.mockResolvedValue({ data: { accessToken: jwt(900) } });
    await request({ url: '/api/customer/profile/71', headers: {} });
    expect(lock).toHaveBeenCalledWith('inkvistar-session-refresh', expect.any(Function));
  } finally {
    delete navigator.locks;
  }
});
