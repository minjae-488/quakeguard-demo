/**
 * mockDataGenerator.ts
 * 지역명을 시드(seed)로 사용하는 결정론적 가상 데이터 생성기.
 * 같은 지역은 항상 동일한 데이터를 반환합니다.
 */
import type { Building, Shelter, EarthquakeHistory, CCTV, DangerZone, Contact } from '../types';

// ── 해시 함수 (문자열 → 양의 정수) ──────────────────
function strHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// ── XorShift32 의사 난수 생성기 ──────────────────────
function makeRng(seed: number) {
  let s = (seed || 1) >>> 0;
  return (): number => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    s = s >>> 0;
    return s / 4294967296;
  };
}

// pick(rng, arr) – 배열에서 무작위 1개 선택
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// 위도/경도 소폭 산란
function scatter(base: number, rng: () => number, range: number): number {
  return +(base + (rng() - 0.5) * range).toFixed(6);
}

// ── 공통 어휘 풀 ─────────────────────────────────────
const DONG_LIST = [
  '중앙동', '남부동', '북부동', '동부동', '서부동',
  '신흥동', '봉황동', '황성동', '성건동', '월성동',
  '용강동', '교동', '노서동', '노동동', '충효동',
  '읍내동', '태평동', '신도동', '상동', '하동',
  '관문동', '봉명동', '대흥동', '대화동', '중리동',
];

const RO_LIST = [
  '중앙로', '원화로', '태종로', '양정로', '계림로',
  '무열왕로', '첨성로', '천마로', '불국로', '화랑로',
  '시청로', '청사로', '공원로', '산업로', '문화로',
  '해방로', '번영로', '개발로', '동서로', '남북로',
];

const BUILDING_TEMPLATES = [
  { nameFn: (city: string) => `${city} 시청 본청`, purpose: '공공청사' },
  { nameFn: (city: string) => `${city} 구청 청사`, purpose: '공공청사' },
  { nameFn: (city: string) => `${city} 군청 청사`, purpose: '공공청사' },
  { nameFn: (city: string) => `${city} 중앙초등학교`, purpose: '교육시설' },
  { nameFn: (city: string) => `${city} 제1중학교`, purpose: '교육시설' },
  { nameFn: (city: string) => `${city} 제2중학교`, purpose: '교육시설' },
  { nameFn: (city: string) => `${city} 고등학교`, purpose: '교육시설' },
  { nameFn: (city: string) => `${city} 여자고등학교`, purpose: '교육시설' },
  { nameFn: (city: string) => `${city} 종합시장 상가동`, purpose: '상업시설' },
  { nameFn: (city: string) => `${city} 재래시장 아케이드`, purpose: '상업시설' },
  { nameFn: (city: string) => `${city} 노인복지관`, purpose: '문화시설' },
  { nameFn: (city: string) => `${city} 종합사회복지관`, purpose: '문화시설' },
  { nameFn: (city: string) => `${city} 문화예술회관`, purpose: '문화시설' },
  { nameFn: (city: string) => `${city} 보건소`, purpose: '공공청사' },
  { nameFn: (city: string) => `${city} 소방서`, purpose: '공공청사' },
  { nameFn: (city: string) => `${city} 119안전센터`, purpose: '공공청사' },
  { nameFn: (city: string) => `${city} 경찰서`, purpose: '공공청사' },
  { nameFn: (city: string) => `${city} 지구대`, purpose: '공공청사' },
  { nameFn: (city: string) => `${city} 시립도서관`, purpose: '문화시설' },
  { nameFn: (city: string) => `${city} 주민센터`, purpose: '공공청사' },
  { nameFn: (city: string) => `${city} 행정복지센터`, purpose: '공공청사' },
  { nameFn: (city: string) => `${city} 연립주택 (구도심)`, purpose: '아파트' },
  { nameFn: (city: string) => `${city} 빌라 (지하1층)`, purpose: '단독주택' },
  { nameFn: (city: string) => `${city} 단독주택밀집지구`, purpose: '단독주택' },
  { nameFn: (city: string) => `${city} 구역 다가구주택`, purpose: '단독주택' },
  { nameFn: (city: string) => `${city} 공장동 (노후)`, purpose: '공장' },
  { nameFn: (city: string) => `${city} 물류창고`, purpose: '창고시설' },
  { nameFn: (city: string) => `${city} 읍사무소`, purpose: '공공청사' },
  { nameFn: (city: string) => `${city} 면사무소`, purpose: '공공청사' },
  { nameFn: (city: string) => `${city} 농협중앙회 지점`, purpose: '근린생활시설' },
  { nameFn: (city: string) => `${city} 수협 지점`, purpose: '근린생활시설' },
  { nameFn: (city: string) => `${city} 의료원`, purpose: '의료시설' },
  { nameFn: (city: string) => `${city} 종합병원`, purpose: '의료시설' },
];

