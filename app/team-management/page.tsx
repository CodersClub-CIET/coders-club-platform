import { ToastProvider } from "@/components/providers/toast-provider";
import { TeamManagementView } from "@/components/team-management/team-management-view";

export const metadata = {
  title: "Team Management | Coders Club Platform",
  description: "View teams, members, scores, and coin balances",
};

export default function TeamManagementPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-6">
      <ToastProvider />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 mb-2">
            Team Management
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Team Management
          </h1>
          <p className="mt-2 text-sm sm:text-base text-indigo-200 max-w-2xl">
            View teams, their members, score, and coin balances. Associates can
            update team details, score, and coin balances.
          </p>
        </div>

        <TeamManagementView />
      </div>
    </main>
  );
}
