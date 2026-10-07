"use client";

import { useState } from "react";
import { Minus, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  setCoinBalance,
  updateTeamDetails,
  updateTeamScore,
  type UpdatedTeamFields,
} from "@/lib/team-management/service";
import { useSubmitGuard } from "@/lib/team-management/use-submit-guard";
import {
  MAX_COIN_BALANCE,
  parseWholeNumber,
  validateCoinBalance,
  validateTeamName,
  validateTeamScore,
} from "@/lib/team-management/validation";
import type { CoinBalance, TeamDetail } from "@/lib/team-management/types";

const CARD = "bg-white border border-slate-200 rounded-2xl shadow-sm p-5";
const INPUT =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60";

interface EditorCallbacks {
  /** Role-aware: false => no edit control is rendered at all. */
  canEdit: boolean;
  onTeamUpdated: (patch: UpdatedTeamFields) => void;
  onCoinUpdated: (coinTypeId: string, balance: number) => void;
  onMutationError: (error: unknown) => void;
}

/* ----------------------------------------------------------------------------
 * Team details (name editable; team code is protected and never editable)
 * ------------------------------------------------------------------------- */
export function TeamDetailsPanel({
  team,
  canEdit,
  onTeamUpdated,
  onMutationError,
}: { team: TeamDetail } & Pick<
  EditorCallbacks,
  "canEdit" | "onTeamUpdated" | "onMutationError"
>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const { saving, run } = useSubmitGuard();

  function startEdit() {
    setDraft(team.name);
    setErrors([]);
    setEditing(true);
  }

  async function save() {
    const result = validateTeamName(draft);
    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }
    if (draft.trim() === team.name) {
      setEditing(false);
      return;
    }

    await run(async () => {
      try {
        const updated = await updateTeamDetails(team.id, draft.trim(), team.version);
        onTeamUpdated(updated);
        toast.success("Team details updated.");
        setEditing(false);
      } catch (error) {
        onMutationError(error);
        setEditing(false);
      }
    });
  }

  return (
    <section aria-label="Team details" className={CARD}>
      <h3 className="text-base font-bold text-slate-900 mb-3">Team Details</h3>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Team Name
          </dt>
          <dd className="mt-1">
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={saving}
                  aria-label="Team name"
                  aria-invalid={errors.length > 0}
                  className={`${INPUT} w-full`}
                />
                {errors.map((e) => (
                  <p key={e} role="alert" className="text-xs text-red-600">
                    {e}
                  </p>
                ))}
                <div className="flex gap-2">
                  <Button size="sm" onClick={save} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 break-words">
                  {team.name}
                </span>
                {canEdit && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={startEdit}
                    aria-label="Edit team name"
                  >
                    <Pencil />
                  </Button>
                )}
              </div>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Team Identifier
          </dt>
          <dd className="mt-1 font-mono text-slate-900">{team.teamCode}</dd>
        </div>
      </dl>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * Team score
 * ------------------------------------------------------------------------- */
