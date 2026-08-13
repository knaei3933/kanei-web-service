# Plan approval → auto demo generation trigger

## Role
Full-stack developer for kanei-web-service (Next.js + Tailwind + Vercel).

## Objective
When admin approves a plan (Gate2), automatically trigger demo generation instead of leaving status as `approved_for_execution` with a confusing message. Also update the review page messages.

## Context
- Project: `/mnt/c/Users/kanei/claudecode/02.Homepage_Dev/kanei-web-service/`
- Current flow: Gate2 approve → `approved_for_execution` → admin must manually click "デモ生成" → `demo_generating`
- Desired flow: Gate2 approve → automatically transition to `demo_generating`
- The `execute-demo` route already handles transitioning to `demo_generating` and launching Claude Code on local
- Files:
  - `src/app/api/admin/submissions/[id]/approve-plan/route.ts` - Gate2 approval endpoint
  - `src/app/review/[submissionId]/page.tsx` - Review page with messages (3155 lines)
  - `src/lib/approval-package.ts` - approvePlan function

## Constraints
- Japanese text only
- No breaking changes to API response format
- tsc --noEmit must pass
- The `approved_for_execution` status should still exist in the type but we skip through it

## Verification
- `npx tsc --noEmit` passes
- API contract unchanged (response still includes all fields)

---

## Task 1: Auto-trigger demo generation after plan approval

In `approve-plan/route.ts`, after `approvePlan()` succeeds:
1. Read the approval package to get the updated status
2. Transition status from `approved_for_execution` to `demo_generating` 
3. Set `demoGenerationStartedAt` timestamp on the package
4. Write the updated package
5. Return the updated status as `demo_generating` in the response

The implementation:
- After line 79 (`const updated = await approvePlan(id, {...})`)
- If updated && updated.status === "approved_for_execution":
  - Set updated.status = "demo_generating"
  - Set updated.demoGenerationStartedAt = new Date().toISOString() (add to package if not existing)
  - await writeApprovalPackage(updated)
- This way the response already shows demo_generating

Also add `demoGenerationStartedAt?: string` to the response JSON.

## Task 2: Update review page messages for demo_generating status

In `src/app/review/[submissionId]/page.tsx`:

Find the message at approximately line 147:
```
return "承認済み・実行準備完了。実行ハンドオフをローカルで実行してください。";
```

Change to something like:
```
return "デモを自動生成中です。生成が完了すると通知されます。";
```

Also find any other references to "実行ハンドオフをローカルで実行" in the review page and update them to reflect that demo generation happens automatically after approval.

Check lines around 299-302 that mention "ローカルオペレータ" and update to reflect automatic processing.

Also find line ~381 that says "本制作を実行する" and make sure it's only shown for the correct status.
