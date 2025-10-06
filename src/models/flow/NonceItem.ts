/**
 * DynamoDB nonce管理用のアイテムインターフェース
 * 既存のSnsTableの構造に合わせて設計
 */
export interface DynamoDBNonceItem {
  /** Partition Key: NONCE#{nonceValue} */
  PK: string;
  /** Sort Key: META */
  SK: string;
  /** GSI1 Partition Key: NONCE_STATUS#{status} */
  GSI1PK: string;
  /** GSI1 Sort Key: NONCE#{nonceValue} */
  GSI1SK: string;
  /** GSI2 Partition Key: NONCE_CLEANUP */
  GSI2PK: string;
  /** GSI2 Sort Key: {expiresAt} */
  GSI2SK: string;
  /** nonce値 */
  nonce: string;
  /** nonceステータス */
  status: 'active' | 'used' | 'expired';
  /** 生成タイムスタンプ */
  timestamp: number;
  /** 有効期限タイムスタンプ */
  expiresAt: number;
  /** 使用日時（使用時のみ） */
  usedAt?: number;
  /** 作成日時（ISO文字列） */
  createdAt: string;
  /** TTL（DynamoDB自動削除用） */
  ttl: number;
}

/**
 * nonce統計情報
 */
export interface NonceStats {
  /** 総数 */
  total: number;
  /** アクティブ数 */
  active: number;
  /** 使用済み数 */
  used: number;
  /** 期限切れ数 */
  expired: number;
}

/**
 * nonce生成リクエスト
 */
export interface NonceGenerationRequest {
  /** 有効期限（ミリ秒、デフォルト5分） */
  expiryMs?: number;
}

/**
 * nonce検証リクエスト
 */
export interface NonceValidationRequest {
  /** 検証するnonce値 */
  nonce: string;
  /** 現在のタイムスタンプ */
  currentTimestamp: number;
}

/**
 * nonce使用マークリクエスト
 */
export interface NonceUsageRequest {
  /** 使用するnonce値 */
  nonce: string;
  /** 使用日時 */
  usedAt: number;
}
