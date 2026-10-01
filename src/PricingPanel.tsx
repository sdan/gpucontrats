import type { Contract } from './contracts';
import { compareTerms } from './pricing';

const money = (value: number) => `$${value.toFixed(2)}`;

export function PricingPanel({ rows, onClose }: { rows: Contract[]; onClose: () => void }) {
  const comparisons = compareTerms(rows);
  return <div id="pricing-panel" className="panel pricing-panel" role="region" aria-label="Price by term">
    <div className="panel-heading"><strong>Price by term</strong><button type="button" aria-label="Close pricing" onClick={onClose}>×</button></div>
    <p>Available offers in this view, USD per GPU-hour.</p>
    {comparisons.length ? <>
      {comparisons.map(comparison => {
        const { threeYear, fiveYear } = comparison;
        // Show the numeric scale explicitly; lines only join the two quoted options.
        const min = Math.floor(Math.min(threeYear, fiveYear));
        const max = Math.max(min + 1, Math.ceil(Math.max(threeYear, fiveYear)));
        const y = (price: number) => 123 - (price - min) / (max - min) * 94;
        const change = (fiveYear - threeYear) / threeYear * 100;
        const changeText = change === 0 ? 'Same hourly rate' : `${Math.abs(change).toFixed(1)}% ${change < 0 ? 'lower' : 'higher'} hourly rate`;
        return <figure key={comparison.allocations[0]} className="term-comparison">
          <figcaption><strong>{comparison.location}</strong><span>{changeText}</span></figcaption>
          <div className="comparison-context">{comparison.gpu === 'Not specified' ? 'GPU model not specified' : comparison.gpu} · {comparison.allocations.length} {comparison.allocations.length === 1 ? 'allocation' : 'allocations'}</div>
          <svg viewBox="0 0 340 157" role="img" aria-label={`${comparison.location}: 3 years at ${money(threeYear)}, 5 years at ${money(fiveYear)} per GPU-hour. ${changeText}.`}>
            {[0, 0.5, 1].map(fraction => {
              const value = min + fraction * (max - min);
              return <g key={fraction}><line x1="52" x2="304" y1={y(value)} y2={y(value)} stroke="#ddd"/><text x="42" y={y(value) + 4} textAnchor="end">{money(value)}</text></g>;
            })}
            <line x1="83" x2="270" y1={y(threeYear)} y2={y(fiveYear)} stroke="#217346" strokeWidth="1.5" strokeDasharray="4 3"/>
            <circle cx="83" cy={y(threeYear)} r="4" fill="#217346"/>
            <circle cx="270" cy={y(fiveYear)} r="4" fill="#217346"/>
            <text x="83" y={y(threeYear) - 10} textAnchor="middle" className="point-label">{money(threeYear)}</text>
            <text x="270" y={y(fiveYear) - 10} textAnchor="middle" className="point-label">{money(fiveYear)}</text>
            <text x="83" y="149" textAnchor="middle">3 years</text><text x="270" y="149" textAnchor="middle">5 years</text>
          </svg>
          <table className="term-table" aria-label={`${comparison.location} payment terms`}>
            <thead><tr><th>Term</th><th>Per GPU-hour</th><th>Upfront</th></tr></thead>
            <tbody><tr><td>3 years</td><td>{money(threeYear)}</td><td>{comparison.threeUpfront}</td></tr>
              <tr><td>5 years</td><td>{money(fiveYear)}</td><td>{comparison.fiveUpfront}</td></tr></tbody>
          </table>
        </figure>;
      })}
      <p className="comparison-note">Hourly rate by term. Upfront terms differ; contract value is in Details.</p>
    </> : <p>No matching 3- and 5-year options in this view. Clear search or filters to see comparable offers.</p>}
    <p className="comparison-note">Taken allocations and offers without a fixed rate are excluded.</p>
    <div className="panel-footer"><span>Our offers</span><button type="button" onClick={onClose}>Done</button></div>
  </div>;
}
