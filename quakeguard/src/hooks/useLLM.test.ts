import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLLM } from './useLLM';
import type { ILLMProvider } from '../types';

describe('useLLM', () => {
  it('초기 상태는 idle과 빈 문자열을 가져야 한다', () => {
    const mockProvider: ILLMProvider = {
      stream: async function* () { yield 'test'; }
    };
    
    const { result } = renderHook(() => useLLM(mockProvider));
    expect(result.current.response.status).toBe('idle');
    expect(result.current.response.content).toBe('');
  });

  it('analyze 호출 시 스트리밍 결과를 누적하여 상태를 업데이트해야 한다', async () => {
    const mockProvider: ILLMProvider = {
      stream: async function* () {
        yield '즉시 ';
        yield '조치';
      }
    };
    
    const { result } = renderHook(() => useLLM(mockProvider));
    
    await act(async () => {
      await result.current.analyze('system prompt', 'user prompt');
    });

    expect(result.current.response.status).toBe('done');
    expect(result.current.response.content).toBe('즉시 조치');
  });

  it('예외 발생 시 error 상태로 전환되어야 한다', async () => {
    const mockProvider: ILLMProvider = {
      stream: async function* () {
        throw new Error('API Error');
      }
    };
    
    const { result } = renderHook(() => useLLM(mockProvider));
    
    await act(async () => {
      await result.current.analyze('s', 'u');
    });

    expect(result.current.response.status).toBe('error');
    expect(result.current.response.error).toBe('API Error');
  });
});
