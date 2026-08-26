const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_ENDPOINT = 'https://exp.host/--/api/v2/push/getReceipts';
const EXPO_PUSH_TOKEN_PATTERN = /^(?:Expo|Exponent)PushToken\[[^\]]+\]$/;

function isExpoPushToken(token) {
  return EXPO_PUSH_TOKEN_PATTERN.test(String(token || '').trim());
}

function buildExpoPushMessages(tokens, title, body, data = {}) {
  const uniqueTokens = [...new Set((tokens || []).map(token => String(token || '').trim()))];
  return uniqueTokens
    .filter(isExpoPushToken)
    .map(to => ({
      to,
      title: String(title || '').slice(0, 200),
      body: String(body || '').slice(0, 4000),
      data,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    }));
}

function expoHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function sendExpoPushBatch({ fetchImpl, tokens, title, body, data = {}, accessToken }) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  const messages = buildExpoPushMessages(tokens, title, body, data);
  if (!messages.length) return { messages, tickets: [] };

  const response = await fetchImpl(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: expoHeaders(accessToken),
    body: JSON.stringify(messages),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result?.errors?.[0]?.message || `Expo push request failed with HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }

  const tickets = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];
  return { messages, tickets };
}

async function fetchExpoPushReceipts({ fetchImpl, ticketIds, accessToken }) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  const ids = [...new Set((ticketIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const response = await fetchImpl(EXPO_RECEIPTS_ENDPOINT, {
    method: 'POST',
    headers: expoHeaders(accessToken),
    body: JSON.stringify({ ids }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.errors?.[0]?.message || `Expo receipt request failed with HTTP ${response.status}.`);
  return result?.data || {};
}

function getImmediatelyInvalidTokens(messages, tickets) {
  return tickets.flatMap((ticket, index) => {
    const isUnregistered = ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered';
    return isUnregistered && messages[index]?.to ? [messages[index].to] : [];
  });
}

function getReceiptInvalidTokens(messages, tickets, receipts) {
  return tickets.flatMap((ticket, index) => {
    const receipt = ticket?.id ? receipts?.[ticket.id] : null;
    const isUnregistered = receipt?.status === 'error' && receipt?.details?.error === 'DeviceNotRegistered';
    return isUnregistered && messages[index]?.to ? [messages[index].to] : [];
  });
}

module.exports = {
  EXPO_PUSH_ENDPOINT,
  EXPO_RECEIPTS_ENDPOINT,
  isExpoPushToken,
  buildExpoPushMessages,
  sendExpoPushBatch,
  fetchExpoPushReceipts,
  getImmediatelyInvalidTokens,
  getReceiptInvalidTokens,
};
