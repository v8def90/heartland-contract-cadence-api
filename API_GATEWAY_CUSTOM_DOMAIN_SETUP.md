# API Gateway カスタムドメイン設定ガイド

**作成日**: 2026-01-03  
**目的**: `dev-api.heart-land.io`をAPI Gatewayのカスタムドメインとして設定し、SSL/TLS証明書を正しく設定する

---

## 🔍 現在の状況

- **カスタムドメイン**: `dev-api.heart-land.io`
- **問題**: 証明書がAPI Gatewayの発行元のまま（保護されていない通信）
- **ドメイン管理**: Cloudflare
- **API Gateway**: HTTP API (v2)

---

## 📋 必要な設定手順

### 1. AWS Certificate Manager (ACM) で証明書を取得

**重要**: API Gatewayのカスタムドメインには、**us-east-1リージョン**で取得した証明書が必要です。

```bash
# us-east-1リージョンで証明書をリクエスト
aws acm request-certificate \
  --domain-name dev-api.heart-land.io \
  --validation-method DNS \
  --region us-east-1 \
  --profile AWSAdministratorAccess-925271162067

# 証明書のARNを確認
aws acm list-certificates \
  --region us-east-1 \
  --profile AWSAdministratorAccess-925271162067 \
  --query 'CertificateSummaryList[?DomainName==`dev-api.heart-land.io`]'
```

### 2. DNS検証レコードをCloudflareに追加

ACMからDNS検証レコードが提供されます。CloudflareのDNS設定に追加してください。

**Cloudflare DNS設定例**:
```
Type: CNAME
Name: _xxxxxxxxxxxxx.dev-api.heart-land.io
Content: _xxxxxxxxxxxxx.acm-validations.aws.
TTL: Auto
Proxy: Off (DNS only)
```

### 3. Serverless Frameworkでカスタムドメインを設定

#### 方法1: serverless-domain-managerプラグインを使用（推奨）

**1. プラグインをインストール**:
```bash
pnpm add -D serverless-domain-manager
```

**2. `serverless.yml`に設定を追加**:
```yaml
plugins:
  - serverless-offline
  - serverless-domain-manager

custom:
  customDomain:
    domainName: dev-api.heart-land.io
    basePath: ''
    stage: ${self:provider.stage}
    certificateName: dev-api.heart-land.io
    certificateArn: arn:aws:acm:us-east-1:925271162067:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    createRoute53Record: false  # Cloudflareで管理しているためfalse
    endpointType: regional
    apiType: http
    securityPolicy: TLS_1_2
```

**3. カスタムドメインを作成**:
```bash
serverless create_domain --stage dev
```

**4. デプロイ**:
```bash
pnpm run deploy:dev
```

#### 方法2: CloudFormationリソースで直接定義

`serverless.yml`の`resources`セクションに以下を追加:

```yaml
resources:
  Resources:
    # API Gateway Custom Domain
    ApiGatewayDomain:
      Type: AWS::ApiGatewayV2::DomainName
      Properties:
        DomainName: dev-api.heart-land.io
        DomainNameConfigurations:
          - CertificateArn: arn:aws:acm:us-east-1:925271162067:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
            CertificateName: dev-api.heart-land.io
            EndpointType: REGIONAL
            SecurityPolicy: TLS_1_2

    # API Mapping
    ApiGatewayMapping:
      Type: AWS::ApiGatewayV2::ApiMapping
      Properties:
        ApiId: !Ref HttpApi
        DomainName: !Ref ApiGatewayDomain
        Stage: ${self:provider.stage}
        ApiMappingKey: ''  # 空文字列でベースパスなし
```

### 4. CloudflareのDNS設定

**Cloudflare DNS設定**:
```
Type: A (または CNAME)
Name: dev-api
Content: API Gatewayのカスタムドメインのエンドポイント（例: d-xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com）
TTL: Auto
Proxy: Off (DNS only)  # 重要: SSL/TLS設定を「Full」または「Full (strict)」にする場合
```

**または、Cloudflare Proxyを使用する場合**:
```
Type: A
Name: dev-api
Content: CloudflareのIPアドレス（任意のIP）
TTL: Auto
Proxy: On (Proxied)
```

### 5. CloudflareのSSL/TLS設定

**Cloudflareダッシュボード**:
1. SSL/TLS → Overview
2. **Encryption mode**を以下のいずれかに設定:
   - **Full (strict)**: Cloudflareがオリジンサーバーの証明書を検証（推奨）
   - **Full**: Cloudflareがオリジンサーバーの証明書を検証しない（自己署名証明書でもOK）

**重要**: 
- Cloudflare Proxyが**Off**の場合: SSL/TLS設定は無関係（直接API Gatewayに接続）
- Cloudflare Proxyが**On**の場合: **Full (strict)**を推奨

---

## 🔧 推奨設定（Cloudflare Proxy使用）

### 設定1: Cloudflare Proxyを使用（推奨）

**メリット**:
- ✅ DDoS保護
- ✅ CDN機能
- ✅ レート制限
- ✅ キャッシュ機能

**設定**:
1. Cloudflare DNS: `dev-api` → Aレコード → Proxy: **On**
2. Cloudflare SSL/TLS: **Full (strict)**
3. API Gateway: カスタムドメイン + ACM証明書

### 設定2: Cloudflare Proxyを使用しない（シンプル）

