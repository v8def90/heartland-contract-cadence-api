# IdempotencyKey フロントエンド実装ガイド

## 概要

`idempotencyKey`は、`POST /tokens/transfer`エンドポイントで使用されるオプショナルパラメータです。同じ送金リクエストが重複して実行されることを防ぐために使用されます。

## 目的

- **二重送金の防止**: ネットワークエラーやタイムアウトによる再試行時に、同じ送金が複数回実行されることを防ぐ
- **冪等性の保証**: 同じ`idempotencyKey`で複数回リクエストしても、最初の1回のみが実行される

## フロントエンドでの実装方法

### 推奨方法1: UUIDを使用（最も推奨）

```typescript
import { v4 as uuidv4 } from 'uuid';

// 送金リクエスト時にUUIDを生成
const transferTokens = async (
  recipientDid: string,
  amount: string,
  message: string
) => {
  const idempotencyKey = uuidv4(); // 例: "550e8400-e29b-41d4-a716-446655440000"
  
  const response = await fetch('/tokens/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      recipientDid,
      amount,
      message,
      idempotencyKey, // UUIDをセット
    }),
  });
  
  return response.json();
};
```

**メリット**:
- 一意性が保証される
- 標準的な方法
- 実装が簡単

**注意点**:
- 再試行時には**同じUUIDを使用する必要がある**
- ユーザーが送金ボタンを再度クリックした場合は、新しいUUIDを生成する

### 推奨方法2: リクエスト内容のハッシュ値を使用

```typescript
import crypto from 'crypto';

// リクエスト内容からハッシュを生成
const generateIdempotencyKey = (
  senderDid: string,
  recipientDid: string,
  amount: string,
  message: string,
  timestamp: string // ユーザー操作のタイムスタンプ
): string => {
  const data = `${senderDid}-${recipientDid}-${amount}-${message}-${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// 使用例
const transferTokens = async (
  recipientDid: string,
  amount: string,
  message: string
) => {
  const timestamp = new Date().toISOString();
  const idempotencyKey = generateIdempotencyKey(
    currentUserDid,
    recipientDid,
    amount,
    message,
    timestamp
  );
  
  const response = await fetch('/tokens/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      recipientDid,
      amount,
      message,
      idempotencyKey,
    }),
  });
  
  return response.json();
};
```

**メリット**:
- 同じリクエスト内容なら同じキーが生成される
- 再試行時に自動的に同じキーになる

**注意点**:
- タイムスタンプを含める場合は、ユーザー操作ごとに異なるキーになる
- タイムスタンプを含めない場合は、完全に同じリクエストが重複する可能性がある

### 推奨方法3: タイムスタンプ + ランダム値の組み合わせ

```typescript
const generateIdempotencyKey = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
};

