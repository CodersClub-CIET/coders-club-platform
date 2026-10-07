import AssociateManagementTable from "./components/AssociateManagementTable";

export const metadata = {
  title: "Associate Management | Coders Club Platform",
  description: "View and manage Coders Club associates, contact profiles, and allocation eligibility",
};

export default function AssociateManagementPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-6">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Module Hero Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                Associate Management
              </span>

              <span className="text-xs text-indigo-300 font-mono">
                v1.0.0
              </span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Associate Management
            </h1>

            <p className="mt-2 text-sm sm:text-base text-indigo-200 max-w-2xl">
              Manage platform associate records, contact details, active/inactive
              status, and allocation eligibility under the authoritative Supabase-first
              architecture.
            </p>
          </div>
        </div>

        {/* Directory & Management Table */}
        <AssociateManagementTable />
      </div>
    </main>
  );
}
