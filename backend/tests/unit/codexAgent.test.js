const path = require('path');

// Helper to re-require the module with a clean cache and optional mocks
async function loadCodexAgent({ withMockOpenAI, throwOpenAIOnRequire } = {}) {
  jest.resetModules();
  // Optionally mock the 'openai' package
  if (withMockOpenAI) {
    jest.doMock('openai', () => {
      class MockOpenAI {
        constructor() {}
        chat = {
          completions: {
            create: jest.fn(async () => ({
              choices: [{ message: { content: 'mocked-response' } }],
            })),
          },
        };
      }
      return { OpenAI: MockOpenAI };
    }, { virtual: true });
  } else if (throwOpenAIOnRequire) {
    // Simulate missing module by throwing MODULE_NOT_FOUND upon require
    jest.doMock('openai', () => {
      const err = new Error('Cannot find module "openai"');
      err.code = 'MODULE_NOT_FOUND';
      throw err;
    }, { virtual: true });
  } else {
    // Ensure any previous mock is cleared so require('openai') behaves normally
    try { jest.dontMock('openai'); } catch (_) {}
  }
  const mod = require(path.resolve(__dirname, '../../utils/codexAgent.js'));
  return mod;
}

describe('utils/codexAgent.runCodex', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' }; // mark test environment
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  test('returns disabled stub when no OPENAI_API_KEY is set (test env)', async () => {
    delete process.env.OPENAI_API_KEY;
    const { runCodex } = await loadCodexAgent();
    await expect(runCodex('hello')).resolves.toBe('[codex-disabled]');
  });

  test('returns disabled stub when OPENAI module is missing (MODULE_NOT_FOUND)', async () => {
    // Simulate having an API key, but without installing the package
    process.env.OPENAI_API_KEY = 'test-key';
    const { runCodex } = await loadCodexAgent({ throwOpenAIOnRequire: true });
    await expect(runCodex('hello')).resolves.toBe('[codex-disabled]');
  });

  test('invokes OpenAI and returns content when client is available (mocked)', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const { runCodex } = await loadCodexAgent({ withMockOpenAI: true });
    await expect(runCodex('generate something')).resolves.toBe('mocked-response');
  });
});
