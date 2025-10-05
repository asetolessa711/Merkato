// azureContentModerator.js
// Utility for Azure Content Moderator image moderation
const axios = require('axios');
const fs = require('fs');

async function moderateImage(imagePath) {
  // Evaluate environment at call-time to honor per-test overrides
  const endpoint = process.env.AZURE_CM_ENDPOINT; // e.g. https://<region>.api.cognitive.microsoft.com
  const key = process.env.AZURE_CM_KEY;
  const testReal = String(process.env.AZURE_CM_TEST_REAL || 'false').toLowerCase() === 'true';
  const BYPASS = String(process.env.AZURE_MODERATION_BYPASS).toLowerCase() === 'true' && process.env.NODE_ENV !== 'test' && !testReal;

  // Global bypass (not in tests unless explicitly forcing real mode)
  if (BYPASS) {
    return {
      AdultClassificationScore: 0,
      IsImageAdultClassified: false,
      RacyClassificationScore: 0,
      IsImageRacyClassified: false,
    };
  }

  // In dev/misconfigured environments: return safe pass by default, but allow forcing real behavior via AZURE_CM_TEST_REAL
  if (!endpoint || !key || key === 'dummy') {
    if (testReal) {
      throw new Error('Azure moderation failed: misconfigured');
    }
    return {
      AdultClassificationScore: 0,
      IsImageAdultClassified: false,
      RacyClassificationScore: 0,
      IsImageRacyClassified: false,
    };
  }

  const url = `${endpoint}/contentmoderator/moderate/v1.0/ProcessImage/Evaluate`;
  const imageData = fs.readFileSync(imagePath);
  try {
    const res = await axios.post(url, imageData, {
      headers: {
        'Content-Type': 'image/jpeg', // or image/png
        'Ocp-Apim-Subscription-Key': key,
      },
      // Let us handle non-2xx statuses explicitly
      validateStatus: () => true,
      timeout: Number(process.env.AZURE_CM_TIMEOUT_MS || 10000),
    });
    if (!res || res.status >= 400) {
      const statusText = (res && (res.statusText || res.data?.message || res.data?.error || res.status)) || 'Error';
      throw new Error(`Azure moderation failed: ${statusText}`);
    }
    return res.data;
  } catch (err) {
    if (err && (err.code === 'ECONNABORTED' || /timeout/i.test(err.message))) {
      throw new Error('Azure moderation failed: timeout');
    }
    const msg = err?.response?.statusText || err?.response?.data?.message || err.message || 'unknown error';
    throw new Error(`Azure moderation failed: ${msg}`);
  }
}

module.exports = { moderateImage };
