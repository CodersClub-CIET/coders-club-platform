import React from "react";
import ScoreManagementTable from "@/app/scores/components/ScoreManagementTable";
import { ManagementGuard } from "@/components/auth/management-guard";
import { PageHeader } from "@/components/ui/cyberpunk";
import { BarChart3 } from "lucide-react";

export const metadata = {
  title: "Scores | Coders Club CIET",
  description: "Manage and validate student event performance scores",
};

export default function ScoreManagementPage() {
  return (
    <ManagementGuard>
      <div className="space-y-6">
        <PageHeader 
          moduleCode="EVAL // 04" 
          category="EVALUATION" 
          title="Score Management" 
          description="View and update student event performance scores. Supports inline editing and real-time sync." 
          icon={BarChart3} 
        />
        <ScoreManagementTable />
      </div>
    </ManagementGuard>
  );
}
