import AssociateManagementTable from "./components/AssociateManagementTable";
import { ManagementGuard } from "@/components/auth/management-guard";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/ui/cyberpunk";

export const metadata = {
  title: "Associate Management | Coders Club CIET",
  description: "View and manage Coders Club associates, contact profiles, and allocation eligibility",
};

export default function AssociateManagementPage() {
  return (
    <ManagementGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          moduleCode="ADM // 05"
          category="PERSONNEL"
          title="Associate Management"
          description="View and manage Coders Club associates, contact profiles, and allocation eligibility"
          icon={Users}
        />
        <AssociateManagementTable />
      </div>
    </ManagementGuard>
  );
}
