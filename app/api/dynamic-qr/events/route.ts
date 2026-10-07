import { handleQR } from "@/lib/dynamic-qr/http";
import { qrDependencies } from "@/lib/dynamic-qr/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handleQR(request, "events", qrDependencies(request));
}
