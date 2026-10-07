import { handleQR } from "@/lib/dynamic-qr/http";
import { qrDependencies } from "@/lib/dynamic-qr/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: {params: Promise<{id:string}>}) {
  return handleQR(request, "get", qrDependencies(request), (await context.params).id);
}
