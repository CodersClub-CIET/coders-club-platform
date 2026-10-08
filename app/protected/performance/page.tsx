import StudentPerformanceView from "@/components/performance/student-performance-view";
import { PageHeader } from "@/components/ui/cyberpunk";
import { TrendingUp } from "lucide-react";

export default function StudentPerformancePage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        moduleCode="EVAL // 05" 
        category="PERFORMANCE" 
        title="Performance Analytics" 
        description="View and analyze performance metrics across the system."
        icon={TrendingUp} 
      />
      <StudentPerformanceView />
    </div>
  );
}
