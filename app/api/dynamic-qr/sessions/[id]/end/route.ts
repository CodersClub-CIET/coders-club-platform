import { handleQR } from "@/lib/dynamic-qr/http";
import { qrDependencies } from "@/lib/dynamic-qr/server";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: {params: Promise<{id:string}>}) {
  return handleQR(request, "end", qrDependencies(request), (await context.params).id);
}
