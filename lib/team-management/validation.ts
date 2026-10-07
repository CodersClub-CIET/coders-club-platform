import type { ValidationResult } from "./types";

/** Keep in sync with the CHECK constraints in 20261006000200_team_management.sql. */
export const MAX_TEAM_NAME_LENGTH = 80;
export const MAX_TEAM_SCORE = 1_000_000;
export const MAX_COIN_BALANCE = 1_000_000;

function wholeNumberResult(
  value: number,
  label: string,
  max: number
): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${label} must be a valid number.`);
    return { isValid: false, errors };
  }

  if (!Number.isInteger(value)) {
    errors.push(`${label} must be a whole number.`);
  }
  if (value < 0) {
    errors.push(`${label} cannot be negative.`);
  }
  if (value > max) {
    errors.push(`${label} cannot exceed ${max.toLocaleString("en-US")}.`);
  }

  return { isValid: errors.length === 0, errors };
}

export function validateTeamName(name: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = typeof name === "string" ? name.trim() : "";

  if (trimmed.length === 0) {
    errors.push("Team name is required.");
  } else if (trimmed.length > MAX_TEAM_NAME_LENGTH) {
    errors.push(`Team name cannot exceed ${MAX_TEAM_NAME_LENGTH} characters.`);
  }

  return { isValid: errors.length === 0, errors };
}

export function validateTeamScore(score: number): ValidationResult {
  return wholeNumberResult(score, "Score", MAX_TEAM_SCORE);
}

export function validateCoinBalance(balance: number): ValidationResult {
  return wholeNumberResult(balance, "Coin balance", MAX_COIN_BALANCE);
}

/**
 * Parses text typed into a number box. Returns null for anything that is not a
 * plain base-10 whole number (so "12abc", "1e3", "", " " are all rejected
 * instead of being silently coerced).
 */
export function parseWholeNumber(input: string): number | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().replace(/,/g, "");
  if (!/^-?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

const ROMAN_YEARS: Readonly<Record<number, string>> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
};

export function formatYear(year: number): string {
  return ROMAN_YEARS[year] ?? String(year);
}
