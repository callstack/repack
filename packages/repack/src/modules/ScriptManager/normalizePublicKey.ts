import { NormalizedScriptLocatorSignatureVerificationMode } from './NativeScriptManager.js';

const PUBLIC_KEY_PEM_PATTERN =
  /^-----BEGIN PUBLIC KEY-----\s*[\s\S]+?\s*-----END PUBLIC KEY-----$/;

export const INVALID_PUBLIC_KEY_ERROR =
  'Property publicKey must be a PEM-formatted public key enclosed in BEGIN/END PUBLIC KEY markers.';

export function normalizePublicKey(
  publicKey: string | undefined,
  verifyScriptSignature: NormalizedScriptLocatorSignatureVerificationMode
) {
  if (!publicKey) return;

  const normalizedPublicKey = publicKey.trim();

  if (
    verifyScriptSignature !==
      NormalizedScriptLocatorSignatureVerificationMode.OFF &&
    !PUBLIC_KEY_PEM_PATTERN.test(normalizedPublicKey)
  ) {
    throw new Error(INVALID_PUBLIC_KEY_ERROR);
  }

  return normalizedPublicKey;
}
