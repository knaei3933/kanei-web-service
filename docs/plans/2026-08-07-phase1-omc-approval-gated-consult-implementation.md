# Phase 1 OMC Execution Plan — Approval-Gated Consult Pipeline

> For Hermes / OMC: implement this plan only. Do not expand scope beyond phase 1. Use Claude Code / OMC for coding. After implementation, verify with real build and production checks.

Goal:
- Convert the current consult pipeline into an approval-gated internal review system where customer submissions do not immediately become customer-facing proposal/draft deliverables.

Architecture:
- Reuse the current `/api/consult` intake and mail stack, but stop the happy-path at an internal `approval package` artifact and review status.
- Keep the current draft/proposal generation code in the repo, but move it behind approval gates so it is no longer the default customer-facing outcome.
- Add a lightweight internal review route and approval APIs to establish the state machine without yet building the full post-approval execution engine.

Tech stack:
- Next.js 16 / App Router
- TypeScript
- Tailwind
- Existing consult-quality, draft, proposal, and mail modules

Non-goals for phase 1:
- No automatic post-approval generation engine
- No long-running background executor
- No full reference-URL crawling / browser extraction implementation yet
- No customer-visible exposure of internal prompt chain

---

## Deliverable summary

At the end of phase 1, the system must do this:

1. Customer submits `/consult`
2. Submission is saved
3. Intake quality is assessed
4. Approval package is created
5. Customer sees only:
   - follow-up requested, or
   - internal review in progress
6. Internal reviewer page shows:
   - submission summary
   - quality assessment
   - missing points
   - internal prompt chain preview
   - approval state
7. Representative can:
   - approve for planning
   - reject / hold
8. Proposal/draft are no longer auto-exposed to the customer by default

---

## State model for phase 1

Use these states now:
- `received`
- `needs_followup`
- `awaiting_representative_approval`
- `approved_for_planning`
- `rejected`

Mapping rules:
- weak intake → `needs_followup`
- strong intake → `awaiting_representative_approval`
- representative approved → `approved_for_planning`
- representative rejected → `rejected`

Do not add `execution_in_progress` or later states yet in code unless needed for typing extensibility.

---

## Files to create / modify

### Create
- `src/lib/approval-package.ts`
- `src/lib/prompt-chain.ts`
- `src/app/review/[submissionId]/page.tsx`
- `src/app/api/consult/approve/route.ts`
- `src/app/api/consult/reject/route.ts`

### Modify
- `src/app/api/consult/route.ts`
- `src/app/consult/page.tsx`
- `src/server/mail/types.ts`
- `src/server/mail/templates.ts`
- `src/server/mail/index.ts`
- optionally `src/lib/consult-quality.ts` only if extra typing helpers are needed

### Reuse without customer default exposure
- `src/lib/proposal.ts`
- `src/lib/draft.ts`
- `src/app/proposal/page.tsx`
- `src/app/draft/page.tsx`

---

## Data model design

### Task 1: Create approval package types and persistence helpers

Objective:
- Introduce a single internal artifact that records whether a consult is ready, what is missing, and what internal stages are planned.

Files:
- Create: `src/lib/approval-package.ts`

Implementation requirements:
- Export types:
  - `ApprovalStatus = "received" | "needs_followup" | "awaiting_representative_approval" | "approved_for_planning" | "rejected"`
  - `RepresentativeDecision = "approve" | "reject" | "hold" | null`
  - `PromptStagePreview`
  - `ApprovalPackage`
- `ApprovalPackage` should include at minimum:
  - `submissionId`
  - `receivedAt`
  - `status`
  - `customerFacingStatus`
  - `intakeQuality`
  - `reviewSummary`
  - `referenceAnalysis`
  - `materialsAnalysis`
  - `promptChainPreview`
  - `approval`
- Add helpers:
  - `buildApprovalPackage(payload, submissionId, savedFiles, intakeQuality)`
  - `approvalPackagePathFor(submissionId)`
  - `writeApprovalPackage(pkg)`
  - `readApprovalPackage(submissionId)`
  - `updateApprovalPackageDecision(submissionId, action, meta)`
- Reuse the existing submission storage folder layout.
- Save file path:
  - `data/submissions/<submissionId>/approval-package.json`
  - or `/tmp/...` equivalent in serverless mode, using the same root logic as consult storage.

Verification:
- local helper invocation writes valid JSON
- build passes

Commit message:
- `feat: add approval package model for consult review`

---

## Internal prompt chain preview

### Task 2: Create internal-only prompt chain preview builder

Objective:
- Encode the internal stage order that 대표님 can review, without exposing it to customers.

Files:
- Create: `src/lib/prompt-chain.ts`
- Modify: `src/lib/approval-package.ts`

