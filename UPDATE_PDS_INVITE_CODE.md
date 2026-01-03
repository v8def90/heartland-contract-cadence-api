# PDS招待コード更新手順（AWS CLI）

**作成日**: 2026-01-02  
**目的**: 招待コードを再デプロイせずにAWS CLIで更新する方法

---

## 📋 概要

招待コードを変更するたびに再デプロイするのは非効率的です。AWS CLIを使用してLambda関数の環境変数を直接更新する方が簡易です。

---

## 🔧 更新手順

### 方法1: 全環境変数を保持して更新（推奨）

```bash
# 現在の環境変数を取得してJSONファイルに保存
aws lambda get-function-configuration \
  --function-name heartland-api-v3-dev-app \
  --profile AWSAdministratorAccess-925271162067 \
  --region ap-northeast-1 \
  --query 'Environment.Variables' \
  --output json > /tmp/current_env.json

# JSONファイルを編集してPDS_INVITE_CODEを更新
# （エディタで編集するか、以下のコマンドで更新）

# 環境変数を更新
aws lambda update-function-configuration \
  --function-name heartland-api-v3-dev-app \
  --profile AWSAdministratorAccess-925271162067 \
  --region ap-northeast-1 \
  --environment "Variables=$(cat /tmp/current_env.json | jq '.PDS_INVITE_CODE = "新しい招待コード"')"
```

### 方法2: ワンライナーで更新

```bash
# 現在の環境変数を取得し、PDS_INVITE_CODEのみ更新
aws lambda update-function-configuration \
  --function-name heartland-api-v3-dev-app \
  --profile AWSAdministratorAccess-925271162067 \
  --region ap-northeast-1 \
  --environment "Variables={
    $(aws lambda get-function-configuration \
      --function-name heartland-api-v3-dev-app \
      --profile AWSAdministratorAccess-925271162067 \
      --region ap-northeast-1 \
      --query 'Environment.Variables' \
      --output json | \
      python3 -c "import sys, json; env = json.load(sys.stdin); env['PDS_INVITE_CODE'] = '新しい招待コード'; print(','.join([f'{k}={v}' for k, v in env.items()]))")
  }"
```

### 方法3: jqを使用（より簡潔）

```bash
# jqがインストールされている場合
aws lambda update-function-configuration \
  --function-name heartland-api-v3-dev-app \
  --profile AWSAdministratorAccess-925271162067 \
  --region ap-northeast-1 \
  --environment "Variables=$(aws lambda get-function-configuration \
    --function-name heartland-api-v3-dev-app \
    --profile AWSAdministratorAccess-925271162067 \
    --region ap-northeast-1 \
    --query 'Environment.Variables' \
    --output json | jq '.PDS_INVITE_CODE = "新しい招待コード"')"
```

---

## 📝 利用可能な招待コード

以下の招待コードが利用可能です：

1. ~~`pds-dev-heart-land-io-j7itf-uabze`~~ (使用済み)
2. ~~`pds-dev-heart-land-io-l56nn-t65m2`~~ (使用済み)
3. `pds-dev-heart-land-io-3t6gg-kkvi2` (現在使用中)
4. `pds-dev-heart-land-io-svtti-fuwpx`
5. `pds-dev-heart-land-io-2h6sl-zj7nt`
6. `pds-dev-heart-land-io-dvt4c-dvkbn`
7. `pds-dev-heart-land-io-dhc7u-anxgi`
8. `pds-dev-heart-land-io-nvtf4-2edrx`
9. `pds-dev-heart-land-io-xmr3o-wnqrw`
10. `pds-dev-heart-land-io-clh54-pgoi3`

---

## ✅ 更新確認

更新後、以下のコマンドで確認できます：

```bash
aws lambda get-function-configuration \
  --function-name heartland-api-v3-dev-app \
  --profile AWSAdministratorAccess-925271162067 \
  --region ap-northeast-1 \
  --query 'Environment.Variables.PDS_INVITE_CODE' \
  --output text
```

---

## ⚠️ 注意事項

1. **更新の反映時間**: 環境変数の更新は数秒で反映されますが、Lambda関数の再起動が必要な場合があります。

2. **複数のLambda関数**: 他のLambda関数（`transactionWorker`など）でも同じ環境変数が必要な場合は、それぞれ更新する必要があります。

3. **本番環境**: 本番環境でも同様の手順で更新できますが、`--function-name`を本番環境の関数名に変更してください。

---

## 🔄 スクリプト化（オプション）

頻繁に招待コードを更新する場合は、スクリプトを作成すると便利です：

```bash
#!/bin/bash
# update-invite-code.sh

FUNCTION_NAME="heartland-api-v3-dev-app"
PROFILE="AWSAdministratorAccess-925271162067"
REGION="ap-northeast-1"
NEW_INVITE_CODE="$1"

if [ -z "$NEW_INVITE_CODE" ]; then
  echo "Usage: $0 <invite-code>"
  exit 1
fi

# 現在の環境変数を取得
CURRENT_ENV=$(aws lambda get-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --profile "$PROFILE" \
  --region "$REGION" \
  --query 'Environment.Variables' \
  --output json)

# PDS_INVITE_CODEを更新
UPDATED_ENV=$(echo "$CURRENT_ENV" | python3 -c "
import sys, json
env = json.load(sys.stdin)
env['PDS_INVITE_CODE'] = sys.argv[1]
print(json.dumps(env))
" "$NEW_INVITE_CODE")

# 環境変数を更新
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --profile "$PROFILE" \
  --region "$REGION" \
  --environment "Variables=$UPDATED_ENV"

echo "✅ PDS_INVITE_CODE updated to: $NEW_INVITE_CODE"
```

使用方法：
```bash
chmod +x update-invite-code.sh
./update-invite-code.sh pds-dev-heart-land-io-svtti-fuwpx
```

---

**最終更新**: 2026-01-02  
**状態**: 手順完了


