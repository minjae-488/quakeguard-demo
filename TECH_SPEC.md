#  Tech Spec — QuakeGuard
> 작성일: 2026-07-02 | 기준: PRD v2 (5일 개발 스코프)

---

## 1. 아키텍처 개요

### 전체 구조

```
[사용자 브라우저]
       │
       │  (정적 파일 서빙)
       ▼
  [Vercel CDN]
  React SPA (빌드 결과물)
       │
       ├─ 로컬 JSON 데이터 읽기 (백엔드 없음)
       │  └─ buildings.json, scenarios.json
       │
       └─ 외부 API 호출
          ├─ Anthropic API (Claude) 또는
          └─ OpenAI API (GPT-4o)
```

### 핵심 설계 결정

| 결정 | 내용 | 이유 |
|------|------|------|
| **백엔드 없음** | 순수 프론트엔드만 | 5일 안에 서버 세팅은 불가, Vercel 무료 정적 배포로 충분 |
| **데이터 번들링** | CSV → JSON으로 변환 후 소스코드에 포함 | DB 없이 데이터 조회 가능, 실시간 API 인증 불필요 |
| **LLM 직접 호출** | 브라우저 → LLM API 직접 | 중간 서버 불필요, API 키는 환경변수로 보호 |
| **지도: Leaflet** | Kakao/Naver 대신 Leaflet 사용 | Kakao Maps는 API 키 발급 + 도메인 등록 절차 필요, Leaflet은 즉시 사용 가능 |

---

## 2. 기술 스택

### 2-1. 핵심 프레임워크

| 기술 | 버전 | 역할 | 선택 이유 |
|------|------|------|-----------|
| **React** | 18.x | UI 컴포넌트 | 컴포넌트 재사용, 상태 관리 용이 |
| **TypeScript** | 5.x | 타입 안전성 | 런타임 오류 사전 방지, 자동완성 |
| **Vite** | 6.x | 빌드 도구 | 빠른 개발 서버, 간단한 설정 |

### 2-2. UI / 스타일링

| 기술 | 버전 | 역할 |
|------|------|------|
| **Vanilla CSS** | — | 스타일링 (CSS 변수 기반 디자인 시스템) |
| **Google Fonts (Inter)** | — | 타이포그래피 |
| **Leaflet.js** | 1.9.x | 지도 렌더링 |
| **react-leaflet** | 4.x | React에서 Leaflet 사용 |

>  Tailwind, Bootstrap, MUI 등 외부 UI 라이브러리 미사용 (디자인 자유도 확보)

### 2-3. AI / LLM

| 기술 | 버전 | 역할 |
|------|------|------|
| **@anthropic-ai/sdk** | 최신 | Claude API 클라이언트 |
| **openai** | 최신 | OpenAI API 클라이언트 (대안) |

> 실제 사용할 API는 사용자가 발급한 키에 따라 결정 (Claude 권장)

### 2-4. 배포

| 기술 | 역할 |
|------|------|
| **Vercel** | 정적 사이트 호스팅, 환경변수 관리 |
| **GitHub** | 소스코드 저장소, Vercel 자동 배포 트리거 |

---

## 3. 폴더 구조

```
quakeguard/
├── public/
│   └── favicon.ico
│
├── src/
│   ├── components/              # UI 컴포넌트
│   │   ├── Header.tsx           # 상단 헤더 (로고, 상태 표시)
│   │   ├── InputPanel.tsx       # 지진 정보 입력 폼
│   │   ├── BuildingList.tsx     # 취약 건물 카드 목록
│   │   ├── MapView.tsx          # Leaflet 지도
│   │   ├── AiResult.tsx         # AI 조치사항 출력 패널
│   │   └── ReportPanel.tsx      # 상황보고서 출력
│   │
│   ├── data/                    # 정적 데이터
│   │   ├── buildings.json       # 내진 취약 건축물 (CSV 변환본 or 가상)
│   │   ├── scenarios.json       # 빠른 선택 시나리오 (경주, 포항)
│   │   └── regions.json         # 시도/시군구 목록
│   │
│   ├── hooks/                   # 커스텀 React 훅
│   │   ├── useLLM.ts            # LLM API 호출 및 스트리밍
│   │   └── useBuildings.ts      # 건물 데이터 필터링 로직
│   │
│   ├── types/
│   │   └── index.ts             # 전체 TypeScript 타입 정의
│   │
│   ├── utils/
│   │   ├── promptBuilder.ts     # LLM 프롬프트 조립
│   │   ├── dataParser.ts        # JSON 데이터 파싱 유틸
│   │   └── coordinates.ts       # 지역명 → 위경도 매핑
│   │
│   ├── App.tsx                  # 루트 컴포넌트 (레이아웃 조립)
│   ├── main.tsx                 # 진입점
│   └── index.css                # 글로벌 스타일 + 디자인 시스템
│
├── .env                         # 환경변수 (API 키) — git 제외
├── .env.example                 # 환경변수 템플릿 — git 포함
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 4. TypeScript 타입 정의

```typescript
// src/types/index.ts

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

