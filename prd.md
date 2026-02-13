# PRD: 플레이메이커 컨셉 독립 챗봇

## 1. 개요

플레이메이커(Plai-Maker)의 대화형 앱 설계 경험을 **독립된 챗봇 서비스**로 분리·확장한다.
기존 플레이메이커가 MISO 플랫폼 내부 메뉴(`/plai-maker`)로 동작하는 것과 달리, 이 챗봇은 별도 도메인/앱으로 배포하여 외부 사용자에게도 제공할 수 있는 형태를 목표로 한다.

**스코프**: 이 문서는 **문제 정의(Problem Definition) 완료 단계까지**의 흐름만 다룬다.

---

## 2. 배경 및 문제 정의

### 2.1 현재 상태 (As-Is)

플레이메이커는 MISO 웹 프론트엔드(`web/`)의 한 메뉴로 존재하며, 다음과 같은 구조로 동작한다:

| 구성요소 | 현재 구현 |
|---------|----------|
| **라우팅** | `web/src/app/(menu)/plai-maker/` Next.js App Router 페이지 |
| **채팅 엔진** | `useMisoChat` 훅 → MISO 챗봇 API (`ssePost`)로 SSE 스트리밍 |
| **에이전트 오케스트레이터** | MISO 앱(워크플로우/챗플로우)에 Claude 에이전트 프롬프트 탑재 |
| **응답 파싱** | `miso-response-parser.ts` — XML-like 태그 기반 파싱 (`<agent>`, `<form>`, `<problem_definition>`, `<prd>` 등) |
| **폼 렌더링** | `StreamingQuestions` 컴포넌트 — select/multiselect 질문 카드 UI |
| **문제 정의 카드** | `ProblemDefinitionCard` — 목적/대상사용자/핵심문제/페인포인트 테이블 |
| **대화 저장** | `plaimaker-conversation.service.ts` → 백엔드 API (`/plaimaker/conversations`) |
| **인증** | MISO 로그인 세션 필수 (내부 API 사용) |

### 2.2 에이전트 흐름 (문제 정의까지)

```
사용자 입력
    │
    ▼
┌─────────────────────────────┐
│  Orchestrator (CLAUDE.md)   │  ← 순수 라우터, 컨텐츠 생성 안 함
│  - 문제 정의 미완성 → Ally  │
│  - 문제 정의 완성 → Kyle    │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────┐
│  Ally (ally.md)             │  ← 문제 발견 전문가
│  - JTBD 프레임워크           │
│  - Turn 1: 3-5개 질문        │
│  - Turn 2: 1-2개 보충 질문   │
│  - 최대 2턴에 완료           │
└─────────┬───────────────────┘
          │
          ▼
    ┌─────────────┐
    │ ready_for_prd: true │
    │ + 문제 정의 요약 테이블  │
    └─────────────┘
```

### 2.3 MISO 연동 포인트

| 연동 지점 | 설명 |
|----------|------|
| **챗봇 API** | MISO 앱(챗플로우)을 통해 LLM 호출. `ssePost(api, body)` → SSE 스트리밍 응답 |
| **앱 코드** | `appCode`로 특정 MISO 앱 식별. 어드민에서 플레이메이커용 앱 설정 |
| **대화 ID** | `conversation_id` — MISO 대화 세션 관리, 이전 컨텍스트 유지 |
| **응답 포맷** | MISO 앱의 LLM이 XML-like 태그로 구조화된 응답 생성 |
| **대화 영속성** | 별도 API (`/plaimaker/conversations`)로 대화 이력 저장/조회 |

### 2.4 응답 파싱 구조

MISO 챗봇 API의 응답은 텍스트 스트림이며, 프론트엔드에서 XML-like 태그를 파싱한다:

```
<agent>ally</agent>
메시지 텍스트...
<form>[
  {
    "type": "select",
    "question": "리포트 작성 주기는?",
    "header": "작성 빈도",
    "options": [
      {"label": "매일", "description": "일일 리포트"},
      {"label": "매주", "description": "주간 리포트"}
    ]
  }
]</form>
```

파싱 결과 (`MisoParsedResponse`):

