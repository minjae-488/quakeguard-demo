/** 지역 정보 */
export interface Region {
  sido: string;        // 예: "경상북도"
  sigungu: string;     // 예: "경주시"
  lat: number;         // 위도
  lng: number;         // 경도
}

/** 내진 취약 건축물 */
export interface Building {
  id: string;
  name: string;              // 건물명
  address: string;           // 상세 주소
  sigungu: string;           // 시군구 (필터링 키)
  builtYear: number;         // 준공연도
  floors: number;            // 층수
  purpose: string;           // 용도 (아파트, 학교, 병원 등)
  seismicDesign: boolean;    // 내진설계 여부
  riskLevel: 'high' | 'medium' | 'low';  // 위험등급
  lat?: number;              // 위도 (있을 경우)
  lng?: number;              // 경도 (있을 경우)
}

/** 지진 입력 정보 */
export interface EarthquakeInput {
  region: Region;
  magnitude: number;         // 규모 (1.0 ~ 9.0)
  depth: number;             // 깊이 (km)
  occurredAt: string;        // ISO 8601 날짜+시각
}

/** AI 응답 상태 */
export type AiResponseStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

/** AI 응답 */
export interface AiResponse {
  status: AiResponseStatus;
  content: string;           // 스트리밍 중 누적 텍스트
  error?: string;
}

/** 빠른 선택 시나리오 */
export interface Scenario {
  id: string;
  label: string;             // 예: "2016 경주 M5.8"
  description: string;
  input: EarthquakeInput;
}

/** LLM 제공자 인터페이스 (SOLID OCP, LSP, DIP 적용) */
export interface ILLMProvider {
  stream(systemPrompt: string, userPrompt: string): AsyncIterable<string>;
}

/** 대피소 (Shelter) */
export interface Shelter {
  id: string;
  name: string;
  address: string;
  sigungu: string;
  lat: number;
  lng: number;
  capacity: number;
}

/** 지진 이력 (EarthquakeHistory) */
export interface EarthquakeHistory {
  id: string;
  date: string;
  magnitude: number;
  depth: number;
  location: string;
  lat: number;
  lng: number;
}

/** CCTV 현황 */
export interface CCTV {
  id: string;
  name: string;
  type: string;
  sigungu: string;
  address: string;
  lat: number;
  lng: number;
}

/** 붕괴위험지구 */
export interface DangerZone {
  id: string;
  name: string;
  type: string;
  sigungu: string;
  address: string;
  riskLevel: 'high' | 'medium' | 'low';
  lat: number;
  lng: number;
  shapeType?: 'polygon' | 'polyline';
  path?: [number, number][];
}

/** 연락망 */
export interface Contact {
  id: string;
  name: string;
  phone: string;
  role: string;
  sigungu: string;
}