/** AI 응답 */
export interface AiResponse {
  status: 'idle' | 'loading' | 'streaming' | 'done' | 'error';
  content: string;           // 스트리밍 중 누적 텍스트
  error?: string;
}

/** 빠른 선택 시나리오 */
export interface Scenario {
  id: string;
  label: string;             // 예: "2016 경주 M5.8"
  input: EarthquakeInput;
  description: string;
}
```

---

## 5. LLM 연동 명세

### 5-1. 사용 모델

| 우선순위 | 모델 | 이유 |
|----------|------|------|
| 1순위 | `claude-sonnet-4-5` | 한국어 품질 우수, 구조화 출력 안정적 |
| 대안 | `gpt-4o` | Claude 사용 불가 시 대체 |

### 5-2. API 호출 방식: 스트리밍

```typescript
// 스트리밍으로 텍스트가 실시간으로 표시되도록 구현
// hooks/useLLM.ts 핵심 로직

const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-5',
  max_tokens: 2000,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: userPrompt }]
});

for await (const chunk of stream) {
  // 청크마다 React state 업데이트 → 실시간 타이핑 효과
  setContent(prev => prev + chunk.delta.text);
}
```

### 5-3. 시스템 프롬프트 구조

```
[역할]
당신은 대한민국 지진 재난 담당 공무원을 보조하는 AI입니다.
제공된 재난안전데이터를 근거로 구체적이고 실행 가능한 조치사항을 생성합니다.

[출력 형식 - 반드시 준수]
##  위험 수준 판단
(규모와 건물 현황 기반 종합 판단)

##  즉시 조치 (0~30분)
1. [조치내용] — 근거: [데이터 근거]
2. ...

##  1시간 내 조치
1. ...

##  상황보고서 초안
발생시각: {시각}
발생위치: {위치}
규모: M{규모}
...

