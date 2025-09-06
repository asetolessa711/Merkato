const OpenAI = require("openai");

const IS_TEST = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
let client = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // In tests or when not configured, do not instantiate the client
    if (IS_TEST) return null;
    throw new Error('OPENAI_API_KEY is not set');
  }
  client = new OpenAI({ apiKey });
  return client;
}

async function runCodex(prompt) {
  const openai = getClient();
  if (!openai) {
    // Return a deterministic stub in tests
    return '[codex-disabled]';
  }
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
  });
  return response.choices[0].message.content;
}

module.exports = { runCodex };
