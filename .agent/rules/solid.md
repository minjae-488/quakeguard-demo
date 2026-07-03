# SOLID Principles Rules — QuakeGuard

## 개요

코어 로직(`src/utils/`, `src/hooks/`, `src/types/`)은 SOLID 원칙을 따른다.
5원칙 각각을 이 프로젝트의 구체적인 코드 패턴으로 정의한다.

---

## S — Single Responsibility Principle (단일 책임)

> **하나의 모듈/함수/클래스는 하나의 이유로만 변경된다.**

### 적용 규칙

- 함수 하나는 **한 가지 일**만 한다 (20줄 초과 시 분리 검토)
- 파일 하나는 **한 가지 역할**만 담당한다

###  올바른 예

```typescript
// promptBuilder.ts  → 프롬프트 조립만 담당
export function buildSystemPrompt(): string { ... }
export function buildUserPrompt(input: EarthquakeInput, buildings: Building[]): string { ... }

// dataParser.ts  → 데이터 파싱만 담당
export function parseBuildingCSV(raw: string): Building[] { ... }
export function filterBuildingsBySigungu(buildings: Building[], sigungu: string): Building[] { ... }

// coordinates.ts  → 좌표 변환만 담당
export function getCoordinates(sigungu: string): { lat: number; lng: number } | null { ... }
```

###  금지 패턴

```typescript
// 한 함수가 파싱 + 필터링 + 프롬프트 조립을 모두 하는 것
function processAndBuildPrompt(csvData: string, sigungu: string): string {
  const buildings = parseBuildingCSV(csvData);    // 책임 1
  const filtered = filterBuildingsBySigungu(...); // 책임 2
  return buildUserPrompt(filtered);               // 책임 3
}
```

---

## O — Open/Closed Principle (개방/폐쇄)

> **확장에는 열려있고, 수정에는 닫혀 있어야 한다.**

### 적용 규칙

- 새로운 재난 유형(태풍, 홍수)이 추가될 때 기존 코드를 **수정하지 않고** 확장할 수 있어야 한다
- 새로운 LLM 제공자(Gemini 등)가 추가될 때 기존 코드를 수정하지 않아야 한다

###  올바른 예 — LLM 제공자 확장

```typescript
// 인터페이스 정의 (변경되지 않음)
interface ILLMProvider {
  stream(systemPrompt: string, userPrompt: string): AsyncIterable<string>;
}

// Claude 구현 (기존 코드 수정 없이 추가)
class ClaudeProvider implements ILLMProvider {
  async *stream(systemPrompt: string, userPrompt: string) { ... }
}

// OpenAI 구현 (기존 코드 수정 없이 추가)
class OpenAIProvider implements ILLMProvider {
  async *stream(systemPrompt: string, userPrompt: string) { ... }
}

// Gemini 추가 시 → 기존 코드 수정 없이 새 클래스만 추가
class GeminiProvider implements ILLMProvider { ... }
```

###  올바른 예 — 재난 유형 확장

```typescript
// 재난 유형별 프롬프트 빌더 인터페이스
interface IPromptBuilder {
  buildSystemPrompt(): string;
  buildUserPrompt(input: DisasterInput): string;
}

class EarthquakePromptBuilder implements IPromptBuilder { ... }
class FloodPromptBuilder implements IPromptBuilder { ... }     // 추가 시 기존 수정 없음
class TyphoonPromptBuilder implements IPromptBuilder { ... }  // 추가 시 기존 수정 없음
```

---

## L — Liskov Substitution Principle (리스코프 치환)

> **자식 타입은 부모 타입을 완전히 대체할 수 있어야 한다.**

### 적용 규칙

- `ILLMProvider`를 구현한 `ClaudeProvider`와 `OpenAIProvider`는 **동일한 입력에 동일한 형식의 출력**을 반환해야 한다
- 인터페이스를 구현하면서 동작을 **약화(throw, no-op)**시키지 않는다

###  올바른 예

