export const FRIEND_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateFriendCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * FRIEND_CODE_ALPHABET.length);
    code += FRIEND_CODE_ALPHABET[idx];
  }
  return code;
}

export function isValidFriendCode(value: string): boolean {
  if (value.length !== CODE_LENGTH) return false;
  for (const ch of value) {
    if (!FRIEND_CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}
