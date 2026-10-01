import { amountNotes, displayAmount, estimates, paymentLabel, type Payment, type Term } from './amounts';

export const CHECKED_ON = '2026-10-01';

// Buyers reach the owner on Signal. One link, shown per row, in Details and in the toolbar.
export const CONTACT = { label: 'Message on Signal', url: 'https://signal.me/#eu/v50iEXkUJyXFGhSBpzCwvtRmYtvsZxq_vdBj8C6kJnqKNSdqefhPmo8iGsnlgmAY' };

export const sources = {
  hardware: 'https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html',
  superpod: 'https://docs.nvidia.com/dgx-superpod/reference-architecture/scalable-infrastructure-b300/latest/dgx-superpod-architecture.html',
  xdr: 'https://docs.nvidia.com/dgx-superpod/reference-architecture/scalable-infrastructure-b300-xdr/latest/dgx-superpod-components.html',
  scaling: 'https://docs.nvidia.com/mission-control/docs/systems-administration-guide/2.1.0/overview.html',
};

export type Status = 'Scheduled' | 'Taken';
export type Price = { amount: number; qualifier?: 'above' } | null;

export interface Contract {
  // The offer ID buyers quote on Signal: <IN|US|POD|B300>-<month>-<nodes N or GPUs G>, plus -3Y/-5Y when two terms exist.
  id: string;
  // Different terms and rollout stages may share capacity. Never sum table rows.
  allocation: string;
  gpu: 'B300' | 'Not specified';
  system: string;
  gpus: number | null;
  gpuQualifier?: 'up to';
  nodes: number | null;
  nodeQualifier?: 'up to' | 'derived';
  location: string;
  ready: string;
  readyOrder: string | null;
  price: Price;
  term: Term;
  payment: Payment;
  network: string;
  status: Status;
  notes: string;
}

const unspecified = 'Not specified';
export const displayLabel = (value: string) => value === unspecified ? 'TBD' : value;

// Every allocation runs NVIDIA Quantum-X800 XDR InfiniBand, 800 Gb/s per port (owner-stated).
const fabric = 'XDR InfiniBand 800G';
const fabricNote = 'XDR InfiniBand at 800 Gb/s.';
const dgx = 'DGX B300: 8× B300 per node, 288 GB HBM3e per GPU, NVLink 5, air-cooled.';
const alternatives = '3-year and 5-year terms are alternatives for the same capacity.';

type IndiaYears = 3 | 5;
const indiaPayments: Record<IndiaYears, Payment> = { 3: { kind: 'deposit', percent: 30 }, 5: { kind: 'upfront', percent: 20 } };

// The 16-node stages carry a small-cluster premium over the 64-node December ceiling.
const indiaStages: (Pick<Contract, 'allocation' | 'nodes' | 'nodeQualifier' | 'ready' | 'readyOrder' | 'status' | 'notes'> & { rates: Record<IndiaYears, number> })[] = [
  { allocation: 'IN-OCT-16N', nodes: 16, rates: { 3: 5.25, 5: 4.70 }, ready: 'Oct 2026', readyOrder: '2026-10-01', status: 'Taken',
    notes: '16 nodes, 128 GPUs. October 2026. Taken.' },
  { allocation: 'IN-NOV-16N', nodes: 16, rates: { 3: 5.25, 5: 4.70 }, ready: 'Mid-Nov 2026', readyOrder: '2026-11-15', status: 'Scheduled',
    notes: '16 nodes, 128 GPUs. RFS mid-November 2026.' },
  { allocation: 'IN-DEC-64N', nodes: 64, nodeQualifier: 'up to', rates: { 3: 5.05, 5: 4.55 }, ready: 'Dec 2026', readyOrder: '2026-12-01', status: 'Scheduled',
    notes: 'Up to 64 nodes, 512 GPUs, by December 2026. This is the ceiling for the India rollout, including the two 16-node October and November stages.' },
];

const india: Contract[] = indiaStages.flatMap(({ rates, ...stage }) => ([3, 5] as const).map(years => ({
  ...stage,
  id: `${stage.allocation}-${years}Y`,
  gpu: 'B300',
  system: 'DGX B300',
  gpus: stage.nodes! * 8,
  gpuQualifier: stage.nodeQualifier === 'up to' ? 'up to' : undefined,
  location: 'India',
  price: { amount: rates[years] },
  term: `${years} years`,
  payment: indiaPayments[years],
  network: fabric,
  notes: `${stage.notes} India. ${dgx} ${fabricNote} ${alternatives} Site, SLA, storage and power inclusions: TBD.`,
})));

