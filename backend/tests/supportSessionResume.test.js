const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual handler without starting the server or touching a database.
const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
function harness({ active = false, authorized = true, joined = true } = {}) {
  const sessions = active ? { customer_71: { id: 'customer_71' } } : {};
  const events = [];
  let handler;
  const start = source.indexOf("  socket.on('resume_support_session',");
  assert.ok(start >= 0);
  const end = source.indexOf('\n  });', start) + 6;
  vm.runInNewContext(source.slice(start, end), {
    socket: { on: (_, fn) => { handler = fn; }, rooms: new Set(joined ? ['customer_71'] : []), emit: event => events.push(event) },
    socketAuthorizer: { authorizeSupportRoom: () => authorized },
    activeSupportSessions: sessions,
    rejectSocketAction: (_, event) => events.push('rejected:' + event),
  });
  let response;
  handler({ room: 'customer_71' }, value => { response = JSON.parse(JSON.stringify(value)); });
  return { sessions, events, response, handler };
}

test('offline return to an ended chat closes local live mode without creating a session', () => {
  const result = harness();
  assert.deepEqual(result.sessions, {});
  assert.deepEqual(result.events, ['session_closed']);
  assert.deepEqual(result.response, { success: true, active: false });
});
test('active session resume remains active without start notifications or replacement', () => {
  const result = harness({ active: true });
  assert.deepEqual(result.sessions, { customer_71: { id: 'customer_71' } });
  assert.deepEqual(result.events, []);
  assert.deepEqual(result.response, { success: true, active: true });
});
test('resume rejects unauthorized and unjoined rooms without exposing their state', () => {
  for (const options of [{ authorized: false }, { joined: false }]) {
    const result = harness({ ...options, active: true });
    assert.deepEqual(result.response, { success: false });
    assert.deepEqual(result.events, ['rejected:resume_support_session']);
  }
});
test('acknowledgement is optional and repeated inactive resumes never start a chat', () => {
  const result = harness();
  result.handler({ room: 'customer_71' });
  result.handler({ room: 'customer_71' }, 'invalid callback');
  assert.deepEqual(result.sessions, {});
  assert.equal(result.events.length, 3);
});
test('shared mobile code starts only from explicit Live action, not reconnect or restoration', () => {
  const mobile = fs.readFileSync(path.join(__dirname, '../../mobile-app/screens/CustomerChatbotPage.jsx'), 'utf8');
  const startFlow = mobile.slice(mobile.indexOf('const startLiveSupport ='), mobile.indexOf('const endLiveSupport ='));
  assert.equal((mobile.match(/emit\('start_support_session'/g) || []).length, 1);
  assert.match(startFlow, /setHumanMessages\(\[createLiveSupportWelcome\(\)\]\)/);
  assert.match(startFlow, /emit\('start_support_session'/);
  assert.equal((mobile.match(/emit\('resume_support_session'/g) || []).length, 3);
});
test('web distinguishes explicit start from reconnect and checks foreground restoration', () => {
  const web = fs.readFileSync(path.join(__dirname, '../../web-app/src/components/ChatWidget.js'), 'utf8');
  assert.equal((web.match(/emit\('start_support_session'/g) || []).length, 1);
  assert.match(web, /if \(explicitLiveStartRef.current\)\s*\{\s*explicitLiveStartRef.current = false;\s*socket.emit\('start_support_session'/);
  assert.match(web, /const freshMessages = \[createLiveSupportWelcome\(\)\]/);
  assert.match(web, /sessionStorage.setItem\('chat_humanMessages', JSON.stringify\(freshMessages\)\)/);
  assert.match(web, /document.addEventListener\('visibilitychange', visibilityHandler\)/);
  assert.match(web, /document.removeEventListener\('visibilitychange', visibilityHandler\)/);
});
test('admin clients treat a reused customer room with a new session id as a new chat', () => {
  const mobileAdmin = fs.readFileSync(path.join(__dirname, '../../mobile-app/screens/AdminChat.jsx'), 'utf8');
  const webAdmin = fs.readFileSync(path.join(__dirname, '../../web-app/src/pages/AdminChat.js'), 'utf8');

  assert.match(mobileAdmin, /currentSession\.sessionId !== sel\.sessionId/);
  assert.match(mobileAdmin, /setMessages\(\[\]\)/);
  assert.match(webAdmin, /currentSession\.sessionId !== sel\.sessionId/);
  assert.match(webAdmin, /key=\{`\$\{selectedAppointment\.id\}:\$\{selectedAppointment\.sessionId\}`\}/);
});
