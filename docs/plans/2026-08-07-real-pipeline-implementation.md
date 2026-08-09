# Consult → Internal Mail → Monet-based Demo → Customer Follow-up Implementation Plan

> For Hermes: implement with Claude Code / OMX, then verify with real build + local run + production browser/API checks.

Goal:
- Upgrade `/consult` from a brief-only intake into a real pipeline:
  1. customer submits inquiry
  2. internal notification goes to `arwg22@gmail.com`
  3. a professional demo/proposal site is generated from the submission
  4. Monet registry assets are actually consulted during demo composition
  5. customer follow-up email is prepared/sent with the proposal URL

Architecture:
- Keep Next.js API route as the orchestration entrypoint.
- Add adapter-based mail sending so production can use SMTP env vars while local/dev can still verify with a real or fallback provider.
- Add an offline Monet extraction step that reads `../monet-registry-main/public/generated/*.json` and generates a committed in-repo catalog used at runtime on Vercel.
- Generate a richer proposal payload than the current draft, and render it in a dedicated proposal/demo route.

Tech stack:
- Next.js 16 / App Router
- TypeScript
- Tailwind only
- nodemailer for SMTP
- local generated Monet catalog committed into this repo

---

## Task 1: Add mail adapter layer

Objective:
- Support internal notification + customer follow-up from server code.

Files:
- Create: `src/server/mail/types.ts`
- Create: `src/server/mail/providers/log.ts`
- Create: `src/server/mail/providers/smtp.ts`
- Create: `src/server/mail/index.ts`
- Create: `src/server/mail/templates.ts`

Requirements:
- env contract:
  - `MAIL_PROVIDER=smtp|log`
  - `MAIL_FROM`
  - `MAIL_REPLY_TO`
  - `MAIL_INTERNAL_TO` default `arwg22@gmail.com`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
- expose two mail flows:
  - `sendInternalConsultNotification(...)`
  - `sendCustomerProposalEmail(...)`
- return structured result object with `provider`, `accepted`, `messageId`, `error`
- log provider writes JSON artifacts under local data dir when SMTP unavailable

Verification:
- `npm run build`
- local route invocation returns mail result fields

## Task 2: Add offline Monet extraction pipeline

Objective:
- Actually use `monet-registry-main` data as a source for proposal composition.

Files:
- Create: `scripts/extract-monet-catalog.mjs`
- Create: `src/generated/monet-catalog.ts`
- Modify: `package.json`

Requirements:
- read from sibling repo:
  - `../monet-registry-main/public/generated/registry.json`
  - `../monet-registry-main/public/generated/page-registry.json`
- generate a compact committed catalog grouped by use case:
  - manufacturing / construction / restaurant / salon / clinic / consulting
- include page ids, selected section ids, category, preview image path, component path, keywords
- do not depend on sibling repo at Vercel runtime; generated file must be committed into this repo
- add npm script:
  - `npm run extract:monet`

Verification:
- generated `src/generated/monet-catalog.ts` exists
- `npm run build` passes without sibling repo at runtime

## Task 3: Upgrade draft into professional proposal/demo model

Objective:
- Replace the current lightweight draft with a professional proposal payload and richer page rendering.

Files:
- Create: `src/lib/proposal.ts`
- Create: `src/app/proposal/page.tsx`
- Modify: `src/lib/draft.ts` or retire if superseded

Requirements:
- build a deterministic `ProposalPayload` from consult data + selected Monet catalog entry
- include:
  - recommended page title / hero / subcopy
  - target audience summary
  - strengths
  - must-include sections
  - recommended site map
  - recommended CTA blocks
  - chosen Monet reference page / sections / rationale
  - proposal status / submission id
- route should render a more professional long-form landing page than current draft:
  - hero
  - proof / strengths
  - recommended sections
  - page structure
  - contact CTA
  - “reference components used” / “design rationale” block
- all text in Japanese
- Tailwind only
- no raw markdown dump feeling

Verification:
- browser check on local proposal page
- proposal body includes Monet reference provenance

## Task 4: Orchestrate proposal generation in `/api/consult`

Objective:
- After submit, create proposal URL and run both mail flows.

Files:
- Modify: `src/app/api/consult/route.ts`

Requirements:
- preserve current submission save + brief generation
- add proposal generation after brief generation
- response fields should include:
  - `proposalGenerated`
  - `proposalUrl`
  - `internalMail`
  - `customerMail`
  - `selectedMonetReference`
- if proposal/mail fails, submission itself still succeeds, but structured error info must be returned

Verification:
- local multipart POST returns proposal URL and mail result objects

## Task 5: Upgrade consult success UI

Objective:
- Success screen must feel like a real sales pipeline handoff.

Files:
- Modify: `src/app/consult/page.tsx`

Requirements:
- replace simple draft CTA with stronger proposal/demo wording
- show status rows:
  - inquiry received
  - internal notification prepared/sent
  - proposal/demo created
  - customer follow-up prepared/sent
- show CTA to open proposal URL
- do not claim mail sent if provider returned failure

Verification:
- browser success screen shows real status based on API response

## Task 6: Real verification flow

Objective:
- Verify exact customer journey order.

Verification sequence:
1. open production top page
2. open demo/portfolio page
3. submit consult
4. confirm success screen status rows
5. open generated proposal URL
6. verify proposal body
7. verify internal/customer mail result from API response

Notes:
- If SMTP/Vercel env is missing, code still lands, but report mail as blocked by missing runtime secrets.
- Do not falsely claim customer mail is already live in production unless production returns success from the provider.
