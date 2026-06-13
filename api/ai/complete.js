const PROVIDERS = {
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    keyName: 'GROQ_API_KEY',
    modelName: 'GROQ_MODEL',
    fallbackModel: 'llama-3.1-8b-instant',
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    keyName: 'OPENROUTER_API_KEY',
    modelName: 'OPENROUTER_MODEL',
    fallbackModel: 'openai/gpt-4o-mini',
  },
};

const ALLOWED_TASKS = new Set(['headline-classification', 'journal-summary', 'weekly-coaching']);

function sendJson(response, status, payload) {
  response.status(status).json(payload);
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => {
      return (
        message &&
        ['system', 'user', 'assistant'].includes(message.role) &&
        typeof message.content === 'string'
      );
    })
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 12000),
    }));
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed' });
  }

  const { provider = 'groq', task = 'headline-classification', messages = [] } = request.body ?? {};
  const config = PROVIDERS[provider];

  if (!config) {
    return sendJson(response, 400, { error: `Unsupported AI provider: ${provider}` });
  }

  if (!ALLOWED_TASKS.has(task)) {
    return sendJson(response, 400, { error: `Unsupported AI task: ${task}` });
  }

  const apiKey = process.env[config.keyName];
  if (!apiKey) {
    return sendJson(response, 503, { error: `${config.keyName} is not configured` });
  }

  const safeMessages = normalizeMessages(messages);
  if (safeMessages.length === 0) {
    return sendJson(response, 400, { error: 'At least one message is required' });
  }

  const systemGuardrail = {
    role: 'system',
    content:
      'You are an XAUUSD analysis coach. Provide setup quality analysis, headline theme classification, and journal review. Do not give direct buy/sell calls, position sizing, guarantees, or overconfident financial advice.',
  };

  const upstream = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(provider === 'openrouter'
        ? {
            'HTTP-Referer': request.headers.origin ?? 'https://xauusd-command-center.vercel.app',
            'X-OpenRouter-Title': 'XAUUSD Command Center',
          }
        : {}),
    },
    body: JSON.stringify({
      model: process.env[config.modelName] || config.fallbackModel,
      temperature: task === 'weekly-coaching' ? 0.35 : 0.15,
      messages: [systemGuardrail, ...safeMessages],
    }),
  });

  const payloadText = await upstream.text();

  if (!upstream.ok) {
    return sendJson(response, upstream.status, {
      error: payloadText.slice(0, 2000) || `${provider} request failed`,
    });
  }

  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    return sendJson(response, 502, { error: `${provider} returned invalid JSON` });
  }

  return sendJson(response, 200, {
    provider,
    task,
    model: payload.model,
    text: payload.choices?.[0]?.message?.content ?? '',
    usage: payload.usage ?? null,
  });
}
