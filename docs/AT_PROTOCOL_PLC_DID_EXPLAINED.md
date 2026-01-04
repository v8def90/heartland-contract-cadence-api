# AT Protocol DID: PLCサーバーと一意性の担保

**作成日**: 2025-12-30  
**目的**: AT Protocolの`did:plc`メソッドとPLCサーバーの役割、一意性の担保方法の詳細説明

---

## 📋 質問への回答

**Q: AT ProtocolのDIDは、PLCサーバーで一意性を担保しているということでしょうか？**

**A: はい、その通りです。ただし、完全に中央集権的ではなく、分散型への移行も可能です。**

---

## 🔍 `did:plc` の仕組み

### PLCサーバーの役割

**PLC (Placeholder DID Controller)** は、AT Protocolが提供する**中央集権的なDID解決サービス**です。

#### 主な機能

1. **Operations管理**: ユーザーのDID変更履歴（Operations）を管理
2. **DID Document生成**: OperationsからDID Documentを生成
3. **DID解決**: DIDからDID Documentを解決
4. **一意性保証**: DIDの一意性を保証

---

## 🔐 DIDの生成と一意性の担保

### DID生成プロセス

```
1. ユーザーが鍵ペアを生成
   - rotationKey: DID変更用の鍵
   - signingKey: 署名用の鍵
   ↓
2. Genesis Operationを作成
   - 最初のOperation（初期設定）
   - rotationKeyとsigningKeyを含む
   ↓
3. Genesis Operationをハッシュ化
   - SHA-256ハッシュを計算
   ↓
4. DIDを生成
   - did:plc:{hashの先頭24文字}
   - 例: did:plc:abc123def456...
   ↓
5. PLCサーバーに送信
   - Genesis OperationをPLCサーバーに送信
   - PLCサーバーがOperationsを管理
```

### 一意性の保証方法

#### 1. **ハッシュベースの一意性**

- DIDはGenesis Operationのハッシュ値から生成される
- ハッシュ衝突の確率は極めて低い（SHA-256）
- **数学的に一意性が保証される**

#### 2. **PLCサーバーによる管理**

- PLCサーバーがOperationsを順序立てて管理
- 同じDIDに対する重複登録を防止
- **運用レベルで一意性が保証される**

#### 3. **署名による検証**

- すべてのOperationは署名されている
- 不正なOperationの追加を防止
- **セキュリティレベルで一意性が保証される**

---

## 🏗️ PLCサーバーのアーキテクチャ

### Operations管理

```
┌─────────────────────────────────────┐
│      PLCサーバー (plc.directory)    │
├─────────────────────────────────────┤
│                                     │
│  did:plc:abc123...                  │
│  ├─ Operation 0 (Genesis)          │
│  │   - rotationKey                  │
│  │   - signingKey                   │
│  │   - timestamp                    │
│  │                                  │
│  ├─ Operation 1 (Key Rotation)     │
│  │   - newSigningKey                │
│  │   - signed with rotationKey     │
│  │                                  │
│  └─ Operation 2 (Service Update)   │
│      - newServiceEndpoint           │
│      - signed with signingKey       │
│                                     │
└─────────────────────────────────────┘
```

### DID Document生成

PLCサーバーは、Operationsの履歴から最新のDID Documentを生成します：

```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:plc:abc123def456...",
  "verificationMethod": [
    {
      "id": "#atproto",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:plc:abc123def456...",
      "publicKeyMultibase": "z..."
    }
  ],
  "service": [
    {
      "id": "#atproto_pds",
      "type": "AtprotoPersonalDataServer",
      "serviceEndpoint": "https://pds.example.com"
    }
  ]
}
```

---

## 🔒 セキュリティと制約

### PLCサーバーができないこと

1. **秘密鍵の保持**: PLCサーバーは秘密鍵を保持しない
2. **勝手なOperation追加**: 署名なしでOperationを追加できない
3. **DIDの変更**: ユーザーの署名なしでDID Documentを変更できない

### PLCサーバーができること（潜在的なリスク）

1. **Operationの拒否**: 特定のOperationを拒否する可能性
2. **誤った情報提供**: DID Documentの履歴に分岐が生じた際に誤った情報を提供する可能性
3. **可用性の問題**: PLCサーバーがダウンすると、DID解決ができなくなる

---

## 🌐 分散型への移行

### `did:web` への移行

ユーザーは、`did:plc`から`did:web`に移行できます：

