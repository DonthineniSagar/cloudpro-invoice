/**
 * NZ Financial Year utilities.
 * FY runs April 1 – March 31. FY27 = 1 Apr 2026 – 31 Mar 2027.
 * Previous FY expenses can be added until May 15 cutoff.
 */

/** Get the FY year number for a given date. e.g. Apr 2026 → FY27, Mar 2026 → FY26 */
export function getFY(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = d.getMonth(); // 0-indexed: 0=Jan, 3=Apr
  const year = d.getFullYear();
  return month >= 3 ? year + 1 : year; // Apr+ = next FY
}

/** Get current FY based on today */
export function currentFY(): number {
  return getFY(new Date());
}

/** Get FY start date (1 April) */
export function fyStart(fy: number): string {
  return `${fy - 1}-04-01`;
}

/** Get FY end date (31 March) */
export function fyEnd(fy: number): string {
  return `${fy}-03-31`;
}

/** Get FY label e.g. "FY26 (Apr 2025 – Mar 2026)" */
export function fyLabel(fy: number): string {
  return `FY${fy.toString().slice(-2)} (Apr ${fy - 1} – Mar ${fy})`;
}

/** Get short FY label e.g. "FY26" */
export function fyShort(fy: number): string {
  return `FY${fy.toString().slice(-2)}`;
}

/** Check if a date falls within a given FY */
export function isInFY(date: Date | string, fy: number): boolean {
  return getFY(date) === fy;
}

/** Check if previous FY is still open for expense entry (before May 15 cutoff) */
export function isPreviousFYOpen(): boolean {
  const now = new Date();
  const month = now.getMonth(); // 0=Jan
  const day = now.getDate();
  // Open in April (month 3) always, and May 1-15 (month 4, day <= 15)
  return (month === 3) || (month === 4 && day <= 15);
}

/** Get list of available FYs for selection (current + previous if open) */
export function availableFYs(): number[] {
  const current = currentFY();
  const fys = [current];
  if (isPreviousFYOpen()) fys.unshift(current - 1);
  return fys;
}

/** FYs available for UI dropdowns: current + 2 previous */
export function selectableFYs(): number[] {
  const current = currentFY();
  return [current, current - 1, current - 2];
}

/** Check if a given FY is closed (read-only) */
export function isFYClosed(fy: number): boolean {
  const current = currentFY();
  if (fy >= current) return false;          // current or future FY — open
  if (fy === current - 1) return !isPreviousFYOpen(); // previous FY — depends on cutoff
  return true;                              // 2+ FYs ago — always closed
}

/** FY months in order: Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar */
export const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

/** Get the 12 month keys (YYYY-MM) for a given FY in order */
export function fyMonthKeys(fy: number): string[] {
  const startYear = fy - 1;
  return [
    `${startYear}-04`, `${startYear}-05`, `${startYear}-06`,
    `${startYear}-07`, `${startYear}-08`, `${startYear}-09`,
    `${startYear}-10`, `${startYear}-11`, `${startYear}-12`,
    `${fy}-01`, `${fy}-02`, `${fy}-03`,
  ];
}
