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

```text
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

- `MAIL_RELAY_URL` には固定の公開ルート `https://kanei-web-service.vercel.app/api/mail-relay` を指定します。
- `MAIL_RELAY_UPSTREAM_URL` には「現在の WSL トンネル URL」または「将来の固定上流」を指定します。
- `MAIL_RELAY_SECRET` は `/api/mail-relay` の認証と上流 WSL リレー（`RELAY_SECRET`）で同じ値を使います。
- 表示用の差出人・返信先は引き続き `info@kanei-trade.co.jp`。
- `log` プロバイダ（SMTP 未設定時の構造化ログ記録）の挙動は変わりません。

## 環境変数（Vercel 側）

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `MAIL_PROVIDER` | ✓ | `smtp` |
| `SMTP_*` | ✓ | 既存の SMTP 設定 |
| `MAIL_RELAY_URL` | リレー使用時 | `https://kanei-web-service.vercel.app/api/mail-relay` |
| `MAIL_RELAY_UPSTREAM_URL` | リレー使用時 | 固定ルートが転送する上流エンドポイント |
| `MAIL_RELAY_SECRET` | リレー使用時 | 固定ルート認証 / 上流 WSL リレー認証の共有シークレット |

`.env.example` にコメント付きプレースホルダがあります。

## リレーサーバー（WSL 側）

スクリプト:
- `/root/.hermes/scripts/kanei_mail_relay.py`
- `/root/.hermes/scripts/manage_kanei_mail_relay.sh`
- `/root/.hermes/scripts/manage_kanei_relay_stack.sh`
- `/root/.hermes/scripts/start_kanei_mail_relay_tunnel.sh`
- `/root/.hermes/scripts/sync_kanei_mail_relay_upstream.py`

### 1. relay server 起動（推奨: 管理スクリプト）

初回だけ環境変数を export して起動すると、以後は `~/.cache/kanei-mail-relay/relay.env` に保存されます。

```bash
export RELAY_SECRET='***'
export SMTP_HOST='sv12515.xserver.jp'
export SMTP_PORT='465'
export SMTP_SECURE='true'
export SMTP_USER='info@kanei-trade.co.jp'
export SMTP_PASS='***'
export MAIL_FROM='info@kanei-trade.co.jp'
export MAIL_REPLY_TO='info@kanei-trade.co.jp'
/root/.hermes/scripts/manage_kanei_mail_relay.sh start
```

日常運用:

```bash
/root/.hermes/scripts/manage_kanei_mail_relay.sh status
/root/.hermes/scripts/manage_kanei_mail_relay.sh health
/root/.hermes/scripts/manage_kanei_mail_relay.sh restart
/root/.hermes/scripts/manage_kanei_mail_relay.sh stop
```

relay + tunnel + sync をまとめて扱う場合:

```bash
/root/.hermes/scripts/manage_kanei_relay_stack.sh start
/root/.hermes/scripts/manage_kanei_relay_stack.sh status
/root/.hermes/scripts/manage_kanei_relay_stack.sh health
/root/.hermes/scripts/manage_kanei_relay_stack.sh sync
/root/.hermes/scripts/manage_kanei_relay_stack.sh up
/root/.hermes/scripts/manage_kanei_relay_stack.sh restart
/root/.hermes/scripts/manage_kanei_relay_stack.sh stop
```

補足:
- PID: `~/.cache/kanei-mail-relay/relay.pid`
- Log: `~/.cache/kanei-mail-relay/relay.log`
- Saved env: `~/.cache/kanei-mail-relay/relay.env`
- 既に relay が動いている場合は、管理スクリプトが実行中プロセスの環境を取り込んで `relay.env` を再生成します。

### 2. cloudflared tunnel 起動（ログを残す）

```bash
/root/.hermes/scripts/start_kanei_mail_relay_tunnel.sh
```

既定値:
- log: `~/.cache/kanei-mail-relay/cloudflared.log`
- relay upstream: `http://127.0.0.1:8256`

このログから最新の `https://*.trycloudflare.com` を自動抽出します。

### 3. upstream URL を Vercel へ自動反映

```bash
python3 /root/.hermes/scripts/sync_kanei_mail_relay_upstream.py --verify-fixed-route
```

このスクリプトは次を行います。
1. `cloudflared.log` または state file から最新 URL を検出
2. `.../health` で upstream 生存確認
3. Vercel `MAIL_RELAY_UPSTREAM_URL` を production に更新
4. Production 再デプロイ
5. 必要時は固定公開ルート `/api/mail-relay` を単体検証

オプション:

```bash
# URL を明示指定
python3 /root/.hermes/scripts/sync_kanei_mail_relay_upstream.py \
  --upstream-url https://example.trycloudflare.com/mail

# 反映だけして再デプロイしない
python3 /root/.hermes/scripts/sync_kanei_mail_relay_upstream.py --skip-redeploy
```

> `--verify-fixed-route` を使う場合は `MAIL_RELAY_SECRET` を環境変数に入れるか、
> `--secret '***'` を渡してください。

## 日次/再起動時の運用手順

1. relay server を起動 / 再起動
   - `/root/.hermes/scripts/manage_kanei_mail_relay.sh start`
   - 既に動いていれば `/root/.hermes/scripts/manage_kanei_mail_relay.sh restart`
2. `/root/.hermes/scripts/manage_kanei_mail_relay.sh health` で確認
3. tunnel を起動
4. `python3 /root/.hermes/scripts/sync_kanei_mail_relay_upstream.py --verify-fixed-route` 実行
5. Production `/consult` で 1 件送信し、以下を確認
   - `mail.provider = relay` または `smtp`
   - `internal.status = sent`
   - `customer.status = sent`
   - 受信箱で実メール確認

## 固定公開ルートの単体確認

```bash
python3 /root/.hermes/scripts/sync_kanei_mail_relay_upstream.py --verify-fixed-route --skip-redeploy
```

または直接:

```bash
curl -sS -X POST 'https://kanei-web-service.vercel.app/api/mail-relay' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ***' \
  --data '{
    "to":[{"address":"info@kanei-trade.co.jp","name":"金 乾雄"}],
    "subject":"【固定公開ルート確認】",
    "text":"固定公開ルート確認です。",
    "html":"<p>固定公開ルート確認です。</p>"
  }'
```

## consult 品質ゲートとの関係

`/api/consult` ではサーバー側で入力品質を審査します。

- `status = ready`
  - proposal / draft を生成
  - お客様へ提案メール送信
- `status = needs_followup`
  - submission は保存
  - 社内通知は送信
  - proposal / draft 公開は保留
  - お客様へ追加情報依頼メールを送信

これにより、内容が薄い・曖昧・テスト的な相談をそのまま自動提案へ流さず、
精度の低いアウトプットを防ぎます。