```
1. ユーザーが自分のドメインを所有
   ↓
2. DID Documentを自分のサーバーに配置
   - https://example.com/.well-known/did.json
   ↓
3. Handle解決を更新
   - DNS TXTレコード: did=did:web:example.com
   ↓
4. did:plcから独立
   - PLCサーバーに依存しなくなる
```

### 移行のメリット

- ✅ **完全な自己主権**: 自分のサーバーでDID Documentを管理
- ✅ **可用性の向上**: PLCサーバーに依存しない
- ✅ **プライバシー**: 自分のドメインで管理

---

## 📊 `did:plc` vs `did:web` vs `did:key`

| 項目           | `did:plc`           | `did:web`        | `did:key`        |
| -------------- | ------------------- | ---------------- | ---------------- |
| **一意性保証** | PLCサーバー         | ドメイン所有者   | 鍵の一意性       |
| **中央集権性** | あり（PLCサーバー） | なし（自己管理） | なし（鍵ベース） |
| **可用性**     | PLCサーバー依存     | ドメイン依存     | 鍵のみ           |
| **移行可能性** | 可能（did:webへ）   | 可能             | 可能             |
| **初期設定**   | 簡単                | ドメイン必要     | 簡単             |
| **運用コスト** | 低い                | ドメイン維持     | 低い             |

---

## 🛠️ サービス提供側の実装

### PLCサーバーへの問い合わせ

```typescript
/**
 * did:plc 解決
 */
async function resolvePlcDid(did: string): Promise<DidDocument> {
  // PLCサーバーに問い合わせ
  // https://plc.directory/{did}
  const plcUrl = `https://plc.directory/${did}`;

  const response = await fetch(plcUrl, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve DID: ${response.statusText}`);
  }

  const document = await response.json();
  return document;
}
```

### 一意性の検証

```typescript
/**
 * DIDの一意性検証
 */
async function verifyDidUniqueness(did: string): Promise<boolean> {
  try {
    // 1. PLCサーバーからDID Documentを取得
    const document = await resolvePlcDid(did);

    // 2. DIDが一致するか確認
    if (document.id !== did) {
      return false;
    }

    // 3. Operationsの整合性を確認（オプション）
    // PLCサーバーが提供するOperations履歴を検証

    return true;
  } catch (error) {
    console.error('DID uniqueness verification failed:', error);
    return false;
  }
}
```

---

## 🔍 一意性の保証レベル

### レベル1: 数学的保証（最高）

- **方法**: ハッシュベースのDID生成
- **保証**: SHA-256ハッシュ衝突の確率は極めて低い
- **信頼性**: 非常に高い

### レベル2: 運用保証（高）

- **方法**: PLCサーバーによる重複登録防止
- **保証**: 運用レベルで一意性を保証
- **信頼性**: 高い（PLCサーバーが正常に動作する場合）

### レベル3: 署名保証（中）

- **方法**: すべてのOperationが署名されている
- **保証**: 不正なOperationの追加を防止
- **信頼性**: 中程度（署名検証が正しく実装されている場合）

---

## ⚠️ 注意事項

### PLCサーバーの制約

1. **中央集権的**: PLCサーバーは単一のサービス提供者
2. **可用性依存**: PLCサーバーがダウンするとDID解決ができない
3. **潜在的な検閲**: Operationの拒否が可能（理論上）

### ベストプラクティス

1. **キャッシュの活用**: DID Documentをキャッシュして可用性を向上
2. **フォールバック**: 複数の解決方法を用意
3. **移行の準備**: `did:web`への移行を検討

---

## 📝 まとめ

### 一意性の担保方法

1. **数学的保証**: ハッシュベースのDID生成
2. **運用保証**: PLCサーバーによる重複登録防止
3. **署名保証**: Operationの署名検証

### PLCサーバーの役割

- ✅ **一意性の保証**: DIDの一意性を保証
- ✅ **Operations管理**: DID変更履歴を管理
- ✅ **DID Document生成**: 最新のDID Documentを生成
- ⚠️ **中央集権的**: 単一のサービス提供者に依存

### 分散型への移行

- ✅ **移行可能**: `did:web`への移行が可能
- ✅ **自己主権**: 自分のドメインでDID Documentを管理
- ✅ **可用性向上**: PLCサーバーに依存しない

---

## 🔗 参考リソース

- [AT Protocol Identity Guide](https://atproto.com/guides/identity)
- [PLC Server Specification](https://atproto.com/specs/plc)
- [DID Core Specification](https://www.w3.org/TR/did-core/)
- [Bluesky PLC Server](https://plc.directory/)

---

**最終更新**: 2025-12-30
