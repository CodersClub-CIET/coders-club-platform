import EventManagementTable from "@/app/event-management/components/EventManagementTable";

export const metadata = {
  title: "Event Management | Coders Club Platform",
  description: "Create and manage Coders Club events and sub-events",
};

export default function EventManagementPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-6">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                Event Management
              </span>

              <span className="text-xs text-indigo-300 font-mono">
                v1.0.0
              </span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Event Management
            </h1>

            <p className="mt-2 text-sm sm:text-base text-indigo-200 max-w-2xl">
              Create and manage events, optional sub-events, schedules,
              venues, descriptions, and event lifecycle status.
            </p>
          </div>
        </div>

        <EventManagementTable />
      </div>
    </main>
  );
}