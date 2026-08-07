# メールリレーフォールバック（Mail Relay Fallback）

Vercel 本番で SMTP がプロバイダ拒否（`554 client host rejected` など）されたとき、
社内 WSL のリレーサーバー経由でメールを届ける仕組みです。

## なぜ必要か

Vercel の送信 IP を、会社 SMTP（`sv12515.xserver.jp:465`）が拒否することがあります。
直接 SMTP 送信すると届かず、お客様・社内のどちらにも通知が飛びません。
そこで「SMTP を最優先で試し、失敗したら社内リレーへフォールバックする」二段構えにします。

## 送信の流れ

固定の公開ルート（Vercel）と上流リレー（WSL）の二段構えです。
WSL 側のトンネル URL は変わりうるため、アプリは固定 URL を叩き、
その固定ルートが上流へ転送します。

```
Vercel (Next.js)
   │  1. SMTP 直送を試みる（MAIL_PROVIDER=smtp）
   │     └─ 成功 → 完了
   │  2. SMTP が拒否/失敗 → MAIL_RELAY_URL へ JSON を POST
   ▼
/api/mail-relay（固定の公開ルート・Vercel 上）
   │  MAIL_RELAY_SECRET で Bearer 認証
   │  ボディをそのまま MAIL_RELAY_UPSTREAM_URL へ転送
   ▼
社内 WSL リレー (kanei_mail_relay.py)
   │  共有シークレットで認証（MAIL_RELAY_SECRET と同じ値）
   │  会社 SMTP (sv12515.xserver.jp:465 SSL) で代理送信
   ▼
info@kanei-trade.co.jp からお客様 / 社内へ届く
```

- `MAIL_RELAY_URL` には固定の公開ルート `https://kanei-web-service.vercel.app/api/mail-relay` を指定します。アプリ側はこの URL を変更不要です。
- `MAIL_RELAY_UPSTREAM_URL` には「現在の WSL トンネル URL」または「将来の固定上流」を指定します。トンネル URL が変わったときはここだけ差し替えます（アプリの再デプロイ不要で Vercel の環境変数を更新すれば反映されます）。
- `MAIL_RELAY_SECRET` は `/api/mail-relay` の認証と上流 WSL リレー（`RELAY_SECRET`）で同じ値を使います。`/api/mail-relay` は受け取った Authorization ヘッダーを上流へもそのまま渡します。
- 表示用の差出人・返信先は引き続き `info@kanei-trade.co.jp`。
- `log` プロバイダ（SMTP 未設定時の構造化ログ記録）の挙動は変わりません。
  リレーは「SMTP を試して失敗した」ときだけ動きます。

## 環境変数（Vercel 側）

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `MAIL_PROVIDER` | ✓ | `smtp`（本番では SMTP を最優先） |
| `SMTP_*` | ✓ | 既存の SMTP 設定（リレーはこの失敗時に動く） |
| `MAIL_RELAY_URL` | リレー使用時 | 固定の公開リレールート。`https://kanei-web-service.vercel.app/api/mail-relay` を指定 |
| `MAIL_RELAY_UPSTREAM_URL` | リレー使用時 | `/api/mail-relay` が転送する上流エンドポイント（WSL トンネル等） |
| `MAIL_RELAY_SECRET` | リレー使用時 | 共有シークレット。`/api/mail-relay` の認証と上流 WSL リレー（`RELAY_SECRET`）で同じ値を使う |

`MAIL_RELAY_*` が未設定でもアプリは動きます（SMTP のエラーをそのまま返すだけ）。
`.env.example` にコメント付きプレースホルダがあります。

> `/api/mail-relay` は `MAIL_RELAY_UPSTREAM_URL` 未設定のとき 502 で
> `{"status":"error","error":"MAIL_RELAY_UPSTREAM_URL が未設定のため転送できません。"}`
> を返します。認証失敗は 401、上流との通信失敗は 502 です。
> 上流の HTTP ステータス・JSON ボディはそのまま透過します。

## リレーサーバー（WSL 側）

スクリプト: `/root/.hermes/scripts/kanei_mail_relay.py`

- Python 3 標準ライブラリのみで動く HTTP サーバー。
- `Authorization: Bearer <RELAY_SECRET>` で認証。
- 受け取った JSON ペイロード（`to` / `subject` / `text` / `html` / `replyTo`）から
  メールを組み立て、会社 SMTP（SSL:465）で送信。

### 起動

```bash
# 既定（ポート 8256, POST /mail）で起動
python3 /root/.hermes/scripts/kanei_mail_relay.py

# ポート / シークレットを環境変数で上書き
RELAY_PORT=8256 RELAY_SECRET=xxxxxxxx \
SMTP_PASS=xxxxxxxx \
python3 /root/.hermes/scripts/kanei_mail_relay.py
```

主な環境変数（既定値）:

| 変数 | 既定値 |
| --- | --- |
| `RELAY_PORT` | `8256` |
| `RELAY_PATH` | `/mail` |
| `RELAY_SECRET` | `change-me-shared-secret`（**必ず変更**） |
| `SMTP_HOST` | `sv12515.xserver.jp` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true`（暗黙 SSL） |
| `SMTP_USER` / `MAIL_FROM` / `MAIL_REPLY_TO` | `info@kanei-trade.co.jp` |
| `SMTP_PASS` | スクリプト既定値（環境変数で上書き推奨） |

> **注意**: このスクリプトは社内（WSL）でのみ動かします。
> Vercel から到達させる必要がある場合は VPN・トンネル等で安全に公開してください。
> シークレットは Vercel 側（`MAIL_RELAY_SECRET`）と必ず同じ値にしてください。

## 結果の型（MailResult）

リレー経由で届いた場合、`provider` は `"relay"` になります。

```ts
type MailProviderName = "smtp" | "relay" | "log";
```

- `smtp`: SMTP で直接届いた
- `relay`: SMTP 失敗 → リレー経由で届いた
- `log`: SMTP 未設定で構造化ログに記録（実配送なし）

完了画面のバッジは未知のプロバイダ名でも崩れないよう、
`providerBadge()` で安全にラベルと色を割り当てています。
