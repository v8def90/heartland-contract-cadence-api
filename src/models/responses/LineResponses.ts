/**
 * LINE Account Linking API Response Models
 *
 * @description TypeScript interfaces for LINE account linking API response payloads
 * @author Heart Token API Team
 * @since 1.0.0
 */

import type { ApiResponse } from './ApiResponse';

/**
 * アカウント連携レスポンス（nonce生成成功、リダイレクトURL返却）
 */
export interface LineLinkResponse {
  success: boolean;
  redirectUrl: string; // LINEプラットフォームへのリダイレクトURL
  nonce: string; // 生成されたnonce（デバッグ用、本番環境では返却しない）
  expiresAt: string; // nonce有効期限（ISO 8601）
}

/**
 * アカウント連携完了レスポンス（Botサーバーから呼び出し時）
 */
export interface LineCompleteLinkResponse {
  success: boolean;
  lineUserId: string;
  primaryDid: string;
  linkedAt: string; // ISO 8601
}

/**
 * アカウント連携ステータス
 */
export interface LineLinkStatus {
  isLinked: boolean;
  lineUserId?: string;
  linkedAt?: string;
  primaryDid?: string;
}

/**
 * アカウント連携解除レスポンス
 */
export interface LineUnlinkResponse {
  success: boolean;
  unlinkedAt: string;
}

/**
 * API Response型定義
 */
export type LineLinkApiResponse = ApiResponse<LineLinkResponse>;
export type LineCompleteLinkApiResponse = ApiResponse<LineCompleteLinkResponse>;
export type LineLinkStatusApiResponse = ApiResponse<LineLinkStatus>;
export type LineUnlinkApiResponse = ApiResponse<LineUnlinkResponse>;
