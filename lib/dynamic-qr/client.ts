import type { CreateSessionRequest, CreateSessionResponse, QRAttendanceSession, RefreshChallengeResponse,
  EndSessionResponse, QRAttendanceRecord, ConsumeChallengeRequest, ConsumeChallengeResponse, ScanContext, EventOption } from "./types";
export class QRApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
async function callApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/dynamic-qr${endpoint}`, {...options, headers, cache:"no-store", referrerPolicy:"no-referrer", credentials:options?.credentials ?? "same-origin"});
  const value: unknown = await response.json();
  if (!response.ok) {
    const message = value && typeof value === "object" && "message" in value && typeof value.message === "string" ? value.message : "Unable to complete this request.";
    throw new QRApiError(message, response.status);
  }
  return value as T;
}
export const createAttendanceSession = (input: CreateSessionRequest) => callApi<CreateSessionResponse>("/sessions", {method:"POST", body:JSON.stringify(input)});
export async function getAttendanceSession(id: string) { return (await callApi<{session:QRAttendanceSession}>(`/sessions/${encodeURIComponent(id)}`)).session; }
export async function listAttendanceSessions() { return (await callApi<{sessions:QRAttendanceSession[]}>("/sessions")).sessions; }
export async function getQREvents() { return (await callApi<{events:EventOption[]}>("/events")).events; }
export const refreshAttendanceChallenge = (id: string, expected: string, validity: number) => callApi<RefreshChallengeResponse>(`/sessions/${encodeURIComponent(id)}/refresh`, {
  method:"POST", body:JSON.stringify({expected_challenge_id:expected, validity_seconds:validity}),
});
export const endAttendanceSession = (id: string) => callApi<EndSessionResponse>(`/sessions/${encodeURIComponent(id)}/end`, {method:"POST"});
export async function getSessionRecords(id: string) { return (await callApi<{records:QRAttendanceRecord[]}>(`/sessions/${encodeURIComponent(id)}/records`)).records; }
export const getScannerContext = (id: string, token: string) => callApi<ScanContext>("/context", {method:"POST", credentials:"omit", body:JSON.stringify({session_id:id, challenge_token:token})});
export async function consumeAttendanceChallenge(input: ConsumeChallengeRequest): Promise<ConsumeChallengeResponse> {
  // Consumption failures are displayable business results, not fabricated successes.
  const response = await fetch("/api/dynamic-qr/consume", {method:"POST", credentials:"omit", referrerPolicy:"no-referrer", cache:"no-store",
    headers:{"Content-Type":"application/json"}, body:JSON.stringify(input)});
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || !("success" in value) || typeof value.success !== "boolean" || !("message" in value) || typeof value.message !== "string") throw new QRApiError("Unable to verify attendance.", response.status);
  if (response.ok && !value.success) throw new QRApiError("Unable to verify attendance.", response.status);
  return {success:value.success, message:value.message,
    code:"code" in value && typeof value.code === "string" ? value.code : undefined,
    attendance_record_id:"attendance_record_id" in value && typeof value.attendance_record_id === "string" ? value.attendance_record_id : undefined};
}