export function TeamScorePanel({
  team,
  canEdit,
  onTeamUpdated,
  onMutationError,
}: { team: TeamDetail } & Pick<
  EditorCallbacks,
  "canEdit" | "onTeamUpdated" | "onMutationError"
>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const { saving, run } = useSubmitGuard();

  function startEdit() {
    setDraft(String(team.score));
    setErrors([]);
    setEditing(true);
  }

  async function save() {
    const parsed = parseWholeNumber(draft);
    if (parsed === null) {
      setErrors(["Score must be a whole number."]);
      return;
    }
    const result = validateTeamScore(parsed);
    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }
    if (parsed === team.score) {
      setEditing(false);
      return;
    }

    await run(async () => {
      try {
        const updated = await updateTeamScore(team.id, parsed, team.version);
        onTeamUpdated(updated);
        toast.success("Team score updated.");
        setEditing(false);
      } catch (error) {
        onMutationError(error);
        setEditing(false);
      }
    });
  }

  return (
    <section aria-label="Team score" className={CARD}>
      <h3 className="text-base font-bold text-slate-900 mb-3">Team Score</h3>

      {editing ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="text"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={saving}
              aria-label="Team score"
              aria-invalid={errors.length > 0}
              className={`${INPUT} w-36`}
            />
            Points
          </label>
          {errors.map((e) => (
            <p key={e} role="alert" className="text-xs text-red-600">
              {e}
            </p>
          ))}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-3xl font-extrabold text-slate-900">
            {team.score.toLocaleString("en-IN")}
            <span className="ml-2 text-sm font-medium text-slate-500">
              Points
            </span>
          </p>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={startEdit}>
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * Coin balances - fully data-driven; no coin name appears in this file
 * ------------------------------------------------------------------------- */
function CoinRow({
  teamId,
  coin,
  canEdit,
  onCoinUpdated,
  onMutationError,
}: {
  teamId: string;
  coin: CoinBalance;
} & Pick<EditorCallbacks, "canEdit" | "onCoinUpdated" | "onMutationError">) {
  // null => not editing; show the stored balance.
  const [text, setText] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const { saving, run } = useSubmitGuard();

  const parsed = text === null ? coin.balance : parseWholeNumber(text);
  const dirty = text !== null && parsed !== null && parsed !== coin.balance;

  function step(delta: number) {
    const base = parsed ?? coin.balance;
    const next = Math.min(MAX_COIN_BALANCE, Math.max(0, base + delta));
    setErrors([]);
    setText(String(next));
  }

  async function save() {
    if (parsed === null) {
      setErrors(["Coin balance must be a whole number."]);
      return;
    }
    const result = validateCoinBalance(parsed);
    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    await run(async () => {
      try {
        const saved = await setCoinBalance(
          teamId,
          coin.coinTypeId,
          parsed,
          coin.balance
        );
        onCoinUpdated(coin.coinTypeId, saved);
        toast.success(`${coin.name} updated.`);
        setText(null);
      } catch (error) {
        onMutationError(error);
        setText(null);
      }
    });
  }

  if (!canEdit) {
    return (
      <li className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
        <span className="text-sm text-slate-700">{coin.name}</span>
        <span className="font-bold text-slate-900">
          {coin.balance.toLocaleString("en-IN")}
        </span>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-slate-200 px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-slate-700">{coin.name}</span>
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => step(-1)}
            disabled={saving || (parsed ?? 0) <= 0}
            aria-label={`Decrease ${coin.name}`}
          >
            <Minus />
          </Button>
          <input
            type="text"
            inputMode="numeric"
            value={text ?? String(coin.balance)}
            onChange={(e) => {
              setErrors([]);
              setText(e.target.value);
            }}
            disabled={saving}
            aria-label={`${coin.name} balance`}
            aria-invalid={errors.length > 0}
            className={`${INPUT} w-20 text-center`}
          />
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => step(1)}
            disabled={saving || (parsed ?? 0) >= MAX_COIN_BALANCE}
            aria-label={`Increase ${coin.name}`}
          >
            <Plus />
          </Button>
        </div>
      </div>

      {errors.map((e) => (
        <p key={e} role="alert" className="text-xs text-red-600">
          {e}
        </p>
      ))}

      {text !== null && (
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setText(null);
              setErrors([]);
            }}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      )}
    </li>
  );
}

export function TeamCoinPanel({
  team,
  canEdit,
  onCoinUpdated,
  onMutationError,
}: { team: TeamDetail } & Pick<
  EditorCallbacks,
  "canEdit" | "onCoinUpdated" | "onMutationError"
>) {
  return (
    <section aria-label="Coin balances" className={CARD}>
      <h3 className="text-base font-bold text-slate-900 mb-3">Coin Balances</h3>

      {team.coins.length === 0 ? (
        <p className="text-sm text-slate-500">
          No coin types are configured yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {team.coins.map((coin) => (
            <CoinRow
              key={coin.coinTypeId}
              teamId={team.id}
              coin={coin}
              canEdit={canEdit}
              onCoinUpdated={onCoinUpdated}
              onMutationError={onMutationError}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
