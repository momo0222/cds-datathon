function getEncryptionSecret() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required for OAuth token storage");
  }
  return secret;
}

function toBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

async function getKey() {
  const encoded = new TextEncoder().encode(getEncryptionSecret());
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey();
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(token)
    )
  );

  return `${toBase64(iv)}.${toBase64(ciphertext)}`;
}

export async function decryptToken(encrypted: string) {
  const [ivValue, ciphertextValue] = encrypted.split(".");
  if (!ivValue || !ciphertextValue) {
    throw new Error("Invalid encrypted token format");
  }

  const key = await getKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivValue) },
    key,
    fromBase64(ciphertextValue)
  );

  return new TextDecoder().decode(plaintext);
}
