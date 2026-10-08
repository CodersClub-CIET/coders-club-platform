import crypto from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server-admin";

export interface ActivationCredentialRecord {
  requestId: string;
  email: string;
  credentialHash: string;
  expiresAt: string;
  failedAttempts: number;
  maxAttempts: number;
  isConsumed: boolean;
  consumedAt: string | null;
  isSuperseded: boolean;
  issuedBy: string;
  issuedAt: string;
}

const SETTING_KEY_PREFIX = "associate_activation:";
const DEFAULT_EXPIRY_HOURS = 72;
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Generate a cryptographically secure 32-byte activation credential (64 hex characters).
 */
export function generateActivationCredential(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash credential with SHA-256 for secure storage.
 */
export function hashActivationCredential(credential: string): string {
  return crypto.createHash("sha256").update(credential.trim()).digest("hex");
}

/**
 * Constant-time comparison of candidate credential against stored hash.
 */
export function verifyActivationCredential(candidate: string, storedHash: string): boolean {
  try {
    const candidateHash = hashActivationCredential(candidate);
    const candidateBuf = Buffer.from(candidateHash, "hex");
    const storedBuf = Buffer.from(storedHash, "hex");
    if (candidateBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(candidateBuf, storedBuf);
  } catch {
    return false;
  }
}

/**
 * Store or supersede activation credential in system_settings.
 */
export async function storeActivationCredential(
  requestId: string,
  email: string,
  credentialHash: string,
  adminUserId: string
): Promise<ActivationCredentialRecord> {
  const admin = createServiceRoleClient();
  const settingKey = `${SETTING_KEY_PREFIX}${requestId}`;

  // First check if an existing credential exists and supersede it
  const { data: existing } = await admin
    .from("system_settings")
    .select("id, setting_value")
    .eq("setting_key", settingKey)
    .maybeSingle();

  const record: ActivationCredentialRecord = {
    requestId,
    email: email.trim().toLowerCase(),
    credentialHash,
    expiresAt: new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
    failedAttempts: 0,
    maxAttempts: MAX_FAILED_ATTEMPTS,
    isConsumed: false,
    consumedAt: null,
    isSuperseded: false,
    issuedBy: adminUserId,
    issuedAt: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await admin
      .from("system_settings")
      .update({
        setting_value: record,
        updated_by: adminUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`Failed to update activation credential: ${error.message}`);
  } else {
    const { error } = await admin
      .from("system_settings")
      .insert({
        setting_key: settingKey,
        setting_value: record,
        description: `Activation credential for Associate request ${requestId}`,
        is_active: true,
        updated_by: adminUserId,
      });
    if (error) throw new Error(`Failed to store activation credential: ${error.message}`);
  }

  return record;
}

/**
 * Retrieve activation credential record for a request.
 */
export async function getActivationCredentialRecord(
  requestId: string
): Promise<ActivationCredentialRecord | null> {
  const admin = createServiceRoleClient();
  const settingKey = `${SETTING_KEY_PREFIX}${requestId}`;

  const { data, error } = await admin
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", settingKey)
    .maybeSingle();

  if (error || !data?.setting_value) return null;
  return data.setting_value as unknown as ActivationCredentialRecord;
}

/**
 * Record a failed attempt for an activation credential.
 */
export async function recordFailedAttempt(
  requestId: string,
  currentAttempts: number
): Promise<void> {
  const admin = createServiceRoleClient();
  const settingKey = `${SETTING_KEY_PREFIX}${requestId}`;

  const { data } = await admin
    .from("system_settings")
    .select("id, setting_value")
    .eq("setting_key", settingKey)
    .maybeSingle();

  if (data?.id && data.setting_value) {
    const updated = {
      ...(data.setting_value as unknown as ActivationCredentialRecord),
      failedAttempts: currentAttempts + 1,
    };
    await admin
      .from("system_settings")
      .update({ setting_value: updated, updated_at: new Date().toISOString() })
      .eq("id", data.id);
  }
}

/**
 * Mark activation credential as consumed.
 */
export async function markCredentialConsumed(
  requestId: string
): Promise<void> {
  const admin = createServiceRoleClient();
  const settingKey = `${SETTING_KEY_PREFIX}${requestId}`;

  const { data } = await admin
    .from("system_settings")
    .select("id, setting_value")
    .eq("setting_key", settingKey)
    .maybeSingle();

  if (data?.id && data.setting_value) {
    const updated = {
      ...(data.setting_value as unknown as ActivationCredentialRecord),
      isConsumed: true,
      consumedAt: new Date().toISOString(),
    };
    await admin
      .from("system_settings")
      .update({ setting_value: updated, updated_at: new Date().toISOString() })
      .eq("id", data.id);
  }
}
