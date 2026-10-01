import { display, fields, type Contract } from './contracts';

export function contractsToCsv(rows: readonly Contract[]): string {
  const records = [
    fields.map(field => field.key === 'notes' ? 'Notes' : field.title),
    ...rows.map(row => fields.map(field => display(row, field.key))),
  ];
  // Preserve commas, quotes, and multiline notes. The BOM keeps Unicode readable in Excel.
  return '\uFEFF' + records.map(record => record.map(value => {
    const text = /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${text.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n') + '\r\n';
}

export function downloadContracts(rows: readonly Contract[]) {
  const url = URL.createObjectURL(new Blob([contractsToCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'gpu-contracts.csv';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
