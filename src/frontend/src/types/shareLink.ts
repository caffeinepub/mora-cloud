export interface ShareLink {
  token: string;
  docId: string;
  createdAt: bigint;
  expiresAt: bigint;
  note: string;
  revoked: boolean;
}

export type ShareLinkResult<T> =
  | { ok: T; err?: never }
  | { err: string; ok?: never };