| 필드 | 타입 | 설명 |
|-----|------|------|
| `agentId` | `string \| null` | 응답한 에이전트 ID (ally, kyle 등) |
| `message` | `string` | 태그 외부 텍스트 (마크다운) |
| `questions` | `Question[]` | `<form>` 태그 내 질문 배열 |
| `problemDefinition` | `ProblemDefinition \| null` | `<problem_definition>` 태그 내 JSON |
| `isIncomplete` | `boolean` | 스트리밍 중 태그 미완성 여부 |
| `loadingType` | `string \| null` | `<loading>` 태그 (스트리밍 중 UI 힌트) |

### 2.5 폼(질문) 시스템

질문은 `select` / `multiselect` 두 타입만 존재한다:

```typescript
interface Question {
  type: "select" | "multiselect";
  question: string;       // 질문 텍스트
  header: string;         // 질문 그룹 제목 (답변의 key로도 사용)
  options: Array<{
    label: string;        // 옵션 표시 텍스트
    description?: string; // 옵션 설명
    miso_type?: string;   // MISO 연동용 타입 힌트
  }>;
  required?: boolean;
  preselected?: boolean;  // true면 모든 옵션 자동 선택 (multiselect용)
}
```

사용자 답변은 `Record<string, string>` 형태로 직렬화되어 다음 메시지의 `query`로 전송된다:
- select: `{ "작성 빈도": "매일" }`
- multiselect: `{ "주요 불편사항": "데이터 수집, 시간 소요" }`
- 기타 입력: `{ "작성 빈도": "분기별" }` (사용자 직접 입력)

### 2.6 문제 정의 완료 조건

Ally 에이전트는 JTBD 프레임워크 4요소가 수집되면 `ready_for_prd: true`를 반환한다:

| JTBD 요소 | 설명 | 예시 |
|-----------|------|------|
| **목적** (purpose) | 완료 시 기대하는 결과 | "일일 시황 리포트 작성 자동화" |
| **대상 사용자** (target_users) | 수행 주체와 빈도 | "시장 분석팀 (빈도: 매일)" |
| **핵심 문제** (core_problem) | 해결해야 할 근본 과제 | "PDF에서 정보 추출 및 번역 작업" |
| **불편함** (pain_points) | 현재 겪는 고통점 | "반복 작업, 시간 소요, 번역 일관성 문제" |

완료 시 응답 형태:
```json
{
  "message": "문제 정의를 완료했어요! ...\n\n| 항목 | 내용 |\n|------|------|\n| **목적** | ... |",
  "ready_for_prd": true
}
```

프론트엔드에서는 메시지 내 마크다운 테이블로 렌더링되거나, `<problem_definition>` 태그가 포함되면 `ProblemDefinitionCard` 컴포넌트로 구조화 표시된다.

---

## 3. 문제 정의 (이 PRD가 해결하려는 문제)

### 3.1 현재의 한계

| 문제 | 영향 |
|------|------|
| **MISO 플랫폼 종속** | 로그인, 라우팅, API 인증이 모두 MISO에 묶여 있어 외부 배포 불가 |
| **단일 메뉴로 제한** | `web/` 프로젝트 내부 페이지로만 존재, 별도 서비스로 분리 어려움 |
| **에이전트 프롬프트가 MISO 앱에 종속** | 프롬프트 변경 시 MISO 앱 설정 변경 필요 |
| **인증 없는 접근 불가** | 외부 사용자(잠재 고객)에게 체험 제공 어려움 |

### 3.2 해결 목표

**"플레이메이커의 문제 정의 대화 경험을 독립 챗봇으로 추출하여, MISO 계정 없이도 누구나 접근 가능한 형태로 제공한다."**

| 목표 | 상세 |
|------|------|
| **독립 배포** | 별도 도메인/서브도메인으로 배포 가능 |
| **MISO 연동 유지** | 백엔드 LLM 호출은 여전히 MISO 챗봇 API 활용 (Public API 모드) |
| **동일한 UX** | 폼 기반 질문, 에이전트 인디케이터, 문제 정의 카드 등 핵심 UX 유지 |
| **문제 정의까지** | 이 단계에서는 Ally의 문제 정의 완료까지만 구현 (Kyle/Ian/Heather 후속) |

### 3.3 스코프 (In / Out)

| 구분 | 항목 |
|------|------|
| **In** | 대화 UI, 폼 질문 시스템, 에이전트 인디케이터, 문제 정의 카드, MISO Public API 연동, 대화 이력 (로컬 또는 간이 저장) |
| **Out** | Kyle(PRD 생성), Ian(워크플로우), Heather(UI), 사용자 인증/회원가입, 대화 공유, 어드민 설정 |