[제약사항]
- 제공된 데이터에 없는 내용은 추정임을 명시
- 건물명은 반드시 제공된 목록에서만 언급
- 실행 불가능한 모호한 지시 금지
```

### 5-4. 사용자 프롬프트 조립

```typescript
// utils/promptBuilder.ts
export function buildPrompt(input: EarthquakeInput, buildings: Building[]): string {
  const highRisk = buildings.filter(b => b.riskLevel === 'high');
  
  return `
지진 발생 상황:
- 발생 위치: ${input.region.sido} ${input.region.sigungu}
- 규모: M${input.magnitude}
- 깊이: ${input.depth}km
- 발생 시각: ${input.occurredAt}

반경 내 내진 취약 건축물 현황 (${buildings.length}개):
${buildings.map(b => `
- ${b.name} (${b.purpose})
  준공: ${b.builtYear}년, ${b.floors}층
  내진설계: ${b.seismicDesign ? 'O' : 'X (취약)'}
  위험등급: ${b.riskLevel === 'high' ? '높음' : b.riskLevel === 'medium' ? '중간' : '낮음'}
`).join('')}

위 데이터를 바탕으로 즉각 조치사항과 상황보고서를 작성해주세요.
  `;
}
```

---

## 6. 데이터 명세

### 6-1. buildings.json 구조

```json
{
  "version": "1.0",
  "source": "safetydata.go.kr / 가상데이터",
  "updatedAt": "2026-07-02",
  "data": [
    {
      "id": "BLD-001",
      "name": "경주시 황성동 주공아파트",
      "address": "경상북도 경주시 황성동 123",
      "sigungu": "경주시",
      "builtYear": 1987,
      "floors": 15,
      "purpose": "공동주택",
      "seismicDesign": false,
      "riskLevel": "high",
      "lat": 35.8562,
      "lng": 129.2247
    }
  ]
}
```

### 6-2. scenarios.json 구조

```json
[
  {
    "id": "gyeongju-2016",
    "label": " 2016 경주 M5.8",
    "description": "2016년 9월 12일 경북 경주시 남남서쪽 8km 지역에서 발생한 규모 5.8 지진. 국내 계기지진 사상 최대.",
    "input": {
      "region": { "sido": "경상북도", "sigungu": "경주시", "lat": 35.8562, "lng": 129.2247 },
      "magnitude": 5.8,
      "depth": 13,
      "occurredAt": "2016-09-12T20:32:00+09:00"
    }
  },
  {
    "id": "pohang-2017",
    "label": " 2017 포항 M5.4",
    "description": "2017년 11월 15일 경북 포항시 북구 북쪽 8km 지역에서 발생한 규모 5.4 지진.",
    "input": {
      "region": { "sido": "경상북도", "sigungu": "포항시", "lat": 36.0190, "lng": 129.3434 },
      "magnitude": 5.4,
      "depth": 7,
      "occurredAt": "2017-11-15T14:29:00+09:00"
    }
  }
]
```

### 6-3. coordinates.ts (지역 → 위경도 매핑)

```typescript
// 자체 API 호출 없이 주요 시군구 위경도 하드코딩
export const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  "경주시": { lat: 35.8562, lng: 129.2247 },
  "포항시": { lat: 36.0190, lng: 129.3434 },
  "울산시": { lat: 35.5384, lng: 129.3114 },
  "부산시": { lat: 35.1796, lng: 129.0756 },
  // ... 주요 지진 위험 지역 30개
};
```

---

## 7. 환경변수

```bash
# .env (git에서 제외됨 — .gitignore에 추가)
VITE_LLM_PROVIDER=claude          # "claude" 또는 "openai"
VITE_ANTHROPIC_API_KEY=sk-ant-... # Claude API 키
VITE_OPENAI_API_KEY=sk-...        # OpenAI API 키 (대안)

# .env.example (git에 포함 — 키값은 비워둠)
VITE_LLM_PROVIDER=claude
VITE_ANTHROPIC_API_KEY=
VITE_OPENAI_API_KEY=
```

>  **보안 주의**: Vite의 `VITE_` prefix 환경변수는 빌드 시 번들에 포함됨. 데모 목적으로는 허용되나, 실서비스에서는 백엔드 프록시 필요.

---

## 8. 디자인 시스템

### 8-1. 컬러 팔레트

```css
/* index.css */
:root {
  /* 배경 */
  --color-bg-primary:   #0a0e1a;   /* 딥 네이비 (메인 배경) */
  --color-bg-secondary: #111827;   /* 카드 배경 */
  --color-bg-elevated:  #1f2937;   /* 모달, 패널 */

  /* 브랜드 */
  --color-accent:       #f97316;   /* 재난 오렌지 (강조) */
  --color-accent-dark:  #c2410c;

  /* 위험도 */
  --color-danger:       #ef4444;   /* 위험 레드 */
  --color-warning:      #f59e0b;   /* 경고 앰버 */
  --color-safe:         #22c55e;   /* 안전 그린 */

  /* 텍스트 */
  --color-text-primary:   #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-text-muted:     #6b7280;

  /* 테두리 */
  --color-border:       #374151;
  --color-border-focus: #f97316;
}
```

### 8-2. 타이포그래피

```css
/* Google Fonts: Inter */
--font-family: 'Inter', 'Noto Sans KR', sans-serif;
--font-size-xs:   0.75rem;   /* 12px */
--font-size-sm:   0.875rem;  /* 14px */
--font-size-base: 1rem;      /* 16px */
--font-size-lg:   1.125rem;  /* 18px */
--font-size-xl:   1.25rem;   /* 20px */
--font-size-2xl:  1.5rem;    /* 24px */
--font-size-3xl:  2rem;      /* 32px */
```

### 8-3. 레이아웃

```css
/* 2단 레이아웃 */
.app-layout {
  display: grid;
  grid-template-columns: 380px 1fr;  /* 좌: 입력 패널 | 우: 결과 */
  grid-template-rows: 60px 1fr;      /* 상: 헤더 | 하: 콘텐츠 */
  height: 100vh;
}
```

---

## 9. 컴포넌트 인터페이스

```typescript
// 각 컴포넌트의 props 타입 (구현 전 확정)

