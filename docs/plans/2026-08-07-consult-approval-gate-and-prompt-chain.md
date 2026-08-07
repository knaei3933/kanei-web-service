# Consult Approval Gate + Prompt Chain Implementation Plan

> For Hermes: this feature must be implemented only after 대표님 approves this plan. Execution path must use Claude Code / OMC, and production claims are valid only after real build + production verification.

Goal:
- Change the Kanei homepage pipeline from “customer submit → immediate auto proposal/draft generation” to “customer submit → AI sufficiency review → representative approval → staged execution”.

Architecture:
- Keep `/api/consult` as the intake entrypoint, but split the pipeline into two phases:
  1) intake + AI review + approval package creation
  2) representative-approved execution pipeline
- Do not let the customer submission directly trigger final proposal/homepage generation.
- Persist a structured `approval package` containing intake quality, missing items, extraction targets, planned prompt chain, and execution status.
- Require an explicit representative action before downstream generation starts.
- Use a multi-step prompt chain instead of a single mega prompt. Each stage should have a narrowly scoped objective, outputs, and verification.

Tech stack:
- Next.js 16 / App Router
- TypeScript
- Tailwind
- Existing mail adapter / relay path
- Existing proposal/draft generators
- Existing Monet extraction catalog
- Claude Code / OMC for implementation and later execution planning

---

## 1. Product decision to lock in

This plan assumes the following product rules become the new default behavior.

### Rule A — no automatic production from raw intake
- Customer submission alone must not directly become “proposal approved” or “homepage generation started”.
- The current immediate proposal/draft generation should be demoted to either:
  - a review artifact for 대표님, or
  - disabled until approval.

### Rule B — AI reviews, representative decides
- The system may evaluate whether the intake is sufficient.
- But the final authority to proceed is 대표님.
- Therefore the system must surface:
  - intake quality summary,
  - missing points,
  - extraction feasibility,
  - planned execution stages,
  - risks / assumptions,
  - proposed next action.

### Rule C — prompt chain visibility is internal-only
- After sufficiency review is complete, the system must expose the prompt chain only to 대표님 / internal reviewers.
- The system must show internally:
  - which prompts will run,
  - in what order,
  - with what inputs,
  - what output artifact each stage must produce,
  - what stage requires approval to continue.
- The customer must never see the internal prompt chain, execution order, approval mechanics, or OMC/Claude Code operating details.

### Rule D — execution must go through OMC / Claude Code plan-first flow
- The downstream build/generation flow must not go directly from raw user data into “generate site now”.
- It must go through:
  1) plan stage,
  2) representative approval,
  3) execution stage,
  4) verification stage.
- These internal execution mechanics are for 대표님 / internal reviewers only and are not customer-facing content.

---

## 2. New target pipeline

### Customer-facing timeline
1. Customer submits `/consult`
2. System stores submission
3. System evaluates intake sufficiency
4. System analyzes reference URLs / materials readiness / extraction targets
5. System creates an approval package for 대표님
6. Internal mail to 대표님 says:
   - intake received
   - status = waiting for representative approval
   - summary / missing data / next planned stages
7. Customer receives one of two mails:
   - if weak: additional information request
   - if strong: “검토 접수 완료, 내부 검토 후 진행 여부를 안내” type acknowledgement only
8. 대표님 reviews approval package
9. 대표님 explicitly approves “Proceed to planning”
10. System runs prompt chain stage-by-stage
11. System returns plan artifacts for approval
12. 대표님 approves execution plan
13. OMC / Claude Code executes the implementation or proposal-generation steps
14. Verification runs
15. Final customer-facing proposal / draft / site artifacts are sent

### Internal status model
Recommended states:
- `received`
- `needs_followup`
- `ready_for_review`
- `awaiting_representative_approval`
- `planning_in_progress`
- `awaiting_plan_approval`
- `approved_for_execution`
- `execution_in_progress`
- `verification_in_progress`
- `completed`
- `rejected`

---

## 3. Approval package data model

Create a structured artifact for every consult.
Suggested file:
- `data/submissions/<submissionId>/approval-package.json`

Required fields:
- `submissionId`
- `receivedAt`
- `status`
- `intakeQuality`
  - `status`
  - `score`
  - `reasons`
  - `requestedItems`
  - `followupQuestions`
- `reviewSummary`
  - short business summary
  - target user summary
  - strengths summary
  - must-include summary
  - risky assumptions
- `referenceAnalysis`
  - `referenceUrls`
  - `urlsEligibleForExtraction`
  - `urlsBlockedOrUnusable`
  - `requestedFollowStrength`
  - `sectionTargets`
- `materialsAnalysis`
  - available attachments
  - usable assets
  - missing assets
- `executionPlanPreview`
  - ordered stage list
  - prompts to be used
  - expected outputs per stage