Implementation requirements:
- `src/lib/prompt-chain.ts` should export:
  - `buildPromptChainPreview(input): PromptStagePreview[]`
- Use a compact internal preview structure per stage:
  - `id`
  - `title`
  - `objective`
  - `inputs`
  - `expectedOutputs`
  - `requiresRepresentativeApprovalBeforeContinue`
- For phase 1, define previews for these stages only:
  - `intake-normalization`
  - `reference-extraction-planning`
  - `monet-component-mapping`
  - `omc-planning`
  - `execution-after-approval` (preview only, not implemented)
  - `verification`
- Do not store raw full prompt text in customer-facing responses.
- It is acceptable to store prompt summaries / templates in the approval package for internal review.

Verification:
- approval package JSON includes ordered prompt chain preview
- preview is not returned in customer-facing success text blocks unless intended for internal-only API/UI

Commit message:
- `feat: add internal prompt chain preview for consult review`

---

## Consult API behavior change

### Task 3: Convert `/api/consult` into review-gated intake flow

Objective:
- Stop treating `/api/consult` as immediate public proposal generation success.

Files:
- Modify: `src/app/api/consult/route.ts`

Implementation requirements:
- Preserve:
  - payload parsing
  - file saving
  - submission record write
  - brief generation
  - intake quality assessment
- Add:
  - approval package build + write
- Determine state:
  - `needs_followup` if consultQuality says so
  - otherwise `awaiting_representative_approval`
- Response should include:
  - `ok`
  - `submissionId`
  - `consultQuality`
  - `reviewStatus`
  - `approvalStatus`
  - `customerFacingStatus`
  - `reviewUrl` (internal use)
  - `mail`
- Change output behavior:
  - do not treat `proposalUrl` and `draftUrl` as default customer-facing outputs
  - for phase 1, set them to `null` in normal customer response flow unless explicitly needed for internal review only
- Keep current proposal/draft generation code callable if useful internally, but do not wire it into customer success as default behavior.

Recommended internal-only review URL:
- `/review/<submissionId>`

Verification:
- local POST with strong payload returns `awaiting_representative_approval`
- local POST with weak payload returns `needs_followup`
- response no longer advertises customer-facing proposal CTA by default

Commit message:
- `feat: gate consult pipeline behind internal review status`

---

## Mail policy split

### Task 4: Split customer mail into acknowledgement vs follow-up request

Objective:
- Ensure customer messaging reflects review state, not premature proposal completion.

Files:
- Modify: `src/server/mail/types.ts`
- Modify: `src/server/mail/templates.ts`
- Modify: `src/server/mail/index.ts`
- Modify: `src/app/api/consult/route.ts`

Implementation requirements:
- Add a new customer mail purpose:
  - `customer-review-acknowledgement`
- Keep existing:
  - `customer-followup`
  - `customer-proposal`
- Add a new template builder:
  - `buildCustomerReviewAcknowledgementMail(...)`
- For strong submissions in phase 1:
  - send acknowledgement mail only
  - content should say the submission is under internal review and further steps will follow after review
  - do not mention proposal page completed
- For weak submissions:
  - send existing follow-up request mail
- Internal mail should include:
  - status
  - review URL
  - quality score
  - missing items

Verification:
- strong case → customer mail subject/body is acknowledgement only
- weak case → customer mail subject/body asks for missing information
- internal mail includes review link/path

Commit message:
- `feat: split consult customer mail into review and follow-up modes`

---

## Customer success screen change

### Task 5: Replace immediate proposal success UI with review-state UI

Objective:
- The customer should no longer see “your proposal/draft is ready” as the default success state.

Files:
- Modify: `src/app/consult/page.tsx`

Implementation requirements:
- Use the new API response fields:
  - `reviewStatus`
  - `approvalStatus`
  - `customerFacingStatus`
  - `consultQuality`
- Success screen must branch only into these customer-visible states:
  1) `needs_followup`
     - explain that additional information has been requested by email
  2) `awaiting_representative_approval`
     - explain that the submission is under internal review
  3) `approved_for_planning` should not normally occur on direct submit in phase 1
- Remove default customer CTA to proposal/draft on submit completion
- Keep Japanese only in user-facing text
- Keep internal prompt-chain data off the customer screen entirely

Verification:
- weak submission UI shows follow-up state
- strong submission UI shows internal review state
- no default proposal/draft customer CTA appears

Commit message:
- `feat: change consult success page to review-gated states`

---

## Internal review screen

### Task 6: Add internal representative review page

Objective:
- Give 대표님 a place to inspect the approval package and act.

Files:
- Create: `src/app/review/[submissionId]/page.tsx`
- Modify: `src/lib/approval-package.ts`

Implementation requirements:
- Server-rendered page is enough for phase 1
- Read the saved approval package by `submissionId`
- Show sections:
  - business summary
  - intake quality score/status/reasons
  - requested follow-up items
  - reference URL analysis
  - materials readiness
  - internal prompt chain preview
  - current approval state