const us: Contract[] = ([
  { years: 3, amount: 4.95, payment: { kind: 'upfront', percent: 30 } },
  { years: 5, amount: 4.45, payment: { kind: 'upfront', percent: 20 } },
] as const).map(term => ({
  id: `US-DEC-64N-${term.years}Y`, allocation: 'US-DEC-64N', gpu: 'B300', system: 'DGX B300',
  gpus: 512, nodes: 64, location: 'U.S.', ready: 'End-Dec 2026', readyOrder: '2026-12-31',
  price: { amount: term.amount }, term: `${term.years} years`, payment: term.payment,
  network: fabric, status: 'Scheduled',
  notes: `64 nodes, 512 GPUs. RFS end of December 2026, U.S. ${dgx} ${fabricNote} ${alternatives} Site, SLA, storage and power inclusions: TBD.`,
}));

const clusters: Contract[] = [
  {
    id: 'US-DEC-32N-3Y', allocation: 'US-DEC-32N', gpu: 'B300', system: unspecified,
    gpus: 256, nodes: 32, location: 'U.S.', ready: 'Dec 2026', readyOrder: '2026-12-01',
    price: { amount: 5.15 }, term: '3 years', payment: { kind: 'prepayment', percent: 10 },
    network: fabric, status: 'Scheduled',
    notes: `32 nodes × 8 B300 = 256 GPUs. RFS December 2026, U.S. 3-year term, 10% prepayment. ${fabricNote} Server platform (DGX or HGX B300), site, SLA and inclusions: TBD.`,
  },
  {
    id: 'POD-JAN-256N', allocation: 'POD-JAN-256N', gpu: 'B300', system: 'DGX B300 SuperPOD',
    gpus: 2048, nodes: 256, location: unspecified, ready: 'Jan 2027', readyOrder: '2027-01-01',
    price: null, term: '3–5 years', payment: { kind: 'advance', percent: 20 }, network: fabric,
    status: 'Scheduled',
    notes: `256 DGX B300 nodes, 2,048 GPUs, as 4 SuperPOD clusters of 64 nodes. Air-cooled. RFS January 2027. 3- to 5-year term, 20% advance. Rate on request. ${fabricNote} Location: TBD.`,
  },
  {
    id: 'POD-JAN-512N', allocation: 'POD-JAN-512N', gpu: 'B300', system: 'DGX B300 SuperPOD',
    gpus: 4096, nodes: 512, location: unspecified, ready: 'Jan 2027', readyOrder: '2027-01-01',
    price: null, term: '3–5 years', payment: { kind: 'advance', percent: 20 }, network: fabric,
    status: 'Scheduled',
    notes: `512 DGX B300 nodes, 4,096 GPUs, as 8 SuperPOD clusters of 64 nodes. Air-cooled. RFS January 2027. 3- to 5-year term, 20% advance. Rate on request. ${fabricNote} Location: TBD.`,
  },
  {
    id: 'POD-DEC-144N', allocation: 'POD-DEC-144N', gpu: 'B300', system: 'DGX B300 SuperPOD',
    gpus: 1152, nodes: 144, location: unspecified, ready: 'Dec 2026', readyOrder: '2026-12-01',
    price: null, term: '3–5 years', payment: { kind: 'advance', percent: 20 }, network: fabric,
    status: 'Scheduled',
    notes: `144 DGX B300 nodes, 1,152 GPUs, as 2 SuperPOD clusters on 72-node XDR scalable units. Quantum-X800 XDR InfiniBand at 800 Gb/s. Air-cooled. RFS December 2026. 3- to 5-year term, 20% advance. Rate on request. Location: TBD.`,
  },
  {
    id: 'POD-FEB-144N', allocation: 'POD-FEB-144N', gpu: 'B300', system: 'DGX B300 SuperPOD',
    gpus: 1152, nodes: 144, location: unspecified, ready: 'Feb 2027', readyOrder: '2027-02-01',
    price: null, term: '3–5 years', payment: { kind: 'advance', percent: 20 }, network: fabric,
    status: 'Scheduled',
    notes: `144 DGX B300 nodes, 1,152 GPUs, as 2 SuperPOD clusters on 72-node XDR scalable units. Quantum-X800 XDR InfiniBand at 800 Gb/s. Air-cooled. RFS February 2027. 3- to 5-year term, 20% advance. Rate on request. Location: TBD.`,
  },
  {
    id: 'B300-JAN-1152G', allocation: 'B300-JAN-1152G', gpu: 'B300', system: unspecified,
    gpus: 1152, nodes: null, location: unspecified, ready: 'Jan 2027', readyOrder: '2027-01-01',
    price: { amount: 4.95, qualifier: 'above' }, term: '3–5 years', payment: { kind: 'advance', months: 6 },
    network: fabric, status: 'Scheduled',
    notes: `1,152 B300 GPUs, 144 nodes at 8 per node. RFS January 2027. 3- to 5-year term, 6 months payable in advance. Rate above $4.95/GPU-hr, set by term length. ${fabricNote} Server platform, location and SLA: TBD.`,
  },
];

