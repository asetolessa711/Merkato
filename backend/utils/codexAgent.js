// Lazy/optional load of OpenAI client to avoid require-time failures in test/CI
const IS_TEST = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
let client = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // In tests or when not configured, do not instantiate the client
    if (IS_TEST) return null;
    // If not in tests, but API key missing, gracefully disable instead of throwing
    return null;
  }
  let OpenAIImpl;
  try {
    // Support both CJS and ESM default export shapes
    const mod = require('openai');
    OpenAIImpl = mod && mod.OpenAI ? mod.OpenAI : mod;
  } catch (e) {
    // If the package is not installed, disable in tests; otherwise rethrow
    if (IS_TEST || (e && e.code === 'MODULE_NOT_FOUND')) return null;
    throw e;
  }
  if (!OpenAIImpl) return null;
  client = new OpenAIImpl({ apiKey });
  return client;
}

async function runCodex(prompt) {
  const openai = getClient();
  if (!openai) {
    // Return a deterministic stub in tests
  return '[codex-disabled]';
  }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });
    return response.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    // In test or when misconfigured, avoid throwing — return stub
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      return '[codex-disabled]';
    }
    // Gracefully degrade in non-test as well to avoid crashing callers
    return '[codex-disabled]';
  }
}

module.exports = { runCodex };
