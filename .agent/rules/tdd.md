# TDD Rules — QuakeGuard

## 적용 범위

TDD는 **코어 로직**에만 적용한다. UI 컴포넌트(React)는 **자동화 테스트 대상에서 완전히 제외**한다.

###  TDD 적용 대상 (테스트 먼저 작성)
- `src/utils/` — 데이터 파싱, 프롬프트 조립, 좌표 변환
- `src/hooks/` — LLM 호출 로직, 데이터 필터링 로직
- `src/types/` — 타입 가드 함수
- 순수 함수(Pure function)로 작성 가능한 모든 로직

###  UI 자동화 테스트 금지

아래 항목에 대해 **자동화 테스트(Vitest, Playwright, Cypress 등 모든 도구)를 작성하지 않는다.**

- `src/components/` — React 컴포넌트 (Header, InputPanel, BuildingList 등)
- `src/App.tsx` — 루트 레이아웃
- `src/index.css` — 스타일
- 외부 API 직접 호출부 (Mock으로 대체)

**UI 품질 검증은 사람이 직접 브라우저에서 확인한다 (수동 테스트).**

> 이유: 5일 스코프에서 UI 테스트 셋업/유지비용은 실제 기능 개발보다 비효율적이다.
> UI는 TASK.md의 "피드백" 단계에서 사용자가 직접 시나리오를 실행해 검증한다.

---

## Red → Green → Refactor 사이클

모든 코어 로직 구현은 반드시 아래 순서를 따른다.

```
1.  RED   : 실패하는 테스트를 먼저 작성
2.  GREEN : 테스트를 통과하는 최소한의 코드 작성
3.  REFACTOR : 테스트를 유지하며 코드 품질 개선
```

**절대 금지**: 테스트 없이 코어 로직 함수를 먼저 구현하는 것.

---

## 테스트 프레임워크

- **도구**: Vitest (Vite와 통합, Jest 호환 문법)
- **실행**: `npm run test` (watch 모드)
- **파일 위치**: 구현 파일과 같은 폴더, `.test.ts` 확장자

```
src/utils/
├── promptBuilder.ts       ← 구현
├── promptBuilder.test.ts  ← 테스트 (쌍으로 존재)
├── dataParser.ts
├── dataParser.test.ts
└── coordinates.ts
    coordinates.test.ts
```

---

## 테스트 작성 규칙

### 1. 테스트 이름은 행동(behavior)을 서술한다

```typescript
//  나쁜 예
test('buildPrompt', () => { ... })

//  좋은 예
test('규모 5.0 이상이면 즉시조치 문구가 프롬프트에 포함된다', () => { ... })
test('취약 건물이 없는 지역이면 건물 목록이 빈 상태로 전달된다', () => { ... })
```

### 2. AAA 패턴을 따른다

```typescript
test('경주시 필터링 시 경주시 건물만 반환된다', () => {
  // Arrange (준비)
  const buildings = [
    { sigungu: '경주시', name: '황성아파트', ... },
    { sigungu: '포항시', name: '북구빌라', ... },
  ];

  // Act (실행)
  const result = filterBuildingsBySigungu(buildings, '경주시');

  // Assert (검증)
  expect(result).toHaveLength(1);
  expect(result[0].sigungu).toBe('경주시');
});
```

### 3. 외부 의존성은 반드시 Mock 처리

```typescript
// LLM API 호출은 실제 호출 금지, 반드시 Mock
vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn().mockImplementation(() => ({
    messages: { stream: vi.fn().mockResolvedValue(mockStream) }
  }))
}));
```

### 4. 경계값(Edge case) 테스트 필수

각 함수마다 아래 케이스를 반드시 포함한다:
- 빈 입력 (`[]`, `''`, `null`, `undefined`)
- 최솟값/최댓값 (규모 1.0, 9.0)
- 존재하지 않는 지역명
- 잘못된 형식의 데이터

---

## 테스트 커버리지 목표

| 대상 | 목표 커버리지 |
|------|--------------|
| `src/utils/` | **90% 이상** |
| `src/hooks/` | **80% 이상** |
| 전체 코어 로직 | **85% 이상** |
| `src/components/` | **측정 안 함 (자동화 제외)** |

---

## vitest 설정 (vite.config.ts에 추가)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // UI 컴포넌트 테스트 파일이 존재해서는 안 됨
    // 아래 include 설정으로 components/ 는 테스트 스캔에서 제외
    include: ['src/utils/**/*.test.ts', 'src/hooks/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/hooks/**'],
      exclude: [
        'src/components/**',   // UI — 자동화 테스트 금지
        'src/App.tsx',
        'src/main.tsx',
        'src/index.css',
      ],
      // 커버리지 리포트에 components/ 가 0%로 표시되지 않도록 완전 제외
      all: false,
    }
  }
})
```

---

## UI 수동 테스트 가이드

UI 자동화 대신 아래 체크리스트를 TASK.md "피드백" 단계에서 사람이 직접 확인한다.

```
[ ] 시나리오 버튼(경주 M5.8) 클릭 → 입력값 자동 채워짐 확인
[ ] [AI 분석 시작] 버튼 클릭 → 로딩 스피너 표시 확인
[ ] AI 결과 텍스트가 스트리밍으로 타이핑되듯 출력 확인
[ ] 즉시조치 / 1시간내 / 보고서 섹션 구분 확인
[ ] [복사] 버튼 → 클립보드 복사 확인
[ ] [보고서 인쇄] 버튼 → 브라우저 인쇄 창 열림 확인
[ ] 지역 변경 시 건물 목록 필터링 확인
[ ] API 키 없을 때 오류 메시지 표시 확인
```

---

*규칙 버전: 1.1 | 프로젝트: QuakeGuard | UI 자동화 금지 정책 추가*