**メリット**:
- ✅ シンプルな設定
- ✅ 低レイテンシー

**設定**:
1. Cloudflare DNS: `dev-api` → CNAMEレコード → API Gatewayエンドポイント → Proxy: **Off**
2. API Gateway: カスタムドメイン + ACM証明書

---

## 📝 実装手順

### Step 1: ACM証明書を取得

```bash
# 証明書をリクエスト
aws acm request-certificate \
  --domain-name dev-api.heart-land.io \
  --validation-method DNS \
  --region us-east-1 \
  --profile AWSAdministratorAccess-925271162067

# 証明書のARNを取得（後で使用）
CERT_ARN=$(aws acm list-certificates \
  --region us-east-1 \
  --profile AWSAdministratorAccess-925271162067 \
  --query 'CertificateSummaryList[?DomainName==`dev-api.heart-land.io`].CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"
```

### Step 2: DNS検証レコードをCloudflareに追加

ACMから提供されるDNS検証レコードをCloudflareのDNS設定に追加してください。

### Step 3: serverless-domain-managerをインストール

```bash
pnpm add -D serverless-domain-manager
```

### Step 4: serverless.ymlを更新

```yaml
plugins:
  - serverless-offline
  - serverless-domain-manager

custom:
  customDomain:
    domainName: dev-api.heart-land.io
    basePath: ''
    stage: ${self:provider.stage}
    certificateName: dev-api.heart-land.io
    certificateArn: ${env:ACM_CERTIFICATE_ARN}  # .envファイルから読み込み
    createRoute53Record: false
    endpointType: regional
    apiType: http
    securityPolicy: TLS_1_2
```

### Step 5: .envファイルに証明書ARNを追加

```bash
# .env
ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:925271162067:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Step 6: カスタムドメインを作成

```bash
serverless create_domain --stage dev
```

### Step 7: CloudflareのDNS設定

**Cloudflare DNS**:
```
Type: CNAME
Name: dev-api
Content: {API Gatewayのカスタムドメインエンドポイント}
TTL: Auto
Proxy: Off
```

**API Gatewayのカスタムドメインエンドポイントは、`serverless create_domain`実行後に表示されます。**

### Step 8: デプロイ

```bash
pnpm run deploy:dev
```

---

## ✅ 確認方法

### 1. API Gatewayのカスタムドメインを確認

```bash
aws apigatewayv2 get-domain-names \
  --region ap-northeast-1 \
  --profile AWSAdministratorAccess-925271162067 \
  --query 'Items[?DomainName==`dev-api.heart-land.io`]'
```

### 2. SSL/TLS証明書を確認

```bash
curl -v https://dev-api.heart-land.io/auth/verify-email
```

**期待される結果**:
- ✅ SSL証明書が正しく表示される
- ✅ 証明書の発行者がACM（Amazon）である
- ✅ 証明書の有効期限が表示される

### 3. CloudflareのSSL/TLS設定を確認

Cloudflareダッシュボードで以下を確認:
- SSL/TLS → Overview → Encryption mode: **Full (strict)** または **Full**

---

## 🚨 トラブルシューティング

### 問題1: 証明書が表示されない

**原因**: ACM証明書がus-east-1リージョンで取得されていない

**解決方法**:
```bash
# us-east-1リージョンで証明書を確認
aws acm list-certificates --region us-east-1 --profile AWSAdministratorAccess-925271162067
```

### 問題2: DNS検証が完了しない

**原因**: CloudflareのDNS検証レコードが正しく設定されていない

**解決方法**:
1. ACMからDNS検証レコードを取得
2. CloudflareのDNS設定に追加（Proxy: **Off**）
3. 数分待ってから再確認

### 問題3: Cloudflare Proxyを使用している場合、証明書エラーが発生する

**原因**: CloudflareのSSL/TLS設定が「Flexible」になっている

**解決方法**:
1. Cloudflareダッシュボード → SSL/TLS → Overview
2. Encryption modeを**Full (strict)**に変更

### 問題4: API Gatewayのカスタムドメインエンドポイントが取得できない

**原因**: カスタムドメインが正しく作成されていない

**解決方法**:
```bash
# カスタムドメインの状態を確認
aws apigatewayv2 get-domain-name \
  --domain-name dev-api.heart-land.io \
  --region ap-northeast-1 \
  --profile AWSAdministratorAccess-925271162067

# エンドポイントを取得
aws apigatewayv2 get-domain-name \
  --domain-name dev-api.heart-land.io \
  --region ap-northeast-1 \
  --profile AWSAdministratorAccess-925271162067 \
  --query 'DomainNameConfigurations[0].TargetDomainName' \
  --output text
```

---

## 📚 参考資料

- [AWS API Gateway Custom Domain Names](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html)
- [Serverless Domain Manager Plugin](https://github.com/amplify-education/serverless-domain-manager)
- [Cloudflare SSL/TLS Settings](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)

---

## 🔄 次のステップ

1. ✅ ACM証明書を取得（us-east-1リージョン）
2. ✅ DNS検証レコードをCloudflareに追加
3. ✅ serverless-domain-managerをインストール
4. ✅ serverless.ymlを更新
5. ✅ カスタムドメインを作成
6. ✅ CloudflareのDNS設定を更新
7. ✅ デプロイ
8. ✅ SSL/TLS証明書を確認


