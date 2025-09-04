// Optional OpenAI integration with safe fallback for CI/tests where the SDK isn't installed
let openai = null;
let openAIConfigured = false;

try {
  const OpenAI = require('openai');
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    openAIConfigured = true;
  }
} catch (_) {
  // openai package not installed; leave as unconfigured
  openAIConfigured = false;
}

async function runCodex(prompt) {
  if (!openAIConfigured || !openai) {
    const err = new Error('OpenAI not configured');
    err.status = 503;
    throw err;
  }
  const response = await openai.chat.completions.create({
    model: 'gpt-4', // or 'gpt-3.5-turbo'
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
  });
  return response.choices[0].message.content;
}

module.exports = { runCodex, isConfigured: openAIConfigured };