import type { ILLMProvider } from '../types';

export class MockLLMProvider implements ILLMProvider {
  async *stream(systemPrompt: string, userPrompt: string): AsyncIterable<string> {
    // 프롬프트에서 지역 추출
    const regionMatch = userPrompt.match(/- 발생 위치: (.*?) \(위도/);
    const region = regionMatch ? regionMatch[1] : '해당 지역';

    // 프롬프트에서 규모 추출
    const magnitudeMatch = userPrompt.match(/지진 규모: M([\d.]+)/);
    const magnitude = magnitudeMatch ? parseFloat(magnitudeMatch[1]) : 5.0;
    
    // 프롬프트에서 대피소 이름 추출
    const shelterMatches = [...userPrompt.matchAll(/- (.*?) \(수용인원/g)];
    const shelterNames = shelterMatches.length > 0 
      ? shelterMatches.map(m => m[1]).slice(0, 2).join(' 및 ') 
      : '인근 초등학교 또는 가장 넓은 공지';

    // 프롬프트에서 취약 건물 이름 추출
    const buildingMatches = [...userPrompt.matchAll(/- (.*?) \(\d{4}년/g)];
    const top3Buildings = buildingMatches.length > 0
      ? buildingMatches.slice(0, 3).map(m => m[1])
      : ['인근 노후 단독주택', '인근 다세대주택', '인근 종교시설'];

    // 프롬프트에서 붕괴위험지구 추출
    const dangerMatch = userPrompt.match(/\[해당 지역 주요 붕괴위험지구.*?\]\n- ([^\n]+)/);
    const dangerTarget = dangerMatch ? dangerMatch[1] : '인근 좁은 골목 및 이면도로 (붕괴위험)';

    // 프롬프트에서 CCTV 추출
    const cctvMatch = userPrompt.match(/\[해당 지역 주요 CCTV 현황\]\n- ([^\n]+)/);
    const cctvTarget = cctvMatch ? cctvMatch[1] : '주요 대피로 교차로 방범용 CCTV';

    // 프롬프트에서 연락망 추출
    const contactsBlockMatch = userPrompt.match(/\[해당 지역 필수 연락망\]\n([\s\S]*?)위의 상황 정보/);
    const contactsLines = contactsBlockMatch 
      ? contactsBlockMatch[1].trim().split('\n').filter(l => l.startsWith('- ')).slice(0, 3)
      : ['- 관할 소방서 및 경찰서', '- 지자체 재난상황실'];
    const contactsText = contactsLines.join('\n');

    let riskLevelText = '';
    let actionText = '';
    
    if (magnitude >= 7.0) {
      riskLevelText = "**'심각(최고 대응)' 단계** 발령";
      actionText = "2차 붕괴 및 여진에 대비한 최고 수준의 비상 대응 및 전면 대피 필요";
    } else if (magnitude >= 5.0) {
      riskLevelText = "**'경계' 단계** 발령";
      actionText = "주요 노후 건축물 붕괴 대비 비상 대피 및 즉각적인 현장 통제 필요";
    } else if (magnitude >= 3.0) {
      riskLevelText = "**'주의' 단계** 발령";
      actionText = "흔들림 감지 및 잠재적 균열에 대비한 현장 순찰 및 주민 주의 방송 실시";
    } else {
      riskLevelText = "**'관심' 단계** 유지";
      actionText = "일반인 체감은 어려우나, 취약 시설물에 대한 예방적 모니터링 실시";
    }

    const mockResponse = `### [AI 상황 분석 및 즉시 조치사항]

**1. 위험단계 판단**
- 현장 지진 규모 M${magnitude} 발생 및 내진 미적용 노후 건축물 밀집도를 고려하여 ${riskLevelText}
- ${actionText}

**2. 대피 가능 위험 TOP 3**
- 반경 내 가장 노후화된 내진 미적용 취약 건축물에 대한 우선 대피 유도 필요:
  1) **${top3Buildings[0] || '인근 노후 단독주택'}** (붕괴 위험 매우 높음)
  2) **${top3Buildings[1] || '인근 다세대주택'}** (외벽 균열 및 낙하물 위험)
  3) **${top3Buildings[2] || '인근 상업시설'}** (유동인구 다수로 인한 2차 피해 우려)

**3. 즉시 대피 유도**
- 반경 1km 이내 주민들을 가장 안전하고 가까운 **${shelterNames} 대피소**로 즉시 분산 이동 안내
- 스마트 마을방송, 예경보시스템 및 재난문자(CBS) 긴급 송출

**4. 접근 차단 위치**
- **${dangerTarget.split('(')[0].trim()}** 주변 반경 통제 (추가 붕괴 및 낙석 우려에 따른 차량/보행자 전면 통제)
- 구도심 노후 건축물 밀집 지역 진입로 폴리스라인 설치

**5. 우선 확인 CCTV/계측기**
- **${cctvTarget.split('(')[0].trim()}** 최우선 모니터링 실시하여 2차 피해 징후 파악
- 인근 주요 교차로 및 대피로 병목 현상 실시간 파악

**6. 즉시 연락 기관**
${contactsText}
`;

    let extraActions = '';
    if (magnitude >= 7.0) {
      extraActions = `
**7. [심각] 국가 재난 대응 체계 전환 및 광역 동원**
- 중앙재난안전대책본부(중대본) 가동 및 특별재난지역 선포 건의 
- 인근 군부대(재난구조부대) 및 광역 소방헬기 긴급 지원 요청
- 전국 단위 대규모 사상자 발생 대비 권역응급의료센터 연계 응급의료소(DMAT) 설치

**8. [심각] 핵심 기반 시설(라이프라인) 전면 차단**
- 진앙 반경 10km 이내 도시가스 메인 밸브 차단 여부 최우선 확인
- 변전소 화재 및 송전탑 붕괴 여부 한전 상황실과 교차 검증 및 단수 대비 급수차 배차
`;
    } else if (magnitude >= 5.0) {
      extraActions = `
**7. [경계] 광역 재난 지원 및 인프라 점검**
- 인접 시·도 소방본부에 구급차 및 구조공작차 지원(동원령) 요청 대기
- 지역 내 종합병원 재난의료지원팀(DMAT) 출동 대기 지시
- 통신 장애 대비 위성전화망 및 재난안전통신망(PS-LTE) 긴급 점검
`;
    } else if (magnitude >= 3.0) {
      extraActions = `
**7. [주의] 유관기관 협조 사항**
- 관할 지자체 건축물 안전진단반 구성 및 출동 대기 (민간 전문가 포함)
- 민감 시설(유치원, 요양병원 등) 자체 대피 현황 전화 모니터링 실시
`;
    }

    const finalResponse = mockResponse + extraActions + `
> *본 보고서는 공공데이터(건축물대장 및 지진 옥외 대피장소)를 기반으로 작성된 AI 대응 가이드입니다.*`;

    // 글자 단위로 쪼개서 스트리밍 효과 (타이핑 효과) 구현
    const chunks = finalResponse.split('');
    for (const char of chunks) {
      await new Promise(resolve => setTimeout(resolve, 5));
      yield char;
    }
  }
}
