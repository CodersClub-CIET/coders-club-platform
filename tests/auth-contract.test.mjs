import "./typescript-register.mjs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const { resolveAuthState, createAuthStore, INITIAL_AUTH_STATE } = await import("../lib/auth/session.ts");
const { getManagementAccess, ALLOCATION_MANAGEMENT_ROLES, canOperateQR } = await import("../lib/auth/access.ts");
const { validateSupabaseConfiguration, SupabaseConfigurationError } = await import("../lib/supabase/config.ts");

// Explicit unit-test fixtures only; no production implementation or live project.
const identity = (extra = {}) => ({ id: "identity-1", email: "user@example.test", user_metadata: {}, ...extra });
const profile = (extra = {}) => ({ id: "identity-1", role: "associate", is_active: true, display_name: "Profile name", email: "profile@example.test", ...extra });
function source(user = identity(), record = profile(), lookupError = false) {
  let callback = () => {};
  let unsubscribed = 0;
  let subscriptions = 0;
  return {
    getUser: async () => ({ user, error: null }),
    getProfile: async (id) => { assert.equal(id, user.id); return { profile: record, error: lookupError }; },
    onChange(fn) { subscriptions++; callback = fn; return () => { unsubscribed++; }; },
    emit(next, event) { callback(next, event); },
    get subscriptions() { return subscriptions; },
    get unsubscribed() { return unsubscribed; },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe("profile-authoritative authorization", () => {
  it("signed out has no identity or Associate fallback", async () => {
    const s = await resolveAuthState(source(null, null));
    assert.equal(s.user, null); assert.equal(s.role, null); assert.equal(s.isAuthenticated, false); assert.equal(getManagementAccess(s), "sign-in");
  });
  it("authenticated identity with no profile cannot enter management", async () => {
    const s = await resolveAuthState(source(identity(), null));
    assert.equal(s.isAuthenticated, true); assert.equal(s.status, "missing-profile"); assert.equal(s.isAuthorized, false); assert.equal(getManagementAccess(s), "denied");
  });
  it("inactive Admin remains unauthorized", async () => {
    const s = await resolveAuthState(source(identity(), profile({ role: "admin", is_active: false })));
    assert.equal(s.status, "inactive-profile"); assert.equal(s.role, null); assert.equal(getManagementAccess(s), "denied");
  });
  for (const role of ["associate", "admin"]) {
    it(`active ${role} is resolved from its matching profile`, async () => {
      const s = await resolveAuthState(source(identity(), profile({ role })));
      assert.equal(s.isAuthorized, true); assert.equal(s.role, role); assert.equal(s.profile.displayName, "Profile name"); assert.equal(getManagementAccess(s), "allowed");
    });
  }
  it("metadata claiming Admin cannot elevate an Associate profile", async () => {
    const s = await resolveAuthState(source(identity({ user_metadata: { role: "admin" } })));
    assert.equal(s.role, "associate");
  });
  it("admin-named email cannot elevate an Associate profile", async () => {
    const s = await resolveAuthState(source(identity({ email: "admin@example.test" })));
    assert.equal(s.role, "associate");
  });
  it("profile lookup error preserves identity but never grants a role", async () => {
    const s = await resolveAuthState(source(identity(), profile({ role: "admin" }), true));
    assert.equal(s.isAuthenticated, true); assert.equal(s.role, null); assert.equal(s.status, "profile-error"); assert.equal(getManagementAccess(s), "error");
  });
  it("mismatched profile ID and malformed active flag fail closed", async () => {
    for (const record of [profile({ id: "other-account" }), profile({ is_active: "true" })]) {
      const s = await resolveAuthState(source(identity(), record)); assert.equal(s.isAuthorized, false); assert.equal(s.status, "profile-error");
    }
  });
  it("unknown profile role never defaults to Associate", async () => {
    const s = await resolveAuthState(source(identity(), profile({ role: "owner" })));
    assert.equal(s.status, "unsupported-role"); assert.equal(s.role, null);
  });
  it("session verification errors never trigger a profile-based grant", async () => {
    const f = source(); f.getUser = async () => ({ user: identity(), error: { name: "AuthApiError" } });
    const s = await resolveAuthState(f); assert.equal(s.status, "session-error"); assert.equal(s.isAuthorized, false);
  });
  it("allocation screen and QR operator modes respect verified role rules", async () => {
    const associate = await resolveAuthState(source()); const admin = await resolveAuthState(source(identity(), profile({ role: "admin" })));
    assert.equal(getManagementAccess(associate, ALLOCATION_MANAGEMENT_ROLES), "denied"); assert.equal(getManagementAccess(admin, ALLOCATION_MANAGEMENT_ROLES), "allowed");
    assert.equal(canOperateQR("associate", "student"), true); assert.equal(canOperateQR("associate", "associate"), false); assert.equal(canOperateQR("admin", "associate"), true); assert.equal(canOperateQR(null, "student"), false);
  });
});

describe("auth loading, cancellation and subscription lifecycle", () => {
  it("starts loading with a stable signed-out SSR snapshot", async () => {
    const f = source(); let complete; f.getUser = () => new Promise((resolve) => { complete = resolve; });
    const store = createAuthStore(() => f); const cleanup = store.subscribe(() => {});
    assert.equal(store.getSnapshot().loading, true); assert.equal(getManagementAccess(store.getSnapshot()), "loading"); assert.equal(store.getServerSnapshot(), INITIAL_AUTH_STATE);
    complete({ user: identity(), error: null }); await settle(); assert.equal(store.getSnapshot().role, "associate"); cleanup();
  });
  it("manual refresh without mounted consumers never leaks an auth subscription", async () => {
    const f = source(); const store = createAuthStore(() => f); await store.refresh();
    assert.equal(f.subscriptions, 0); assert.equal(store.getSnapshot(), INITIAL_AUTH_STATE);
  });
  it("shares one auth subscription and cleans up the final listener", async () => {
    const f = source(); const store = createAuthStore(() => f);
    const a = store.subscribe(() => {}); const b = store.subscribe(() => {}); await settle();
    assert.equal(f.subscriptions, 1); a(); assert.equal(f.unsubscribed, 0); b(); assert.equal(f.unsubscribed, 1); assert.equal(store.getSnapshot(), INITIAL_AUTH_STATE);
  });
  it("does not publish an async profile result after unmount", async () => {
    const f = source(); let complete; f.getProfile = () => new Promise((resolve) => { complete = resolve; });
    const store = createAuthStore(() => f); let notifications = 0; const cleanup = store.subscribe(() => { notifications++; }); await settle(); cleanup(); const count = notifications;
    complete({ profile: profile(), error: false }); await settle(); assert.equal(notifications, count); assert.equal(store.getSnapshot(), INITIAL_AUTH_STATE);
  });
  it("signed-out events immediately revoke stale profile requests", async () => {
    const f = source(); let complete; f.getProfile = () => new Promise((resolve) => { complete = resolve; });
    const store = createAuthStore(() => f); const cleanup = store.subscribe(() => {}); await settle(); f.emit(null);
    complete({ profile: profile({ role: "admin" }), error: false }); await settle(); assert.equal(store.getSnapshot().status, "signed-out"); assert.equal(store.getSnapshot().role, null); cleanup();
  });
  it("old subscription callbacks cannot replace a newly mounted account state", async () => {
    const old = source(); const current = source(identity({ id: "identity-2" }), profile({ id: "identity-2", role: "admin" })); let calls = 0;
    const store = createAuthStore(() => calls++ ? current : old); const a = store.subscribe(() => {}); await settle(); a(); const b = store.subscribe(() => {}); await settle(); old.emit(null);
    assert.equal(store.getSnapshot().user.id, "identity-2"); assert.equal(store.getSnapshot().role, "admin"); b();
  });
  it("auth-event refresh is deferred outside the synchronous auth callback", async () => {
    const f = source(); let reads = 0; f.getUser = async () => { reads++; return { user: identity(), error: null }; };
    const store = createAuthStore(() => f); const cleanup = store.subscribe(() => {}); await settle(); const before = reads; f.emit(identity()); assert.equal(reads, before); assert.equal(store.getSnapshot().loading, true); await settle(); assert.equal(reads, before + 1); cleanup();
  });
  it("same-account token/focus events recheck the profile without resetting live UI", async () => {
    const f = source(); let lookupError = false;
    f.getProfile = async () => ({ profile: profile(), error: lookupError });
    const store = createAuthStore(() => f); const cleanup = store.subscribe(() => {}); await settle();
    for (const event of ["TOKEN_REFRESHED", "SIGNED_IN"]) {
      f.emit(identity(), event); assert.equal(store.getSnapshot().loading, false); await settle(); assert.equal(store.getSnapshot().role, "associate");
    }
    lookupError = true; f.emit(identity(), "TOKEN_REFRESHED"); await settle(); assert.equal(store.getSnapshot().isAuthorized, false); assert.equal(store.getSnapshot().status, "profile-error"); cleanup();
  });
  it("initialization errors and retry never become privileged or stuck loading", async () => {
    const store = createAuthStore(() => { throw new SupabaseConfigurationError("Missing configuration"); }); const cleanup = store.subscribe(() => {}); await settle();
    assert.equal(store.getSnapshot().status, "configuration-error"); await store.refresh(); assert.equal(store.getSnapshot().loading, false); assert.equal(store.getSnapshot().isAuthorized, false); cleanup();
  });
});

describe("configuration and route boundaries", () => {
  it("missing, placeholder, private keys and invalid URLs fail clearly", () => {
    for (const [url, key] of [[undefined, undefined], ["bad-url", "sb_publishable_test"], ["https://placeholder.invalid", "sb_publishable_test"], ["https://project.supabase.co", "sb_secret_test"], ["http://remote.invalid", "sb_publishable_test"]]) assert.throws(() => validateSupabaseConfiguration(url, key), SupabaseConfigurationError);
  });
  it("accepts explicit public and localhost development configuration", () => {
    assert.equal(validateSupabaseConfiguration("https://project.supabase.co", "sb_publishable_test").url, "https://project.supabase.co");
    assert.equal(validateSupabaseConfiguration("http://localhost:54321", "sb_publishable_test").url, "http://localhost:54321");
  });
  it("legacy anon keys are accepted but service-role JWTs are not", () => {
    const key = (role) => `e30.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
    assert.throws(() => validateSupabaseConfiguration("https://project.supabase.co", key("service_role")), SupabaseConfigurationError);
    assert.equal(validateSupabaseConfiguration("https://project.supabase.co", key("anon")).key, key("anon"));
  });
  it("student scanning remains outside management guards", () => {
    for (const route of ["attendance", "dynamic-qr"]) {
      assert.equal(fs.existsSync(`app/${route}/layout.tsx`), false);
      assert.ok(!fs.readFileSync(`app/${route}/scan/page.tsx`, "utf8").includes("<ManagementGuard"));
    }
    for (const route of ["event-management", "associate-allocation", "scores", "reports", "team-management"]) assert.ok(fs.readFileSync(`app/${route}/layout.tsx`, "utf8").includes("ManagementGuard"));
    assert.ok(fs.readFileSync("app/attendance/page.tsx", "utf8").includes("<ManagementGuard")); assert.ok(fs.readFileSync("app/dynamic-qr/page.tsx", "utf8").includes("<ManagementGuard"));
  });
});
