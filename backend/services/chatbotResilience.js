class ChatbotInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ChatbotInputError';
    this.status = 400;
  }
}

const withTimeout = (operation, timeoutMs, {
  code = 'CHATBOT_PROVIDER_TIMEOUT',
  message = 'AI provider request timed out.',
} = {}) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(message);
      error.code = code;
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve().then(operation), timeout])
    .finally(() => clearTimeout(timer));
};

const createChatbotResponder = ({
  provider,
  fallback,
  logger = console,
  timeoutMs = 12_000,
  failureThreshold = 3,
  cooldownMs = 60_000,
  now = () => Date.now(),
} = {}) => {
  if (typeof fallback !== 'function') {
    throw new TypeError('A chatbot fallback response function is required.');
  }

  let consecutiveFailures = 0;
  let circuitOpenUntil = 0;

  const fallbackResult = (message, context, reason) => ({
    response: fallback(message, context),
    source: 'fallback',
    degraded: true,
    reason,
  });

  const respond = async ({ message, context = {}, systemPrompt = '' } = {}) => {
    if (typeof message !== 'string' || !message.trim()) {
      throw new ChatbotInputError('Message required');
    }

    const normalizedMessage = message.trim();
    if (normalizedMessage.length > 500) {
      throw new ChatbotInputError('Message must be 500 characters or fewer');
    }

    if (typeof provider !== 'function') {
      return fallbackResult(normalizedMessage, context, 'provider_unavailable');
    }

    if (now() < circuitOpenUntil) {
      return fallbackResult(normalizedMessage, context, 'provider_cooldown');
    }

    try {
      const response = await withTimeout(
        () => provider({ message: normalizedMessage, systemPrompt, timeoutMs }),
        timeoutMs
      );

      if (typeof response !== 'string' || !response.trim()) {
        const error = new Error('AI provider returned an empty response.');
        error.code = 'CHATBOT_PROVIDER_EMPTY_RESPONSE';
        throw error;
      }

      consecutiveFailures = 0;
      circuitOpenUntil = 0;
      return {
        response: response.trim(),
        source: 'groq',
        degraded: false,
      };
    } catch (error) {
      consecutiveFailures += 1;
      if (consecutiveFailures >= failureThreshold) {
        circuitOpenUntil = now() + cooldownMs;
      }

      logger.warn?.(
        `[CHATBOT] Groq request failed (${consecutiveFailures}/${failureThreshold}): ${error?.code || error?.message || 'unknown error'}`
      );
      return fallbackResult(normalizedMessage, context, error?.code || 'provider_error');
    }
  };

  const getState = () => ({
    consecutiveFailures,
    circuitOpenUntil,
    circuitOpen: now() < circuitOpenUntil,
  });

  return { respond, getState };
};

module.exports = {
  ChatbotInputError,
  createChatbotResponder,
  withTimeout,
};
