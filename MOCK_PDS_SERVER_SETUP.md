# 開発環境用モックPDSサーバー構築手順

**作成日**: 2025-12-30  
**目的**: 開発環境用にDID生成を行うモックPDSサーバーの構築手順  
**対象**: AT Protocol PDS API (`com.atproto.server.createAccount`)

---

## 📋 概要

開発環境用のモックPDSサーバーを構築し、以下の機能を提供します：

1. **DID生成**: `did:plc:...`形式のDIDを生成
2. **createAccount API**: `com.atproto.server.createAccount`のモック実装
3. **検証要件のスキップ**: 電話番号検証などの検証要件をスキップ

**メリット**:

- ✅ 外部依存なし（`https://bsky.social`への依存を排除）
- ✅ 検証要件をスキップ可能
- ✅ 開発が迅速
- ✅ テストが容易

**デメリット**:

- ⚠️ 本番環境との差異（完全なAT Protocol互換性は保証されない）
- ⚠️ 追加の実装が必要

---

## 🏗️ アーキテクチャ

### モックPDSサーバーの構成

```
┌─────────────────────────────────────┐
│   Mock PDS Server (Express.js)     │
│   Port: 3001                        │
├─────────────────────────────────────┤
│   Endpoints:                        │
│   - POST /xrpc/com.atproto.server.  │
│     createAccount                   │
│   - GET  /xrpc/com.atproto.server.  │
│     describeServer                  │
└─────────────────────────────────────┘
           │
           │ DID生成
           ▼
┌─────────────────────────────────────┐
│   DID Generator                     │
│   - did:plc:...形式の生成            │
│   - 簡易実装（本番環境ではPLC使用）   │
└─────────────────────────────────────┘
```

---

## 📦 必要な依存関係

### 1. プロジェクト構造

```
heartland-contract-cadence-api/
├── mock-pds-server/          # 新規ディレクトリ
│   ├── src/
│   │   ├── server.ts        # Expressサーバー
│   │   ├── didGenerator.ts  # DID生成ロジック
│   │   └── handlers/
│   │       ├── createAccount.ts
│   │       └── describeServer.ts
│   ├── package.json
│   └── tsconfig.json
└── ...
```

### 2. 依存パッケージ

```json
{
  "name": "mock-pds-server",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2"
  }
}
```

---

## 🔧 実装手順

### Step 1: プロジェクトディレクトリの作成

```bash
cd /Users/yuki/Source/heart-land-project/heartland-contract-cadence-api
mkdir -p mock-pds-server/src/handlers
cd mock-pds-server
```

### Step 2: package.jsonの作成

```bash
pnpm init -y
```

`package.json`を編集:

```json
{
  "name": "mock-pds-server",
  "version": "1.0.0",
  "description": "Mock PDS server for development",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "nodemon --exec ts-node src/server.ts",
    "watch": "tsc --watch"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2"
  }
}
```

### Step 3: TypeScript設定

`tsconfig.json`を作成:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 4: DID生成ロジックの実装

`src/didGenerator.ts`を作成（詳細は後述）

### Step 5: createAccountハンドラーの実装

`src/handlers/createAccount.ts`を作成（詳細は後述）

### Step 6: describeServerハンドラーの実装

`src/handlers/describeServer.ts`を作成（詳細は後述）

### Step 7: Expressサーバーの実装

`src/server.ts`を作成（詳細は後述）

### Step 8: 依存関係のインストール

```bash
cd mock-pds-server
pnpm install
```

### Step 9: ビルドと起動

```bash
# ビルド
pnpm run build

# 起動
pnpm start

# または開発モード（ホットリロード）
pnpm run dev
```

---

## 💻 実装コード詳細

### DID生成ロジック (`src/didGenerator.ts`)

```typescript
import crypto from 'crypto';

/**
 * DID Generator for Mock PDS Server
 *
 * @description Generates did:plc:... format DIDs for development.
 * Note: This is a simplified implementation. Production environments
 * should use the actual PLC (Placeholder) server for DID generation.
 */
export class DidGenerator {
  /**
   * Generate a mock did:plc:... DID
   *
   * @description Generates a deterministic DID based on input parameters.
   * Format: did:plc:{base32-encoded-hash}
   *
   * @param seed - Seed value for DID generation (e.g., email + timestamp)
   * @returns Generated DID string
   */
  public static generateDid(seed: string): string {
    // Create a hash from the seed
    const hash = crypto.createHash('sha256').update(seed).digest();

    // Encode to base32 (RFC 4648)
    const base32 = this.base32Encode(hash);

    // Take first 24 characters (standard PLC DID format)
    const didSuffix = base32.substring(0, 24).toLowerCase();

    return `did:plc:${didSuffix}`;
  }

  /**
   * Base32 encoding (RFC 4648)
   */
  private static base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }

  /**
   * Generate a deterministic DID from email and timestamp
   */
  public static generateDidFromEmail(
    email: string,
    timestamp?: number
  ): string {
    const seed = `${email}:${timestamp || Date.now()}`;
    return this.generateDid(seed);
  }
}
```

### createAccountハンドラー (`src/handlers/createAccount.ts`)

