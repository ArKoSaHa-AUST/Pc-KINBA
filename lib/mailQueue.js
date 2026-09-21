import crypto from "crypto";

/**
 * Generates an idempotency correlation ID for email delivery attempts.
 * Format: sha256(kind + ':' + recipient + ':' + eventId + ':' + alertId) truncated to 32 hex chars.
 *
 * @param {{ kind: string, recipient: string, eventId?: string|number|null, alertId?: string|number|null }} param0
 * @returns {string} 32-character hexadecimal correlation id
 */
export function generateCorrelationId({ kind, recipient, eventId, alertId }) {
  const cleanKind = (kind || "notification").trim();
  const cleanRecipient = (recipient || "").trim().toLowerCase();
  const cleanEventId = eventId !== undefined && eventId !== null ? String(eventId).trim() : "";
  const cleanAlertId = alertId !== undefined && alertId !== null ? String(alertId).trim() : "";

  const payload = `${cleanKind}:${cleanRecipient}:${cleanEventId}:${cleanAlertId}`;
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

/**
 * Masks the local part of an email address for safe, privacy-compliant logging.
 * Example: 'john.doe@gmail.com' -> 'j***e@gmail.com'
 *
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  if (!email || typeof email !== "string") return "[empty-email]";
  const trimmed = email.trim();
  const atIdx = trimmed.indexOf("@");
  if (atIdx <= 0) return trimmed.slice(0, 2) + "***";

  const local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx);

  if (local.length <= 2) {
    return `${local[0]}***${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}${domain}`;
}

/**
 * Creates a bounded concurrency limiter (pLimit-style) without external dependencies.
 *
 * @param {number} limit Maximum concurrent asynchronous executions
 * @returns {<T>(fn: () => Promise<T>) => Promise<T>}
 */
export function createConcurrencyLimiter(limit = 5) {
  const max = Math.max(1, limit);
  let active = 0;
  const queue = [];

  const pump = () => {
    while (active < max && queue.length > 0) {
      active++;
      const { fn, resolve, reject } = queue.shift();
      Promise.resolve()
        .then(fn)
        .then(resolve, reject)
        .finally(() => {
          active--;
          pump();
        });
    }
  };

  return function enqueue(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      pump();
    });
  };
}

/**
 * Checks whether a specific correlation_id has already been successfully delivered ('sent').
 *
 * @param {any} supabase Supabase client instance
 * @param {string} correlationId
 * @returns {Promise<boolean>}
 */
export async function isAlreadyDelivered(supabase, correlationId) {
  if (!supabase || !correlationId) return false;
  try {
    const { data, error } = await supabase
      .from("email_deliveries")
      .select("id, status")
      .eq("correlation_id", correlationId)
      .maybeSingle();

    if (error || !data) return false;
    return data.status === "sent";
  } catch {
    return false;
  }
}

/**
 * Persists an email delivery attempt into the durable email_deliveries table.
 *
 * @param {any} supabase Supabase client instance
 * @param {{
 *   kind: string,
 *   recipient: string,
 *   userId?: string|null,
 *   alertId?: string|number|null,
 *   eventId?: string|number|null,
 *   correlationId: string,
 *   status: 'sent'|'failed_transient'|'failed_permanent'|'failed_config',
 *   attempts: number,
 *   lastError?: string|null,
 *   messageId?: string|null
 * }} record
 * @returns {Promise<any>}
 */
export async function recordDeliveryAttempt(supabase, record) {
  if (!supabase) return null;
  const now = new Date().toISOString();
  const payload = {
    kind: record.kind,
    recipient: record.recipient,
    user_id: record.userId || null,
    alert_id: record.alertId !== undefined && record.alertId !== null ? String(record.alertId) : null,
    event_id: record.eventId !== undefined && record.eventId !== null ? Number(record.eventId) : null,
    correlation_id: record.correlationId,
    status: record.status,
    attempts: record.attempts || 1,
    last_error: record.lastError || null,
    message_id: record.messageId || null,
    updated_at: now
  };

  try {
    const { data, error } = await supabase
      .from("email_deliveries")
      .upsert(payload, { onConflict: "correlation_id" })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[MailQueue Record Error]:", error.message);
    }
    return data;
  } catch (err) {
    console.warn("[MailQueue Record Exception]:", err.message);
    return null;
  }
}

/**
 * Computes delivery health stats grouped by status for the last 24h and 7d.
 *
 * @param {any} supabase Supabase client instance
 * @returns {Promise<{ last24h: Record<string, number>, last7d: Record<string, number> }>}
 */
export async function getDeliveryHealthStats(supabase) {
  const fallback = {
    last24h: { sent: 0, failed_transient: 0, failed_permanent: 0, failed_config: 0, total: 0 },
    last7d: { sent: 0, failed_transient: 0, failed_permanent: 0, failed_config: 0, total: 0 }
  };
  if (!supabase) return fallback;

  const now = Date.now();
  const since7d = new Date(now - 7 * 86400000).toISOString();
  const since24h = new Date(now - 86400000).toISOString();

  try {
    const { data, error } = await supabase
      .from("email_deliveries")
      .select("status, created_at")
      .gte("created_at", since7d);

    if (error || !data) return fallback;

    const buildCounts = (rows) => {
      const counts = { sent: 0, failed_transient: 0, failed_permanent: 0, failed_config: 0, total: rows.length };
      for (const r of rows) {
        if (counts[r.status] !== undefined) counts[r.status]++;
      }
      return counts;
    };

    const rows24h = data.filter((r) => r.created_at >= since24h);
    return {
      last24h: buildCounts(rows24h),
      last7d: buildCounts(data)
    };
  } catch (err) {
    console.warn("[MailQueue Health Stats Error]:", err.message);
    return fallback;
  }
}
