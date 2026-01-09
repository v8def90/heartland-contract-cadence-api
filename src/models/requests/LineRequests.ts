/**
 * LINE Account Linking API Request Models
 *
 * @description TypeScript interfaces for LINE account linking API request payloads
 * @author Heart Token API Team
 * @since 1.0.0
 */

/**
 * アカウント連携リクエスト（ログイン情報）
 *
 * @description Request for initiating LINE account linking.
 * Supports both email/password and JWT authentication.
 */
export interface LineLinkRequest {
  // 認証方法A: email/password認証
  email?: string;
  password?: string;
  // 認証方法B: JWT認証（リクエストヘッダーに`Authorization: Bearer {jwtToken}`を含める）
  // jwtTokenはリクエストボディには含めない
}

/**
 * アカウント連携完了リクエスト（Botサーバーから呼び出し）
 *
 * @description Request for completing LINE account linking.
 * Called by Bot server after receiving Webhook event.
 */
export interface LineCompleteLinkRequest {
  lineUserId: string; // LINEのユーザーID
  nonce: string; // nonce
}

/**
 * アカウント連携ステータス取得リクエスト
 *
 * @description Request for getting LINE account linking status.
 */
export interface LineLinkStatusRequest {
  lineUserId?: string; // LINEユーザーIDで検索
  primaryDid?: string; // primaryDidで検索
}
