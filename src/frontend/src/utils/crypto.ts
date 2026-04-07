/**
 * Hash a password using SHA-256 via the Web Crypto API.
 * Returns a hex string.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Format a cycle balance (bigint) to a human-readable string.
 * e.g. 1_200_000_000_000 => "1.20T cycles"
 */
export function formatCycleBalance(cycles: bigint): string {
  const n = Number(cycles);
  if (n >= 1_000_000_000_000) {
    return `${(n / 1_000_000_000_000).toFixed(2)}T cycles`;
  }
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(2)}B cycles`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M cycles`;
  }
  return `${n.toLocaleString()} cycles`;
}

/**
 * Format a Time (bigint nanoseconds) to a human-readable date string.
 */
export function formatTime(time: bigint): string {
  const ms = Number(time / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
