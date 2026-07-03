import type { EarthquakeInput, Building, Shelter, CCTV, DangerZone, Contact } from '../types';
import statsData from '../data/stats.json';

export function buildSystemPrompt(): string {
  return `당신은 대한민국 지진 재난 담당 공무원을 보조하는 AI입니다.
제공된 재난안전데이터를 근거로 구체적이고 실행 가능한 조치사항을 생성합니다.

[출력 형식 - 반드시 다음 6가지 목차를 준수하여 작성할 것]
1. 위험단계 판단
(예: 현재 강우량 및 지진 규모에 따른 위험 단계 발령)

2. 대피 가능 위험 TOP 3
(예: 제공된 취약 건축물 목록 중 위험도가 가장 높은 3곳 명시)

3. 즉시 대피 유도
(예: 인근 지진 옥외 대피소로 대피 지시)

4. 접근 차단 위치
(예: 제공된 붕괴위험지구 데이터를 기반으로 구체적 도로/교량 명시)

5. 우선 확인 CCTV/계측기
(예: 제공된 CCTV 데이터를 기반으로 구체적 장비 위치 명시)

6. 즉시 연락 기관
(예: 제공된 지역 연락망 데이터를 기반으로 기관명 및 연락처 명시)

[제약사항]
- 제공된 데이터에 없는 내용은 추정임을 명시할 것.
- 건물명과 대피소명, CCTV, 위험지구, 연락처는 반드시 제공된 목록에서만 추출하여 구체적으로 언급할 것.`;
}

export function buildUserPrompt(
  input: EarthquakeInput,
  buildings: Building[],
  shelters: Shelter[] = [],
  cctvs: CCTV[] = [],
  dangerZones: DangerZone[] = [],
  contacts: Contact[] = [],
  stats?: { total: number; vulnerable: number } | null,
): string {
  // 통계: 파라미터 → stats.json → 미확보 순 폴백
  const resolvedStats = stats ?? (statsData as any)[input.region.sigungu] ?? null;
  const statSummary = resolvedStats
    ? `전체 건축물: ${resolvedStats.total.toLocaleString()}동, 내진 미적용 노후 건축물: ${resolvedStats.vulnerable.toLocaleString()}동 (약 ${Math.round((resolvedStats.vulnerable / resolvedStats.total) * 100)}%)`
    : '해당 지역 건축물 통계 데이터 미확보 (현장 확인 필요)';

  // 상위 20개 취약 건축물로 제한
  const sampleBuildings = buildings.slice(0, 20);
  const buildingListStr = sampleBuildings.length > 0 
    ? sampleBuildings.map(b => `- ${b.name} (${b.builtYear}년 준공, ${b.purpose}, 내진설계: ${b.seismicDesign ? 'O' : 'X'})`).join('\n')
    : '취약 건물 정보가 없습니다.';

  // 대피소 목록 포맷팅
  const shelterListStr = shelters.length > 0
    ? shelters.map(s => `- ${s.name} (수용인원: ${s.capacity}명, 주소: ${s.address})`).join('\n')
    : '인근 대피소 정보가 없습니다.';

  // CCTV 목록 포맷팅
  const cctvListStr = cctvs.length > 0
    ? cctvs.map(c => `- ${c.name} (${c.type})`).join('\n')
    : 'CCTV 정보가 없습니다.';

  // 붕괴위험지구 포맷팅
  const dangerZoneListStr = dangerZones.length > 0
    ? dangerZones.map(d => `- ${d.name} (${d.type}, 위험도: ${d.riskLevel})`).join('\n')
    : '위험지구 정보가 없습니다.';

  // 연락처 목록 포맷팅
  const contactListStr = contacts.length > 0
    ? contacts.map(c => `- ${c.name} (${c.phone}, 역할: ${c.role})`).join('\n')
    : '연락망 정보가 없습니다.';

  let dynamicInstructions = '';
  if (input.magnitude < 4.0) {
    dynamicInstructions = `
[특별 지시사항: 소규모 지진 (규모 4.0 미만)]
- 대규모 피해 가능성이 낮으므로, 과도한 공포를 유발하는 극단적 대피 지시(예: 전면 대피령)는 지양할 것.
- '상황 주시', '경미한 균열 점검', '가스/전기 차단 등 기본 안전수칙 안내' 위주로 작성할 것.
- 대피소 안내 시 "필요시 대피" 수준으로 권고할 것.`;
  } else if (input.magnitude >= 4.0 && input.magnitude < 6.0) {
    dynamicInstructions = `
[특별 지시사항: 중규모 지진 (규모 4.0 ~ 5.9)]
- 일부 노후/취약 건축물에 실질적인 피해가 발생할 수 있는 규모임.
- 내진 취약 건축물과 주요 위험지구(교량, 노후건물)를 중심으로 '주의 및 경계' 조치를 구체화할 것.
- 특정 위험 지역이나 징후가 발견된 곳에 한정하여 선별적 대피를 유도할 것.`;
  } else {
    dynamicInstructions = `
[특별 지시사항: 대규모 지진 (규모 6.0 이상)]
- 광범위하고 심각한 물리적 피해(건물 붕괴, 인명 피해 등)가 예상되는 매우 위험한 상황임.
- 즉각적이고 전면적인 대피령, 붕괴위험지구의 전면 통제, 가용 가능한 모든 행정/의료/소방 인력 총동원령 등 최고 수위의 대응 조치를 작성할 것.
- 1초가 시급한 재난 상황을 가정하여 매우 단호하고 구체적인 지시를 내릴 것.`;
  }

  return `
[지진 발생 정보]
- 발생 위치: ${input.region.sido} ${input.region.sigungu} (위도: ${input.region.lat}, 경도: ${input.region.lng})
- 발생 시각: ${input.occurredAt || ''}
- 지진 규모: M${input.magnitude}
${input.depth ? `- 진원 깊이: ${input.depth}km` : ''}

[해당 지역(${input.region.sigungu}) 데이터 분석 통계]
- ${statSummary}

[해당 지역 주요 내진 취약 건축물 목록 (상위 20건)]
${buildingListStr}

[해당 지역 인근 지진 옥외 대피소 목록]
${shelterListStr}

[해당 지역 주요 붕괴위험지구 (접근 차단 대상)]
${dangerZoneListStr}

[해당 지역 주요 CCTV 현황]
${cctvListStr}

[해당 지역 필수 연락망]
${contactListStr}
${dynamicInstructions}

위의 상황 정보와 특별 지시사항을 종합적으로 분석하여, 실제 상황에 가장 적합한 6단계 상황보고서를 작성해 주세요.`.trim();
}
