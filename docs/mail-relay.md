# メールリレーフォールバック（Mail Relay Fallback）

Vercel 本番で SMTP がプロバイダ拒否（`554 client host rejected` など）されたとき、
社内 WSL のリレーサーバー経由でメールを届ける仕組みです。

## なぜ必要か

Vercel の送信 IP を、会社 SMTP（`sv12515.xserver.jp:465`）が拒否することがあります。
直接 SMTP 送信すると届かず、お客様・社内のどちらにも通知が飛びません。
そこで「SMTP を最優先で試し、失敗したら社内リレーへフォールバックする」二段構えにします。

## 送信の流れ

```
Vercel (Next.js API)
   │  1. SMTP 直送を試みる（MAIL_PROVIDER=smtp）
   │     └─ 成功 → 完了
   │  2. SMTP が拒否/失敗 → MAIL_RELAY_URL へ JSON を POST
   ▼
社内 WSL リレー (kanei_mail_relay.py)
   │  共有シークレットで認証
   │  会社 SMTP (sv12515.xserver.jp:465 SSL) で代理送信
   ▼
info@kanei-trade.co.jp からお客様 / 社内へ届く
```

- 表示用の差出人・返信先は引き続き `info@kanei-trade.co.jp`。
- `log` プロバイダ（SMTP 未設定時の構造化ログ記録）の挙動は変わりません。
  リレーは「SMTP を試して失敗した」ときだけ動きます。

## 環境変数（Vercel 側）

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `MAIL_PROVIDER` | ✓ | `smtp`（本番では SMTP を最優先） |
| `SMTP_*` | ✓ | 既存の SMTP 設定（リレーはこの失敗時に動く） |
| `MAIL_RELAY_URL` | リレー使用時 | リレーサーバーのエンドポイント URL |
| `MAIL_RELAY_SECRET` | リレー使用時 | リレー認証用の共有シークレット |

`MAIL_RELAY_URL` / `MAIL_RELAY_SECRET` が未設定でもアプリは動きます
（SMTP のエラーをそのまま返すだけ）。`.env.example` にコメント付きプレースホルダがあります。

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
