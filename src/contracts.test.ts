import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTACT, contracts, display, fields, sortContracts } from './contracts';
import { filterContracts } from './view';
import { compareTerms } from './pricing';
import { contractsToCsv } from './csv';
import { estimates } from './amounts';

test('both October term options are taken and future offers are never live', () => {
  const october = contracts.filter(row => row.allocation === 'IN-OCT-16N');
  assert.equal(october.length, 2);
  assert.ok(october.every(row => row.status === 'Taken' && row.nodes === 16));
  assert.ok(contracts.filter(row => row.ready.startsWith('Jan 2027')).every(row => row.status === 'Scheduled'));
});

test('owner-confirmed DGX B300 offers use eight GPUs per node while unknown node counts remain unknown', () => {
  assert.ok(contracts.every(row => row.gpu === 'B300'));
  assert.equal(contracts.find(row => row.id === 'IN-NOV-16N-3Y')?.gpus, 128);
  assert.equal(contracts.find(row => row.id === 'US-DEC-64N-3Y')?.gpus, 512);
  assert.equal(contracts.find(row => row.id === 'B300-JAN-1152G')?.nodes, null);
  const superpods = contracts.filter(row => row.system === 'DGX B300 SuperPOD');
  assert.equal(superpods.length, 4);
  assert.ok(superpods.every(row => row.gpu === 'B300' && row.gpus === row.nodes! * 8));
  assert.equal(display(contracts[0], 'gpu'), 'B300');
  assert.equal(display(contracts.find(row => row.id === 'POD-JAN-256N')!, 'system'), 'DGX B300 SuperPOD');
});

test('December India remains a ceiling and terms share allocation identities', () => {
  const december = contracts.filter(row => row.allocation === 'IN-DEC-64N');
  assert.equal(december.length, 2);
  assert.ok(december.every(row => row.nodeQualifier === 'up to' && row.nodes === 64));
  assert.equal(display(december[0], 'nodes'), '≤ 64');
  assert.equal(display(december[0], 'gpus'), '≤ 512');
  assert.equal(display(december[0], 'contractValue'), 'Up to $67,949,568');
  assert.equal(display(december[0], 'upfrontAmount'), 'Up to $20,384,870.40');
  assert.equal(display(december[1], 'contractValue'), 'Up to $102,036,480');
  assert.match(display(december[0], 'notes'), /up to 512 GPUs/);
});

test('combined capacity preserves limits and unknown counts and sorts numerically by GPUs', () => {
  const small = contracts.find(row => row.id === 'IN-NOV-16N-3Y')!;
  const medium = contracts.find(row => row.id === 'IN-DEC-64N-3Y')!;
  const large = contracts.find(row => row.id === 'B300-JAN-1152G')!;
  assert.equal(display(small, 'capacity'), '128 GPUs · 16 nodes');
  assert.equal(display(medium, 'capacity'), '≤ 512 GPUs · ≤ 64 nodes');
  assert.equal(display(large, 'capacity'), '1,152 GPUs');
  assert.equal(display({ ...small, gpus: null }, 'capacity'), '16 nodes');
  assert.equal(display({ ...small, gpus: null, nodes: null }, 'capacity'), 'TBD');
  assert.deepEqual(sortContracts([large, small, medium], 'capacity', 'asc').map(row => row.gpus), [128, 512, 1152]);
  assert.deepEqual(sortContracts([large, small, medium], 'capacity', 'desc').map(row => row.gpus), [1152, 512, 128]);
});

test('strict lower bounds and duration prepayments survive formatting', () => {
  const row = contracts.find(row => row.id === 'B300-JAN-1152G')!;
  assert.equal(display(row, 'price'), 'Above $4.95');
  assert.equal(display(row, 'upfront'), '6 months advance');
});

test('unknown prices remain last in either sorting direction', () => {
  for (const direction of ['asc', 'desc'] as const) {
    const sorted = sortContracts(contracts, 'price', direction);
    const firstUnknown = sorted.findIndex(row => row.price === null);
    assert.ok(sorted.slice(firstUnknown).every(row => row.price === null));
  }
  const sorted = sortContracts(contracts, 'price', 'desc');
  assert.equal(sorted[0].price?.amount, 5.25);
});

test('inventory contains only owner-supplied offers, never research benchmarks', () => {
  assert.equal(contracts.length, 14);
  for (const provider of ['Runware', 'Together AI']) {
    assert.ok(!JSON.stringify(contracts).includes(provider));
  }
});

test('search finds GPU counts without commas and matches multiple terms', () => {
  const rows = filterContracts(contracts, '  XDR   1152  ', {});
  assert.deepEqual(rows.map(row => row.id), ['POD-DEC-144N', 'POD-FEB-144N', 'B300-JAN-1152G']);
});