// Header
interface HeaderProps {
  status: 'idle' | 'loading' | 'done';
}

// InputPanel
interface InputPanelProps {
  onSubmit: (input: EarthquakeInput) => void;
  onScenarioSelect: (scenario: Scenario) => void;
  isLoading: boolean;
}

// BuildingList
interface BuildingListProps {
  buildings: Building[];
  sigungu: string;
}

// MapView
interface MapViewProps {
  center: { lat: number; lng: number };
  buildings: Building[];
  magnitude: number;
}

// AiResult
interface AiResultProps {
  response: AiResponse;
}

// ReportPanel
interface ReportPanelProps {
  input: EarthquakeInput | null;
  content: string;
}
```

---

## 10. 테스팅 전략

### 테스팅 정리

| 대상 | 방식 | 도구 |
|------|------|------|
| `src/utils/**` |  **TDD** — 테스트 먼저 작성 | Vitest |
| `src/hooks/**` |  **TDD** — 테스트 먼저 작성 | Vitest |
| `src/components/**` |  **자동화 전면 금지** | 수동 확인 |
| `src/App.tsx` |  제외 | 수동 확인 |

> 근거: `.agent/rules/tdd.md` — UI 테스트 자동화는 5일 스코프에서 비효율적.
> UI 품질 검증은 TASK.md "피드백" 단계에서 사용자가 직접 브라우저에서 시나리오를 실행하여 검증한다.

### 코어 로직 테스트 대상 함수

| 파일 | 테스트할 함수 |
|------|----------------|
| `utils/promptBuilder.ts` | `buildSystemPrompt()`, `buildUserPrompt()` |
| `utils/dataParser.ts` | `parseBuildingCSV()`, `filterBuildingsBySigungu()` |
| `utils/coordinates.ts` | `getCoordinates()` |
| `hooks/useLLM.ts` | `analyze()` (Mock Provider 주입) |
| `hooks/useBuildings.ts` | 필터링 로직 |

### 테스트 실행 명령어

```bash
npm run test          # watch 모드 (개발 중)
npm run test:run      # 1회실행 (CI)
npm run test:coverage # 커버리지 리포트 생성
```

---

## 11. 빌드 및 배포

### 10-1. 개발 환경 실행

```bash
cd quakeguard
npm install
cp .env.example .env   # .env 파일 생성 후 API 키 입력
npm run dev            # http://localhost:5173 에서 확인
```

### 10-2. 프로덕션 빌드

```bash
npm run build          # dist/ 폴더에 빌드 결과물 생성
npm run preview        # 빌드 결과물 로컬 확인
```

### 10-3. Vercel 배포

```
1. GitHub에 코드 push
2. vercel.com → New Project → GitHub 저장소 선택
3. Framework Preset: Vite (자동 감지)
4. Environment Variables에 API 키 입력
5. Deploy 클릭 → URL 자동 생성
```

### 11-4. 주요 패키지 목록

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-leaflet": "^4.2.1",
    "leaflet": "^1.9.4",
    "@anthropic-ai/sdk": "^0.39.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "@types/leaflet": "^1.9.14",
    "typescript": "^5.6.2",
    "vite": "^6.0.1",
    "@vitejs/plugin-react": "^4.3.2",
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "jsdom": "^25.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

> 테스트 관련 패키지(vitest, jsdom)는 `src/components/` 제외 설정 포함.

---

## 12. 제약 및 알려진 한계

| 항목 | 현황 | 이유 |
|------|------|------|
| API 키 노출 위험 | 데모에서는 허용 | 백엔드 없는 구조의 한계. 실서비스 전 프록시 서버 필요 |
| 실시간 지진 감지 없음 | 사용자가 수동 입력 | 기상청 API 인증 절차 생략 |
| 주소→좌표 변환 제한 | 주요 지역만 하드코딩 | 지오코딩 API 미사용 |
| 모바일 최적화 미흡 | 태블릿까지만 지원 | 5일 스코프 제한 |
| UI 자동화 테스트 없음 | 수동 검증 | **의도된 구조** — `.agent/rules/tdd.md` 지침 |

---

*작성일: 2026-07-02 | QuakeGuard Tech Spec v1.1 | 테스팅 전략 추가*
