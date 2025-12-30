# AT Protocol DID実装ガイド（サービス提供側）

**作成日**: 2025-12-30  
**目的**: サービス提供側としてAT ProtocolのDIDを実装する方法の詳細ガイド  
**対象**: PDS (Personal Data Server) または AppView の実装者

---

## 📋 概要

サービス提供側として、AT ProtocolのDIDを実装する際は、以下の機能が必要です：

1. **DID解決**: DID Documentの取得
2. **DID署名検証**: 公開鍵による署名検証
3. **Handle解決**: Handle → DID の変換
4. **DID管理**: ユーザーのDID保存・管理
5. **DID生成**: 新規ユーザーへのDID生成（オプション）

---

## 🏗️ アーキテクチャ設計

### サービス提供側の役割

```
┌─────────────────────────────────────────┐
│  サービス提供側（PDS/AppView）          │
├─────────────────────────────────────────┤
│  1. DID解決サービス                      │
│     - DID Document取得                  │
│     - キャッシュ管理                     │
│                                         │
│  2. DID署名検証サービス                  │
│     - 公開鍵取得                        │
│     - 署名検証                          │
│                                         │
│  3. Handle解決サービス                   │
│     - DNS TXTレコード解決               │
│     - Handle → DID変換                  │
│                                         │
│  4. DID管理サービス                     │
│     - ユーザーDID保存                   │
│     - DID生成（オプション）             │
└─────────────────────────────────────────┘
```

---

## 🔧 実装詳細

### 1. DID解決サービス（DID Resolution Service）

#### 目的
DIDからDID Documentを取得し、公開鍵情報などを取得する。

#### 実装

```typescript
/**
 * DID Document Interface
 */
interface DidDocument {
  '@context': string[];
  id: string; // DID
  verificationMethod: VerificationMethod[];
  service?: ServiceEndpoint[];
}

interface VerificationMethod {
  id: string;
  type: string; // Ed25519VerificationKey2020等
  controller: string;
  publicKeyMultibase?: string;
  publicKeyBase58?: string;
}

/**
 * DID解決サービス
 */
export class DidResolutionService {
  private cache: Map<string, { document: DidDocument; expiresAt: number }>;
  private cacheTTL: number = 3600000; // 1時間

  constructor() {
    this.cache = new Map();
  }

  /**
   * DIDを解決してDID Documentを取得
   *
   * @param did - DID (did:plc:xxx, did:web:xxx, did:key:xxx)
   * @returns DID Document
   */
  async resolveDid(did: string): Promise<DidDocument> {
    // 1. キャッシュチェック
    const cached = this.cache.get(did);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.document;
    }

    // 2. DIDメソッドに応じて解決
    const document = await this.resolveByMethod(did);

    // 3. キャッシュに保存
    this.cache.set(did, {
      document,
      expiresAt: Date.now() + this.cacheTTL,
    });

    return document;
  }

  /**
   * DIDメソッドに応じて解決
   */
  private async resolveByMethod(did: string): Promise<DidDocument> {
    if (did.startsWith('did:plc:')) {
      return await this.resolvePlcDid(did);
    } else if (did.startsWith('did:web:')) {
      return await this.resolveWebDid(did);
    } else if (did.startsWith('did:key:')) {
      return await this.resolveKeyDid(did);
    } else {
      throw new Error(`Unsupported DID method: ${did}`);
    }
  }

  /**
   * did:plc 解決
   * AT Protocol独自のDIDメソッド
   */
  private async resolvePlcDid(did: string): Promise<DidDocument> {
    // PLCサーバーに問い合わせ
    // 例: https://plc.directory/{did}
    const plcUrl = `https://plc.directory/${did}`;
    
    try {
      const response = await fetch(plcUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve DID: ${response.statusText}`);
      }

      const document = await response.json();
      return this.normalizeDidDocument(document);
    } catch (error) {
      console.error(`Failed to resolve PLC DID ${did}:`, error);
      throw error;
    }
  }

  /**
   * did:web 解決
   * ユーザーのウェブサーバーから取得
   */
  private async resolveWebDid(did: string): Promise<DidDocument> {
    // did:web:example.com → https://example.com/.well-known/did.json
    const domain = did.replace('did:web:', '');
    const url = `https://${domain}/.well-known/did.json`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve DID: ${response.statusText}`);
      }

      const document = await response.json();
      return this.normalizeDidDocument(document);
    } catch (error) {
      console.error(`Failed to resolve Web DID ${did}:`, error);
      throw error;
    }
  }

  /**
   * did:key 解決
   * 鍵から直接DID Documentを生成
   */
  private async resolveKeyDid(did: string): Promise<DidDocument> {
    // did:keyは鍵情報から直接DID Documentを生成
    // ライブラリを使用（例: @digitalcredentials/did-method-key）
    const { keyToDidDocument } = await import('@digitalcredentials/did-method-key');
    return keyToDidDocument(did);
  }

  /**
   * DID Documentを正規化
   */
  private normalizeDidDocument(doc: any): DidDocument {
    return {
      '@context': doc['@context'] || ['https://www.w3.org/ns/did/v1'],
      id: doc.id,
      verificationMethod: doc.verificationMethod || [],
      service: doc.service || [],
    };
  }

  /**
   * キャッシュクリア
   */
  clearCache(did?: string): void {
    if (did) {
      this.cache.delete(did);
    } else {
      this.cache.clear();
    }
  }
}
```

---

### 2. DID署名検証サービス（DID Signature Verification Service）

#### 目的
DID Documentの公開鍵を使用して署名を検証する。

#### 実装

```typescript
import { Ed25519PublicKey } from '@noble/ed25519';
import { createHash } from 'crypto';

