import { ToastProvider } from "@/components/providers/toast-provider";
import { TeamManagementView } from "@/components/team-management/team-management-view";
import { ManagementGuard } from "@/components/auth/management-guard";
import { PageHeader } from "@/components/ui/cyberpunk";
import { UsersRound } from "lucide-react";

export const metadata = {
  title: "Team Management | Coders Club CIET",
  description: "View teams, members, scores, and coin balances",
};

export default function TeamManagementPage() {
  return (
    <ManagementGuard>
      <ToastProvider />
      <div className="space-y-6">
        <PageHeader
          moduleCode="OPS // 03"
          category="TEAM OPERATIONS"
          title="Team Management"
          description="View club teams, their members, scores, and coin balances. Associates can update team details and enter coin transactions."
          icon={UsersRound}
        />

        <TeamManagementView />
      </div>
    </ManagementGuard>
  );
}
