/**
 * Decimal monetary helper for safe financial arithmetic
 * Avoids IEEE-754 floating point precision errors
 */

export function toCents(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined || amount === '') return 0;
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatMoney(amount: number | string | null | undefined, currency = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function areAmountsEqualWithinTolerance(
  amountA: number | string | null | undefined,
  amountB: number | string | null | undefined,
  tolerance = 0.01
): boolean {
  const centsA = toCents(amountA);
  const centsB = toCents(amountB);
  const toleranceCents = Math.round(tolerance * 100);
  return Math.abs(centsA - centsB) <= toleranceCents;
}

export function safeAdd(...amounts: (number | string | null | undefined)[]): number {
  const totalCents = amounts.reduce<number>((acc, cur) => acc + toCents(cur), 0);
  return fromCents(totalCents);
}

export function safeMultiply(
  quantity: number | string | null | undefined,
  unitPrice: number | string | null | undefined
): number {
  const q = typeof quantity === 'string' ? parseFloat(quantity) : (quantity ?? 0);
  const pCents = toCents(unitPrice);
  if (isNaN(q) || isNaN(pCents)) return 0;
  return fromCents(Math.round(q * pCents));
}
