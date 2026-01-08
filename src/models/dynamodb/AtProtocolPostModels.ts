/**
 * AT Protocol Post/Comment Data Models
 *
 * @description DynamoDB item interfaces for AT Protocol-compliant Post and Comment records.
 * Comments are treated as Reply Posts in AT Protocol.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

/**
 * AT Protocol準拠のPost Record Item
 *
 * @description DynamoDB item for AT Protocol post records.
 * Used for both regular posts and reply posts (comments).
 */
export interface DynamoDBBskyPostRecordItem {
  // Primary Key
  PK: string; // REPO#{ownerDid}
  SK: string; // REC#app.bsky.feed.post#{rkey}

  // AT Protocol標準フィールド
  ownerDid: string; // did:plc:...
  collection: 'app.bsky.feed.post';
  rkey: string; // TID形式
  uri: string; // at://{ownerDid}/app.bsky.feed.post/{rkey}
  cid?: string; // 将来的に実装（IPFS Content Identifier）

  // Lexicon準拠フィールド
  text: string; // content → text
  createdAt: string; // ISO 8601形式
  langs?: string[]; // 言語コード
  reply?: ReplyRef; // 返信構造（Commentの場合）
  embed?: {
    images?: SimplifiedEmbedImage[]; // images → embed.images (簡易版を使用)
  };
  facets?: SimplifiedFacet[]; // tags → facets (簡易版を使用)

  // タイムスタンプ
  createdAtIso: string; // ISO 8601形式（ソート用）
  updatedAtIso: string; // ISO 8601形式

  // TTL
  ttl?: number;

  // GSI Keys
  GSI1PK?: string; // REPO#{ownerDid}（ユーザーの投稿一覧取得用）
  GSI1SK?: string; // REC#app.bsky.feed.post#{rkey}
  GSI2PK?: string; // POST#ALL（フィード取得用）
  GSI2SK?: string; // REC#app.bsky.feed.post#{rkey}
  GSI13PK?: string; // REPLY#ROOT#{rootPostUri}（Reply Post取得用）
  GSI13SK?: string; // REC#app.bsky.feed.post#{rkey}
}

/**
 * Reply Reference（返信構造）
 *
 * @description AT Protocol reply structure for representing comment relationships.
 */
export interface ReplyRef {
  root: StrongRef; // ルート投稿への参照
  parent: StrongRef; // 親投稿への参照
}

/**
 * Strong Reference（AT URIとCIDを含む参照型）
 *
 * @description AT Protocol strong reference for referencing other records.
 */
export interface StrongRef {
  uri: string; // AT URI
  cid?: string; // 将来的に実装（IPFS Content Identifier）
}

/**
 * Embed Image（画像埋め込み）
 *
 * @description AT Protocol embed image structure.
 * Note: This is a simplified version. Full implementation would include
 * image references and metadata.
 */
export interface EmbedImage {
  image: {
    ref: {
      $link: string; // 画像のCID参照（将来的に実装）
    };
    mimeType: string; // image/jpeg, image/png等
    size: number; // ファイルサイズ（バイト）
  };
  alt?: string; // 代替テキスト
}

/**
 * Facet（リッチテキスト表現）
 *
 * @description AT Protocol facet structure for rich text features
 * (mentions, links, tags).
 */
export interface Facet {
  index: {
    byteStart: number; // 開始バイト位置
    byteEnd: number; // 終了バイト位置
  };
  features: FacetFeature[];
}

/**
 * Facet Feature（メンション、リンク等）
 *
 * @description AT Protocol facet feature types.
 */
export interface FacetFeature {
  $type:
    | 'app.bsky.richtext.facet#mention'
    | 'app.bsky.richtext.facet#link'
    | 'app.bsky.richtext.facet#tag';
  did?: string; // メンションの場合
  uri?: string; // リンクの場合
  tag?: string; // タグの場合
}

/**
 * Simplified Embed Image（簡易版）
 *
 * @description 実装初期段階では、画像URLの配列として扱う。
 * 将来的に完全なLexicon準拠形式へ移行。
 */
export interface SimplifiedEmbedImage {
  url: string; // 画像URL
  alt?: string; // 代替テキスト
  mimeType?: string; // MIMEタイプ
  size?: number; // ファイルサイズ（バイト）
}

/**
 * Simplified Facet（簡易版）
 *
 * @description 実装初期段階では、タグの文字列配列として扱う。
 * 将来的に完全なLexicon準拠形式へ移行。
 */
export interface SimplifiedFacet {
  type: 'mention' | 'link' | 'tag';
  value: string; // メンションDID、リンクURL、タグ名
  startIndex: number; // 開始位置
  endIndex: number; // 終了位置
}
