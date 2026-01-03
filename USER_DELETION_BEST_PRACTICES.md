# ユーザー削除時のベストプラクティス

## 概要

ユーザーアカウント削除時の関連データの扱いについて、業界標準のベストプラクティスをまとめます。

## ベストプラクティス

### 1. プロフィール（Profile）

**推奨**: **論理削除（Soft Delete）**

- プロフィールを物理削除せず、`accountStatus: 'deleted'` を設定
- `deletedAt` タイムスタンプを記録
- 表示名を `[Deleted User]` に変更
- メールアドレスなどの個人情報を削除

**理由**:
- 法的要件（GDPR、監査）への対応
- データ整合性の維持
- 復元可能性（誤削除の場合）

### 2. 投稿（Posts）

**推奨**: **匿名化（Anonymization）**

- 投稿を削除せず、著者情報を匿名化
- `authorId` を `"deleted"` に設定、または著者名を `[Deleted User]` に変更
- 投稿内容は保持（他のユーザーへの影響を最小化）

**理由**:
- コンテンツの整合性維持
- 他のユーザーの投稿への参照を保持
- スレッドの文脈を保持

**代替案**: 完全削除（物理削除）
- プライバシー重視の場合
- 法的要件で削除が必要な場合

### 3. コメント（Comments）

**推奨**: **匿名化（Anonymization）**

- コメントを削除せず、著者情報を匿名化
- `authorId` を `"deleted"` に設定、または著者名を `[Deleted User]` に変更
- コメント内容は保持（スレッドの整合性維持）

**理由**:
- スレッドの文脈を保持
- 他のユーザーのコメントへの返信を保持
- 会話の流れを維持

### 4. いいね（Likes）

**推奨**: **物理削除（Hard Delete）**

- ユーザーのすべてのいいねを削除
- 投稿の `likeCount` を更新

**理由**:
- 匿名化しても意味がない（いいねは個人の意見）
- データの整合性を保つため削除が適切
- ストレージ効率

### 5. フォロー関係（Follows）

**推奨**: **物理削除（Hard Delete）**

- フォロー/フォロワー関係をすべて削除
- `followerCount` と `followingCount` を更新

**理由**:
- 削除されたユーザーとの関係は無意味
- データの整合性を保つため削除が適切
- プライバシー保護

### 6. 認証情報（Identity Links）

**推奨**: **保持（Keep for Audit）**

- Identity Linksは削除せず保持
- 監査目的で一定期間保持

**理由**:
- 法的要件（監査、コンプライアンス）
- セキュリティ調査
- 不正行為の追跡

### 7. ルックアップ（Identity Lookups）

**推奨**: **論理削除（Soft Delete）**

- `status: 'revoked'` を設定
- 物理削除は行わない（監査目的）

**理由**:
- 監査目的
- セキュリティ調査
- データ整合性

## 実装方針

### 現在の実装

```typescript
// Soft delete: Mark profile as deleted
async deleteUserProfile(userId: string): Promise<void> {
  // プロフィールを論理削除
  // accountStatus: 'deleted'
  // deletedAt: timestamp
  // displayName: '[Deleted User]'
  // email: 削除
}
```

### 推奨される完全な実装

```typescript
async deleteUserProfile(userId: string): Promise<void> {
  // 1. プロフィールを論理削除
  await this.softDeleteProfile(userId);
  
  // 2. 投稿を匿名化
  await this.anonymizePosts(userId);
  
  // 3. コメントを匿名化
  await this.anonymizeComments(userId);
  
  // 4. いいねを削除
  await this.deleteLikes(userId);
  
  // 5. フォロー関係を削除
  await this.deleteFollows(userId);
  
  // 6. Identity Linksは保持（監査目的）
  // 7. Identity Lookupsを論理削除
  await this.revokeIdentityLookups(userId);
}
```

## 法的要件への対応

### GDPR（EU一般データ保護規則）

- **削除権（Right to Erasure）**: ユーザーは自分のデータの削除を要求できる
- **匿名化**: 完全削除が不可能な場合、匿名化で対応可能
- **保持期間**: 法的要件に基づき、一定期間データを保持する必要がある場合がある

### 監査要件

- **Identity Links**: セキュリティ監査のために保持
- **削除ログ**: 誰がいつ削除したかを記録
- **復元可能性**: 誤削除の場合の復元機能

## パフォーマンス考慮事項

### バッチ処理

大量のデータを削除する場合、バッチ処理を推奨：

```typescript
// バッチ処理で投稿を匿名化
async anonymizePosts(userId: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const posts = await this.getUserPosts(userId, 100, cursor);
    await this.batchAnonymizePosts(posts.items);
    cursor = posts.nextCursor;
  } while (cursor);
}
```

### 非同期処理

削除処理は時間がかかるため、非同期処理を推奨：

```typescript
// SQSにジョブを投入
await this.sqsService.enqueueDeletionJob(userId);
```

## まとめ

| データタイプ | 推奨方法 | 理由 |
|------------|---------|------|
| **プロフィール** | 論理削除 | 監査、法的要件 |
| **投稿** | 匿名化 | コンテンツ整合性 |
| **コメント** | 匿名化 | スレッド整合性 |
| **いいね** | 物理削除 | 意味がない |
| **フォロー** | 物理削除 | 関係が無意味 |
| **Identity Links** | 保持 | 監査目的 |
| **Identity Lookups** | 論理削除 | 監査目的 |

## 参考

- [GDPR Article 17 - Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [Twitter Account Deletion Policy](https://help.twitter.com/en/managing-your-account/deactivate-twitter-account)
- [Facebook Account Deletion](https://www.facebook.com/help/250563911967368)

