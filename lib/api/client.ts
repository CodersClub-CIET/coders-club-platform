import { createClient } from "@/lib/supabase/client";
import { ApiError, type ApiErrorResponse } from "./errors";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options?.headers);

  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (session?.access_token) {
    headers.set(
      "Authorization",
      `Bearer ${session.access_token}`
    );
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse = {};

    try {
      errorData = await response.json();
    } catch {
      // Response may not contain JSON.
    }

    throw new ApiError(
      errorData.error?.message ||
        `API request failed with status ${response.status}`,
      response.status,
      errorData.error?.code,
      errorData.error?.details
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}