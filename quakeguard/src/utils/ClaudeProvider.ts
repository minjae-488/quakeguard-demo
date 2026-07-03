import Anthropic from '@anthropic-ai/sdk';
import type { ILLMProvider } from '../types';

export class ClaudeProvider implements ILLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true // 데모 환경이므로 브라우저 직접 호출 허용
    });
  }

  async *stream(systemPrompt: string, userPrompt: string): AsyncIterable<string> {
    const stream = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}
