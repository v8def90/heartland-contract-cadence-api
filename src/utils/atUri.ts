/**
 * AT URI Utility Functions
 *
 * @description Provides utilities for generating, parsing, and validating AT Protocol URIs.
 * AT URIs follow the format: at://{did}/{collection}/{rkey}
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

/**
 * AT URI components
 */
export interface AtUriComponents {
  did: string;
  collection?: string;
  rkey?: string;
}

/**
 * Generate AT URI
 *
 * @description Generates an AT Protocol URI from components.
 *
 * @param did - Decentralized Identifier (e.g., did:plc:xxx)
 * @param collection - Collection name (e.g., app.bsky.feed.post)
 * @param rkey - Record key (e.g., TID/ULID)
 * @returns AT URI string
 *
 * @example
 * ```typescript
 * const uri = generateAtUri('did:plc:xxx', 'app.bsky.feed.post', '3k2abc123');
 * // Returns: 'at://did:plc:xxx/app.bsky.feed.post/3k2abc123'
 * ```
 */
export function generateAtUri(
  did: string,
  collection: string,
  rkey: string
): string {
  return `at://${did}/${collection}/${rkey}`;
}

/**
 * Parse AT URI
 *
 * @description Parses an AT Protocol URI into its components.
 *
 * @param uri - AT URI string
 * @returns Parsed URI components or null if invalid
 *
 * @example
 * ```typescript
 * const components = parseAtUri('at://did:plc:xxx/app.bsky.feed.post/3k2abc123');
 * // Returns: { did: 'did:plc:xxx', collection: 'app.bsky.feed.post', rkey: '3k2abc123' }
 * ```
 */
export function parseAtUri(uri: string): AtUriComponents | null {
  try {
    // Remove 'at://' prefix
    if (!uri.startsWith('at://')) {
      return null;
    }

    const withoutPrefix = uri.substring(5); // Remove 'at://'
    const parts = withoutPrefix.split('/');

    if (parts.length < 1) {
      return null;
    }

    const did = parts[0];
    const collection = parts.length > 1 ? parts[1] : undefined;
    const rkey = parts.length > 2 ? parts[2] : undefined;

    // Validate DID format
    if (!did || !did.startsWith('did:')) {
      return null;
    }

    const result: AtUriComponents = {
      did,
    };
    if (collection) {
      result.collection = collection;
    }
    if (rkey) {
      result.rkey = rkey;
    }
    return result;
  } catch (error) {
    return null;
  }
}

/**
 * Validate AT URI
 *
 * @description Validates an AT Protocol URI format.
 *
 * @param uri - AT URI string to validate
 * @returns True if URI is valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = validateAtUri('at://did:plc:xxx/app.bsky.feed.post/3k2abc123');
 * // Returns: true
 * ```
 */
export function validateAtUri(uri: string): boolean {
  const components = parseAtUri(uri);
  return (
    components !== null &&
    components.did !== undefined &&
    components.did.length > 0
  );
}

/**
 * Generate profile AT URI
 *
 * @description Generates an AT Protocol URI for a user profile.
 *
 * @param did - User's DID
 * @returns Profile AT URI
 *
 * @example
 * ```typescript
 * const profileUri = generateProfileAtUri('did:plc:xxx');
 * // Returns: 'at://did:plc:xxx/app.bsky.actor.profile/self'
 * ```
 */
export function generateProfileAtUri(did: string): string {
  return `at://${did}/app.bsky.actor.profile/self`;
}
