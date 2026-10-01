import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import DataEditor, { GridCellKind, type DataEditorRef, type GridCell, type GridColumn, type Item, type Theme } from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import { CONTACT, contracts, defaultHiddenFields, display, displayLabel, fields, sortContracts, type Contract, type Field } from './contracts';
import { filterContracts, filterFields, type Filters } from './view';
import { PricingPanel } from './PricingPanel';
import { NotesDialog } from './NotesDialog';
import { downloadContracts } from './csv';
import './style.css';

const theme: Partial<Theme> = {
  accentColor: '#217346', accentLight: '#e2efda', accentFg: '#fff',
  bgCell: '#ffffff', bgHeader: '#eeeeee', bgHeaderHovered: '#dddddd', bgHeaderHasFocus: '#d4e6d8',
  borderColor: '#d4d4d4', horizontalBorderColor: '#d4d4d4',
  textDark: '#000000', textMedium: '#333333', textLight: '#666666', textHeader: '#000000',
  headerFontStyle: 'bold 12px', baseFontStyle: '12px', fontFamily: 'Arial, sans-serif',
  cellHorizontalPadding: 6,
};

function App() {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<{ field: Field; direction: 'asc' | 'desc' } | null>(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [hidden, setHidden] = useState<Field[]>([...defaultHiddenFields]);
  const [panel, setPanel] = useState<'filter' | 'sort' | 'columns' | 'pricing' | null>(null);
  const [note, setNote] = useState<Contract | null>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const grid = useRef<DataEditorRef>(null);
  const visibleFields = fields.filter(field => !hidden.includes(field.key));
  const customColumns = fields.some(field => hidden.includes(field.key) !== defaultHiddenFields.includes(field.key));
  const activeFilters = filterFields.filter(field => filters[field.key]);
  const hasFilters = query !== '' || activeFilters.length > 0;
  const filtered = useMemo(() => filterContracts(contracts, query, filters), [query, filters]);
  const rows = useMemo(() => sort ? sortContracts(filtered, sort.field, sort.direction) : filtered, [filtered, sort]);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!toolbar.current?.contains(event.target as Node)) setPanel(null);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (note) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setPanel(null);
        search.current?.focus();
        search.current?.select();
      } else if (event.key === 'Escape' && panel) {
        setPanel(null);
        toolbar.current?.querySelector<HTMLButtonElement>(`[data-panel="${panel}"]`)?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', keyboard, true);
    };
  }, [panel, note]);

  function clearFilters() { setQuery(''); setFilters({}); }
  const columns: GridColumn[] = visibleFields.map(field => ({
    id: field.key,
    title: `${field.title}${sort?.field === field.key ? sort.direction === 'asc' ? ' ↑' : ' ↓' : ''}`,
    width: widths[field.key] ?? field.width,
  }));

  const getCellContent = useCallback(([col, row]: Item): GridCell => {
    const contract = rows[row];
    const field = visibleFields[col]?.key;
    if (!contract || !field) return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false };
    const value = display(contract, field);
    if (field === 'contact') {
      return { kind: GridCellKind.Text, data: value, displayData: CONTACT.label, copyData: value, readonly: true, allowOverlay: false,
        activationBehaviorOverride: 'single-click', cursor: 'pointer', contentAlign: 'left', themeOverride: { textDark: '#0563c1' } };
    }
    if (field === 'notes' || field === 'contractValue' || field === 'upfrontAmount') {
      return { kind: GridCellKind.Text, data: value, displayData: field === 'notes' ? 'View details' : value, copyData: value,
        readonly: true, allowOverlay: false, activationBehaviorOverride: 'single-click', cursor: 'pointer',
        contentAlign: field === 'notes' ? 'left' : 'right',
        themeOverride: { textDark: '#0563c1' },
      };
    }
    return { kind: GridCellKind.Text, data: value, displayData: value, readonly: true,
      allowOverlay: true, contentAlign: field === 'gpus' || field === 'nodes' || field === 'price' ? 'right' : 'left',
    };
  }, [rows, visibleFields]);

  return <main aria-label="GPU contracts">
    <div className="toolbar" ref={toolbar}>
      <div className="toolbar-row">
        <div className="search-box">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5"/><path d="m10 10 4 4"/></svg>
          <input ref={search} type="search" aria-label="Search contracts" placeholder="Search all columns…" value={query} onChange={event => setQuery(event.target.value)} />
        </div>
        <div className="toolbar-actions">
          <button type="button" data-panel="filter" aria-expanded={panel === 'filter'} aria-controls="filter-panel" className={activeFilters.length ? 'active' : ''} onClick={() => setPanel(panel === 'filter' ? null : 'filter')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M2 3h12L9 8v5H7V8Z"/></svg>
            Filter{activeFilters.length ? ` (${activeFilters.length})` : ''}
          </button>
          <button type="button" data-panel="sort" aria-expanded={panel === 'sort'} aria-controls="sort-panel" className={sort ? 'active' : ''} onClick={() => setPanel(panel === 'sort' ? null : 'sort')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 13V2M2 5l3-3 3 3m3-2v11m-3-3 3 3 3-3"/></svg>
            Sort{sort ? ' (1)' : ''}
          </button>
          <button type="button" data-panel="columns" aria-expanded={panel === 'columns'} aria-controls="columns-panel" className={customColumns ? 'active' : ''} onClick={() => setPanel(panel === 'columns' ? null : 'columns')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M2 2h12v12H2zM6 2v12m4-12v12"/></svg>
            Columns
          </button>
          <button type="button" data-panel="pricing" aria-expanded={panel === 'pricing'} aria-controls="pricing-panel" onClick={() => setPanel(panel === 'pricing' ? null : 'pricing')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M2 2v12h12M4 5l4 3 5 3"/><circle cx="4" cy="5" r="1"/><circle cx="13" cy="11" r="1"/></svg>
            Pricing
          </button>
        </div>
        <div className="toolbar-end">
          <span className="row-count" role="status" aria-live="polite">{rows.length} of {contracts.length} rows</span>
          {hasFilters && <button type="button" className="text-button" onClick={clearFilters}>Clear filters</button>}
          <a className="contact-link" href={CONTACT.url} target="_blank" rel="noopener noreferrer" title="Message the owner on Signal">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M2 3h12v8H6l-3 3v-3H2z"/></svg>
            Contact
          </a>
          <button type="button" className="download-button" disabled={rows.length === 0} title="Download shown rows as CSV, including all columns and full notes" onClick={() => { setPanel(null); downloadContracts(rows); }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M8 2v8m-3-3 3 3 3-3M2 11v3h12v-3"/></svg>
            Download
          </button>
        </div>
      </div>

      {panel === 'pricing' && <PricingPanel rows={filtered} onClose={() => setPanel(null)} />}

      {activeFilters.length > 0 && <div className="filter-summary" aria-label="Active filters">
        {activeFilters.map(field => <button key={field.key} type="button" aria-label={`Remove ${field.label} filter`} onClick={() => setFilters(previous => ({ ...previous, [field.key]: '' }))}>
          {field.label}: {displayLabel(filters[field.key]!)} <span aria-hidden="true">×</span>
        </button>)}
      </div>}

      {panel === 'filter' && <div id="filter-panel" className="panel filter-panel" role="region" aria-label="Filter rows">
        <div className="panel-heading"><strong>Filter rows</strong><button type="button" aria-label="Close filters" onClick={() => setPanel(null)}>×</button></div>
        <p>Show rows matching all filters.</p>
        {filterFields.map(field => <label key={field.key} className="filter-field">
          <span>{field.label}</span>
          <select aria-label={`Filter by ${field.label.toLowerCase()}`} value={filters[field.key] ?? ''} onChange={event => setFilters(previous => ({ ...previous, [field.key]: event.target.value }))}>
            <option value="">All</option>
            {[...new Set(contracts.map(row => row[field.key]))].sort().map(value => <option key={value} value={value}>{displayLabel(value)}</option>)}
          </select>
        </label>)}
        <div className="panel-footer"><button type="button" disabled={!activeFilters.length} onClick={() => setFilters({})}>Clear filters</button><button type="button" onClick={() => setPanel(null)}>Done</button></div>
      </div>}

      {panel === 'sort' && <div id="sort-panel" className="panel" role="region" aria-label="Sort rows">
        <div className="panel-heading"><strong>Sort rows</strong><button type="button" aria-label="Close sort" onClick={() => setPanel(null)}>×</button></div>
        <label className="filter-field"><span>Column</span><select aria-label="Sort column" value={sort?.field ?? ''} onChange={event => setSort(event.target.value ? { field: event.target.value as Field, direction: sort?.direction ?? 'asc' } : null)}>
          <option value="">Original order</option>
          {fields.filter(field => field.key !== 'notes' && field.key !== 'contact').map(field => <option key={field.key} value={field.key}>{field.title}</option>)}
        </select></label>
        <label className="filter-field"><span>Order</span><select aria-label="Sort direction" disabled={!sort} value={sort?.direction ?? 'asc'} onChange={event => setSort(previous => previous ? { ...previous, direction: event.target.value as 'asc' | 'desc' } : null)}>
          <option value="asc">Ascending</option><option value="desc">Descending</option>
        </select></label>
        <div className="panel-footer"><button type="button" disabled={!sort} onClick={() => setSort(null)}>Clear sort</button><button type="button" onClick={() => setPanel(null)}>Done</button></div>
      </div>}

      {panel === 'columns' && <div id="columns-panel" className="panel" role="region" aria-label="Visible columns">
        <div className="panel-heading"><strong>Visible columns</strong><button type="button" aria-label="Close columns" onClick={() => setPanel(null)}>×</button></div>
        <div className="column-options">{fields.map(field => <label key={field.key}>
          <input type="checkbox" checked={!hidden.includes(field.key)} disabled={visibleFields.length === 1 && !hidden.includes(field.key)} onChange={event => setHidden(previous => event.target.checked ? previous.filter(key => key !== field.key) : [...previous, field.key])} />
          {field.title}
        </label>)}</div>
        <div className="panel-footer"><button type="button" disabled={!customColumns} onClick={() => setHidden([...defaultHiddenFields])}>Default columns</button><button type="button" disabled={!hidden.length} onClick={() => setHidden([])}>Show all</button><button type="button" onClick={() => setPanel(null)}>Done</button></div>
      </div>}
    </div>
    <div className="grid-area">
    <DataEditor
      ref={grid}
      width="100%" height="100%"
      columns={columns} rows={rows.length} getCellContent={getCellContent}
      getCellsForSelection={true} copyHeaders rowMarkers="number" rowMarkerWidth={34}
      rowHeight={25} headerHeight={28} theme={theme}
      smoothScrollX smoothScrollY
      keybindings={{ search: false }}
      onCellActivated={([col, row]) => {
        if (visibleFields[col]?.key === 'contact') { window.open(CONTACT.url, '_blank', 'noopener,noreferrer'); return; }
        if (['notes', 'contractValue', 'upfrontAmount'].includes(visibleFields[col]?.key) && rows[row]) {
          setPanel(null);
          setNote(rows[row]);
        }
      }}
      onColumnResize={(column, width) => setWidths(previous => ({ ...previous, [column.id!]: width }))}
      onHeaderClicked={column => {
        const field = visibleFields[column].key;
        setSort(previous => previous?.field === field
          ? previous.direction === 'asc' ? { field, direction: 'desc' } : null
          : { field, direction: 'asc' });
      }}
    />
    {rows.length === 0 && <div className="empty-state" role="status"><p>No matching contracts.</p><button type="button" onClick={clearFilters}>Clear search and filters</button></div>}
    </div>
    <NotesDialog contract={note} onClose={() => { setNote(null); grid.current?.focus(); }} />
  </main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
