export type AiTask = 'headline-classification' | 'journal-summary' | 'weekly-coaching';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiProvider {
  name: 'groq' | 'openrouter';
  complete(task: AiTask, messages: AiMessage[]): Promise<string>;
}

export class ServerAiGateway implements AiProvider {
  constructor(public readonly name: 'groq' | 'openrouter') {}

  async complete(task: AiTask, messages: AiMessage[]) {
    const response = await fetch('/api/ai/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: this.name, task, messages }),
    });

    if (!response.ok) {
      throw new Error(`AI provider ${this.name} failed with ${response.status}`);
    }

    const payload = (await response.json()) as { text: string };
    return payload.text;
  }
}

export function chooseAiProvider(task: AiTask): AiProvider {
  if (task === 'headline-classification' || task === 'journal-summary') {
    return new ServerAiGateway('groq');
  }

  return new ServerAiGateway('openrouter');
}