test('filters combine with search without bringing back taken allocations', () => {
  const rows = filterContracts(contracts, '16', { location: 'India', status: 'Scheduled', term: '3 years' });
  assert.deepEqual(rows.map(row => row.id), ['IN-NOV-16N-3Y', 'IN-DEC-64N-3Y']);
  assert.equal(filterContracts(contracts, 'b300', { location: 'U.S.' }).length, 3);
});

test('contradictory filters return no rows and clearing restores source order', () => {
  assert.deepEqual(filterContracts(contracts, '', { location: 'India', term: '3–5 years' }), []);
  assert.deepEqual(filterContracts(contracts, '  ', {}), contracts);
});

test('term comparisons pair the same allocation and keep differently priced stages apart', () => {
  const comparisons = compareTerms(contracts);
  assert.equal(comparisons.length, 3);
  const nov = comparisons.find(row => row.allocations.includes('IN-NOV-16N'))!;
  assert.deepEqual(nov.allocations, ['IN-NOV-16N']);
  assert.equal(nov.threeYear, 5.25);
  assert.equal(nov.fiveYear, 4.7);
  const dec = comparisons.find(row => row.allocations.includes('IN-DEC-64N'))!;
  assert.deepEqual(dec.allocations, ['IN-DEC-64N']);
  assert.equal(dec.threeYear, 5.05);
  assert.equal(dec.fiveYear, 4.55);
  assert.equal(dec.threeUpfront, '30% deposit');
  assert.equal(dec.fiveUpfront, '20% upfront');
  const us = comparisons.find(row => row.location === 'U.S.')!;
  assert.deepEqual(us.allocations, ['US-DEC-64N']);
  assert.equal(us.threeYear, 4.95);
  assert.equal(us.fiveYear, 4.45);
  assert.equal(us.threeUpfront, '30% upfront');
  assert.equal(us.fiveUpfront, '20% upfront');
  assert.equal(display(contracts.find(row => row.id === 'POD-JAN-256N')!, 'upfront'), '20% advance');
  assert.equal(display(contracts.find(row => row.id === 'US-DEC-32N-3Y')!, 'upfront'), '10% prepayment');
});

test('charts never connect separate allocations or substitute bounds for exact prices', () => {
  const three = contracts.find(row => row.id === 'US-DEC-64N-3Y')!;
  const five = contracts.find(row => row.id === 'US-DEC-64N-5Y')!;
  assert.deepEqual(compareTerms([three, { ...five, allocation: 'DIFFERENT' }]), []);
  assert.deepEqual(compareTerms([three, { ...five, price: { amount: 4.45, qualifier: 'above' } }]), []);
  assert.deepEqual(compareTerms(filterContracts(contracts, 'US-DEC-32N-3Y', {})), []);
  assert.deepEqual(compareTerms(filterContracts(contracts, '', { status: 'Taken' })), []);
  assert.deepEqual(compareTerms(filterContracts(contracts, '', { term: '3 years' })), []);
});

test('CSV preserves price bounds, Unicode, and complete multiline notes', () => {
  const row = contracts.find(row => row.id === 'B300-JAN-1152G')!;
  const notes = 'Includes "storage", pending confirmation.\nFull second line.';
  const csv = contractsToCsv([{ ...row, notes }]);
  assert.ok(csv.startsWith('\uFEFF"Offer","Hardware","Capacity"'));
  assert.ok(csv.includes('"GPUs","Nodes"'));
  assert.ok(csv.includes('"Above $4.95"'));
  assert.ok(csv.includes('"3–5 years"'));
  assert.ok(csv.includes('"Includes ""storage"", pending confirmation.\nFull second line.'));
  assert.ok(csv.endsWith('\r\n'));
  assert.ok(!csv.includes('click to read'));
});

test('CSV follows the supplied view order and keeps formula-like notes as text', () => {
  const rows = sortContracts(filterContracts(contracts, '', { location: 'India', status: 'Scheduled' }), 'price', 'desc');
  const csv = contractsToCsv(rows);
  assert.equal(csv.split('\r\n').length, rows.length + 2);
  assert.ok(csv.indexOf('"IN-NOV-16N"') < csv.indexOf('"IN-DEC-64N"'));
  assert.ok(!csv.includes('"IN-OCT-16N"'));
  assert.ok(contractsToCsv([{ ...rows[0], notes: '=1+1' }]).includes('"\'=1+1\n\n3-year contract value'));
});

test('full-term value uses the supplied GPU count and continuous billing convention', () => {
  const row = contracts.find(row => row.id === 'US-DEC-32N-3Y')!;
  assert.deepEqual(estimates(row, 'contractValue'), [{ amount: 34_647_552, qualifier: 'exact', years: 3 }]);
  assert.equal(display(row, 'contractValue'), '$34,647,552');
  assert.equal(display(row, 'upfrontAmount'), '$3,464,755.20');
  const confirmed = { ...row, payment: { kind: 'prepayment' as const, percent: 10 } };
  assert.equal(display(confirmed, 'upfrontAmount'), '$3,464,755.20');
  assert.equal(display(confirmed, 'contractValue'), '$34,647,552');
  assert.match(display(row, 'notes'), /10% prepayment on contract value: 3-year: \$3,464,755\.20/);
});

