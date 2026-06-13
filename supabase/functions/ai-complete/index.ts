type Provider = 'groq' | 'openrouter';
type AiTask = 'headline-classification' | 'journal-summary' | 'weekly-coaching';

interface RequestBody {
  provider: Provider;
  task: AiTask;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

const providerConfig = {
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: Deno.env.get('GROQ_API_KEY'),
    model: 'llama-3.3-70b-versatile',
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: Deno.env.get('OPENROUTER_API_KEY'),
    model: 'openai/gpt-4o-mini',
  },
} as const;

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = (await request.json()) as RequestBody;
  const config = providerConfig[body.provider];

  if (!config?.apiKey) {
    return Response.json({ error: `${body.provider} is not configured` }, { status: 503 });
  }

  const systemGuardrail = {
    role: 'system',
    content:
      'You are an XAUUSD analysis coach. Provide setup quality analysis, headline theme classification, and journal review. Do not give direct buy/sell calls, position sizing, guarantees, or overconfident financial advice.',
  };

  const upstream = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...(body.provider === 'openrouter'
        ? {
            'HTTP-Referer': 'https://xauusd-command.local',
            'X-OpenRouter-Title': 'XAUUSD Command Center',
          }
        : {}),
    },
    body: JSON.stringify({
      model: config.model,
      temperature: body.task === 'weekly-coaching' ? 0.35 : 0.15,
      messages: [systemGuardrail, ...body.messages],
    }),
  });

  if (!upstream.ok) {
    return Response.json({ error: await upstream.text() }, { status: upstream.status });
  }

  const payload = await upstream.json();
  return Response.json({ text: payload.choices?.[0]?.message?.content ?? '' });
});
