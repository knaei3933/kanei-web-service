@AGENTS.md

## Claude Code + OMC 사용 규칙

이 프로젝트에서 Claude Code를 실행할 때는 다음을 따르세요.

### OMC (oh-my-claudecode) 플러그인
- **항상 활성화됨** —Skills 69개, Agents 19개, Hooks 11개
- 복잡한 구현 작업은 `omc:ultrawork` 또는 `omc:autopilot` 스킬 사용
- 계획 단계에서는 `omc:plan` 스킬 사용
- 코드 리뷰는 `omc:code-reviewer` 에이전트 사용
- 디버깅은 `omc:debugger` 에이전트 사용

### 필수 참조 파일
- **OMC Monet 컴포넌트 카탈로그**: `src/generated/monet-catalog.ts` — 자동 생성. 홈페이지 제작 시 반드시 이 카탈로그를 먼저 참조하여 재사용 가능한 컴포넌트를 우선 사용.
- **brief.json**: 고객 요구사항 정규화 브리핑
- **omc-plan.json**: 단계별 실행 계획

### 데모 사이트 제작 워크플로우
1. `brief.json` 읽기 → 요구사항 파악
2. `omc-plan.json` 읽기 → 실행 계획 확인
3. `src/generated/monet-catalog.ts` 참조 → 컴포넌트 매핑
4. OMC `ultrawork` 또는 `autopilot`로 구현 (카탈로그 기반 우선, 커스텀은 필요시만)
5. `verify` 스킬로 brief 요구사항 vs 구현 내용 교차 확인

### 코딩 규칙
- 고객 향 텍스트는 **일본어만**
- Stack: Next.js 16 (App Router) + Tailwind CSS 4 + framer-motion + lucide-react
- UI 컴포넌트: `src/components/ui/` (button, section 등) 재사용
- 섹션 컴포넌트: `src/components/sections/` 에 생성
- 데모 페이지: `src/app/execution/[submissionId]/page.tsx` 에 라우팅