```typescript
// 두 구현체 모두 stream()이 AsyncIterable<string>을 반환
const provider: ILLMProvider = isClaudeKey ? new ClaudeProvider(key) : new OpenAIProvider(key);

// 호출 코드는 어떤 구현체인지 몰라도 됨
for await (const chunk of provider.stream(system, user)) {
  appendToOutput(chunk);
}
```

###  금지 패턴

```typescript
class BrokenProvider implements ILLMProvider {
  async *stream() {
    throw new Error('not implemented'); // ← LSP 위반: 인터페이스 계약 파기
  }
}
```

---

## I — Interface Segregation Principle (인터페이스 분리)

> **클라이언트는 자신이 사용하지 않는 메서드에 의존하지 않아야 한다.**

### 적용 규칙

- 인터페이스는 **작게, 목적별로** 분리한다
- 하나의 거대한 인터페이스 대신 여러 개의 작은 인터페이스를 사용한다

###  올바른 예

```typescript
//  역할별로 분리된 인터페이스
interface ILLMStreamer {
  stream(system: string, user: string): AsyncIterable<string>;
}

interface ILLMCompleter {
  complete(system: string, user: string): Promise<string>;
}

interface IDataReader {
  getBuildings(sigungu: string): Building[];
}

interface IDataWriter {
  saveResult(result: AiResponse): void;
}
```

###  금지 패턴

```typescript
//  모든 것을 한 인터페이스에 몰아넣기
interface IEverything {
  stream(...): AsyncIterable<string>;
  complete(...): Promise<string>;
  getBuildings(...): Building[];
  saveResult(...): void;
  parseCSV(...): Building[];
  buildPrompt(...): string;
}
```

---

## D — Dependency Inversion Principle (의존성 역전)

> **고수준 모듈은 저수준 모듈에 의존하지 않는다. 둘 다 추상화에 의존한다.**

### 적용 규칙

- 훅(`hooks/`)은 구체적인 구현 클래스가 아닌 **인터페이스에 의존**한다
- LLM 제공자, 데이터 소스는 **주입(injection)**으로 전달한다
- 테스트 시 쉽게 Mock으로 교체 가능한 구조여야 한다

###  올바른 예

```typescript
// hooks/useLLM.ts
// ← 구체 클래스(ClaudeProvider)에 의존하지 않음
export function useLLM(provider: ILLMProvider) {
  const [response, setResponse] = useState<AiResponse>({ status: 'idle', content: '' });

  const analyze = async (system: string, user: string) => {
    for await (const chunk of provider.stream(system, user)) {
      setResponse(prev => ({ ...prev, content: prev.content + chunk }));
    }
  };

  return { response, analyze };
}

// App.tsx에서 구체 구현 주입
const provider = import.meta.env.VITE_LLM_PROVIDER === 'claude'
  ? new ClaudeProvider(import.meta.env.VITE_ANTHROPIC_API_KEY)
  : new OpenAIProvider(import.meta.env.VITE_OPENAI_API_KEY);

<MyComponent provider={provider} />
```

###  테스트에서 Mock 주입

```typescript
// 테스트 파일에서 실제 API 호출 없이 Mock 주입
const mockProvider: ILLMProvider = {
  stream: async function* () {
    yield '즉시 조치:';
    yield ' 황성아파트 현장 확인';
  }
};

const { response, analyze } = useLLM(mockProvider);
```

---

## 요약 체크리스트

코어 로직 PR/코드 작성 전 확인:

- [ ] 이 함수/모듈은 단 하나의 책임만 갖는가? **(S)**
- [ ] 새 기능 추가 시 기존 코드를 수정하지 않아도 되는가? **(O)**
- [ ] 인터페이스 구현체는 완전히 교체 가능한가? **(L)**
- [ ] 인터페이스는 필요한 메서드만 포함하는가? **(I)**
- [ ] 구체 클래스가 아닌 인터페이스에 의존하는가? **(D)**

---

*규칙 버전: 1.0 | 프로젝트: QuakeGuard*
