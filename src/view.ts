import { display, fields, type Contract } from './contracts';

export const filterFields = [
  { key: 'status', label: 'Status' },
  { key: 'location', label: 'Location' },
  { key: 'term', label: 'Term' },
  { key: 'network', label: 'Network' },
] as const;

export type Filters = Partial<Record<typeof filterFields[number]['key'], string>>;

export function filterContracts(rows: Contract[], query: string, filters: Filters): Contract[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return rows.filter(row => {
    if (filterFields.some(({ key }) => filters[key] && row[key] !== filters[key])) return false;
    // Search hidden columns too, including notes and unformatted GPU counts.
    const text = `${fields.filter(field => field.key !== 'contact').map(field => display(row, field.key)).join(' ')} ${row.gpus ?? ''} ${row.nodes ?? ''}`.toLowerCase();
    return terms.every(term => text.includes(term));
  });
}