// The site owner is the seller. Only their offers belong in this inventory.
export const contracts: Contract[] = [...india, ...us, ...clusters];

export const fields = [
  { key: 'offer', title: 'Offer', width: 132 },
  { key: 'system', title: 'Hardware', width: 160 },
  { key: 'capacity', title: 'Capacity', width: 195 },
  { key: 'location', title: 'Location', width: 88 },
  { key: 'ready', title: 'Start', width: 120 },
  { key: 'term', title: 'Term', width: 75 },
  { key: 'price', title: '$/GPU-hour', width: 115 },
  { key: 'upfront', title: 'Upfront', width: 136 },
  { key: 'status', title: 'Status', width: 80 },
  { key: 'notes', title: 'Details', width: 88 },
  { key: 'contact', title: 'Contact', width: 140 },
  { key: 'contractValue', title: 'Contract value ($)', width: 272 },
  { key: 'gpu', title: 'GPU model', width: 106 },
  { key: 'gpus', title: 'GPUs', width: 65 },
  { key: 'nodes', title: 'Nodes', width: 65 },
  { key: 'upfrontAmount', title: 'Upfront amount ($)', width: 272 },
  { key: 'network', title: 'Network', width: 150 },
  { key: 'allocation', title: 'Allocation', width: 125 },
] as const;

export type Field = typeof fields[number]['key'];
// Visibility only changes the grid; search, details and CSV retain every field.
export const defaultHiddenFields: readonly Field[] = ['contractValue', 'gpu', 'gpus', 'nodes', 'upfrontAmount', 'network', 'allocation'];

export function display(contract: Contract, field: Field): string {
  if (field === 'offer') return contract.id;
  if (field === 'contact') return CONTACT.url;
  if (field === 'contractValue' || field === 'upfrontAmount') return displayAmount(contract, field);
  if (field === 'upfront') return paymentLabel(contract.payment);
  if (field === 'notes') return `${contract.notes}\n\n${amountNotes(contract)}`;
  if (field === 'capacity') {
    const parts = [];
    if (contract.gpus !== null) parts.push(`${display(contract, 'gpus')} GPU${contract.gpus === 1 ? '' : 's'}`);
    if (contract.nodes !== null) parts.push(`${display(contract, 'nodes')} node${contract.nodes === 1 ? '' : 's'}`);
    return parts.join(' · ') || 'TBD';
  }
  if (field === 'system') return displayLabel(contract.system === unspecified ? contract.gpu : contract.system);
  if (field === 'price') {
    if (!contract.price) return 'Price on request';
    const { amount, qualifier } = contract.price;
    return `${qualifier === 'above' ? 'Above ' : ''}$${amount.toFixed(2)}`;
  }
  if (field === 'gpus' || field === 'nodes') {
    const n = contract[field];
    if (n === null) return '—';
    const ceiling = field === 'nodes' ? contract.nodeQualifier === 'up to' : contract.gpuQualifier === 'up to';
    return `${ceiling ? '≤ ' : ''}${n.toLocaleString('en-US')}`;
  }
  return displayLabel(contract[field]);
}

// Missing values stay last in either direction. Prices retain their qualifiers.
export function sortContracts(rows: Contract[], field: Field, direction: 'asc' | 'desc'): Contract[] {
  function value(row: Contract): string | number | null {
    if (field === 'offer') return row.id;
    if (field === 'contact') return null;  // identical on every row
    if (field === 'contractValue' || field === 'upfrontAmount') return estimates(row, field)[0]?.amount ?? null;
    if (field === 'upfront') return paymentLabel(row.payment);
    // Capacity sorts by GPU count, never by the formatted label or mixed units.
    if (field === 'capacity') return row.gpus;
    if (field === 'system') return row.system === unspecified && row.gpu === unspecified ? null : display(row, field);
    if (field === 'price') return row.price?.amount ?? null;
    if (field === 'ready') return row.readyOrder;
    if (field === 'gpus' || field === 'nodes') return row[field];
    return row[field] === unspecified ? null : row[field];
  }
  return [...rows].sort((a, b) => {
    const x = value(a), y = value(b);
    if (x === null) return y === null ? 0 : 1;
    if (y === null) return -1;
    const comparison = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'en', { numeric: true });
    return comparison * (direction === 'asc' ? 1 : -1);
  });
}