// 使用例
const transferTokens = async (
  recipientDid: string,
  amount: string,
  message: string
) => {
  const idempotencyKey = generateIdempotencyKey();
  
  const response = await fetch('/tokens/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      recipientDid,
      amount,
      message,
      idempotencyKey,
    }),
  });
  
  return response.json();
};
```

**メリット**:
- 実装が簡単（外部ライブラリ不要）
- 一意性が高い

**注意点**:
- 再試行時には同じキーを使用する必要がある

## 実装パターン

### パターン1: 送金ボタンクリック時に生成（推奨）

```typescript
// React の例
const TransferButton = () => {
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleTransfer = async () => {
    // ボタンクリック時に新しいキーを生成
    const newKey = uuidv4();
    setIdempotencyKey(newKey);
    setIsLoading(true);
    
    try {
      const response = await transferTokens(
        recipientDid,
        amount,
        message,
        newKey
      );
      
      if (response.success) {
        // 送金成功
        setIdempotencyKey(null); // 次の送金のためにクリア
      }
    } catch (error) {
      // エラー時は同じキーで再試行可能
      console.error('Transfer failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRetry = async () => {
    // 再試行時は同じキーを使用
    if (idempotencyKey) {
      setIsLoading(true);
      try {
        await transferTokens(
          recipientDid,
          amount,
          message,
          idempotencyKey // 同じキーを使用
        );
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  return (
    <div>
      <button onClick={handleTransfer} disabled={isLoading}>
        送金
      </button>
      {error && (
        <button onClick={handleRetry}>再試行</button>
      )}
    </div>
  );
};
```

### パターン2: フォーム送信時に生成

```typescript
// フォーム送信時に生成
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const idempotencyKey = uuidv4();
  
  try {
    await transferTokens(
      formData.recipientDid,
      formData.amount,
      formData.message,
      idempotencyKey
    );
  } catch (error) {
    // エラーハンドリング
  }
};
```

## エラーハンドリング

### 重複エラーの処理

```typescript
const transferTokens = async (
  recipientDid: string,
  amount: string,
  message: string,
  idempotencyKey: string
) => {
  try {
    const response = await fetch('/tokens/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipientDid,
        amount,
        message,
        idempotencyKey,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      if (data.error?.code === 'VALIDATION_ERROR' && 
          data.error?.message === 'Duplicate idempotency key') {
        // 重複エラー: 既に送金が完了している可能性がある
        // トランザクション履歴を確認するか、成功として扱う
        console.warn('Duplicate idempotency key - transaction may have already completed');
        return { success: true, duplicate: true };
      }
      throw new Error(data.error?.message || 'Transfer failed');
    }
    
    return data;
  } catch (error) {
    console.error('Transfer error:', error);
    throw error;
  }
};
```

## ベストプラクティス

### ✅ 推奨される実装

1. **送金ボタンクリック時にUUIDを生成**
   - ユーザー操作ごとに新しいキーを生成
   - 再試行時は同じキーを使用

2. **キーの保存と再利用**
   - エラー発生時は、同じキーで再試行可能にする
   - 成功後はキーをクリア

3. **重複エラーの適切な処理**
   - `VALIDATION_ERROR`の場合は、送金が既に完了している可能性がある
   - トランザクション履歴を確認するか、成功として扱う

### ❌ 避けるべき実装

1. **毎回新しいキーを生成して再試行**
   ```typescript
   // ❌ 悪い例: 再試行時に新しいキーを生成
   const retry = async () => {
     const newKey = uuidv4(); // 毎回新しいキー
     await transferTokens(recipientDid, amount, message, newKey);
   };
   ```

2. **キーを生成しない（オプショナルだから省略）**
   ```typescript
   // ❌ 悪い例: idempotencyKeyを省略
   // ネットワークエラー時の再試行で二重送金のリスクがある
   await transferTokens(recipientDid, amount, message); // idempotencyKeyなし
   ```

3. **固定値を使用**
   ```typescript
   // ❌ 悪い例: 固定値を使用
   const idempotencyKey = 'fixed-key'; // すべての送金で同じキー
   ```

## 実装例（完全版）

```typescript
import { v4 as uuidv4 } from 'uuid';

interface TransferState {
  idempotencyKey: string | null;
  isRetrying: boolean;
}

class TokenTransferService {
  private transferState: TransferState = {
    idempotencyKey: null,
    isRetrying: false,
  };
  
  async transfer(
    recipientDid: string,
    amount: string,
    message: string,
    isRetry: boolean = false
  ): Promise<TransferResult> {
    // 再試行でない場合、またはキーがない場合は新しいキーを生成
    if (!isRetry || !this.transferState.idempotencyKey) {
      this.transferState.idempotencyKey = uuidv4();
    }
    
    try {
      const response = await fetch('/tokens/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientDid,
          amount,
          message,
          idempotencyKey: this.transferState.idempotencyKey,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 成功時はキーをクリア
        this.transferState.idempotencyKey = null;
        return { success: true, data: data.data };
      }
      
      // 重複エラーの場合
      if (data.error?.code === 'VALIDATION_ERROR' && 
          data.error?.message === 'Duplicate idempotency key') {
        // 既に送金が完了している可能性がある
        this.transferState.idempotencyKey = null;
        return { success: true, duplicate: true };
      }
      
      throw new Error(data.error?.message || 'Transfer failed');
    } catch (error) {
      // ネットワークエラーなどの場合は、キーを保持して再試行可能にする
      throw error;
    }
  }
  
  async retry(
    recipientDid: string,
    amount: string,
    message: string
  ): Promise<TransferResult> {
    return this.transfer(recipientDid, amount, message, true);
  }
  
  reset(): void {
    this.transferState.idempotencyKey = null;
  }
}
```

## まとめ

**フロントエンドからは、通常以下のように実装することを推奨します：**

1. **送金ボタンクリック時にUUIDを生成**
   ```typescript
   const idempotencyKey = uuidv4();
   ```

2. **再試行時は同じキーを使用**
   ```typescript
   // エラー発生時は、同じidempotencyKeyで再試行
   ```

3. **成功後はキーをクリア**
   ```typescript
   // 送金成功後は、次の送金のためにキーをクリア
   ```

4. **重複エラーを適切に処理**
   ```typescript
   // VALIDATION_ERRORの場合は、送金が既に完了している可能性がある
   ```

これにより、ネットワークエラーやタイムアウトによる再試行時にも、二重送金を防ぐことができます。