- `approval`
  - `representativeDecision`
  - `approvedAt`
  - `approvedBy`
  - `approvalMemo`
- `execution`
  - stage statuses
  - artifact paths
  - verification summary

Important:
- This artifact is not just a log.
- It is the control document for whether the pipeline may proceed.

---

## 4. Prompt chain that must be made visible

The current user requirement is explicit: after the intake is judged sufficient, the command prompts and their order should be visible.

Below is the recommended chain.

### Stage 1 — Intake normalization prompt
Purpose:
- Convert raw consult payload into a normalized brief object.

Input:
- payload
- saved file metadata
- reference site metadata

Output:
- normalized brief
- missing facts list
- contradictions list

Representative-visible prompt template:
- “Summarize the business, target audience, goals, constraints, available assets, and design references from this consult submission. Identify contradictions, vague points, and mandatory follow-up questions. Output structured JSON only.”

### Stage 2 — Reference URL extraction planning prompt
Purpose:
- Decide which URLs should be extracted and what should be extracted from each.

Input:
- normalized brief
- reference site list
- follow-strength metadata

Output:
- extraction target list
- per-URL extraction intent
- component/section capture priorities

Representative-visible prompt template:
- “For each submitted reference URL, decide whether to extract layout, sections, copy direction, CTA patterns, trust elements, navigation structure, or only visual mood. Reject URLs that are not suitable for extraction and explain why.”

### Stage 3 — Monet / component reference mapping prompt
Purpose:
- Map customer intent to existing Monet catalog structures and extraction targets.

Input:
- normalized brief
- Monet catalog
- extraction plan

Output:
- recommended sections
- component candidates
- rationale

Representative-visible prompt template:
- “Match this business and target audience to the most relevant Monet structures, sections, and component directions. Explain which sections are directly reusable, which need adaptation, and which must be custom.”

### Stage 4 — Representative approval planning prompt
Purpose:
- Produce a plan for 대표님 to approve before any generation or build proceeds.

Input:
- normalized brief
- extraction plan
- component mapping

Output:
- phase-by-phase implementation/generation plan
- assumptions
- blockers
- exact stage order

Representative-visible prompt template:
- “Create a staged execution plan for this website job. Separate planning, extraction, draft composition, visual generation, copy refinement, and verification. Mark which outputs require representative approval before continuing.”

### Stage 5 — OMC plan prompt
Purpose:
- Generate the formal plan artifact used by Claude Code / OMC.

Input:
- approved planning context

Output:
- plan document
- task list
- file/output targets
- verification checklist

Representative-visible prompt template:
- “Write an execution plan for OMC/Claude Code with explicit stages, artifacts, inputs, output paths, verification steps, and rollback points. Do not execute implementation yet.”

### Stage 6 — OMC execution prompt
Purpose:
- Execute only after 대표님 approves the plan.

Input:
- approved plan
- approved brief
- extraction outputs
- component mapping

Output:
- proposal site / draft site / implementation artifacts

Representative-visible prompt template:
- “Execute the approved plan stage-by-stage. At each stage, produce the required artifact, verify it, and record progress. Do not skip verification. Do not invent unavailable assets. If a stage is blocked, stop and report the blocker.”

### Stage 7 — Verification prompt
Purpose:
- Verify the result before anything is reported as complete.

Input:
- generated artifacts
- final URLs / files
- expected deliverables

Output:
- verification report
- pass/fail per requirement

Representative-visible prompt template:
- “Verify that the generated outputs satisfy the approved brief, required sections, reference alignment, asset usage rules, and contact conversion goals. Return a pass/fail checklist with evidence.”

---

## 5. UI / API changes required

### A. `/api/consult` behavior
Current:
- stores submission
- creates brief
- creates draft/proposal URL
- sends downstream mails

Target:
- stores submission
- evaluates sufficiency
- creates approval package
- returns status for review, not automatic production success
- proposal/draft generation becomes conditional on approval state

New response shape should include:
- `submissionId`
- `consultQuality`
- `reviewStatus`
- `approvalStatus`
- `approvalPackagePath` or `approvalPackageId`
- `plannedStages`
- `customerMailMode`
  - `followup_request`
  - `review_acknowledgement`
- optional preview artifacts only if explicitly configured for internal review

### B. `/consult` success UI
Current:
- may expose proposal/draft immediately

Target:
- show one of these:
  - “추가 정보 요청을 보냈습니다”
  - “내부 검토 중입니다”
  - “대표 승인 대기 중입니다”
- do not expose production proposal/draft CTA as the default success path
- optionally show “受付内容の要約” and “確認中の項目” only

### C. representative review UI
Add a new internal route or internal-only artifact view.
Recommended options:
1. internal page like `/review/[submissionId]`
2. or internal mail containing an approval package link

