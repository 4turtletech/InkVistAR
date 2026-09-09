// Groq retired llama-3.3-70b-versatile for free/developer accounts on 2026-08-16.
// Keep provider choice configurable without changing request sites or bypassing failures.
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const groqRequest = ({ message, systemPrompt, model = DEFAULT_GROQ_MODEL }) => ({
  model,
  messages: [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: message },
  ],
  temperature: 0.7,
  max_completion_tokens: 1024,
  ...(model.startsWith('openai/gpt-oss-') ? { reasoning_effort: 'low', include_reasoning: false } : {}),
});

module.exports = { DEFAULT_GROQ_MODEL, groqRequest };
