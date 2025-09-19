const path = require('path');
const fs = require('fs');

describe('azureContentModerator utility', () => {
  const imgPath = path.join(__dirname, 'dummy-image.jpg');

  beforeAll(() => {
    // Ensure a dummy file exists; we can mock readFileSync but this is harmless
    try { fs.writeFileSync(imgPath, Buffer.from([0xff, 0xd8, 0xff, 0xd9])); } catch (_) {}
  });

  afterAll(() => {
    try { fs.unlinkSync(imgPath); } catch (_) {}
  });

  afterEach(() => {
    jest.resetModules();
    delete process.env.AZURE_CM_ENDPOINT;
    delete process.env.AZURE_CM_KEY;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('returns pass object in dev when key missing or dummy', async () => {
    process.env.AZURE_CM_KEY = 'dummy';
    const { moderateImage } = require('../../utils/azureContentModerator');
    const result = await moderateImage(imgPath);
    expect(result).toMatchObject({
      IsImageAdultClassified: false,
      IsImageRacyClassified: false,
    });
  });

  test('returns Azure response data on success', async () => {
    process.env.AZURE_CM_ENDPOINT = 'https://example.cognitive.azure.com';
    process.env.AZURE_CM_KEY = 'real-key';
    // Mock axios
    jest.doMock('axios', () => ({
      post: jest.fn().mockResolvedValue({ data: { IsImageAdultClassified: false, IsImageRacyClassified: false, AdultClassificationScore: 0.1, RacyClassificationScore: 0.05 } })
    }));
    // Mock fs to avoid real IO cost
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from([0x00]));
    const { moderateImage } = require('../../utils/azureContentModerator');
    const result = await moderateImage(imgPath);
    expect(result).toHaveProperty('AdultClassificationScore');
  });

  test('throws with message when Azure returns error response', async () => {
    process.env.AZURE_CM_ENDPOINT = 'https://example.cognitive.azure.com';
    process.env.AZURE_CM_KEY = 'real-key';
    jest.doMock('axios', () => ({
      post: jest.fn().mockRejectedValue({ response: { data: { message: 'Bad Request' } } })
    }));
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from([0x00]));
    const { moderateImage } = require('../../utils/azureContentModerator');
    await expect(moderateImage(imgPath)).rejects.toThrow(/Azure moderation failed: Bad Request/);
  });

  test('throws with original error message on timeout', async () => {
    process.env.AZURE_CM_ENDPOINT = 'https://example.cognitive.azure.com';
    process.env.AZURE_CM_KEY = 'real-key';
    jest.doMock('axios', () => ({
      post: jest.fn().mockRejectedValue(new Error('timeout of 2000ms exceeded'))
    }));
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from([0x00]));
    const { moderateImage } = require('../../utils/azureContentModerator');
    await expect(moderateImage(imgPath)).rejects.toThrow(/Azure moderation failed: timeout/);
  });
});
