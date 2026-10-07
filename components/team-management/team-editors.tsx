"use client";

import type { TeamDetail } from "@/lib/team-management/types";

const CARD = "bg-white border border-slate-200 rounded-2xl shadow-sm p-5";

export function TeamDetailsPanel({ team }: { team: TeamDetail }) {
  return (
    <section aria-label="Team details" className={CARD}>
      <h3 className="text-base font-bold text-slate-900 mb-3">Team Details</h3>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Team Name
          </dt>
          <dd className="mt-1 font-semibold text-slate-900 break-words">
            {team.name}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Status
          </dt>
          <dd className="mt-1 text-slate-900 capitalize">{team.status}</dd>
        </div>
        {team.description && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Description
            </dt>
            <dd className="mt-1 text-slate-700 whitespace-pre-wrap break-words">
              {team.description}
            </dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Team ID
          </dt>
          <dd className="mt-1 font-mono text-slate-900 break-all">{team.id}</dd>
        </div>
      </dl>
    </section>
  );
}

export function TeamScorePanel({ team }: { team: TeamDetail }) {
  return (
    <section aria-label="Team score" className={CARD}>
      <h3 className="text-base font-bold text-slate-900 mb-3">Team Score</h3>
      <div className="flex items-center gap-3">
        <p className="text-3xl font-extrabold text-slate-900">
          {team.score.toLocaleString("en-IN", { maximumFractionDigits: 20 })}
          <span className="ml-2 text-sm font-medium text-slate-500">Points</span>
        </p>
      </div>
    </section>
  );
}

export function TeamCoinPanel({ team }: { team: TeamDetail }) {
  return (
    <section aria-label="Coin balances" className={CARD}>
      <h3 className="text-base font-bold text-slate-900 mb-3">Coin Balances</h3>
      {team.coins.length === 0 ? (
        <p className="text-sm text-slate-500">
          No enabled coin types are configured yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {team.coins.map((coin) => (
            <li
              key={coin.coinTypeId}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
            >
              <span className="text-sm text-slate-700 break-words min-w-0">
                {coin.name}
              </span>
              <span className="font-bold text-slate-900 shrink-0">
                {coin.balance.toLocaleString("en-IN", { maximumFractionDigits: 20 })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
