// Older deployed history APIs have timestamps but no message IDs. Keep a
// one-to-one fallback match so repeated identical messages are not collapsed.
export function normalizeSupportMessage(message, index = 0, origin = 'live') {
  // The deployed API returns UTC SQL DATETIME strings without a zone. Parsing
  // these as local time moves PH chat history eight hours earlier than live events.
  const rawTime = message.timestamp;
  const value = typeof rawTime === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(rawTime)
    ? `${rawTime.replace(' ', 'T')}Z` : rawTime;
  const parsed = new Date(value ?? Date.now());
  const timestamp = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return {
    ...message,
    id: String(message.id ?? `${origin}:${timestamp.getTime()}:${index}:${message.sender}:${message.text}`),
    timestamp,
    origin,
  };
}

export function mergeSupportHistory(current, history) {
  const saved = history.map((message, index) => normalizeSupportMessage(message, index, 'history'));
  const matched = new Set();
  const remaining = current.filter(message => {
    if (message.sender === 'system') return true;
    const match = saved.findIndex((candidate, index) => !matched.has(index) && (
      String(candidate.id) === String(message.id) || (
        candidate.sender === message.sender && candidate.text === message.text &&
        Math.abs(candidate.timestamp.getTime() - new Date(message.timestamp).getTime()) <= 2000
      )
    ));
    if (match < 0) return true;
    matched.add(match);
    return false;
  });
  const notices = remaining.filter(message => message.sender === 'system');
  const messages = [...saved, ...remaining.filter(message => message.sender !== 'system')]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return [...notices, ...messages];
}

export function appendSupportMessage(current, message) {
  if (message.id != null && current.some(item => String(item.id) === String(message.id))) return current;
  return [...current, normalizeSupportMessage(message)];
}
