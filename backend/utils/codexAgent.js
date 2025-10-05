// Lazy/optional load of OpenAI client to avoid require-time failures in test/CI
const IS_TEST = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
let client = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  // Fast-path forced mock (used in unit tests to avoid any dependency on openai module shape)
  if (process.env.CODEX_FORCE_MOCK === 'true') {
    client = {
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content: 'mocked-response' } }],
          }),
        },
      },
    };
    return client;
  }
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
    // Handle various export patterns and Jest virtual mocks
    if (mod && mod.OpenAI) {
      OpenAIImpl = mod.OpenAI; // { OpenAI: class }
    } else if (mod && typeof mod === 'function') {
      OpenAIImpl = mod; // direct class/function export
    } else if (mod && mod.default && mod.default.OpenAI) {
      OpenAIImpl = mod.default.OpenAI;
    } else if (mod && mod.default && typeof mod.default === 'function') {
      OpenAIImpl = mod.default;
    }
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
    return response.choices?.[0]?.message?.content || '[codex-empty]';
  } catch (err) {
    // In test environments or for auth/network errors, degrade gracefully
    if (IS_TEST || (err && /unauthorized|api key|401/i.test(err.message || ''))) {
      return '[codex-disabled]';
    }
    throw err;
  }
}

module.exports = { runCodex };