// ── 내진 취약 등급 산정 ──────────────────────────────
const HIGH_RISK_PURPOSES = ['공공청사', '교육시설', '의료시설'];

function calcRiskLevel(
  builtYear: number,
  seismicDesign: boolean,
  purpose: string,
): 'high' | 'medium' | 'low' {
  if (seismicDesign) return 'low';

  const isHighRiskPurpose = HIGH_RISK_PURPOSES.includes(purpose);

  if (builtYear <= 1980) {
    return isHighRiskPurpose ? 'high' : 'high';
  }
  if (builtYear <= 1991) {
    return isHighRiskPurpose ? 'high' : 'medium';
  }
  if (builtYear <= 2005) {
    return isHighRiskPurpose ? 'medium' : 'medium';
  }
  return 'low';
}

const SHELTER_NAMES: ((city: string) => string)[] = [
  city => `${city} 초등학교 운동장`,
  city => `${city} 남초등학교 운동장`,
  city => `${city} 중학교 체육관`,
  city => `${city} 여자중학교 강당`,
  city => `${city} 고등학교 운동장`,
  city => `${city} 시민공원`,
  city => `${city} 어린이공원`,
  city => `${city} 문화광장`,
  city => `${city} 체육공원`,
  city => `${city} 공설운동장`,
  city => `${city} 국민체육센터`,
  city => `${city} 실내체육관`,
  city => `${city} 근린공원`,
  city => `${city} 생태공원`,
  city => `${city} 주민운동장`,
];

const CCTV_LOCATIONS = [
  '주요사거리 방범용', '역 앞 교차로', '버스터미널 앞',
  '시장 입구 교통정보수집용', '교량 재난감시용', '터널 입구 감시용',
  '대피로 생활안전용', '주요 교차로 방범용', '공원 입구 방범용',
];

const CCTV_TYPES = ['방범용', '교통정보수집용', '재난감시용', '생활안전용'];

const DANGER_TYPES_LIST = [
  '급경사지', '붕괴위험지구', '낙석위험구간', '옹벽위험지구', '침수위험지역',
  '교량', '터널', '노후건축물밀집구역', '이면도로'
];

const CONTACT_TEMPLATES = [
  { dept: '재난안전과',      role: '재난총괄' },
  { dept: '소방서',          role: '화재·구조·구급' },
  { dept: '경찰서',          role: '치안·교통통제' },
  { dept: '한국전력 지사',   role: '전력공급차단' },
  { dept: '도시가스 고객센터', role: '가스공급차단' },
  { dept: '응급의료센터',    role: '부상자 이송' },
];

function cityShort(sigungu: string): string {
  return sigungu.replace(/특별자치시$|광역시$|특별시$|시$|군$|구$/, '');
}

function genPhone(rng: () => number): string {
  const areaCodes = ['031', '032', '033', '041', '042', '043', '044', '051', '052', '053', '054', '055', '061', '062', '063', '064'];
  const area = pick(rng, areaCodes);
  const mid  = String(Math.floor(rng() * 9000) + 1000);
  const end  = String(Math.floor(rng() * 9000) + 1000);
  return `${area}-${mid}-${end}`;
}

// ── 생성 함수 ────────────────────────────────────────

export function generateMockBuildings(
  sigungu: string, sido: string, lat: number, lng: number
): Building[] {
  const rng  = makeRng(strHash(sigungu + '||buildings'));
  const city = cityShort(sigungu);
  const count = Math.floor(rng() * 21) + 15;

  const templates = [...BUILDING_TEMPLATES];
  for (let i = templates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [templates[i], templates[j]] = [templates[j], templates[i]];
  }

  return Array.from({ length: count }, (_, i) => {
    const builtYear     = Math.floor(rng() * 61) + 1960;
    const dong          = pick(rng, DONG_LIST);
    const num           = Math.floor(rng() * 300) + 1;
    const floors        = Math.floor(rng() * 7) + 1;
    
    const template      = templates[i] ?? templates[i % templates.length];
    const purpose       = template.purpose;
    const name          = template.nameFn(city);

    const seismicDesign = builtYear < 1988 ? false : builtYear < 2005 ? rng() > 0.7 : rng() > 0.2;
    const riskLevel     = calcRiskLevel(builtYear, seismicDesign, purpose);

    let finalLat = scatter(lat, rng, 0.09);
    let finalLng = scatter(lng, rng, 0.09);

    return {
      id:            `MOCK-${sigungu}-B${i + 1}`,
      name,
      address:       `${sido} ${sigungu} ${dong} ${num}`,
      sigungu,
      builtYear,
      floors,
      purpose,
      seismicDesign,
      riskLevel,
      lat:           finalLat,
      lng:           finalLng,
    };
  });
}