```typescript
import { Request, Response } from 'express';
import { DidGenerator } from '../didGenerator';
import crypto from 'crypto';

interface CreateAccountRequest {
  email?: string;
  handle: string;
  password?: string;
  inviteCode?: string;
  verificationCode?: string;
  verificationPhone?: string;
  did?: string;
  recoveryKey?: string;
  plcOp?: any;
}

interface CreateAccountResponse {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
  didDoc?: any;
}

function generateMockJwt(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    'base64url'
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url'
  );
  const signature = crypto
    .createHash('sha256')
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function createAccountHandler(req: Request, res: Response): void {
  try {
    const body: CreateAccountRequest = req.body;

    if (!body.handle) {
      res.status(400).json({
        error: 'InvalidRequest',
        message: 'Input must have the property "handle"',
      });
      return;
    }

    const seed = `${body.email || body.handle}:${Date.now()}`;
    const did = DidGenerator.generateDid(seed);

    const accessJwt = generateMockJwt({
      sub: did,
      handle: body.handle,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    });

    const refreshJwt = generateMockJwt({
      sub: did,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 604800,
    });

    const response: CreateAccountResponse = {
      accessJwt,
      refreshJwt,
      handle: body.handle,
      did,
      didDoc: {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: did,
        service: [
          {
            id: '#atproto_pds',
            type: 'AtprotoPersonalDataServer',
            serviceEndpoint:
              process.env.PDS_ENDPOINT || 'http://localhost:3001',
          },
        ],
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in createAccount:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

### describeServerハンドラー (`src/handlers/describeServer.ts`)

```typescript
import { Request, Response } from 'express';

export function describeServerHandler(req: Request, res: Response): void {
  try {
    const response = {
      did: process.env.PDS_DID || 'did:web:localhost',
      availableUserDomains: ['.localhost'],
      inviteCodeRequired: false,
      phoneVerificationRequired: false, // ⚠️ 検証要件をスキップ
      links: {
        privacyPolicy: 'https://example.com/privacy',
        termsOfService: 'https://example.com/terms',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in describeServer:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

### Expressサーバー (`src/server.ts`)

```typescript
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { createAccountHandler } from './handlers/createAccount';
import { describeServerHandler } from './handlers/describeServer';

const app: Express = express();
const PORT = process.env.PDS_PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/xrpc/com.atproto.server.createAccount', createAccountHandler);
app.get('/xrpc/com.atproto.server.describeServer', describeServerHandler);

app.listen(PORT, () => {
  console.log(`🚀 Mock PDS Server running on http://localhost:${PORT}`);
  console.log(`📝 Endpoints:`);
  console.log(`   POST /xrpc/com.atproto.server.createAccount`);
  console.log(`   GET  /xrpc/com.atproto.server.describeServer`);
  console.log(`   GET  /health`);
});
```

---

## 🔌 統合方法

### 1. 環境変数の設定

`.env`ファイルに以下を追加:

```bash
# Mock PDS Server (開発環境のみ)
PDS_ENDPOINT=http://localhost:3001
PDS_PORT=3001

# 本番環境では以下を使用
# PDS_ENDPOINT=https://bsky.social
```

### 2. PdsServiceの更新

`src/services/PdsService.ts`で、環境変数に基づいてエンドポイントを切り替え:

```typescript
private constructor() {
  // 開発環境ではモックPDSサーバーを使用
  this.pdsEndpoint = process.env.PDS_ENDPOINT || 'https://bsky.social';
  // ...
}
```

### 3. モックPDSサーバーの起動

開発環境では、モックPDSサーバーを起動:

```bash
cd mock-pds-server
pnpm run dev
```

### 4. アプリケーションの起動

通常通りアプリケーションを起動:

```bash
pnpm run dev
```

---

## 🧪 テスト方法

### 1. ヘルスチェック

```bash
curl http://localhost:3001/health
```

### 2. describeServer API

```bash
curl http://localhost:3001/xrpc/com.atproto.server.describeServer
```

### 3. createAccount API

```bash
curl -X POST http://localhost:3001/xrpc/com.atproto.server.createAccount \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "handle": "testuser.localhost",
    "password": "Test1234!"
  }'
```

### 4. アプリケーションからのテスト

```bash
# ユーザー登録エンドポイントをテスト
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "displayName": "Test User",
    "handle": "testuser.localhost"
  }'
```

---

## ⚠️ 注意事項

### 1. 本番環境では使用しない

モックPDSサーバーは開発環境専用です。本番環境では使用しないでください。

### 2. DID生成の簡易実装

この実装は簡易的なDID生成です。本番環境では、実際のPLC（Placeholder）サーバーを使用する必要があります。

### 3. セキュリティ

モックサーバーは検証要件をスキップするため、セキュリティ機能は実装されていません。

### 4. データ永続化

現在の実装では、データは永続化されません。サーバーを再起動すると、データは失われます。

---

## 🔄 今後の改善案

### 1. データ永続化

- SQLiteやJSONファイルを使用してデータを永続化
- アカウント情報の保存と取得

### 2. より正確なDID生成

- 実際のPLCサーバーの仕様に準拠したDID生成
- または、実際のPLCサーバーへの接続

### 3. 追加APIの実装

- `com.atproto.server.createSession`
- `com.atproto.server.refreshSession`
- その他のAT Protocol API

### 4. Docker化

- Docker Composeを使用した簡単なセットアップ
- 開発環境の統一

---

## 📚 参考リンク

- [AT Protocol Lexicon: com.atproto.server.createAccount](https://atproto.com/specs/lexicon#com-atproto-server-createAccount)
- [AT Protocol Lexicon: com.atproto.server.describeServer](https://atproto.com/specs/lexicon#com-atproto-server-describeServer)
- [AT Protocol DID: did:plc](https://atproto.com/specs/did#did-plc)
- [AT Protocol Self-Hosting Guide](https://atproto.com/ja/guides/self-hosting)

---

**最終更新**: 2025-12-30  
**状態**: 構築手順完了、実装準備完了