test('missing rates or GPU counts never become fabricated dollar totals', () => {
  const noCount = { ...contracts.find(row => row.id === 'IN-NOV-16N-3Y')!, gpus: null };
  const noRate = contracts.find(row => row.id === 'POD-JAN-256N')!;
  for (const field of ['contractValue', 'upfrontAmount'] as const) {
    assert.deepEqual(estimates(noCount, field), []);
    assert.deepEqual(estimates(noRate, field), []);
    assert.equal(display(noCount, field), 'GPU count TBD');
    assert.equal(display(noRate, field), 'Rate on request');
  }
});

test('strict price bounds remain bounds at both term lengths and for a six-month advance', () => {
  const row = contracts.find(row => row.id === 'B300-JAN-1152G')!;
  assert.deepEqual(estimates(row, 'contractValue'), [
    { amount: 149_859_072, qualifier: 'above', years: 3 },
    { amount: 249_765_120, qualifier: 'above', years: 5 },
  ]);
  assert.equal(display(row, 'contractValue'), '3y: >$149,859,072 / 5y: >$249,765,120');
  assert.deepEqual(estimates(row, 'upfrontAmount'), [{ amount: 24_976_512, qualifier: 'above' }]);
  assert.equal(display(row, 'upfrontAmount'), 'Above $24,976,512');
  assert.match(display(row, 'notes'), /3-year contract value: Above \$149,859,072/);
  assert.match(display(row, 'notes'), /5-year contract value: Above \$249,765,120/);
});

test('total sorting is numeric with unknowns last; CSV includes the calculation basis', () => {
  for (const field of ['contractValue', 'upfrontAmount'] as const) {
    for (const direction of ['asc', 'desc'] as const) {
      const rows = sortContracts(contracts, field, direction);
      assert.equal(rows[0].id, direction === 'desc' ? 'B300-JAN-1152G' : field === 'contractValue' ? 'IN-OCT-16N-3Y' : 'US-DEC-32N-3Y');
      assert.ok(rows.slice(0, 10).every(row => estimates(row, field).length === 1 || estimates(row, field).length === 2));
      assert.ok(rows.slice(10).every(row => estimates(row, field).length === 0));
    }
  }
  const csv = contractsToCsv([contracts.find(row => row.id === 'US-DEC-32N-3Y')!]);
  assert.ok(csv.includes('"Contract value ($)"'));
  assert.ok(csv.includes('"$34,647,552"'));
  assert.ok(csv.includes('"$3,464,755.20"'));
  assert.ok(csv.includes('8,760 hr/yr'));
});

test('a capacity ceiling and an above rate cannot fabricate a bound on total value', () => {
  const row = { ...contracts.find(row => row.id === 'B300-JAN-1152G')!, gpuQualifier: 'up to' as const };
  for (const field of ['contractValue', 'upfrontAmount'] as const) {
    assert.deepEqual(estimates(row, field), []);
    assert.equal(display(row, field), 'Count and rate TBD');
  }
  assert.match(display(row, 'notes'), /follows the final GPU count and rate/);
});

test('every row carries the same Signal contact link in the grid, details and CSV, and search ignores it', () => {
  assert.ok(CONTACT.url.startsWith('https://signal.me/'));
  assert.ok(contracts.every(row => display(row, 'contact') === CONTACT.url));
  assert.deepEqual(sortContracts(contracts, 'contact', 'desc').map(row => row.id), contracts.map(row => row.id));
  const csv = contractsToCsv([contracts[0]]);
  assert.ok(csv.includes('"Contact"'));
  assert.ok(csv.includes(`"${CONTACT.url}"`));
  assert.deepEqual(filterContracts(contracts, 'signal.me', {}), []);
});

test('offer IDs are unique, follow the scheme, lead the grid and the CSV, and are searchable', () => {
  const skus = contracts.map(row => display(row, 'offer'));
  assert.equal(new Set(skus).size, contracts.length);
  assert.ok(skus.every(sku => /^(IN|US|POD|B300)-[A-Z]{3}-\d+[NG](-[35]Y)?$/.test(sku)), skus.join(' '));
  assert.equal(fields[0].key, 'offer');
  assert.ok(contractsToCsv([contracts[0]]).startsWith('\uFEFF"Offer","Hardware"'));
  assert.deepEqual(filterContracts(contracts, 'US-DEC-32N', {}).map(row => row.id), ['US-DEC-32N-3Y']);
  assert.deepEqual(sortContracts(contracts, 'offer', 'asc')[0].id, 'B300-JAN-1152G');
});
