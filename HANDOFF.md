# kanei-web-service 핸드오프

> 새 세션에서 이 파일을 읽고 작업을 이어가세요.

## 프로젝트 개요

카네이무역주식회사 홈페이지 제작 서비스의 Production 사이트.
고객 문의(`/consult`) → 품질 검증 → 대표 승인 → 계획 승인 → Claude Code handoff → 자동 제작까지 이어지는 전자동 시스템.

- **Production**: `https://kanei-web-service.vercel.app/`
- **GitHub**: `https://github.com/knaei3933/kanei-web-service.git` (branch: main)
- **Working tree**: `/mnt/c/Users/kanei/claudecode/02.Homepage_Dev/kanei-web-service/`
- **Stack**: Next.js 16 + Tailwind + framer-motion + lucide-react
- **Deploy**: Vercel Team `kims-projects-912b33ac`

## 최근 커밋 (HEAD: 7444fab)

| 커밋 | 내용 |
|------|------|
| `7444fab` | docs: promote stack manager as primary ops method |
| `0de4ed5` | feat: refine review attachment preview ui |
| `fb0f32d` | feat: add attachment preview in review |
| `aac0514` | docs: document managed mail relay operations |
| `c162978` | feat: persist uploaded attachments via storage relay |
| `c1e7a84` | feat: add durable submission storage relay |
| `4f076ea` | feat: add plan approval and execution handoff gates |
| `b3d67e0` | feat: add approval-gated consult review flow |
| `6391947` | feat: add consult quality gate and relay sync ops |
| `2ef7c63` | feat: add fixed public mail relay route |

## 구현 완료 목록

- [x] `/consult` multipart 제출 (payload + 첨부 파일)
- [x] consult 입력 품질 자동 판정 (부실/엉뚱 입력 → 추가 질문 요청)
- [x] approval-gated phase1/phase2 (대표 승인 → 계획 승인 → 실행 handoff)
- [x] 메일 provider 계층 (log / smtp / relay)
- [x] 고정 공개 relay 경로 `/api/mail-relay` (smtp 차단 시 fallback)
- [x] quick tunnel upstream 자동갱신 (`sync_kanei_mail_relay_upstream.py`)
- [x] durable submission storage relay (artifact JSON/MD 영구 보존)
- [x] 첨부파일 원본 durable 저장 (binary relay → WSL disk)
- [x] review 화면 첨부 미리보기 (종류 badge, 용량 표기, 이미지/PDF/텍스트 preview)
- [x] relay 단독 관리 스크립트 (`manage_kanei_mail_relay.sh`)
- [x] 통합 스택 관리 스크립트 (`manage_kanei_relay_stack.sh`)
- [x] 운영 문서 정리 (`docs/mail-relay.md`, `docs/submission-storage.md`)

## 인프라 아키텍처

```
Production (Vercel serverless)
  /api/consult        → 품질검증 → brief 생성 → 메일 송신 → review redirect
  /api/mail-relay     → 고정 공개 경로 → upstream (quick tunnel) → relay.py → SMTP
  /api/submission-storage/[id]/[file]   → artifact proxy → relay → WSL disk
  /api/submission-storage/[id]/files/*  → 첨부 binary proxy → relay → WSL disk
  /review/[id]        → 내부 review UI (승인/거절 + 첨부 preview)
  /draft, /proposal   → 초안/제안 렌더링
        ↓ relay (quick tunnel)
WSL (relay.py on :8256)
  → /mail             → SMTP (XServer)
  → /submission-storage → /root/.cache/kanei-submission-storage/
```

## 핵심 파일 구조

```
src/
  app/
    api/
      consult/route.ts                              # multipart 접수 + 품질검증
      consult/approve/route.ts                      # gate1: 대표 승인
      consult/plan/approve/route.ts                 # gate2: 계획 승인
      consult/reject/route.ts                       # 거절
      consult/[id]/attachments/[name]/route.ts       # 첨부 다운로드 (inline/attachment 분기)
      mail-relay/route.ts                            # 고정 공개 mail relay
      submission-storage/[id]/[file]/route.ts        # artifact proxy
      submission-storage/[id]/files/[name]/route.ts  # 첨부 binary proxy
    consult/page.tsx                                  # 고객 문의 폼
    review/[id]/page.tsx                             # 내부 review UI (첨부 preview 포함)
    draft/page.tsx, proposal/page.tsx                # 초안/제안
  lib/
    approval-package.ts                              # approval 패키지 구조
    consult-quality.ts                               # 품질 평가 로직
  server/
    submission-storage/
      index.ts                                       # storage adapter
      types.ts                                       # 타입 + safe name 검증
      providers/filesystem.ts                        # 로컬 디스크 provider
      providers/relay.ts                              # HTTP relay provider
    mail/index.ts                                    # 메일 공개 API
docs/
  mail-relay.md                                      # relay 운영 문서
  submission-storage.md                              # storage 운영 문서
scripts/ (/root/.hermes/scripts/)
  kanei_mail_relay.py                                # mail+storage 겸용 relay 서버
  manage_kanei_mail_relay.sh                          # relay 단독 관리
  manage_kanei_relay_stack.sh                          # 통합 관리 (relay+tunnel+sync)
  start_kanei_mail_relay_tunnel.sh                     # quick tunnel 시작
  sync_kanei_mail_relay_upstream.py                    # upstream URL 자동 반영
```

