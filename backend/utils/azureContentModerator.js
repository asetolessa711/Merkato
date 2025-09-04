// azureContentModerator.js
// Utility for Azure Content Moderator image moderation
const axios = require('axios');
const fs = require('fs');

const AZURE_CM_ENDPOINT = process.env.AZURE_CM_ENDPOINT; // e.g. https://<region>.api.cognitive.microsoft.com
const AZURE_CM_KEY = process.env.AZURE_CM_KEY;

async function moderateImage(imagePath) {
  if (!AZURE_CM_ENDPOINT || !AZURE_CM_KEY || AZURE_CM_KEY === 'dummy') {
    // Mock: always pass moderation in dev
    return {
      AdultClassificationScore: 0,
      IsImageAdultClassified: false,
      RacyClassificationScore: 0,
      IsImageRacyClassified: false
    };
  }
  const url = `${AZURE_CM_ENDPOINT}/contentmoderator/moderate/v1.0/ProcessImage/Evaluate`;
  const imageData = fs.readFileSync(imagePath);
  try {
    const res = await axios.post(url, imageData, {
      headers: {
        'Content-Type': 'image/jpeg', // or image/png
        'Ocp-Apim-Subscription-Key': AZURE_CM_KEY
      }
    });
    return res.data;
  } catch (err) {
    throw new Error('Azure moderation failed: ' + (err.response?.data?.message || err.message));
  }
}

module.exports = { moderateImage };