export function generateMockShelters(
  sigungu: string, sido: string, lat: number, lng: number
): Shelter[] {
  const rng  = makeRng(strHash(sigungu + '||shelters'));
  const city = cityShort(sigungu);
  const count = Math.floor(rng() * 8) + 5;

  const nameTemplates = [...SHELTER_NAMES];
  for (let i = nameTemplates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [nameTemplates[i], nameTemplates[j]] = [nameTemplates[j], nameTemplates[i]];
  }

  return Array.from({ length: count }, (_, i) => {
    const dong     = pick(rng, DONG_LIST);
    const num      = Math.floor(rng() * 300) + 1;
    const capacity = Math.floor(rng() * 1700) + 300;

    const finalLat = scatter(lat, rng, 0.08);
    const finalLng = scatter(lng, rng, 0.08);

    return {
      id:       `MOCK-${sigungu}-S${i + 1}`,
      name:     (nameTemplates[i] ?? nameTemplates[0])(city),
      address:  `${sido} ${sigungu} ${dong} ${num}`,
      sigungu,
      lat:      finalLat,
      lng:      finalLng,
      capacity,
    };
  });
}

export function generateMockCCTVs(
  sigungu: string, sido: string, lat: number, lng: number
): CCTV[] {
  const rng   = makeRng(strHash(sigungu + '||cctv'));
  const count = Math.floor(rng() * 8) + 8;

  return Array.from({ length: count }, (_, i) => {
    const ro   = pick(rng, RO_LIST);
    const loc  = pick(rng, CCTV_LOCATIONS);
    const type = pick(rng, CCTV_TYPES);
    const num  = Math.floor(rng() * 300) + 10;

    let finalLat = scatter(lat, rng, 0.1);
    let finalLng = scatter(lng, rng, 0.1);

    return {
      id:      `MOCK-${sigungu}-C${i + 1}`,
      name:    `${sigungu} ${ro} ${loc}`,
      type,
      sigungu,
      address: `${sido} ${sigungu} ${ro} ${num}`,
      lat:     finalLat,
      lng:     finalLng,
    };
  });
}

export function generateMockDangerZones(
  sigungu: string, sido: string, lat: number, lng: number
): DangerZone[] {
  const rng   = makeRng(strHash(sigungu + '||danger'));
  const count = Math.floor(rng() * 4) + 3;

  return Array.from({ length: count }, (_, i) => {
    const dong      = pick(rng, DONG_LIST);
    const type      = pick(rng, DANGER_TYPES_LIST);
    const riskLevel = rng() < 0.5 ? 'high' : 'medium';
    
    let centerLat = scatter(lat, rng, 0.1);
    let centerLng = scatter(lng, rng, 0.1);

    const shapeType: 'polyline' | 'polygon' = ['교량', '터널', '이면도로'].includes(type) ? 'polyline' : 'polygon';

    const path: [number, number][] = [];
    if (shapeType === 'polyline') {
      const numPoints = Math.floor(rng() * 2) + 3;
      let currentLat = centerLat;
      let currentLng = centerLng;
      for (let j = 0; j < numPoints; j++) {
        path.push([currentLat, currentLng]);
        currentLat += (rng() - 0.5) * 0.01;
        currentLng += (rng() - 0.5) * 0.01;
      }
    } else {
      // 면형 (다각형 형태, 4~6개의 점으로 블록 구성)
      const numPoints = Math.floor(rng() * 3) + 4;
      const radius = 0.003 + rng() * 0.005; // 대략 300m~800m 반경의 불규칙 다각형
      for (let j = 0; j < numPoints; j++) {
        const angle = (j / numPoints) * Math.PI * 2 + (rng() * 0.5); // 불규칙한 각도
        const pointLat = centerLat + Math.cos(angle) * radius * (0.8 + rng() * 0.4);
        const pointLng = centerLng + Math.sin(angle) * radius * (0.8 + rng() * 0.4);
        path.push([pointLat, pointLng]);
      }
    }

    return {
      id:        `MOCK-${sigungu}-D${i + 1}`,
      name:      `${dong} ${type}`,
      type,
      sigungu,
      address:   `${sido} ${sigungu} ${dong}`,
      riskLevel: riskLevel as 'high' | 'medium' | 'low',
      lat:       centerLat,
      lng:       centerLng,
      shapeType,
      path
    };
  });
}

export function generateMockContacts(sigungu: string): Contact[] {
  const rng  = makeRng(strHash(sigungu + '||contacts'));
  const city = cityShort(sigungu);

  return CONTACT_TEMPLATES.map((t, i) => ({
    id:      `MOCK-${sigungu}-CON${i + 1}`,
    name:    `${city} ${t.dept}`,
    phone:   genPhone(rng),
    role:    t.role,
    sigungu,
  }));
}

export function generateMockStats(sigungu: string): { total: number; vulnerable: number } {
  const rng  = makeRng(strHash(sigungu + '||stats'));
  const total = Math.floor(rng() * 90000) + 8000;
  const rate  = rng() * 0.28 + 0.18; // 취약 비율 18~46%
  return { total, vulnerable: Math.floor(total * rate) };
}
