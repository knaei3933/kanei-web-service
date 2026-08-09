# Consult + Gmail Automation Implementation Plan

> For Hermes: use Claude Code / delegate_task for code changes, and verify every step with real build output.

Goal:
- Upgrade `/consult` from a simple inquiry form into a production-ready intake system.
- Add server-side submission handling, persistence, and Gmail auto-acknowledgement foundations.
- Keep implementation workable in the current WSL + Next.js + Vercel environment.

Architecture:
- Frontend stays in Next.js App Router.
- Form submits to a new server API route.
- Submission is normalized into a typed lead payload.
- Initial persistence should be adapter-based so local/dev can start with file-based storage or stub mode, then switch to Supabase/Postgres cleanly.
- Email sending should also be adapter-based: first stub/log mode, then Gmail API mode.

Tech stack:
- Next.js 16 App Router
- TypeScript
- Tailwind
- Future-ready adapters for DB + Gmail API

Current verified environment:
- `node -v` => v24.18.0
- `npm -v` => 11.16.0
- `npx next --version` => 16.2.12
- `npm run build` => PASS
- Important blocker for actual Claude Code CLI work in this shell: `claude auth status --text` => Not logged in

---

## Phase 0: Preconditions and development rules

### Task 0.1: Keep code changes inside project only
Objective:
- All implementation stays under this repo.

Files:
- Modify: none
- Verify: `git status --short`

Step:
- Confirm current repo is clean enough before implementation.

Verification:
- Run: `git status --short`
- Expected: no unexpected unrelated changes.

### Task 0.2: Confirm local build baseline
Objective:
- Make sure current baseline passes before touching code.

Verification command:
- `npm run build`

Expected:
- Successful build with `/`, `/_not-found`, `/consult` routes.

### Task 0.3: Confirm Claude Code availability in this environment
Objective:
- Verify whether actual Claude Code CLI can be used from this WSL environment through the user-required GLM API provider path.

Verification commands:
- `claude --version`
- `claude auth status --text`

Expected:
- Version present
- Claude Code provider path must be validated for real Claude Code-driven implementation

Important note:
- At the time of writing, Claude Code is installed.
- However, the relevant blocker is not generic Claude account login by itself.
- The real blocker is that Hermes already uses GLM API, while Claude Code/OMC in this shell has not yet been proven to run through the same intended GLM-backed provider path.
- Actual coding in the user-required workflow is blocked until Claude Code is verified/configured to use that GLM provider path.

---

## Phase 1: Refactor `/consult` page into a typed intake UI

### Task 1.1: Extract form constants into a dedicated config module
Objective:
- Reduce size/complexity of `src/app/consult/page.tsx`.

Files:
- Create: `src/features/consult/config.ts`
- Modify: `src/app/consult/page.tsx`

Implementation:
- Move large option arrays into `src/features/consult/config.ts`
- Export:
  - industry suggestion groups
  - site goal options
  - current issue options
  - feature options
  - budget options
  - timeline options
  - operation preference options
  - color scheme options

Verification:
- `npm run build`

### Task 1.2: Add consult form types
Objective:
- Make frontend and backend share the same payload shape.

Files:
- Create: `src/features/consult/types.ts`

Implementation:
- Add:
  - `ConsultFormData`
  - `ReferenceSiteInput`
  - `LeadStatus`
  - `LeadRecord`
  - `LeadAISummary`

Minimum required fields:
- companyName
- industry
- region
- businessCategory
- currentWebsite
- socialLinks
- whyNow
- currentIssues
- keepThings
- avoidThings
- siteGoals
- targetCustomer
- desiredActions
- coreStrengths
- desiredTone
- undesiredTone
- colorScheme
- referenceSites
- requiredPages
- requiredFeatures
- mustIncludeInfo
- availableAssets
- budget
- timeline
- operationPreference
- annualPaymentInterest
- communicationPreference
- contactName
- email
- phone
- extraMessage
- consent

Verification:
- `npm run build`

### Task 1.3: Add frontend normalizer/initial state helpers
Objective:
- Keep page component readable.

Files:
- Create: `src/features/consult/form-state.ts`
- Modify: `src/app/consult/page.tsx`

Implementation:
- Export:
  - `INITIAL_CONSULT_FORM_DATA`
  - `createEmptyReferenceSite()`
  - checkbox toggle helper(s)
  - optional frontend validation helper

Verification:
- `npm run build`

