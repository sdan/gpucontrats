# GPU contracts

The interface is one full-window Glide Data Grid and a compact search/filter/sort/columns toolbar. It retains plain spreadsheet styling: Arial, 25px rows, gray gridlines, and ordinary status text. There is no navigation, footer, sign-in, database, or backend. The only outbound action is Contact, which opens the owner's Signal link in a new tab; it appears as a column on every row, in the Details heading, and in the toolbar. Search ignores the link. Static assets deploy to Cloudflare Pages.

## Control flow

The site owner is selling these contracts. `src/contracts.ts` holds their offers, and the interface describes them as inventory. There is no source column or source filter because every offer has the same seller. Public pricing used for research must never become inventory rows. `src/view.ts` searches and filters the records. `src/main.tsx` sorts the filtered result and supplies visible fields to Glide. Search, filters, sort and column visibility are local view state; none changes the records. Cell overlays are read-only. `src/style.css` sizes the viewport, toolbar and popovers, and respects reduced motion.

## Data rules

- Every row has an offer ID, its `id`, which buyers quote on Signal: `<IN|US|POD|B300>-<month>-<nodes N or GPUs G>`, plus `-3Y` or `-5Y` when the allocation has two terms. Examples: `IN-DEC-64N-3Y`, `US-DEC-32N-3Y`, `POD-FEB-144N`, `B300-JAN-1152G`. The offer ID is the first column and the Details heading, and the dialog's Signal button names it. "SKU" is deliberately not used: in this market it means the hardware variant, and every row here is the same one.
- One row is one contract option. `allocation` links the 3-year and 5-year alternatives for the same capacity. No total GPU capacity is computed: the India stages are cumulative to the 64-node December ceiling, and the U.S. 32-node and 1,152-GPU allocations may overlap other rows.
- Every DGX B300 node has 8 B300 GPUs. 16 nodes = 128 GPUs, 32 = 256, 64 = 512, 144 = 1,152, 256 = 2,048, 512 = 4,096. India December keeps the "up to" qualifier on nodes and GPUs. The 1,152-GPU January allocation has no confirmed node count, so the note states 144 at 8 per node and the Nodes field stays empty.
- The four SuperPOD offers show `DGX B300 SuperPOD`. The 144-node pods are two 72-node XDR scalable units each; the 256- and 512-node pods are four and eight 64-node clusters. The 32-node and 1,152-GPU allocations have no confirmed server platform, so Hardware falls back to the GPU model.
- Every allocation runs XDR InfiniBand at 800 Gb/s, as stated by the owner. Network holds one value, `XDR InfiniBand 800G`, so the filter has one option.
- Dates are the owner's delivery dates: October, mid-November, December and end-December 2026; January and February 2027. October India is Taken. Future dates are Scheduled.
- Prices are USD per GPU-hour, set by the owner. The January 1,152-GPU rate is a lower bound, displayed "Above $4.95". Unpriced rows display "Price on request". The 16-node India stages and the U.S. 32-node allocation carry a small-cluster premium over the 64-node allocations.
- Payment percentages apply to contract value. The wording (deposit, upfront, prepayment, advance) follows each term sheet. The six-month advance is priced at 730 hours per month.
- Copy is declarative and in the owner's voice, in the register of a GPU capacity listing. Unknowns are listed as "TBD". The words "assumed", "unconfirmed" and "illustrative" do not appear.

## Sources

