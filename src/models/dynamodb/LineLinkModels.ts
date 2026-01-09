/**
 * LINE Account Linking Data Models
 *
 * @description DynamoDB item interfaces for LINE account linking functionality.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

/**
 * LINE連携情報アイテム
 *
 * @description DynamoDB item for LINE account linking information.
 */
export interface DynamoDBLineLinkItem {
  PK: string; // LINE_LINK#{lineUserId}
  SK: string; // META
  lineUserId: string; // LINEのユーザーID
  primaryDid: string; // 自社サービスのprimaryDid（did:plc:...）
  linkedAt: string; // 連携日時（ISO 8601）
  unlinkedAt?: string; // 連携解除日時
  status: 'linked' | 'unlinked'; // 連携ステータス
  createdAt: string;
  updatedAt: string;

  // GSI Keys
  GSI1PK?: string; // USER#{primaryDid}
  GSI1SK?: string; // LINE_LINK#{lineUserId}
}

/**
 * LINE連携用nonceアイテム
 *
 * @description DynamoDB item for LINE account linking nonce.
 * Used to securely link LINE user ID with primaryDid.
 */
export interface DynamoDBLineLinkNonceItem {
  PK: string; // LINE_NONCE#{nonce}
  SK: string; // META
  nonce: string; // nonce（10文字以上255文字以下、128ビット以上推奨）
  primaryDid: string; // 自社サービスのユーザーID（primaryDid）
  linkToken: string; // 連携トークン（Botサーバー側で管理）
  createdAt: string;
  expiresAt: number; // nonce有効期限（Unix timestamp、ミリ秒）
  status: 'active' | 'used' | 'expired';
  ttl?: number; // TTL（24時間後）

  // GSI Keys
  GSI1PK?: string; // LINE_NONCE_STATUS#{status}
  GSI1SK?: string; // LINE_NONCE#{nonce}
}
