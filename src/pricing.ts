import type { Contract } from './contracts';
import { paymentLabel } from './amounts';

export interface TermComparison {
  location: string;
  gpu: Contract['gpu'];
  allocations: string[];
  threeYear: number;
  fiveYear: number;
  threeUpfront: string;
  fiveUpfront: string;
}

export function compareTerms(rows: readonly Contract[]): TermComparison[] {
  const allocations = new Map<string, { three?: Contract; five?: Contract }>();
  for (const row of rows) {
    // A lower bound or a term range cannot supply an exact point on this chart.
    if (row.status === 'Taken' || !row.price || row.price.qualifier || !['3 years', '5 years'].includes(row.term)) continue;
    const pair = allocations.get(row.allocation) ?? {};
    pair[row.term === '3 years' ? 'three' : 'five'] = row;
    allocations.set(row.allocation, pair);
  }

  const comparisons = new Map<string, TermComparison>();
  for (const [allocation, { three, five }] of allocations) {
    if (!three?.price || !five?.price) continue;
    if (three.location !== five.location || three.gpu !== five.gpu || three.system !== five.system) continue;
    const threeUpfront = paymentLabel(three.payment), fiveUpfront = paymentLabel(five.payment);
    const key = JSON.stringify([three.location, three.gpu, three.system, three.price.amount, five.price.amount, threeUpfront, fiveUpfront]);
    const existing = comparisons.get(key);
    if (existing) existing.allocations.push(allocation);
    else comparisons.set(key, {
      location: three.location, gpu: three.gpu, allocations: [allocation],
      threeYear: three.price.amount, fiveYear: five.price.amount,
      threeUpfront, fiveUpfront,
    });
  }
  return [...comparisons.values()];
}
