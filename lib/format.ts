/**
 * Formatting utilities for display
 * Uses INR (₹) and liters for India
 */

export const GALLONS_TO_LITERS = 3.78541

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function gallonsToLiters(gallons: number): number {
  return gallons * GALLONS_TO_LITERS
}

export function litersToGallons(liters: number): number {
  return liters / GALLONS_TO_LITERS
}
