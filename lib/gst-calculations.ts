/**
 * GST Calculation Utilities for NZ Tax
 */

export const NZ_GST_RATE = 0.15; // 15%

/**
 * Calculate GST amount from subtotal
 */
export function calculateGST(subtotal: number): number {
  return subtotal * NZ_GST_RATE;
}

/**
 * Calculate total including GST
 */
export function calculateTotal(subtotal: number): number {
  return subtotal + calculateGST(subtotal);
}

/**
 * Extract GST from GST-inclusive amount
 * Formula: GST = Amount × 15/115
 */
export function extractGST(totalAmount: number): number {
  return (totalAmount * 15) / 115;
}

/**
 * Calculate amount excluding GST
 */
export function calculateExGST(totalAmount: number): number {
  return totalAmount - extractGST(totalAmount);
}
