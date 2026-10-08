import AllocationManagementTable from "@/app/associate-allocation/components/AllocationManagementTable";
import { PageHeader } from "@/components/ui/cyberpunk";
import { Layers } from "lucide-react";

export const metadata = {
  title: "Associate Allocation | Coders Club Platform",
  description: "Manage associate allocations across events and sub-events",
};

export default function AssociateAllocationPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        moduleCode="ADM // 07"
        category="RESOURCE MANAGEMENT"
        title="Associate Allocation"
        description="Manage associate allocations across events and sub-events"
        icon={Layers}
      />
      <AllocationManagementTable />
    </main>
  );
}
