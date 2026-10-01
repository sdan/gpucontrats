import type { Contract } from './contracts';

// Percentages apply to contract value. Wording (deposit, upfront, prepayment, advance) follows each term sheet.
export type Payment =
  | { kind: 'deposit' | 'upfront' | 'advance' | 'prepayment'; percent: number }
  | { kind: 'advance'; months: number };

export type Term = '3 years' | '5 years' | '3–5 years';
export type AmountField = 'contractValue' | 'upfrontAmount';

interface Estimate { amount: number; qualifier: 'exact' | 'above' | 'up to'; years?: number }

// Billing conventions: 24/7 for the full term, 365-day year.
const HOURS_PER_YEAR = 365 * 24;
const HOURS_PER_MONTH = HOURS_PER_YEAR / 12;

export function paymentLabel(payment: Payment): string {
  return 'months' in payment ? `${payment.months} months advance` : `${payment.percent}% ${payment.kind}`;
}

export function estimates(contract: Contract, field: AmountField): Estimate[] {
  if (contract.gpus === null || contract.price === null) return [];
  // A ceiling on quantity times a floor on rate bounds nothing.
  if (contract.gpuQualifier === 'up to' && contract.price.qualifier === 'above') return [];
  const hourly = contract.gpus * contract.price.amount;
  const qualifier = contract.gpuQualifier === 'up to' ? 'up to' : contract.price.qualifier === 'above' ? 'above' : 'exact';
  const amount = (hours: number, fraction = 1) => Math.round(hourly * hours * fraction * 100) / 100;
  if (field === 'upfrontAmount' && 'months' in contract.payment) {
    return [{ amount: amount(HOURS_PER_MONTH * contract.payment.months), qualifier }];
  }
  const years = contract.term === '3–5 years' ? [3, 5] : [contract.term === '3 years' ? 3 : 5];
  const fraction = field === 'upfrontAmount' && 'percent' in contract.payment ? contract.payment.percent / 100 : 1;
  return years.map(year => ({ amount: amount(HOURS_PER_YEAR * year, fraction), qualifier, years: year }));
}

function usd(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function formatEstimate(estimate: Estimate): string {
  return `${estimate.qualifier === 'above' ? 'Above ' : estimate.qualifier === 'up to' ? 'Up to ' : ''}${usd(estimate.amount)}`;
}

export function displayAmount(contract: Contract, field: AmountField): string {
  if (contract.price === null) return 'Rate on request';
  if (contract.gpus === null) return 'GPU count TBD';
  const values = estimates(contract, field);
  if (values.length === 0) return 'Count and rate TBD';
  if (values.length === 1) return formatEstimate(values[0]);
  return values.map(value => `${value.years}y: ${value.qualifier === 'above' ? '>' : value.qualifier === 'up to' ? '≤' : ''}${usd(value.amount)}`).join(' / ');
}

// Appended to each row's note so the dialog, search, copy and CSV carry the same arithmetic.
export function amountNotes(contract: Contract): string {
  const lines: string[] = [];
  if (contract.price === null) lines.push('Rate on request. Contract value follows the rate.');
  else if (contract.gpus === null) lines.push('Contract value follows the final GPU count.');
  else if (estimates(contract, 'contractValue').length === 0) lines.push('Contract value follows the final GPU count and rate.');
  else {
    const rate = `${contract.price.qualifier === 'above' ? 'above ' : ''}$${contract.price.amount.toFixed(2)}`;
    const count = `${contract.gpuQualifier === 'up to' ? 'up to ' : ''}${contract.gpus.toLocaleString('en-US')} GPUs`;
    for (const value of estimates(contract, 'contractValue')) {
      lines.push(`${value.years}-year contract value: ${formatEstimate(value)}. ${count} × ${rate}/GPU-hr × 8,760 hr/yr × ${value.years} years.`);
    }
    if ('months' in contract.payment) {
      lines.push(`${contract.payment.months}-month advance: ${formatEstimate(estimates(contract, 'upfrontAmount')[0])}. ${count} × ${rate}/GPU-hr × 730 hr/month × ${contract.payment.months} months.`);
    } else {
      const values = estimates(contract, 'upfrontAmount').map(value => `${value.years}-year: ${formatEstimate(value)}`).join('; ');
      lines.push(`${paymentLabel(contract.payment)} on contract value: ${values}.`);
    }
  }
  lines.push('Contract value is billed 24/7 for the full term. Excludes taxes.');
  return lines.join('\n\n');
}