### Task 1.4: Rebuild `/consult` UI to match the 2nd spec
Objective:
- Reflect the high-density intake structure already designed.

Files:
- Modify: `src/app/consult/page.tsx`
- Optionally create: `src/features/consult/components/*.tsx`

Recommended component split:
- `SectionCard.tsx`
- `StepHeader.tsx`
- `FieldLabel.tsx`
- `RadioCard.tsx`
- `CheckCard.tsx`
- `SuggestionTags.tsx`
- `ReferenceSiteFields.tsx`

Target structure:
- Step 1: business basics
- Step 2: current issues
- Step 3: site goal + target customer
- Step 4: desired tone + references
- Step 5: pages/features/assets
- Step 6: budget/timeline/operation
- Step 7: contact/consent

Critical UI rules:
- Japanese UI text only
- Long free-text fields must be large enough
- Reference sites must support URL + memo together
- Industry must be free-input first, suggestions second

Verification:
- `npm run build`
- Then run dev server and open `/consult`

### Task 1.5: Strengthen frontend validation and submit readiness
Objective:
- Prevent thin or unusable submissions.

Files:
- Modify: `src/features/consult/form-state.ts`
- Modify: `src/app/consult/page.tsx`

Rules:
- Require at least one site goal
- Require target customer text
- Require core strengths text
- Require desired tone text
- Require at least one page and one feature
- Require consent
- Show inline helper text when free-text fields are too short

Verification:
- `npm run build`
- Manual browser check on `/consult`

---

## Phase 2: Add backend submission path

### Task 2.1: Add a canonical lead ID generator
Objective:
- Standardize server-side lead creation.

Files:
- Create: `src/server/leads/id.ts`

Implementation:
- Export `generateLeadId()`
- Format example: `HP-20260807-0001`
- For MVP, timestamp + random suffix is acceptable if sequential storage is not yet implemented.

Verification:
- Build passes

### Task 2.2: Add submit payload validation on server
Objective:
- Never trust the client payload directly.

Files:
- Create: `src/server/leads/validate.ts`
- Reuse: `src/features/consult/types.ts`

Implementation:
- Validate required string fields
- Validate email format
- Validate consent boolean
- Validate reference site object shape
- Return normalized payload or detailed field error map

Verification:
- Build passes

### Task 2.3: Add lead storage adapter interface
Objective:
- Avoid coupling UI directly to a future DB choice.

Files:
- Create: `src/server/leads/storage/types.ts`
- Create: `src/server/leads/storage/file-storage.ts`
- Create: `src/server/leads/storage/index.ts`
- Create directory: `data/leads/` (or another dev-safe local path inside project)

Implementation:
- Define `LeadStorageAdapter` interface
- First implementation: write JSON files locally for development
- Use one file per lead under `data/leads/<lead_id>.json`

Why this matters:
- Real practical development can start now in this environment
- Later replacement with Supabase/Postgres won’t require rewriting page logic

Verification:
- Build passes
- After submit, a JSON file appears on disk

### Task 2.4: Add outbound mail adapter interface
Objective:
- Same adapter pattern for email.

Files:
- Create: `src/server/mail/types.ts`
- Create: `src/server/mail/log-mailer.ts`
- Create: `src/server/mail/index.ts`

Implementation:
- Define `MailAdapter` interface
- MVP implementation logs outgoing mail payload to file or server console
- Add `sendConsultAckEmail()` helper

Important:
- Do not hard-wire Gmail API first
- First make the app verifiably send through a stub/log adapter in this environment

Verification:
- Build passes
- After submit, email payload log exists

### Task 2.5: Add `/api/consult` route
Objective:
- Move form submission off client-only `console.log` behavior.

Files:
- Create: `src/app/api/consult/route.ts`

Route behavior:
1. Parse JSON body
2. Validate payload
3. Generate `lead_id`
4. Persist lead record via storage adapter
5. Send acknowledgment via mail adapter
6. Return success JSON:
```json
{
  "ok": true,
  "leadId": "HP-...",
  "status": "lead_received"
}
```

On failure:
- return 400 for validation issues
- return 500 for unexpected issues

Verification:
- `npm run build`
- `curl` local endpoint after running dev server

---

## Phase 3: Connect frontend to backend

### Task 3.1: Replace client-side console submission with API submission
Objective:
- `/consult` should submit to real backend route.

Files:
- Modify: `src/app/consult/page.tsx`

Implementation:
- POST to `/api/consult`
- Show pending state
- Handle field/general errors
- Preserve success screen after successful response
- Display lead ID in completion view

