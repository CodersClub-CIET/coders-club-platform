import { PageHeader } from "@/components/ui/cyberpunk";
import { CalendarDays } from "lucide-react";
import EventManagementTable from "@/app/event-management/components/EventManagementTable";

export const metadata = { title: "Event Management | Coders Club" };

export default function EventManagementPage() {
  return (
    <main className="space-y-6">
      <PageHeader 
        moduleCode="OPS // 02" 
        category="EVENT OPERATIONS" 
        title="Event Management" 
        description="Manage institutional events, rounds, sub-event hierarchies, schedules, venues, and operational lifecycle states." 
        icon={CalendarDays} 
      />
      <EventManagementTable />
    </main>
  );
}