/**
 * DID署名検証サービス
 */
export class DidSignatureVerificationService {
  private didResolutionService: DidResolutionService;

  constructor(didResolutionService: DidResolutionService) {
    this.didResolutionService = didResolutionService;
  }

  /**
   * DID署名を検証
   *
   * @param did - DID
   * @param message - 署名対象のメッセージ
   * @param signature - 署名（Base64またはHex）
   * @returns 検証結果
   */
  async verifySignature(
    did: string,
    message: string,
    signature: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. DID Documentを取得
      const didDocument = await this.didResolutionService.resolveDid(did);

      // 2. 検証用公開鍵を取得
      const publicKey = this.extractPublicKey(didDocument);
      if (!publicKey) {
        return {
          success: false,
          error: 'No verification method found in DID Document',
        };
      }

      // 3. 署名を検証
      const isValid = await this.verifySignatureWithKey(
        message,
        signature,
        publicKey
      );

      if (!isValid) {
        return {
          success: false,
          error: 'Signature verification failed',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * DID Documentから公開鍵を抽出
   */
  private extractPublicKey(
    didDocument: DidDocument
  ): { key: Uint8Array; algorithm: string } | null {
    // verificationMethodから公開鍵を取得
    for (const vm of didDocument.verificationMethod) {
      if (vm.type === 'Ed25519VerificationKey2020' && vm.publicKeyMultibase) {
        // Multibase形式から公開鍵をデコード
        const publicKey = this.decodeMultibase(vm.publicKeyMultibase);
        return { key: publicKey, algorithm: 'Ed25519' };
      } else if (vm.type === 'Ed25519VerificationKey2018' && vm.publicKeyBase58) {
        // Base58形式から公開鍵をデコード
        const publicKey = this.decodeBase58(vm.publicKeyBase58);
        return { key: publicKey, algorithm: 'Ed25519' };
      }
    }

    return null;
  }

  /**
   * 署名を検証（Ed25519）
   */
  private async verifySignatureWithKey(
    message: string,
    signature: string,
    publicKey: { key: Uint8Array; algorithm: string }
  ): Promise<boolean> {
    if (publicKey.algorithm !== 'Ed25519') {
      throw new Error(`Unsupported algorithm: ${publicKey.algorithm}`);
    }

    // メッセージをハッシュ化（必要に応じて）
    const messageBytes = new TextEncoder().encode(message);

    // 署名をデコード
    const signatureBytes = this.decodeSignature(signature);

    // Ed25519署名検証
    const { verify } = await import('@noble/ed25519');
    return await verify(signatureBytes, messageBytes, publicKey.key);
  }

  /**
   * Multibase形式をデコード
   */
  private decodeMultibase(multibase: string): Uint8Array {
    // multibase形式: z + base58エンコードされたデータ
    if (multibase.startsWith('z')) {
      const base58Data = multibase.substring(1);
      return this.decodeBase58(base58Data);
    }
    throw new Error(`Unsupported multibase prefix: ${multibase[0]}`);
  }

  /**
   * Base58形式をデコード
   */
  private decodeBase58(base58: string): Uint8Array {
    // base58デコードライブラリを使用
    // 例: bs58 パッケージ
    const bs58 = require('bs58');
    return new Uint8Array(bs58.decode(base58));
  }

  /**
   * 署名をデコード
   */
  private decodeSignature(signature: string): Uint8Array {
    // Base64またはHex形式をデコード
    if (signature.startsWith('0x')) {
      // Hex形式
      return Buffer.from(signature.substring(2), 'hex');
    } else {
      // Base64形式
      return Buffer.from(signature, 'base64');
    }
  }
}
```

---

### 3. Handle解決サービス（Handle Resolution Service）

#### 目的
Handle（`@username.bsky.social`）からDIDを解決する。

#### 実装

```typescript
import dns from 'dns/promises';

/**
 * Handle解決サービス
 */
export class HandleResolutionService {
  private cache: Map<string, { did: string; expiresAt: number }>;
  private cacheTTL: number = 3600000; // 1時間

  constructor() {
    this.cache = new Map();
  }

  /**
   * Handleを解決してDIDを取得
   *
   * @param handle - Handle (@username.bsky.social)
   * @returns DID
   */
  async resolveHandle(handle: string): Promise<string | null> {
    // Handle形式の検証
    if (!handle.startsWith('@')) {
      throw new Error('Handle must start with @');
    }

    // キャッシュチェック
    const cached = this.cache.get(handle);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.did;
    }

    // DNS TXTレコードから解決
    const did = await this.resolveFromDns(handle);

    if (did) {
      // キャッシュに保存
      this.cache.set(handle, {
        did,
        expiresAt: Date.now() + this.cacheTTL,
      });
    }

    return did;
  }

  /**
   * DNS TXTレコードからDIDを解決
   */
  private async resolveFromDns(handle: string): Promise<string | null> {
    try {
      // Handleからドメインを抽出
      // @username.bsky.social → bsky.social
      const domain = handle.substring(1).split('.').slice(-2).join('.');

      // _atproto.{domain} のTXTレコードを取得
      const txtRecordName = `_atproto.${domain}`;
      const records = await dns.resolveTxt(txtRecordName);

      // did=did:plc:xxx 形式のレコードを探す
      for (const record of records) {
        const recordText = Array.isArray(record) ? record.join('') : record;
        const match = recordText.match(/did=([^;]+)/);
        if (match && match[1].startsWith('did:')) {
          return match[1];
        }
      }

      // 見つからない場合は、AT Protocolの標準APIを使用
      return await this.resolveFromAtProtoApi(handle);
    } catch (error) {
      console.error(`Failed to resolve handle ${handle}:`, error);
      // フォールバック: AT Protocol APIを使用
      return await this.resolveFromAtProtoApi(handle);
    }
  }

  /**
   * AT Protocol APIからHandleを解決
   */
  private async resolveFromAtProtoApi(handle: string): Promise<string | null> {
    try {
      // com.atproto.identity.resolveHandle を使用
      // 例: https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=username.bsky.social
      const domain = handle.substring(1).split('.').slice(-2).join('.');
      const url = `https://${domain}/xrpc/com.atproto.identity.resolveHandle?handle=${handle.substring(1)}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.did && data.did.startsWith('did:')) {
        return data.did;
      }

      return null;
    } catch (error) {
      console.error(`Failed to resolve handle via API ${handle}:`, error);
      return null;
    }
  }

  /**
   * キャッシュクリア
   */
  clearCache(handle?: string): void {
    if (handle) {
      this.cache.delete(handle);
    } else {
      this.cache.clear();
    }
  }
}
```

---

### 4. DID管理サービス（DID Management Service）

#### 目的
ユーザーのDIDを保存・管理する。

#### 実装

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

/**
 * DynamoDB DID管理アイテム
 */
interface DynamoDBDidItem {
  PK: string; // USER#{userId}
  SK: string; // DID
  GSI1PK: string; // DID#{did}
  GSI1SK: string; // USER
  userId: string;
  did: string;
  handle?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DID管理サービス
 */
export class DidManagementService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.DID_TABLE_NAME || 'heartland-api-did-dev';
  }

  /**
   * ユーザーのDIDを保存
   */
  async saveUserDid(
    userId: string,
    did: string,
    handle?: string
  ): Promise<void> {
    const item: DynamoDBDidItem = {
      PK: `USER#${userId}`,
      SK: 'DID',
      GSI1PK: `DID#${did}`,
      GSI1SK: 'USER',
      userId,
      did,
      handle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );
  }

  /**
   * ユーザーのDIDを取得
   */
  async getUserDid(userId: string): Promise<string | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'DID',
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    const item = result.Item as DynamoDBDidItem;
    return item.did;
  }

  /**
   * DIDからユーザーIDを取得
   */
  async getUserIdByDid(did: string): Promise<string | null> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :did',
        ExpressionAttributeValues: {
          ':did': `DID#${did}`,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const item = result.Items[0] as DynamoDBDidItem;
    return item.userId;
  }
}
```

---

### 5. DID生成サービス（オプション）

#### 目的
新規ユーザーにDIDを生成して提供する（サービス提供側がDIDを管理する場合）。

#### 実装

```typescript
import { Ed25519Keypair } from '@noble/ed25519';
import { createHash } from 'crypto';

/**
 * DID生成サービス（オプション）
 * 
 * 注意: 通常、ユーザーは自分でDIDを生成・管理しますが、
 * サービス提供側がDIDを生成する場合はこのサービスを使用します。
 */
export class DidGenerationService {
  /**
   * 新しいDIDを生成（did:key形式）
   * 
   * @returns { did: string, privateKey: Uint8Array, publicKey: Uint8Array }
   */
  async generateDidKey(): Promise<{
    did: string;
    privateKey: Uint8Array;
    publicKey: Uint8Array;
  }> {
    // Ed25519鍵ペアを生成
    const { Ed25519Keypair } = await import('@noble/ed25519');
    const privateKey = Ed25519Keypair.generate().privateKey;
    const publicKey = Ed25519Keypair.fromPrivateKey(privateKey).publicKey;

    // did:key形式のDIDを生成
    const did = this.generateDidKeyFromPublicKey(publicKey);

    return {
      did,
      privateKey,
      publicKey,
    };
  }

  /**
   * 公開鍵からdid:key形式のDIDを生成
   */
  private generateDidKeyFromPublicKey(publicKey: Uint8Array): string {
    // did:key形式: did:key:z{multibase-encoded-public-key}
    // 実装はライブラリを使用（例: @digitalcredentials/did-method-key）
    const { publicKeyToDid } = await import('@digitalcredentials/did-method-key');
    return publicKeyToDid(publicKey);
  }
}
```

---

## 🔄 統合実装例

### 認証フローでの使用

```typescript
/**
 * 統合認証サービス
 */
export class UnifiedAuthService {
  private didResolutionService: DidResolutionService;
  private signatureVerificationService: DidSignatureVerificationService;
  private handleResolutionService: HandleResolutionService;
  private didManagementService: DidManagementService;

  constructor() {
    this.didResolutionService = new DidResolutionService();
    this.signatureVerificationService = new DidSignatureVerificationService(
      this.didResolutionService
    );
    this.handleResolutionService = new HandleResolutionService();
    this.didManagementService = new DidManagementService();
  }

  /**
   * DID認証
   */
  async authenticateWithDid(
    did: string,
    message: string,
    signature: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    // 1. 署名検証
    const verificationResult = await this.signatureVerificationService.verifySignature(
      did,
      message,
      signature
    );

    if (!verificationResult.success) {
      return verificationResult;
    }

    // 2. ユーザーIDを取得（DIDから）
    const userId = await this.didManagementService.getUserIdByDid(did);

    if (!userId) {
      return {
        success: false,
        error: 'User not found for DID',
      };
    }

    return {
      success: true,
      userId,
    };
  }

  /**
   * Handle認証
   */
  async authenticateWithHandle(
    handle: string,
    message: string,
    signature: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    // 1. Handle → DID解決
    const did = await this.handleResolutionService.resolveHandle(handle);

    if (!did) {
      return {
        success: false,
        error: 'Failed to resolve handle',
      };
    }

    // 2. DID認証
    return await this.authenticateWithDid(did, message, signature);
  }
}
```

---

## 📦 必要な依存関係

```json
{
  "dependencies": {
    "@noble/ed25519": "^1.7.0",
    "@digitalcredentials/did-method-key": "^2.0.0",
    "bs58": "^5.0.0",
    "dns": "^0.2.2"
  },
  "devDependencies": {
    "@types/bs58": "^5.0.0"
  }
}
```

---

## 🔒 セキュリティ考慮事項

### 1. DID解決のセキュリティ
- ✅ **キャッシュの適切な管理**: TTL設定、無効化
- ✅ **エラーハンドリング**: 解決失敗時の適切な処理
- ✅ **レート制限**: 解決リクエストの制限

### 2. 署名検証のセキュリティ
- ✅ **タイミング攻撃対策**: 定数時間比較
- ✅ **公開鍵の検証**: DID Documentの真正性確認
- ✅ **署名アルゴリズムの検証**: サポートされているアルゴリズムのみ受け入れ

### 3. Handle解決のセキュリティ
- ✅ **DNSキャッシュポイズニング対策**: DNSSEC検証（オプション）
- ✅ **TTLの適切な設定**: キャッシュの有効期限管理

---

## 📊 実装優先順位

### Phase 1: 基本機能（必須）
1. DID解決サービス
2. DID署名検証サービス
3. DID管理サービス

### Phase 2: 拡張機能（推奨）
4. Handle解決サービス
5. キャッシュ最適化
6. エラーハンドリング強化

### Phase 3: オプション機能
7. DID生成サービス（サービス提供側がDIDを管理する場合）
8. DID Documentの検証強化

---

## 🔗 参考リソース

- [AT Protocol Identity Guide](https://atproto.com/guides/identity)
- [DID Core Specification](https://www.w3.org/TR/did-core/)
- [AT Protocol DID Methods](https://atproto.com/specs/did)
- [Bluesky DID Implementation](https://github.com/bluesky-social/atproto)

---

**最終更新**: 2025-12-30  
**次回レビュー**: Phase 1実装完了後

