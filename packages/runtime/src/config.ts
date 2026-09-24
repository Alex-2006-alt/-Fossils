export function validateConfig() {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:"))
    throw Error(
      "Configure the SQLite DATABASE_URL; rehearse a provider migration before changing it",
    );
  const provider = process.env.STORAGE_PROVIDER || "local";
  if (!["local", "r2"].includes(provider))
    throw Error("Unsupported STORAGE_PROVIDER");
  if (provider === "r2")
    for (const key of [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ])
      if (!process.env[key]) throw Error("Missing " + key);
  const quota = Number(process.env.FAMILY_QUOTA_BYTES || 5368709120);
  if (!Number.isSafeInteger(quota) || quota < 1)
    throw Error("FAMILY_QUOTA_BYTES must be a positive integer");
  if (process.env.NODE_ENV === "production") {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret || secret.length < 32 || secret.includes("change-this"))
      throw Error("Set a random AUTH_SECRET of at least 32 characters");
    const origin = process.env.APP_URL || process.env.NEXTAUTH_URL;
    if (!origin) throw Error("APP_URL is required");
    const parsed = new URL(origin);
    if (
      parsed.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(parsed.hostname)
    )
      throw Error("Production APP_URL must use HTTPS");
  }
}
