const { GoogleGenAI } = require('@google/genai');

const API_KEYS = [
  process.env.GEMINI_KEY_1,
  process.env.GEMINI_KEY_2,
  process.env.GEMINI_KEY_3,
  process.env.GEMINI_KEY_4,
].filter(Boolean);

module.exports = async function handler(req, res) {
  // Allow requests from anywhere
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  let lastError = null;

  for (let i = 0; i < API_KEYS.length; i++) {
    const apiKey = API_KEYS[i];

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0, // Shuts off thinking delay for instant answers
          },
        },
      });

      return res.status(200).json({
        success: true,
        keyUsedIndex: i + 1,
        text: response.text,
      });
    } catch (error) {
      lastError = error;

      // If key hits rate limit (429), fall back to next key
      if (error.status === 429 || error.message?.includes('429')) {
        console.warn(`Key #${i + 1} hit quota. Trying Key #${i + 2}...`);
        continue;
      }

      break;
    }
  }

  return res.status(500).json({
    error: 'All API keys failed or were exhausted',
    details: lastError?.message || lastError,
  });
};
