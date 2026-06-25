// /api/groq.js — Vercel serverless proxy
// Forwards requests to Groq API with server-side key
// Supports model fallback from frontend

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'GROQ_KEY not configured in Vercel environment variables' });
  }

  const { model, max_tokens, messages } = req.body;

  // Allow any model the frontend requests (supports fallback chain)
  const allowedModels = [
    'llama-3.3-70b-versatile',
    'gemma2-9b-it',
    'mixtral-8x7b-32768',
    'llama3-8b-8192',
    'llama3-70b-8192',
  ];

  const selectedModel = allowedModels.includes(model) ? model : 'llama-3.3-70b-versatile';

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: max_tokens || 4000,
        messages: messages,
      }),
    });

    const data = await groqRes.json();

    // Pass through 429 so frontend can try next model
    if (!groqRes.ok) {
      return res.status(groqRes.status).json(data);
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
