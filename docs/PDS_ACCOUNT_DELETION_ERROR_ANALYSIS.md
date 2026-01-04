# PDSアカウント削除失敗の原因調査レポート

## エラー情報

### エラーメッセージ
```
Invalid query parameter: did
at constructMethodCallUrl (/opt/nodejs/node_modules/@atproto/xrpc/dist/util.js:45:19)
at BskyAgent.call (/opt/nodejs/node_modules/@atproto/xrpc/dist/xrpc-client.js:53:58)
```

### エラー発生箇所
- `PdsService.deleteAccount` (line 321)
- `xrpc.call`メソッドの呼び出し時

## 現在の実装

### deleteAccountメソッド（失敗している実装）
```typescript
await (agent as any).xrpc.call(
  'com.atproto.server.deleteAccount',
  {
    did,
  },
  {
    encoding: 'application/json',
    headers: {
      authorization: `Bearer ${accessJwt}`,
    },
  }
);
```

### createAccountメソッド（参考 - 成功している実装）
```typescript
const response = await agent.createAccount(createAccountParams);
```

## 型定義の確認

### deleteAccountのInputSchema
```typescript
export interface InputSchema {
  did: string;
  password: string;
  token: string;
}
```

### deleteAccountのCallOptions
```typescript
export interface CallOptions {
  signal?: AbortSignal;
  headers?: HeadersMap;
  qp?: QueryParams;  // クエリパラメータ（空オブジェクト）
  encoding?: 'application/json';
}
```

### deleteAccountのQueryParams
```typescript
export type QueryParams = {};  // クエリパラメータは空
```

## 問題の分析

### 根本原因

**`xrpc.call`メソッドの第2引数はクエリパラメータ（`qp`）として扱われています。**
しかし、`com.atproto.server.deleteAccount`は**POSTリクエスト**で、`did`は**リクエストボディ（`InputSchema`）**に含める必要があります。

### xrpc.callのシグネチャ（推測）
```typescript
xrpc.call(
  methodId: string,
  queryParams?: QueryParams,  // 第2引数 = クエリパラメータ（GETリクエスト用）
  options?: CallOptions        // 第3引数 = オプション（headers, encodingなど）
)
```

### 問題点

1. **パラメータの配置が間違っている**
   - 現在の実装では、`{ did }`を第2引数（クエリパラメータ）として渡している
   - しかし、`deleteAccount`はPOSTリクエストで、`did`はリクエストボディに含める必要がある
   - `xrpc.call`は`did`をクエリパラメータとして扱おうとし、`constructMethodCallUrl`でエラーが発生

2. **InputSchemaの要件が満たされていない**
   - `deleteAccount`の`InputSchema`には`did`, `password`, `token`の3つが必要
   - 現在の実装では`did`のみを渡している
   - `password`と`token`が不足している

3. **xrpc.callの使用方法が不適切**
   - `xrpc.call`は低レベルAPIで、リクエストボディを直接指定する方法が不明確
   - `createAccount`は高レベルAPI（`agent.createAccount()`）を使用しており、リクエストボディが自動的に処理される

## 解決策の方向性

### 1. agent.com.atproto.server.deleteAccount()を直接使用（推奨）

`createAccount`と同様に、直接メソッド呼び出しを使用する方法：

```typescript
await agent.com.atproto.server.deleteAccount({
  did,
  password: userPassword,  // ユーザーのパスワードが必要
  token: deletionToken,      // 削除トークンが必要
}, {
  headers: {
    authorization: `Bearer ${accessJwt}`,
  },
});
```

**課題**:
- `session`プロパティが読み取り専用のため、認証情報を設定する方法が問題
- `password`と`token`が必要だが、現在の実装ではこれらを取得していない

### 2. xrpc.callの正しい使用方法を確認

リクエストボディを指定する方法を確認する必要があります。おそらく、`CallOptions`の`encoding`と`headers`を使用し、リクエストボディは別の方法で指定する必要があります。

ただし、`xrpc.call`のドキュメントや実装を確認する必要があります。

### 3. 直接HTTPリクエストを送信

`fetch`を使用して直接HTTPリクエストを送信する方法：

```typescript
const response = await fetch(`${this.pdsEndpoint}/xrpc/com.atproto.server.deleteAccount`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessJwt}`,
  },
  body: JSON.stringify({
    did,
    password: userPassword,
    token: deletionToken,
  }),
});
```

**課題**:
- `createAccount`と同じ方法ではない
- エラーハンドリングやレスポンスの処理を手動で実装する必要がある

## 追加の調査が必要な項目

1. **BskyAgentのcom.atproto.server.deleteAccountメソッドの使用方法**
   - メソッドのシグネチャを確認
   - 認証情報の設定方法を確認

2. **xrpc.callのリクエストボディ指定方法**
   - ドキュメントや実装を確認
   - リクエストボディを指定する方法を確認

3. **deleteAccountのpasswordとtokenの取得方法**
   - `password`: ユーザーのパスワードが必要
   - `token`: 削除トークンが必要（`com.atproto.server.requestAccountDelete`で取得）

4. **管理者権限での削除方法**
   - `com.atproto.admin.deleteAccount`の使用を検討
   - 管理者権限での削除が可能か確認

## 結論

**根本原因**: `xrpc.call`の第2引数はクエリパラメータとして扱われているため、POSTリクエストのリクエストボディ（`did`）をクエリパラメータとして渡そうとしてエラーが発生しています。

**推奨される解決策**: `agent.com.atproto.server.deleteAccount()`を直接使用する方法を検討するか、`fetch`を使用して直接HTTPリクエストを送信する方法を検討します。

ただし、`deleteAccount`には`password`と`token`が必要なため、これらの取得方法も確認する必要があります。