- [NVIDIA DGX B300 hardware](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)
- [NVIDIA B300 SuperPOD architecture](https://docs.nvidia.com/dgx-superpod/reference-architecture/scalable-infrastructure-b300/latest/dgx-superpod-architecture.html)
- [NVIDIA XDR reference architecture](https://docs.nvidia.com/dgx-superpod/reference-architecture/scalable-infrastructure-b300-xdr/latest/dgx-superpod-components.html)
- [NVIDIA scalable-unit configuration](https://docs.nvidia.com/mission-control/docs/systems-administration-guide/2.1.0/overview.html)

NVIDIA references explain hardware specifications and cluster terminology. Commercial terms and delivery details come from the owner. Missing details remain unspecified or TBD.

## Build and publish

Run `npm ci`, `npm test`, and `npm run build`. `npm run dev` serves the local site. `npm run deploy` builds and uploads `dist/` to the Cloudflare Pages project `gpu-contracts`, production branch `main`. The command requires a current Cloudflare login.

Only `dist/` is uploaded. Research files, source notes, credentials and local tests are not deployment inputs.

There is no analytics client or tracking integration, at the owner's request.

## Grid controls

The visible search box narrows rows across all columns, including hidden fields and notes. Space-separated search terms must all match; search is case-insensitive. Cmd/Ctrl+F focuses the search box. Filter combines exact values for status, location, term and network; the active filters can be removed individually or cleared. A count and an empty state make the result explicit.

Sort uses one column and direction; unknown numeric values remain last. Column headers still cycle through ascending, descending and original order. Columns lets readers hide fields while retaining at least one. Drag a header edge to resize. Select cells and copy with standard keyboard shortcuts, including the column headers. On a phone, the toolbar wraps and the grid scrolls horizontally.

Eleven columns are visible by default: Offer, Hardware, Capacity, Location, Start, Term, $/GPU-hour, Upfront, Status, Details, and Contact. Capacity combines existing GPU and node counts without deriving missing quantities. Both bounds remain visible when the allocation is capped; sorting uses numeric GPU counts with unknowns last. Separate GPU and node counts, GPU model, contract value, upfront amount, Network and Allocation remain available in Columns and CSV. Details combines the quantities and shows the dollar figures and fabric. `defaultHiddenFields` in `contracts.ts` defines only presentation, never data removal. Columns can restore the default or show all fields. The layout follows [gpulist's listing fields](https://gpulist.ai/new) and [SF Compute's contract specifications](https://sfcompute.com/legal/terms-of-service); no external inventory or trading features are imported.

The green Download button stays at the right edge of the toolbar, including when controls wrap on phones. It calls `src/csv.ts` to save `gpu-contracts.csv` in the browser, exporting the currently filtered and sorted rows with all columns, even hidden ones, and complete notes. CSV uses quoted fields, CRLF record separators, and a UTF-8 BOM for Excel. Formula-like text stays literal. No network request or backend is involved; the button is disabled when no rows match.

Details cells show "View details" and open with one click, tap, or keyboard activation. `src/NotesDialog.tsx` uses a native modal dialog for focus management and Escape-to-close. It shows contract facts, including fields hidden from the grid, followed by the full selectable note, calculations and NVIDIA references. Its body scrolls within the viewport while Close stays visible. Details use Glide's single-cell activation setting; copying the cell still returns the full note. The selected contract comes from the current filtered/sorted rows and visible column mapping.

## Contract value and payments

`src/amounts.ts` computes each row independently. Contract value is GPUs × hourly rate × 8,760 hours × years, billed 24/7 for the full term, excluding taxes. A 3–5 year term produces separate 3-year and 5-year values. An "above" rate produces an "Above" value, an "up to" GPU count produces an "Up to" value, and the two together produce no value because a ceiling times a floor bounds nothing. Amounts round to cents after the full calculation and are never abbreviated. Sorting uses the first displayed value and leaves missing amounts last.

Upfront amounts are the payment percentage applied to contract value. The six-month advance uses 730 hours per month. `display(row, 'notes')` appends the contract value and upfront lines, with their arithmetic, to the row's note, so the dialog, search, copy and CSV carry the same text. No portfolio total is computed because allocations overlap and terms are alternatives.

## Pricing comparison

The optional Pricing panel keeps the default view as a grid. `src/pricing.ts` pairs exact 3- and 5-year rates only within the same available allocation, using the currently filtered records. Identical pairs for the same location and hardware share one chart; allocation identifiers remain distinct and capacity is never summed. Taken offers, missing prices, strict lower bounds, and term ranges cannot supply chart points. `src/PricingPanel.tsx` renders the two quoted options with an explicit price scale and the accompanying upfront terms. Percentage differences compare hourly rates, not total commitment or financing-adjusted cost. There is no interpolation, historical series, market benchmark, or forecast.

## Essential maintenance

Update the records when the owner confirms hardware, exact RFS, location, pricing basis or allocation status. Keep unknowns explicit and avoid capacity totals until overlapping allocations are resolved.
