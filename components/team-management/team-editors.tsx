"use client";

import type { TeamDetail } from "@/lib/team-management/types";

const CARD = "rounded-xl border border-[#292D33] bg-[#111318] p-5";

export function TeamDetailsPanel({ team }: { team: TeamDetail }) {
  return (
    <section aria-label="Team details" className={CARD}>
      <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#9B9EA6] mb-4">
        Team Details
      </h3>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-[#686C74]">
            Team Name
          </dt>
          <dd className="mt-1 font-semibold text-[#F3F1EC] break-words">
            {team.name}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-[#686C74]">
            Status
          </dt>
          <dd className="mt-1 text-[#9B9EA6] capitalize font-mono text-xs">{team.status}</dd>
        </div>
        {team.description && (
          <div className="sm:col-span-2">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-[#686C74]">
              Description
            </dt>
            <dd className="mt-1 text-[#9B9EA6] whitespace-pre-wrap break-words text-sm">
              {team.description}
            </dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-[#686C74]">
            Team ID
          </dt>
          <dd className="mt-1 font-mono text-xs text-[#686C74] break-all">{team.id}</dd>
        </div>
      </dl>
    </section>
  );
}

export function TeamScorePanel({ team }: { team: TeamDetail }) {
  return (
    <section aria-label="Team score" className={CARD}>
      <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#9B9EA6] mb-4">
        Team Score
      </h3>
      <div className="flex items-baseline gap-3">
        <p className="font-display text-4xl font-extrabold text-[#F2B84B]">
          {team.score.toLocaleString("en-IN", { maximumFractionDigits: 20 })}
        </p>
        <span className="font-mono text-xs text-[#686C74] uppercase tracking-wider">Points</span>
      </div>
    </section>
  );
}

export function TeamCoinPanel({ team }: { team: TeamDetail }) {
  return (
    <section aria-label="Coin balances" className={CARD}>
      <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#9B9EA6] mb-4">
        Coin Balances
      </h3>
      {team.coins.length === 0 ? (
        <p className="text-sm text-[#686C74] font-mono py-2 text-center">
          No enabled coin types are configured yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {team.coins.map((coin) => (
            <li
              key={coin.coinTypeId}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#292D33] bg-[#0D0F12] px-4 py-3"
            >
              <span className="text-sm text-[#9B9EA6] break-words min-w-0">
                {coin.name}
              </span>
              <span className="font-mono font-bold text-[#F2B84B] shrink-0">
                {coin.balance.toLocaleString("en-IN", { maximumFractionDigits: 20 })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