It should show:
- business summary
- sufficiency score
- missing items
- reference URLs and extraction intent
- prompt chain preview
- next execution stages
- approve / reject / hold actions

### D. approval action route
Add a route such as:
- `POST /api/consult/approve`
- `POST /api/consult/reject`

These routes should:
- validate representative action
- update approval package
- transition state
- optionally trigger next stage

---

## 6. Files likely to change

Core files already in play:
- `src/app/api/consult/route.ts`
- `src/app/consult/page.tsx`
- `src/lib/consult-quality.ts`
- `src/lib/proposal.ts`
- `src/lib/draft.ts`
- `src/server/mail/index.ts`
- `src/server/mail/templates.ts`
- `src/server/mail/types.ts`

Likely new files:
- `src/lib/approval-package.ts`
- `src/lib/prompt-chain.ts`
- `src/app/review/[submissionId]/page.tsx` or equivalent
- `src/app/api/consult/approve/route.ts`
- `src/app/api/consult/reject/route.ts`
- `src/lib/extraction-plan.ts`
- `docs/plans/...` for OMC execution handoff

---

## 7. Customer mail policy after this change

### If consult is weak
Send:
- additional information request mail

### If consult is sufficient but not yet approved
Send:
- acknowledgement only
- no proposal page yet
- no “your tailored site is complete” wording yet

### Only after representative approval + execution success
Send:
- proposal URL / draft URL / next-step mail

This avoids premature delivery of low-quality outputs.

---

## 8. OMC / Claude Code execution policy

The user requirement here is important and should become a product rule.

### Required execution order
1. intake review complete
2. representative approves proceeding
3. OMC planning artifact is generated
4. representative approves plan
5. Claude Code executes approved plan
6. verification runs
7. final result is disclosed externally

### What must never happen
- raw customer input → one giant prompt → final site generation
- hidden prompt chain
- hidden extraction scope
- hidden assumptions
- execution before representative approval

---

## 9. Bite-sized implementation tasks for the later coding phase

These are not yet approved for execution. They are the future implementation breakdown once 대표님 approves this plan.

### Task 1: Add approval package model and persistence
Objective:
- Create the data structure that stores review status and prompt chain preview.

### Task 2: Convert `/api/consult` from auto-generation entrypoint to review-gate entrypoint
Objective:
- Intake should stop at review/approval package creation unless explicitly approved.

### Task 3: Add prompt chain preview builder
Objective:
- Persist the exact stage order and prompt summaries shown to 대표님.

### Task 4: Add representative review screen or artifact view
Objective:
- Show intake summary, prompt chain, extraction plan, and approval actions.

### Task 5: Add approval / reject actions
Objective:
- Transition submissions into approved or rejected states.

### Task 6: Split customer mail templates into acknowledgement / follow-up / approved-delivery
Objective:
- Ensure customer messaging reflects the real state.

### Task 7: Move proposal/draft generation behind approval gates
Objective:
- Disable immediate public proposal/draft success path.

### Task 8: Add OMC plan artifact generation stage
Objective:
- When approved to plan, produce a formal OMC execution plan.

### Task 9: Add execution + verification state tracking
Objective:
- Record whether the approved plan was executed and verified.

### Task 10: Production verification
Objective:
- Validate the new state machine end-to-end on production.

---

## 10. Verification checklist for the future implementation

The feature is complete only if all of the following are verified.

### Intake / state
- customer submit creates submission
- customer submit creates approval package
- default state is not “final generation complete”

### Review / approval
- representative can see quality summary
- representative can see prompt chain order
- representative can see extraction scope
- representative can approve or reject

### Customer messaging
- weak intake gets follow-up request mail
- strong intake gets acknowledgement, not premature proposal mail
- proposal/draft mail only goes after approval + execution success

### Execution visibility
- OMC plan stage is visible
- execution stage is visible
- verification stage is visible

### Production truthfulness
- no final success claim is shown unless actual artifacts are generated and verified

---

## 11. Recommended first implementation scope

To keep the next coding pass realistic, the first approved implementation should probably stop at:
- approval package creation
- representative review visibility
- proposal/draft auto-exposure disabled
- explicit approval state model
- prompt chain preview disclosure

And leave these for the second pass:
- full automated post-approval execution orchestration
- background workers / resumable pipeline engine
- deeper extraction automation across all reference URL types

That split will reduce production risk.

---

## 12. Approval decision requested from 대표님

If approved, the next coding pass should implement the following exact product shift:

- `/consult` no longer immediately exposes customer-facing proposal/draft by default
- customer intake creates an internal approval package first
- representative approval becomes mandatory before downstream execution
- prompt chain order becomes visible in the review package
- OMC / Claude Code plan-first execution becomes mandatory for downstream build steps

Once approved, the next step is:
- write the execution-level OMC plan
- then implement phase 1 of the approval-gated pipeline
