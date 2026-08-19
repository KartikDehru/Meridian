import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Minimum password policy enforced at every entry point. */
export function passwordPolicyError(plain: string): string | null {
  if (plain.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(plain) || !/[0-9]/.test(plain))
    return "Password must contain both letters and numbers.";
  return null;
}
