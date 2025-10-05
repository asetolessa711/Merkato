const path = require('path');

describe('azureContentModerator BYPASS behavior', () => {
  const imgPath = path.join(__dirname, 'dummy-bypass.jpg');
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    // simulate non-test environment so BYPASS can be effective
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterEach(() => {
    jest.resetModules();
    delete process.env.AZURE_MODERATION_BYPASS;
    delete process.env.AZURE_CM_TEST_REAL;
  });

  test('returns safe pass object when AZURE_MODERATION_BYPASS=true (non-test env)', async () => {
    process.env.AZURE_MODERATION_BYPASS = 'true';
    const { moderateImage } = require('../../utils/azureContentModerator');
    const result = await moderateImage(imgPath);
    expect(result).toMatchObject({
      IsImageAdultClassified: false,
      IsImageRacyClassified: false,
    });
  });
});
