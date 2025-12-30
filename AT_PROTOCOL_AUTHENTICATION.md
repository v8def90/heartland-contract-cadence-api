# AT Protocol認証実装ガイド

**作成日**: 2025-12-30  
**目的**: AT Protocol (ATProto) の認証仕様と実装方法の詳細説明  
**参考**: [AT Protocol Specification](https://atproto.com/specs/authentication)

---

## 📋 AT Protocol認証の概要

AT Protocolでは、**分散型認証**を採用しており、従来の中央集権的な認証サーバーに依存しません。主に以下の要素で構成されます：

1. **DID (Decentralized Identifier)**: ユーザーの分散型識別子
2. **Handle**: 人間が読める識別子（`@username.bsky.social`）
3. **署名ベース認証**: DIDドキュメントの公開鍵による署名検証
4. **PDS (Personal Data Server)**: 個人データサーバーでの認証
5. **セッション管理**: AT Protocol準拠のセッション管理

---

## 🔐 AT Protocol認証の仕組み

### 1. **DIDベース認証**

#### 基本概念
- **DID**: `did:plc:xxx`, `did:web:xxx`, `did:key:xxx` などの形式
- **DID Document**: DIDに対応する公開鍵情報を含むドキュメント
- **署名検証**: DID Documentの公開鍵で署名を検証

#### 認証フロー
```
1. ユーザーがDIDと秘密鍵を保持
   ↓
2. 認証要求時にメッセージに署名
   ↓
3. サーバーがDID Documentを取得
   ↓
4. 公開鍵で署名を検証
   ↓
5. 検証成功 → セッション確立
```

#### 実装例
```typescript
/**
 * AT Protocol DID認証リクエスト
 */
interface AtProtoAuthRequest {
  /** DID (Decentralized Identifier) */
  did: string; // did:plc:xxx
  /** 署名されたメッセージ */
  signature: string;
  /** 署名対象のメッセージ */
  message: string;
  /** タイムスタンプ */
  timestamp: number;
  /** ノンス（リプレイ攻撃防止） */
  nonce: string;
}

/**
 * DID署名検証
 */
async function verifyDidSignature(
  did: string,
  message: string,
  signature: string
): Promise<boolean> {
  // 1. DID Documentを取得
  const didDocument = await resolveDid(did);
  
  // 2. 公開鍵を取得
  const publicKey = didDocument.verificationMethod[0].publicKeyMultibase;
  
  // 3. 署名を検証
  const isValid = await verifySignature(
    message,
    signature,
    publicKey
  );
  
  return isValid;
}
```

---

### 2. **Handleベース認証**

#### 基本概念
- **Handle**: `@username.bsky.social` 形式の人間が読める識別子
- **Handle解決**: Handle → DID への解決
- **DNS TXTレコード**: Handle解決のためのDNSレコード

#### 認証フロー
```
1. ユーザーがHandleを提供
   ↓
2. DNS TXTレコードからDIDを解決
   ↓
3. DID Documentを取得
   ↓
4. 署名検証（DID認証と同じ）
   ↓
5. 認証完了
```

#### 実装例
```typescript
/**
 * Handle解決
 */
async function resolveHandle(handle: string): Promise<string | null> {
  // DNS TXTレコードを取得
  // _atproto.{handle} のTXTレコードからDIDを取得
  const txtRecords = await dns.resolveTxt(`_atproto.${handle}`);
  
  // did=did:plc:xxx 形式のレコードを探す
  for (const record of txtRecords) {
    const match = record[0].match(/did=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Handle認証
 */
async function authenticateWithHandle(
  handle: string,
  signature: string,
  message: string
): Promise<boolean> {
  // 1. Handle → DID解決
  const did = await resolveHandle(handle);
  if (!did) {
    return false;
  }
  
  // 2. DID署名検証
  return await verifyDidSignature(did, message, signature);
}
```

---

### 3. **PDS (Personal Data Server) 認証**

#### 基本概念
- **PDS**: ユーザーの個人データをホストするサーバー
- **PDS認証**: PDSがユーザーの認証を管理
- **セッション管理**: PDSがセッショントークンを発行

#### 認証フロー
```
1. ユーザーがPDSに認証要求
   ↓
2. PDSがDID署名を検証
   ↓
3. PDSがセッショントークンを発行
   ↓
4. クライアントがセッショントークンを使用
   ↓
5. PDSがセッションを検証
```

#### 実装例
```typescript
/**
 * PDS認証リクエスト
 */
interface PdsAuthRequest {
  /** DID */
  did: string;
  /** 署名 */
  signature: string;
  /** メッセージ */
  message: string;
}

/**
 * PDS認証レスポンス
 */
interface PdsAuthResponse {
  /** アクセストークン */
  accessToken: string;
  /** リフレッシュトークン */
  refreshToken: string;
  /** 有効期限 */
  expiresIn: number;
  /** DID */
  did: string;
}

/**
 * PDS認証
 */
async function authenticateWithPds(
  request: PdsAuthRequest
): Promise<PdsAuthResponse | null> {
  // 1. DID署名検証
  const isValid = await verifyDidSignature(
    request.did,
    request.message,
    request.signature
  );
  
  if (!isValid) {
    return null;
  }
  
  // 2. セッショントークン生成
  const accessToken = generateSessionToken(request.did);
  const refreshToken = generateRefreshToken(request.did);
  
  // 3. セッション保存
  await saveSession(request.did, accessToken, refreshToken);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 3600, // 1時間
    did: request.did,
  };
}
```

---

### 4. **XRPC認証**

#### 基本概念
- **XRPC**: AT ProtocolのHTTP APIプロトコル
- **認証ヘッダー**: `Authorization: Bearer {token}` または署名ヘッダー
- **Lexicon定義**: 認証要件はLexiconスキーマで定義

#### 認証方法

##### 方法1: Bearer Token認証
```http
POST /xrpc/com.atproto.server.createSession HTTP/1.1
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "identifier": "did:plc:xxx",
  "password": "app-password"
}
```

##### 方法2: 署名ベース認証
```http
POST /xrpc/com.atproto.repo.createRecord HTTP/1.1
Authorization: Bearer {accessToken}
Content-Type: application/json
atproto-signature: {signature}

{
  "repo": "did:plc:xxx",
  "collection": "app.bsky.feed.post",
  "record": { ... }
}
```

#### 実装例
```typescript
/**
 * XRPC認証ミドルウェア
 */
async function xrpcAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // 1. Authorizationヘッダーを取得
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  const token = authHeader.substring(7);
  
  // 2. セッショントークンを検証
  const session = await verifySessionToken(token);
  
  if (!session) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  
  // 3. リクエストにDIDを追加
  req.did = session.did;
  req.user = session.user;
  
  next();
}
```

---

## 🔄 認証フロー詳細

### 新規ユーザー登録フロー

```
1. ユーザーがDIDを生成（または既存のDIDを使用）
   ↓
2. DID Documentを公開（DID解決可能にする）
   ↓
3. PDSにアカウント作成要求
   ↓
4. PDSがDID署名を検証
   ↓
5. PDSがRepositoryを作成
   ↓
6. セッショントークンを発行
   ↓
7. 認証完了
```

### ログインフロー

```
1. ユーザーがDID（またはHandle）を提供
   ↓
2. 認証メッセージに署名
   ↓
3. PDSに認証要求
   ↓
4. PDSがDID署名を検証
   ↓
5. セッショントークンを発行
   ↓
6. クライアントがトークンを保存
   ↓
7. 以降のリクエストでトークンを使用
```

### セッション更新フロー

```
1. アクセストークンが期限切れ
   ↓
2. リフレッシュトークンで更新要求
   ↓
3. PDSがリフレッシュトークンを検証
   ↓
4. 新しいアクセストークンを発行
   ↓
5. セッション継続
```

---

## 🛠️ 実装タスク

### Phase 1: DID基盤構築

- [ ] **DID解決サービス**
  - `src/services/DidResolutionService.ts` 作成
  - `did:plc`, `did:web`, `did:key` の解決
  - DID Document取得
  - 優先度: **最高**

- [ ] **署名検証サービス**
  - `src/services/DidSignatureService.ts` 作成
  - 公開鍵による署名検証
  - 複数の署名アルゴリズム対応（Ed25519, ES256K等）
  - 優先度: **最高**

### Phase 2: Handle解決

- [ ] **Handle解決サービス**
  - `src/services/HandleResolutionService.ts` 作成
  - DNS TXTレコード解決
  - Handle → DID変換
  - 優先度: **高**

### Phase 3: PDS認証

- [ ] **PDS認証サービス**
  - `src/services/PdsAuthService.ts` 作成
  - DID署名検証
  - セッショントークン生成・検証
  - 優先度: **高**

- [ ] **セッション管理**
  - `src/services/SessionService.ts` 作成
  - セッショントークン保存
  - セッション更新
  - 優先度: **高**

### Phase 4: XRPC統合

- [ ] **XRPC認証ミドルウェア**
  - `src/middleware/xrpcAuth.ts` 作成
  - Bearer Token認証
  - 署名ベース認証
  - 優先度: **中**

---

## 📦 必要な依存関係

### DID関連
```json
{
  "dependencies": {
    "@atproto/did-resolver": "^0.1.0",
    "did-resolver": "^4.0.0",
    "did-jwt": "^5.0.0"
  }
}
```

### 署名検証
```json
{
  "dependencies": {
    "@noble/ed25519": "^1.7.0",
    "elliptic": "^6.6.1"
  }
}
```

### DNS解決
```json
{
  "dependencies": {
    "dns": "^0.2.2"
  }
}
```

---

## 🔒 セキュリティ考慮事項

### 1. DID署名検証
- ✅ **公開鍵の信頼性**: DID Documentの真正性確認
- ✅ **署名アルゴリズム**: Ed25519推奨
- ✅ **タイミング攻撃対策**: 定数時間比較

### 2. セッション管理
- ✅ **トークンの有効期限**: 短い有効期限（1時間）
- ✅ **リフレッシュトークン**: 長い有効期限（30日）
- ✅ **トークンの無効化**: ログアウト時の即座無効化

### 3. Handle解決
- ✅ **DNSキャッシュ**: 適切なTTL設定
- ✅ **DNSスプーフィング対策**: DNSSEC検証（オプション）

---

## 🔗 参考リソース

- [AT Protocol Authentication Spec](https://atproto.com/specs/authentication)
- [DID Specification](https://www.w3.org/TR/did-core/)
- [Bluesky Authentication Guide](https://docs.bsky.app/docs/advanced-guides/authentication)
- [AT Protocol DID Resolution](https://atproto.com/specs/did)

---

## 📊 AT Protocol認証 vs 従来の認証

| 項目 | AT Protocol認証 | 従来の認証（JWT等） |
|------|----------------|-------------------|
| **識別子** | DID（分散型） | User ID（中央集権） |
| **認証方法** | 署名検証 | パスワード/JWT |
| **サーバー依存** | なし（分散型） | あり（中央集権） |
| **セッション管理** | PDSが管理 | 認証サーバーが管理 |
| **可搬性** | 高い（DIDは移動可能） | 低い（サーバー依存） |
| **プライバシー** | 高い（自己主権） | 低い（サーバー管理） |

---

**最終更新**: 2025-12-30  
**次回レビュー**: Phase 1実装完了後