## 운영 스크립트 사용법

```bash
# 통합 관리 (권장)
/root/.hermes/scripts/manage_kanei_relay_stack.sh up      # 일괄 기동
/root/.hermes/scripts/manage_kanei_relay_stack.sh status    # 상태 확인
/root/.hermes/scripts/manage_kanei_relay_stack.sh health    # 헬스체크
/root/.hermes/scripts/manage_kanei_relay_stack.sh sync     # upstream sync
/root/.hermes/scripts/manage_kanei_relay_stack.sh restart  # 재시작
/root/.hermes/scripts/manage_kanei_relay_stack.sh stop      # 정지

# 개별 (필요시)
/root/.hermes/scripts/manage_kanei_mail_relay.sh start|stop|restart|status|health
```

## Watchdog (자동 복구 + 자동 Sync)

**Hermes cron 잡** (job_id: `14cd36f6367c`, 2분마다):
- `kanei_relay_watchdog_check.py` — relay/tunnel health check + 자동 재시작 + URL 변경 시 Vercel env sync
- 정상 동작 시 조용 (stdout 없음), 문제 발생/복구 시 stderr 출력 → Telegram 알림
- `deliver=telegram` 설정으로 장애 시 대표님께 알림

**수동 테스트**: `python3 /root/.hermes/scripts/kanei_relay_watchdog_check.py`

**Watchdog 동작**:
1. relay health check (`:8256/health`) — 실패 시 relay 재시작
2. tunnel 프로세스 + URL 감지 — 실패 시 tunnel 재시작 + 새 URL 기록
3. URL 변경 시 자동 `sync_kanei_mail_relay_upstream.py` 실행 (Vercel env 갱신)
4. 연속 실패 3회 → 전체 스택 재시작

**관련 파일**:
- `/root/.hermes/scripts/kanei_relay_watchdog_check.py` — 단일 실행 체크 스크립트 (cron용)
- `/root/.hermes/scripts/kanei_relay_watchdog.sh` — 상시 실행 루프 스크립트 (수동 실행용)
- `~/.cache/kanei-mail-relay/last-synced-url.txt` — 마지막 sync된 upstream URL

## 미해결 / 개선 가능 영역

1. **~~WSL relay/tunnel 의존성~~** — ✅ watchdog cron 잡 (2분마다 자동 복구 + URL sync)으로 대응 완료. 향후 named tunnel 전환 시 더 안정화 가능.
2. **~~XServer SMTP 차단~~** — ✅ Port 465/SSL은 WSL에서 차단되지만, Port 587/STARTTLS는 정상. relay를 587로 전환하여 **직접 송신** 가능 (relay 경유 불필요해짐). 현재 relay도 587 사용 중.
3. **~~SSH 호스팅 접속 불명~~** — ✅ XServer 공유 서버(`sv12515.xserver.jp`=202.233.67.36) 정책으로 SSH 포트 차단. 웹(80/443)은 정상. SSH 필요 시 XServer VPS/전용서버 이전 또는 별도 SSH 호스팅 필요.
4. **~~node_modules WSL/Windows 혼재~~** — ✅ `npm ci` + `npm approve-scripts` + `npm rebuild`로 해결. Linux x64 네이티브 바인딩 정상 설치 확인.
5. **~~실제 고객 문의 수신 후 E2E 파이프라인 검증~~** — ✅ production에서 테스트 제출 성공 (submission → brief → approval-package → mail relay → review page 전체 통과).
6. **~~sync 스크립트 버그 수정~~** — ✅ `SUBMISSION_STORAGE_RELAY_UPSTREAM_URL` 미갱신 문제 수정. 이제 tunnel 재시작 시 mail + storage upstream 모두 자동 sync.

> **모든 미해결 항목 해결 완료**

## 코딩 원칙 (대표님 지시)

- **코딩 작업은 무조건 Claude Code** (`claude -p` or delegate_task)
- **이미지 생성은 무조건** `/usr/bin/codex -m gpt-5.5`
- 페이지 텍스트는 **일본어만**
- 내부 프롬프트 체인·OMC/Claude Code 실행 순서는 **대표에게만 공개**
