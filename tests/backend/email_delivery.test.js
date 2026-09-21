import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import {
  deliver,
  classifyError,
  verifyMailerConfig,
  transporter,
  RETRY_CONFIG
} from "../../mailer.js";
import {
  generateCorrelationId,
  isAlreadyDelivered,
  recordDeliveryAttempt,
  getDeliveryHealthStats,
  maskEmail
} from "../../lib/mailQueue.js";
import { app, supabase, processPriceDropEvents } from "../../server.js";

describe("Email Delivery Resilience, Retries & Observability (Task 14.3)", () => {
  let originalSleep;
  let originalRng;
  let originalBaseDelay;
  let originalMaxDelay;

  beforeEach(() => {
    originalSleep = RETRY_CONFIG.sleep;
    originalRng = RETRY_CONFIG.rng;
    originalBaseDelay = RETRY_CONFIG.baseDelayMs;
    originalMaxDelay = RETRY_CONFIG.maxDelayMs;

    // Default fast sleep for test execution
    RETRY_CONFIG.sleep = () => Promise.resolve();
    RETRY_CONFIG.rng = Math.random;
    RETRY_CONFIG.baseDelayMs = 10;
    RETRY_CONFIG.maxDelayMs = 100;
  });

  afterEach(() => {
    RETRY_CONFIG.sleep = originalSleep;
    RETRY_CONFIG.rng = originalRng;
    RETRY_CONFIG.baseDelayMs = originalBaseDelay;
    RETRY_CONFIG.maxDelayMs = originalMaxDelay;
    vi.restoreAllMocks();
  });

  // ============================================================================
  // MAIL-001: Transient 421 succeeds on attempt 2
  // ============================================================================
  it("MAIL-001: Transient 421 succeeds on attempt 2", async () => {
    let callCount = 0;
    vi.spyOn(transporter, "sendMail").mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        const err = new Error("421 4.7.0 Try again later");
        err.responseCode = 421;
        throw err;
      }
      return { messageId: "<msg-mail-001@brevo.com>" };
    });

    const res = await deliver(
      { to: "buyer@example.com", subject: "Price Drop" },
      { kind: "price_drop", recipient: "buyer@example.com" }
    );

    expect(res.ok).toBe(true);
    expect(res.attempts).toBe(2);
    expect(res.messageId).toBe("<msg-mail-001@brevo.com>");
    expect(callCount).toBe(2);
  });

  // ============================================================================
  // MAIL-002: Four consecutive ETIMEDOUTs exhaust retries
  // ============================================================================
  it("MAIL-002: Four consecutive ETIMEDOUTs exhaust retries", async () => {
    let callCount = 0;
    vi.spyOn(transporter, "sendMail").mockImplementation(async () => {
      callCount++;
      const err = new Error("connect ETIMEDOUT");
      err.code = "ETIMEDOUT";
      throw err;
    });

    const res = await deliver(
      { to: "buyer@example.com", subject: "Price Drop" },
      { kind: "price_drop", recipient: "buyer@example.com" }
    );

    expect(res.ok).toBe(false);
    expect(res.classification).toBe("transient");
    expect(res.attempts).toBe(4);
    expect(callCount).toBe(4);
    expect(res.error).toContain("ETIMEDOUT");
  });

  // ============================================================================
  // MAIL-003: 550 permanent failure is not retried
  // ============================================================================
  it("MAIL-003: 550 permanent failure is not retried", async () => {
    let callCount = 0;
    vi.spyOn(transporter, "sendMail").mockImplementation(async () => {
      callCount++;
      const err = new Error("550 5.1.1 User unknown");
      err.responseCode = 550;
      throw err;
    });

    const res = await deliver(
      { to: "nonexistent@example.com", subject: "Price Drop" },
      { kind: "price_drop", recipient: "nonexistent@example.com" }
    );

    expect(res.ok).toBe(false);
    expect(res.classification).toBe("permanent");
    expect(res.attempts).toBe(1);
    expect(callCount).toBe(1);
  });

  // ============================================================================
  // MAIL-004: EAUTH classifies as config and is not retried
  // ============================================================================
  it("MAIL-004: EAUTH classifies as config and is not retried", async () => {
    let callCount = 0;
    vi.spyOn(transporter, "sendMail").mockImplementation(async () => {
      callCount++;
      const err = new Error("Invalid login credentials");
      err.code = "EAUTH";
      throw err;
    });

    const res = await deliver(
      { to: "test@example.com", subject: "Welcome" },
      { kind: "welcome", recipient: "test@example.com" }
    );

    expect(res.ok).toBe(false);
    expect(res.classification).toBe("config");
    expect(res.attempts).toBe(1);
    expect(callCount).toBe(1);
  });

  // ============================================================================
  // MAIL-005: Backoff delays grow exponentially and are jittered
  // ============================================================================
  it("MAIL-005: Backoff delays grow exponentially and are jittered", async () => {
    const recordedDelays = [];
    RETRY_CONFIG.sleep = async (ms) => {
      recordedDelays.push(ms);
    };
    RETRY_CONFIG.rng = () => 0.5; // Constant 50% jitter
    RETRY_CONFIG.baseDelayMs = 1000;
    RETRY_CONFIG.maxDelayMs = 30000;

    vi.spyOn(transporter, "sendMail").mockImplementation(async () => {
      const err = new Error("421 Temporary failure");
      err.responseCode = 421;
      throw err;
    });

    await deliver(
      { to: "test@example.com", subject: "Test" },
      { kind: "price_drop", recipient: "test@example.com" }
    );

    // Exponential delays:
    // Attempt 1 -> 2: min(30000, 1000 * 2^0) * 0.5 = 500
    // Attempt 2 -> 3: min(30000, 1000 * 2^1) * 0.5 = 1000
    // Attempt 3 -> 4: min(30000, 1000 * 2^2) * 0.5 = 2000
    expect(recordedDelays).toEqual([500, 1000, 2000]);
  });

  // ============================================================================
  // Helper to construct mock Supabase state for dispatcher testing
  // ============================================================================
  function setupMockSupabase(initialData = {}) {
    const events = [...(initialData.events || [])];
    const alerts = [...(initialData.alerts || [])];
    const listings = [...(initialData.listings || [])];
    const deliveries = new Map();
    const alertUpdates = [];
    const eventUpdates = [];

    vi.spyOn(supabase, "from").mockImplementation((table) => {
      if (table === "price_drop_events") {
        return {
          select: () => ({
            is: (col, val) => ({
              order: () => ({
                limit: () =>
                  Promise.resolve({
                    data: events.filter((e) => (val === null ? e.processed_at == null : e.processed_at === val)),
                    error: null
                  })
              })
            })
          }),
          update: (payload) => ({
            eq: (col, val) => {
              eventUpdates.push({ payload, id: val });
              const ev = events.find((e) => e.id === val);
              if (ev) Object.assign(ev, payload);
              return Promise.resolve({ data: null, error: null });
            }
          })
        };
      }
      if (table === "price_alerts") {
        return {
          select: () => ({
            eq: () => ({
              in: (col, vals) =>
                Promise.resolve({
                  data: alerts.filter((a) => vals.includes(a.product_id)),
                  error: null
                })
            })
          }),
          update: (payload) => ({
            eq: (col, val) => {
              alertUpdates.push({ payload, id: val });
              const al = alerts.find((a) => a.id === val);
              if (al) Object.assign(al, payload);
              return Promise.resolve({ data: null, error: null });
            }
          })
        };
      }
      if (table === "listings") {
        return {
          select: () => ({
            in: (col, vals) =>
              Promise.resolve({
                data: listings.filter((l) => vals.includes(l.id)),
                error: null
              })
          })
        };
      }
      if (table === "wishlists") {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null })
          })
        };
      }
      if (table === "email_deliveries") {
        return {
          select: () => ({
            eq: (col, val) => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: deliveries.has(val) ? { id: 1, status: deliveries.get(val).status } : null,
                  error: null
                })
            })
          }),
          upsert: (payload) => {
            deliveries.set(payload.correlation_id, payload);
            return {
              select: () => ({
                maybeSingle: () => Promise.resolve({ data: payload, error: null })
              })
            };
          }
        };
      }
      return {
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
      };
    });

    return { events, alerts, listings, deliveries, alertUpdates, eventUpdates };
  }

  // ============================================================================
  // MAIL-006: On failure, price_alerts.status remains 'active' and count increments
  // ============================================================================
  it("MAIL-006: On failure, price_alerts.status remains active and failed_notification_count increments", async () => {
    const mock = setupMockSupabase({
      events: [
        { id: 101, listing_id: "list-1", retailer: "StarTech", old_price: 50000, new_price: 45000, processed_at: null }
      ],
      listings: [{ id: "list-1", title: "RTX 4070" }],
      alerts: [
        {
          id: "alert-1",
          product_id: "list-1",
          user_email: "user@example.com",
          user_name: "Buyer",
          target_price: 46000,
          status: "active",
          failed_notification_count: 1
        }
      ]
    });

    vi.spyOn(transporter, "sendMail").mockImplementation(async () => {
      const err = new Error("connect ETIMEDOUT");
      err.code = "ETIMEDOUT";
      throw err;
    });

    const result = await processPriceDropEvents();

    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);

    const alertUpdate = mock.alertUpdates.find((u) => u.id === "alert-1");
    expect(alertUpdate).toBeDefined();
    expect(alertUpdate.payload.status).toBe("active");
    expect(alertUpdate.payload.failed_notification_count).toBe(2);
    expect(alertUpdate.payload.last_notification_status).toBe("failed_transient");
  });

  // ============================================================================
  // MAIL-007: On transient failure, price_drop_events row is not marked processed_at
  // ============================================================================
  it("MAIL-007: On transient failure, price_drop_events row is not marked processed_at", async () => {
    const mock = setupMockSupabase({
      events: [
        { id: 201, listing_id: "list-2", retailer: "Ryans", old_price: 30000, new_price: 27000, retry_count: 0, processed_at: null }
      ],
      listings: [{ id: "list-2", title: "B650 Motherboard" }],
      alerts: [
        {
          id: "alert-2",
          product_id: "list-2",
          user_email: "user2@example.com",
          target_price: 28000,
          status: "active"
        }
      ]
    });

    vi.spyOn(transporter, "sendMail").mockImplementation(async () => {
      const err = new Error("421 Rate limited");
      err.responseCode = 421;
      throw err;
    });

    await processPriceDropEvents();

    const ev = mock.events.find((e) => e.id === 201);
    expect(ev.processed_at).toBeNull();
    expect(ev.retry_count).toBe(1);
  });

  // ============================================================================
  // MAIL-008: After MAX_EVENT_RETRIES (5) drain attempts, poison event is marked processed
  // ============================================================================
  it("MAIL-008: After MAX_EVENT_RETRIES drain attempts, poison event is marked processed", async () => {
    const mock = setupMockSupabase({
      events: [
        { id: 301, listing_id: "list-3", retailer: "TechLand", old_price: 40000, new_price: 35000, retry_count: 4, processed_at: null }
      ],
      listings: [{ id: "list-3", title: "Ryzen 7 7700" }],
      alerts: [
        {
          id: "alert-3",
          product_id: "list-3",
          user_email: "user3@example.com",
          target_price: 36000,
          status: "active"
        }
      ]
    });

    vi.spyOn(transporter, "sendMail").mockImplementation(async () => {
      const err = new Error("450 Service busy");
      err.responseCode = 450;
      throw err;
    });

    await processPriceDropEvents();

    const ev = mock.events.find((e) => e.id === 301);
    expect(ev.processed_at).not.toBeNull();
    expect(ev.retry_count).toBe(5);
  });

  // ============================================================================
  // MAIL-009: POST /api/price-alerts/process reports honest failed count
  // ============================================================================
  it("MAIL-009: POST /api/price-alerts/process reports honest failed count when send fails", async () => {
    setupMockSupabase({
      events: [
        { id: 401, listing_id: "list-4", retailer: "StarTech", old_price: 20000, new_price: 18000, processed_at: null }
      ],
      listings: [{ id: "list-4", title: "1TB NVMe SSD" }],
      alerts: [
        {
          id: "alert-4",
          product_id: "list-4",
          user_email: "user4@example.com",
          target_price: 19000,
          status: "active"
        }
      ]
    });

    vi.spyOn(transporter, "sendMail").mockImplementation(async () => {
      const err = new Error("554 Transaction failed");
      err.responseCode = 554;
      throw err;
    });

    const res = await request(app).post("/api/price-alerts/process");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.failed).toBe(1);
    expect(res.body.sent).toBe(0);
    expect(res.body.events).toBe(1);
  });

  // ============================================================================
  // MAIL-010: Running dispatcher twice over the same event sends exactly one email
  // ============================================================================
  it("MAIL-010: Running dispatcher twice over same event sends exactly one email (correlation-id dedupe)", async () => {
    const mock = setupMockSupabase({
      events: [
        { id: 501, listing_id: "list-5", retailer: "StarTech", old_price: 60000, new_price: 54000, processed_at: null }
      ],
      listings: [{ id: "list-5", title: "DDR5 32GB Kit" }],
      alerts: [
        {
          id: "alert-5",
          product_id: "list-5",
          user_email: "user5@example.com",
          target_price: 55000,
          status: "active"
        }
      ]
    });

    let sendMailInvocations = 0;
    vi.spyOn(transporter, "sendMail").mockImplementation(async () => {
      sendMailInvocations++;
      return { messageId: "<dedupe-msg-1@brevo.com>" };
    });

    // Run 1: Sends email successfully
    const run1 = await processPriceDropEvents();
    expect(run1.sent).toBe(1);
    expect(run1.skipped).toBe(0);
    expect(sendMailInvocations).toBe(1);

    // Reset processed_at to simulate re-queued or concurrent drain of the same event
    mock.events[0].processed_at = null;

    // Run 2 over same event: Dedupes via correlation-id and skips send
    const run2 = await processPriceDropEvents();
    expect(run2.sent).toBe(0);
    expect(run2.skipped).toBe(1);
    expect(sendMailInvocations).toBe(1); // Not invoked again!
  });

  // ============================================================================
  // MAIL-011: verifyMailerConfig fails loudly when EMAIL_FROM is unset
  // ============================================================================
  it("MAIL-011: verifyMailerConfig fails loudly when EMAIL_FROM is unset", async () => {
    const originalEmailFrom = process.env.EMAIL_FROM;
    delete process.env.EMAIL_FROM;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const verified = await verifyMailerConfig();
      expect(verified).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
      const warningMessage = warnSpy.mock.calls[0][0];
      expect(warningMessage).toContain("EMAIL_FROM");
    } finally {
      if (originalEmailFrom !== undefined) {
        process.env.EMAIL_FROM = originalEmailFrom;
      }
    }
  });

  // ============================================================================
  // Utility & API Endpoint Verification
  // ============================================================================
  it("UTILITY: generateCorrelationId creates consistent 32-char hex hashes", () => {
    const id1 = generateCorrelationId({ kind: "price_drop", recipient: "User@Example.com", eventId: 12, alertId: "a-1" });
    const id2 = generateCorrelationId({ kind: "price_drop", recipient: "user@example.com", eventId: 12, alertId: "a-1" });
    expect(id1).toBe(id2);
    expect(id1).toHaveLength(32);
    expect(/^[a-f0-9]{32}$/.test(id1)).toBe(true);
  });

  it("UTILITY: maskEmail masks local part for safe logging", () => {
    expect(maskEmail("arkosaha61005@gmail.com")).toBe("a***5@gmail.com");
    expect(maskEmail("ab@test.com")).toBe("a***@test.com");
    expect(maskEmail("")).toBe("[empty-email]");
  });

  it("API: GET /api/price-alerts/delivery-health returns health stats structure", async () => {
    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({
        gte: () =>
          Promise.resolve({
            data: [
              { status: "sent", created_at: new Date().toISOString() },
              { status: "failed_transient", created_at: new Date().toISOString() }
            ],
            error: null
          })
      })
    });

    const res = await request(app).get("/api/price-alerts/delivery-health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.last24h.sent).toBe(1);
    expect(res.body.stats.last24h.failed_transient).toBe(1);
  });
});
