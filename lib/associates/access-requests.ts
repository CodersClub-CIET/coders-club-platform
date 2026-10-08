import { createClient } from "@/lib/supabase/client";

export type AccessRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface AssociateAccessRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  year: number | null;
  section: string | null;
  reason: string | null;
  status: AccessRequestStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  approved_auth_user_id: string | null;
  created_at: string;
}

export interface AccessRequestInput {
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  year?: number;
  section?: string;
  reason?: string;
}

export async function submitAssociateAccessRequest(input: AccessRequestInput) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_associate_access_request", {
    p_full_name: input.fullName.trim(),
    p_email: input.email.trim().toLowerCase(),
    p_phone: input.phone?.trim() || null,
    p_department: input.department?.trim() || null,
    p_year: input.year || null,
    p_section: input.section?.trim() || null,
    p_reason: input.reason?.trim() || null,
  });
  if (error) {
    if (error.code === "PGRST202" || /schema cache|could not find the function/i.test(error.message)) {
      console.error("Associate access request RPC is not deployed or visible in PostgREST.", error);
      throw new Error("Associate access requests are temporarily unavailable. Please contact a platform administrator.");
    }
    if (/already pending|active account already exists|active associate already exists/i.test(error.message)) {
      throw new Error(error.message);
    }
    console.error("Associate access request submission failed.", error);
    throw new Error("Unable to submit your access request right now. Please try again.");
  }
  return data as AssociateAccessRequest;
}

export async function listAssociateAccessRequests() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("associate_access_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AssociateAccessRequest[];
}
