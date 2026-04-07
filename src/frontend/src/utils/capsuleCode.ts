const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_PREFIX = "CLOUD-";
const CODE_SUFFIX_LENGTH = 5;
const TOTAL_CODE_LENGTH = CODE_PREFIX.length + CODE_SUFFIX_LENGTH; // 11

export function generateCapsuleCode(): string {
  let suffix = "";
  for (let i = 0; i < CODE_SUFFIX_LENGTH; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `${CODE_PREFIX}${suffix}`;
}

export function getOrCreateCapsuleCode(principalId: string): string {
  const existing = localStorage.getItem(`capsuleCode:${principalId}`);
  if (existing) return existing;

  // Keep generating until we find a unique code
  let code = generateCapsuleCode();
  while (localStorage.getItem(`codeMap:${code}`) !== null) {
    code = generateCapsuleCode();
  }

  localStorage.setItem(`capsuleCode:${principalId}`, code);
  localStorage.setItem(`codeMap:${code}`, principalId);
  return code;
}

export function lookupPrincipalByCode(code: string): string | null {
  return localStorage.getItem(`codeMap:${code.toUpperCase()}`);
}

export function isCapsuleCode(input: string): boolean {
  const upper = input.toUpperCase();
  return upper.startsWith(CODE_PREFIX) && upper.length === TOTAL_CODE_LENGTH;
}
