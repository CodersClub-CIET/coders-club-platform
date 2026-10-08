import type {
  CreatorRole, CreateSessionRequest, CreateSessionResponse, QRAttendanceSession,
  QRAttendanceRecord, RefreshChallengeResponse, EndSessionResponse,
  ScanContext, ConsumeChallengeRequest, ConsumeChallengeResponse, EventOption,
} from "./types";
export class QRHttpError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export interface Principal { id: string; role: CreatorRole }
export interface QRRepository {
  events(p: Principal): Promise<EventOption[]>;
  list(p: Principal): Promise<QRAttendanceSession[]>;
  get(p: Principal, id: string, mutation?: boolean): Promise<QRAttendanceSession>;
  create(p: Principal, input: CreateSessionRequest): Promise<CreateSessionResponse>;
  rotate(p: Principal, id: string, expected: string, validity: number): Promise<RefreshChallengeResponse>;
  end(p: Principal, id: string): Promise<EndSessionResponse>;
  records(p: Principal, id: string): Promise<QRAttendanceRecord[]>;
  context(id: string, token: string): Promise<ScanContext>;
  consume(input: ConsumeChallengeRequest): Promise<ConsumeChallengeResponse>;
}
export interface QRDependencies { authorize(): Promise<Principal>; repository: QRRepository }
export type QROperation = "events" | "list" | "create" | "get" | "refresh" | "end" | "records" | "context" | "consume";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new QRHttpError(400, "A valid UUID is required.");
  return value.toLowerCase();
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new QRHttpError(400, "A JSON object is required.");
  return value as Record<string, unknown>;
}
function keys(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new QRHttpError(400, "Unexpected request fields.");
}
function text(value: unknown, max: number, min = 1) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new QRHttpError(400, "Invalid request field.");
  return value.trim();
}
function validity(value: unknown) {
  if (value === undefined) return 30;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 300) throw new QRHttpError(400, "Validity must be between 1 and 300 seconds.");
  return value;
}
async function json(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new QRHttpError(400, "JSON input is required.");
  const reader = request.body?.getReader();
  if (!reader) throw new QRHttpError(400, "JSON input is required.");
  const parts: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new QRHttpError(400, "Request body is too large."); }
      parts.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    return object(JSON.parse(new TextDecoder().decode(bytes)) as unknown);
  } catch (error) {
    if (error instanceof QRHttpError) throw error;
    throw new QRHttpError(400, "Malformed JSON input.");
  } finally { reader.releaseLock(); }
}
function reply(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"}});
}
/** Actual HTTP boundary shared by all route exports; dependencies are injected in tests only. */
export async function handleQR(request: Request, operation: QROperation, deps: QRDependencies, id?: string) {
  try {
    const publicOperation = operation === "consume" || operation === "context";
    const p = publicOperation ? null : await deps.authorize();
    const expectedMethod = ["events", "list", "get", "records"].includes(operation) ? "GET" : "POST";
    if (request.method !== expectedMethod) return reply({message: "Method not allowed."}, 405);
    if (!publicOperation && request.method === "POST") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin) throw new QRHttpError(403, "Cross-origin management requests are not permitted.");
    }
    if (operation === "context") {
      const body = await json(request); keys(body, ["session_id", "challenge_token"]);
      return reply(await deps.repository.context(uuid(body.session_id), text(body.challenge_token, 256, 16)));
    }
    if (operation === "consume") {
      const body = await json(request); keys(body, ["challenge_token", "register_number", "device_hash"]);
      const result = await deps.repository.consume({challenge_token: text(body.challenge_token, 256, 16),
        register_number: text(body.register_number, 128),
        device_hash: body.device_hash === undefined ? undefined : text(body.device_hash, 256)});
      const codes: Record<string, number> = {INVALID_CHALLENGE:400, INVALID_STUDENT:400,
        CHALLENGE_NOT_FOUND:404, CHALLENGE_EXPIRED:409, SESSION_NOT_ACTIVE:409,
        STUDENT_NOT_FOUND:403, STUDENT_NOT_ELIGIBLE:403, ALREADY_ATTENDED:409};
      return reply(result, result.success ? 200 : codes[result.code ?? ""] ?? 500);
    }
    if (!p) throw new QRHttpError(401, "Sign in is required.");
    switch (operation) {
      case "events": return reply({events: await deps.repository.events(p)});
      case "list": return reply({sessions: await deps.repository.list(p)});
      case "create": {
        const body = await json(request); keys(body, ["event_node_id", "attendance_context", "target_role", "validity_seconds"]);
        if (body.attendance_context !== "morning" && body.attendance_context !== "afternoon") throw new QRHttpError(400, "Choose morning or afternoon.");
        if (body.target_role !== "student" && body.target_role !== "associate") throw new QRHttpError(400, "Invalid attendance target.");
        if (p.role === "associate" && body.target_role !== "student") throw new QRHttpError(403, "Associates may manage student attendance only.");
        return reply(await deps.repository.create(p, {event_node_id: uuid(body.event_node_id),
          attendance_context: body.attendance_context, target_role: body.target_role, validity_seconds: validity(body.validity_seconds)}), 201);
      }
      case "get": return reply({session: await deps.repository.get(p, uuid(id))});
      case "records": return reply({records: await deps.repository.records(p, uuid(id))});
      case "refresh": {
        const body = await json(request); keys(body, ["expected_challenge_id", "validity_seconds"]);
        return reply(await deps.repository.rotate(p, uuid(id), uuid(body.expected_challenge_id), validity(body.validity_seconds)));
      }
      case "end": {
        if (request.body) { const body = await json(request); keys(body, []); }
        return reply(await deps.repository.end(p, uuid(id)));
      }
    }
  } catch (error) {
    const status = error instanceof QRHttpError ? error.status : 500;
    return reply({success: false, message: error instanceof QRHttpError ? error.message : "Unable to complete this request."}, status);
  }
}
export function databaseError(error: {code?: string; message?: string; details?: string; hint?: string} | null) {
  if (!error) return;
  console.error("[dynamic-qr] Database error:", error.code, error.message, error.details, error.hint);
  const statuses: Record<string, number> = {"42501":403, "22023":400, P0001:409, P0002:404, "23505":409};
  const status = statuses[error.code ?? ""] ?? 500;
  const messages: Record<number, string> = {400:"Invalid request.",403:"Permission denied.",404:"Resource not found or inaccessible.",409:"State changed. Reload before retrying.",500:"Database operation unavailable."};
  throw new QRHttpError(status, messages[status]);
}