- Show action buttons/forms:
  - approve for planning
  - reject
- Keep this route internal in intent; explicit auth can be deferred if not already available, but label/document as internal-only.
- If package not found, show clear error state.

Verification:
- a saved submission opens review page successfully
- prompt chain preview is visible here
- customer-facing page does not show this content

Commit message:
- `feat: add internal review page for consult approval`

---

## Approval action APIs

### Task 7: Add approve / reject endpoints

Objective:
- Let representative update the approval state explicitly.

Files:
- Create: `src/app/api/consult/approve/route.ts`
- Create: `src/app/api/consult/reject/route.ts`
- Modify: `src/lib/approval-package.ts`

Implementation requirements:
- Accept JSON body with:
  - `submissionId`
  - optional `memo`
  - optional `approvedBy`
- Approve route should update:
  - `status = approved_for_planning`
  - `approval.representativeDecision = "approve"`
  - `approvedAt`
  - `approvedBy`
  - `approvalMemo`
- Reject route should update:
  - `status = rejected`
  - `approval.representativeDecision = "reject"`
  - metadata timestamps/memo
- Return updated package summary JSON
- Do not yet trigger full execution engine automatically
- It is okay to include `nextRecommendedAction` in response for future wiring

Verification:
- approve API changes status correctly
- reject API changes status correctly
- review page reflects changed state after refresh

Commit message:
- `feat: add representative approval APIs for consult review`

---

## Internal-only review link propagation

### Task 8: Add review URL into internal notifications and API response

Objective:
- Make it easy for 대표님 to jump from mail/API evidence into the review page.

Files:
- Modify: `src/app/api/consult/route.ts`
- Modify: `src/server/mail/templates.ts`
- Possibly modify: `src/server/mail/types.ts`

Implementation requirements:
- Build `reviewUrl = ${absoluteBaseUrl(request)}/review/${submissionId}`
- Include review URL in:
  - approval package
  - internal mail template
  - API response
- Do not include review URL in customer-facing mail content

Verification:
- internal mail includes review URL
- API response includes review URL
- customer mail does not include review URL

Commit message:
- `feat: add internal review URL to consult pipeline`

---

## Build + verification pass

### Task 9: Local verification

Objective:
- Prove the phase 1 state machine works before production deployment.

Commands:
- `npm run build`
- `npx tsc --noEmit`
- local or script-based POST to `/api/consult` with:
  - strong payload
  - weak payload

Expected evidence:
- strong payload:
  - `reviewStatus = awaiting_representative_approval`
  - customer mail mode = acknowledgement
  - no default proposal/draft CTA in response
- weak payload:
  - `reviewStatus = needs_followup`
  - customer mail mode = follow-up request
- review page loads for saved submission
- approval API updates package state

Commit message:
- `test: verify approval-gated consult flow locally`

---

## Production verification pass

### Task 10: Production verification

Objective:
- Verify the exact customer/internal split in production.

Required sequence:
1. deploy production
2. submit strong consult
3. confirm customer completion UI = internal review state
4. confirm internal mail = review link + summary
5. open review page
6. approve via API or form
7. confirm state changes to `approved_for_planning`
8. submit weak consult
9. confirm customer completion UI = additional info requested
10. confirm follow-up mail content

Important truthfulness rule:
- Do not claim the full approved-execution pipeline exists yet.
- Phase 1 is complete when review-gating and approval control are live.

Commit message:
- no new code; verification only

---

## OMC execution prompt for this phase

Use this prompt with OMC / Claude Code after 대표님 confirms this execution plan:

“Implement phase 1 of the approval-gated consult pipeline in `/mnt/c/Users/kanei/claudecode/02.Homepage_Dev/kanei-web-service` exactly as defined in `docs/plans/2026-08-07-consult-approval-gate-and-prompt-chain.md` and `docs/plans/2026-08-07-phase1-omc-approval-gated-consult-implementation.md`. Scope is limited to: approval package model, internal prompt chain preview, consult API review-gating, customer mail split into acknowledgement vs follow-up, customer success UI review-state conversion, internal review page, approval/reject APIs, and review URL propagation. Do not implement post-approval automatic generation. Run build/typecheck and keep changes production-safe.”

---

## Final acceptance criteria for phase 1

Phase 1 is done only if all are true:
- customer submit no longer implies immediate proposal/draft delivery
- internal approval package is created for each consult
- prompt chain preview is visible internally only
- representative approval is explicit, not implied
- strong consults send acknowledgement only
- weak consults send follow-up request
- customer completion UI reflects review state, not hidden internal orchestration
- internal review page works
- approval APIs work
- build/typecheck pass
- production behavior is verified before reporting completion
