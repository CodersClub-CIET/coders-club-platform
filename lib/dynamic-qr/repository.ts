import type { SupabaseClient } from "@supabase/supabase-js";
import { QRHttpError, databaseError, type Principal, type QRRepository } from "./http";
import type { QRAttendanceSession, QRChallenge, CreateSessionRequest, QRAttendanceRecord, ScanContext } from "./types";
const SESSION_COLUMNS = "id,event_node_id,attendance_context,target_role,creator_role,created_by,status,attendance_count,started_at,ended_at,created_at,updated_at,metadata";
const CHALLENGE_COLUMNS = "id,session_id,challenge_token,status,issued_at,expires_at,consumed_at";
function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new QRHttpError(500, "Unexpected database response.");
  return value as Record<string, unknown>;
}
function rows(value: unknown) {
  if (!Array.isArray(value)) throw new QRHttpError(500, "Unexpected database response.");
  return value.map(row);
}
function str(value: unknown): string {
  if (typeof value !== "string") throw new QRHttpError(500, "Unexpected database response.");
  return value;
}
function nullable(value: unknown): string | null { return value == null ? null : str(value); }
function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new QRHttpError(500, "Unexpected database response.");
  return value;
}
function choice<T extends string>(value: unknown, allowed: readonly T[]): T {
  for (const candidate of allowed) if (value === candidate) return candidate;
  throw new QRHttpError(500, "Unexpected database response.");
}
function challenge(value: unknown): QRChallenge {
  const q = row(value);
  return {id: str(q.id), session_id: str(q.session_id), challenge_token: str(q.challenge_token),
    status: choice(q.status, ["active", "expired", "consumed", "revoked"]),
    issued_at: str(q.issued_at), expires_at: str(q.expires_at), consumed_at: nullable(q.consumed_at)};
}
function session(value: unknown, name: string, latest?: QRChallenge): QRAttendanceSession {
  const s = row(value); const meta = s.metadata;
  let validity = 30;
  if (meta && typeof meta === "object" && !Array.isArray(meta) && "dynamic_qr" in meta) {
    const config = meta.dynamic_qr;
    if (config && typeof config === "object" && "validity_seconds" in config &&
        typeof config.validity_seconds === "number" && Number.isInteger(config.validity_seconds) &&
        config.validity_seconds >= 1 && config.validity_seconds <= 300) validity = config.validity_seconds;
  }
  const status = choice(s.status, ["active", "ended", "cancelled"]);
  return {id: str(s.id), event_node_id: str(s.event_node_id), event_name: name,
    attendance_context: choice(s.attendance_context, ["morning", "afternoon"]),
    target_role: choice(s.target_role, ["student", "associate"]), creator_role: choice(s.creator_role, ["admin", "associate"]),
    created_by: str(s.created_by), status, started_at: str(s.started_at), ended_at: nullable(s.ended_at),
    attendance_count: number(s.attendance_count), created_at: str(s.created_at), updated_at: str(s.updated_at),
    validity_seconds: validity, latest_challenge_id: latest?.id ?? null,
    current_challenge: status === "active" && latest?.status === "active" && Date.parse(latest.expires_at) > Date.now() ? latest : undefined};
}
function remaining(q: QRChallenge) { return Math.max(0, Math.ceil((Date.parse(q.expires_at) - Date.now()) / 1000)); }

