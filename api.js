import { GoogleGenAI } from '@google/genai';

// Add your keys in Vercel environment variables (or test locally)
const API_KEYS = [
  process.env.GEMINI_KEY_1,
  process.env.GEMINI_KEY_2,
  process.env.GEMINI_KEY_3,
  process.env.GEMINI_KEY_4,
].filter(Boolean); // removes empty keys

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  let lastError = null;

  // Loop through your keys in order
  for (let i = 0; i < API_KEYS.length; i++) {
    const apiKey = API_KEYS[i];

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
      });

      // Return the result and which key was used
      return res.status(200).json({
        success: true,
        keyUsedIndex: i + 1,
        text: response.text,
      });
    } catch (error) {
      lastError = error;

      // If error is rate limit (429), loop continues to next key
      if (error.status === 429 || error.message?.includes('429')) {
        console.warn(`Key #${i + 1} hit rate limit (429). Switching to Key #${i + 2}...`);
        continue;
      }

      // If it's another error (e.g. invalid prompt), break early
      break;
    }
  }

  // If all keys failed
  return res.status(500).json({
    error: 'All API keys exhausted or encountered an error.',
    details: lastError?.message || lastError,
  });
}
