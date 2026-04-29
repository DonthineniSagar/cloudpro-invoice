const NZD = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' });

export function exGst(amount: number): number {
  return amount / 1.15;
}

export function preTaxMargin(revenueExGst: number, expensesExGst: number): number {
  return revenueExGst - expensesExGst;
}

export function netGstPosition(gstCollected: number, gstPaid: number): number {
  return gstCollected - gstPaid;
}

export function formatNZD(amount: number): string {
  return NZD.format(amount);
}
