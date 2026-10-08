import Link from "next/link";
import { ManagementGuard } from "@/components/auth/management-guard";
import { ALLOCATION_MANAGEMENT_ROLES } from "@/lib/auth/access";
import { SlidersHorizontal } from "lucide-react";
import { PageHeader, CyberCard } from "@/components/ui/cyberpunk";

export default function ConfigurePlatformPage() {
  return (
    <ManagementGuard allowedRoles={ALLOCATION_MANAGEMENT_ROLES}>
      <div className="space-y-6">
        <PageHeader 
          moduleCode="SYS // 08" 
          category="CONFIGURATION" 
          title="Platform Configure" 
          description="Manage operational rules and system parameters."
          icon={SlidersHorizontal} 
        />

        <CyberCard className="p-6 sm:p-8 space-y-4">
          <p className="text-sm font-semibold text-[#F2B84B]">System Settings</p>
          <p className="text-sm text-[#9B9EA6]">
            Platform operational rules are enforced through database settings and Supabase authentication policies.
          </p>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF2A1A] px-4 py-2.5 text-xs font-semibold text-[#F3F1EC] hover:bg-[#C51D16] transition-colors"
          >
            Back to Dashboard
          </Link>
        </CyberCard>
      </div>
    </ManagementGuard>
  );
}
