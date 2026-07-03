import { useState, useRef, useCallback } from 'react';
import type { AiResponse, ILLMProvider } from '../types';

export function useLLM(provider: ILLMProvider) {
  const [response, setResponse] = useState<AiResponse>({
    status: 'idle',
    content: ''
  });

  // 마지막 호출 파라미터를 저장해 retry에서 재사용
  const lastCallRef = useRef<{ systemPrompt: string; userPrompt: string } | null>(null);

  const analyze = useCallback(async (systemPrompt: string, userPrompt: string) => {
    lastCallRef.current = { systemPrompt, userPrompt };
    setResponse({ status: 'loading', content: '' });

    try {
      const stream = provider.stream(systemPrompt, userPrompt);

      for await (const chunk of stream) {
        setResponse(prev => ({
          status: 'streaming',
          content: prev.content + chunk
        }));
      }

      setResponse(prev => ({ ...prev, status: 'done' }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setResponse({
        status: 'error',
        content: '',
        error: message
      });
    }
  }, [provider]);

  const retry = useCallback(() => {
    if (lastCallRef.current) {
      analyze(lastCallRef.current.systemPrompt, lastCallRef.current.userPrompt);
    }
  }, [analyze]);

  const reset = useCallback(() => {
    setResponse({ status: 'idle', content: '' });
    lastCallRef.current = null;
  }, []);

  return { response, analyze, retry, reset };
}
