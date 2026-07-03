import { describe, it, expect } from 'vitest';
import { buildUserPrompt, buildSystemPrompt } from './promptBuilder';
import type { EarthquakeInput, Building } from '../types';

describe('promptBuilder', () => {
  describe('buildSystemPrompt', () => {
    it('시스템 프롬프트에는 필수 제약사항이 포함되어야 한다', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('재난안전데이터');
      expect(prompt).toContain('6가지 목차를 준수');
      expect(prompt).toContain('제약사항');
    });
  });

  describe('buildUserPrompt', () => {
    const mockInput: EarthquakeInput = {
      region: { sido: '경상북도', sigungu: '경주시', lat: 35.8, lng: 129.2 },
      magnitude: 5.8,
      depth: 13,
      occurredAt: '2016-09-12T20:32:00'
    };

    const mockBuildings: Building[] = [
      {
        id: 'B1', name: '테스트아파트', address: '주소1', sigungu: '경주시',
        builtYear: 1980, floors: 5, purpose: '주거', seismicDesign: false, riskLevel: 'high'
      }
    ];

    it('입력된 지진 정보(지역, 규모)가 프롬프트에 포함되어야 한다', () => {
      const prompt = buildUserPrompt(mockInput, mockBuildings);
      expect(prompt).toContain('경주시');
      expect(prompt).toContain('M5.8');
      expect(prompt).toContain('13km');
    });

    it('취약 건축물 목록이 포맷팅되어 포함되어야 한다', () => {
      const prompt = buildUserPrompt(mockInput, mockBuildings);
      expect(prompt).toContain('테스트아파트');
      expect(prompt).toContain('내진설계: X');
      expect(prompt).toContain('1980년 준공');
    });

    it('건물 목록이 비어있을 경우 예외 처리가 텍스트에 나타나야 한다', () => {
      const prompt = buildUserPrompt(mockInput, []);
      expect(prompt).toContain('취약 건물 정보가 없습니다');
    });
  });
});