Verification:
- `npm run build`
- Browser submit test

### Task 3.2: Improve success screen to reflect real workflow
Objective:
- Tell customer what happens next.

Files:
- Modify: `src/app/consult/page.tsx`

Add:
- intake ID display
- expected next step text
- what materials may be requested next
- support email display

Verification:
- manual browser test

---

## Phase 4: Add Gmail-ready provider seam

### Task 4.1: Add environment variable contract
Objective:
- Define Gmail integration points even if not enabled yet.

Files:
- Create: `.env.example`
- Create: `src/server/env.ts`

Include placeholders:
- `LEAD_STORAGE_MODE=file`
- `MAIL_PROVIDER=log`
- `MAIL_FROM=arwg22@gmail.com`
- `MAIL_REPLY_TO=arwg22@gmail.com`
- future Gmail OAuth/token fields

Verification:
- Build passes

### Task 4.2: Document Gmail API provider as next adapter
Objective:
- Make next implementation step obvious.

Files:
- Create: `docs/plans/gmail-provider-next-step.md`

Include:
- required Google Cloud OAuth setup
- token storage approach
- message threading strategy
- template mapping by message type

Verification:
- file exists and is readable

---

## Phase 5: Prepare state-machine foundation

### Task 5.1: Add lead status constants
Objective:
- Prepare for proposal / preview / feedback workflow.

Files:
- Create: `src/server/leads/status.ts`

Statuses for MVP:
- `lead_received`
- `awaiting_materials`
- `intake_analyzed`
- `proposal_sent`
- `draft_generating`
- `preview_ready`
- `waiting_feedback`
- `approved`
- `delivered`

Verification:
- Build passes

### Task 5.2: Persist base status inside lead record
Objective:
- Every new lead should be stateful from day one.

Files:
- Modify: `src/server/leads/storage/*`
- Modify: `src/app/api/consult/route.ts`

Verification:
- Submit and inspect saved JSON

---

## Phase 6: Practical verification in this environment

### Task 6.1: Verify local development server
Objective:
- Confirm this WSL environment can run the upgraded flow.

Commands:
- `npm run dev -- --hostname 0.0.0.0 --port 3004`
- Open `http://127.0.0.1:3004/consult`

Expected:
- page renders
- submission works
- success screen appears

### Task 6.2: Verify API end-to-end with curl
Objective:
- Confirm backend works without browser ambiguity.

Command pattern:
```bash
curl -X POST http://127.0.0.1:3004/api/consult \
  -H 'Content-Type: application/json' \
  --data @/tmp/sample-consult.json
```

Expected:
- `{"ok":true,"leadId":"...","status":"lead_received"}`

### Task 6.3: Verify persisted artifacts
Objective:
- Confirm submission leaves evidence.

Checks:
- `data/leads/<lead_id>.json` exists
- outbound mail log exists or console output is captured

### Task 6.4: Verify production build again
Objective:
- Ensure no dev-only breakage.

Command:
- `npm run build`

Expected:
- PASS

---

## Important environment conclusion

This environment is already good enough for:
- UI development
- Next.js API route development
- local persistence testing
- email stub/log testing
- Vercel deployment after code changes

But this environment is NOT yet ready for the user-mandated Claude Code workflow until this is fixed:
- Claude Code/OMC must be verified or configured to use the GLM-backed provider path required by the user.

So the real implementation should start only after confirming the Claude Code provider path is GLM, not after generic Claude account authentication.

Recommended unblock direction:
- configure/verify Claude Code third-party provider wiring (`ANTHROPIC_BASE_URL` + API-key or `apiKeyHelper`) only if the chosen GLM route exposes an Anthropic-compatible endpoint or gateway

---

## Recommended implementation order for Claude Code

1. Extract consult config/types/helpers
2. Rebuild `/consult` UI
3. Add `/api/consult` route
4. Add file-based storage adapter
5. Add log mail adapter
6. Connect frontend submit flow
7. Verify with browser + curl + build
8. Then add Gmail provider adapter

---

## Definition of done

The task is only done when all are true:
- `/consult` matches the upgraded intake design
- form submits to real backend route
- backend validates and stores data
- acknowledgment mail path runs through adapter
- build passes
- local dev browser test passes
- curl API test passes
- on-disk lead artifact exists

---
Created: 2026-08-07
Status: Ready for Claude Code implementation after GLM provider-path verification