/** All queries use the caller's client/RLS; public RPCs use an isolated anon client. */
export class SupabaseQRRepository implements QRRepository {
  constructor(private readonly caller: () => Promise<SupabaseClient>, private readonly anonymous: () => SupabaseClient) {}
  private async allocations(p: Principal): Promise<string[] | null> {
    if (p.role === "admin") return null;
    const db = await this.caller();
    const a = await db.from("associates").select("id").eq("auth_user_id", p.id).eq("is_active", true).maybeSingle();
    databaseError(a.error);
    if (!a.data) throw new QRHttpError(403, "Active Associate access is required.");
    const allocations = await db.from("associate_allocations").select("event_node_id")
      .eq("associate_id", str(row(a.data).id)).eq("is_active", true).eq("attendance_access", true);
    databaseError(allocations.error);
    return rows(allocations.data).map(r => str(r.event_node_id));
  }
  private async scope(p: Principal, eventId: string) {
    const ids = await this.allocations(p);
    if (ids !== null && !ids.includes(eventId)) throw new QRHttpError(404, "Resource not found or inaccessible.");
  }
  async events(p: Principal) {
    const ids = await this.allocations(p); if (ids?.length === 0) return [];
    const db = await this.caller(); let query = db.from("event_nodes").select("id,name").eq("is_active", true).order("name").limit(100);
    if (ids) query = query.in("id", ids);
    const result = await query; databaseError(result.error);
    return rows(result.data).map(r => ({id: str(r.id), name: str(r.name)}));
  }
  private async eventName(id: string) {
    const db = await this.caller(); const result = await db.from("event_nodes").select("name").eq("id", id).maybeSingle();
    databaseError(result.error); return result.data ? str(row(result.data).name) : "Event information unavailable";
  }
  async list(p: Principal) {
    const ids = await this.allocations(p); if (ids?.length === 0) return [];
    const db = await this.caller(); let query = db.from("attendance_sessions").select(SESSION_COLUMNS).order("started_at", {ascending: false}).limit(100);
    if (ids) query = query.in("event_node_id", ids);
    const result = await query; databaseError(result.error); const data = rows(result.data);
    if (!data.length) return [];
    const names = await db.from("event_nodes").select("id,name").in("id", [...new Set(data.map(s => str(s.event_node_id)))]);
    databaseError(names.error); const nameById = new Map(rows(names.data).map(r => [str(r.id), str(r.name)]));
    // Latest identity is loaded when a session is selected; list exposes only active challenges.
    const qs = await db.from("qr_challenges").select(CHALLENGE_COLUMNS).in("session_id", data.map(s => str(s.id)))
      .eq("status", "active").order("issued_at", {ascending: false}).order("id", {ascending: false}).limit(500);
    databaseError(qs.error); const active = rows(qs.data).map(challenge);
    return data.map(s => session(s, nameById.get(str(s.event_node_id)) ?? "Event information unavailable", active.find(q => q.session_id === s.id)));
  }
  async get(p: Principal, id: string, mutation = false) {
    const db = await this.caller(); const result = await db.from("attendance_sessions").select(SESSION_COLUMNS).eq("id", id).maybeSingle();
    databaseError(result.error); if (!result.data) throw new QRHttpError(404, "Resource not found or inaccessible.");
    const s = row(result.data); await this.scope(p, str(s.event_node_id));
    if (mutation && p.role === "associate" && (s.created_by !== p.id || s.creator_role !== "associate" || s.target_role !== "student")) throw new QRHttpError(404, "Resource not found or inaccessible.");
    const q = await db.from("qr_challenges").select(CHALLENGE_COLUMNS).eq("session_id", id)
      .order("issued_at", {ascending: false}).order("id", {ascending: false}).limit(1);
    databaseError(q.error); const latest = rows(q.data)[0];
    return session(s, await this.eventName(str(s.event_node_id)), latest ? challenge(latest) : undefined);
  }
  async create(p: Principal, input: CreateSessionRequest) {
    if (p.role === "associate" && input.target_role !== "student") throw new QRHttpError(403, "Associates may manage student attendance only.");
    await this.scope(p, input.event_node_id); const name = await this.eventName(input.event_node_id); const db = await this.caller();
    const result = await db.rpc("qr_create_session", {p_event_node_id: input.event_node_id, p_attendance_context: input.attendance_context,
      p_target_role: input.target_role, p_validity_seconds: input.validity_seconds ?? 30});
    databaseError(result.error); const data = row(result.data); const q = challenge(data.challenge);
    return {session: session(data.session, name, q), challenge: q};
  }
  async rotate(p: Principal, id: string, expected: string, validity: number) {
    await this.get(p, id, true); const db = await this.caller();
    const result = await db.rpc("qr_rotate_challenge", {p_session_id: id, p_expected_challenge_id: expected, p_validity_seconds: validity});
    databaseError(result.error); const data = row(result.data); const q = challenge(data.challenge);
    return {session_id: str(data.session_id), challenge: q, remaining_seconds: remaining(q)};
  }
  async end(p: Principal, id: string) {
    await this.get(p, id, true); const db = await this.caller(); const result = await db.rpc("qr_end_session", {p_session_id: id});
    databaseError(result.error); const data = row(result.data);
    return {session_id: str(data.session_id), status: choice(data.status, ["ended"]), ended_at: str(data.ended_at)};
  }
  async records(p: Principal, id: string): Promise<QRAttendanceRecord[]> {
    await this.get(p, id); const db = await this.caller();
    const result = await db.from("attendance_records").select("id,session_id,challenge_id,event_node_id,attendance_type,student_id,associate_id,marked_at,status,verified_by_server,students!attendance_records_student_id_fkey(name,register_number),associates!attendance_records_associate_id_fkey(name)")
      .eq("session_id", id).order("marked_at", {ascending: false}).limit(500);
    databaseError(result.error);
    return rows(result.data).map(r => ({id:str(r.id), session_id:str(r.session_id), challenge_id:nullable(r.challenge_id),
      event_node_id:str(r.event_node_id), attendance_type:choice(r.attendance_type, ["student", "associate"]), student_id:nullable(r.student_id),
      associate_id:nullable(r.associate_id), marked_at:str(r.marked_at), status:choice(r.status, ["present", "invalid", "rejected"]), verified_by_server:r.verified_by_server === true,
      student_name:r.students ? nullable(row(r.students).name) : null, student_reg_number:r.students ? nullable(row(r.students).register_number) : null,
      associate_name:r.associates ? nullable(row(r.associates).name) : null}));
  }
  async context(id: string, token: string): Promise<ScanContext> {
    const result = await this.anonymous().rpc("qr_scan_context", {p_session_id: id, p_challenge_token: token});
    databaseError(result.error); const data = row(result.data);
    if (data.success !== true) throw new QRHttpError(404, "This QR code is invalid or no longer active.");
    // Explicit allowlist: never forward raw RPC JSON to the public response.
    return {success:true, session_id:str(data.session_id), event_name:str(data.event_name),
      attendance_context:choice(data.attendance_context, ["morning", "afternoon"]), target_role:choice(data.target_role, ["student", "associate"]), expires_at:str(data.expires_at)};
  }
  async consume(input: {challenge_token:string; register_number:string; device_hash?:string}) {
    const result = await this.anonymous().rpc("consume_student_attendance", {p_challenge_token:input.challenge_token,
      p_register_number:input.register_number, p_device_hash:input.device_hash ?? null});
    databaseError(result.error); const data = row(result.data);
    const messages: Record<string,string> = {ATTENDANCE_MARKED:"Attendance recorded.", INVALID_CHALLENGE:"Invalid QR code.",
      INVALID_STUDENT:"Enter your register number.", CHALLENGE_NOT_FOUND:"Invalid QR code.", CHALLENGE_EXPIRED:"This QR code is no longer active. Rescan the displayed QR.",
      SESSION_NOT_ACTIVE:"This attendance session is not active.", STUDENT_NOT_FOUND:"Student verification failed.",
      STUDENT_NOT_ELIGIBLE:"Student verification failed.", ALREADY_ATTENDED:"Attendance has already been recorded."};
    const code = str(data.code);
    if (!messages[code] || typeof data.success !== "boolean" || (data.success && code !== "ATTENDANCE_MARKED")) throw new QRHttpError(500, "Unexpected database response.");
    return {success:data.success, code, message:messages[code], attendance_record_id:data.success ? str(data.attendance_record_id) : undefined};
  }
}
