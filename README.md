# gpucontrats

A spreadsheet-style GPU contract inventory built with [Glide Data Grid](https://github.com/glideapps/glide-data-grid), React, TypeScript, and Vite.

**[Live site](https://gpu-contracts.pages.dev/)**

The default columns are Offer, Hardware, Capacity, Location, Start, Term, $/GPU-hour, Upfront, Status, Details, and Contact. Every row has an offer ID such as US-DEC-64N-3Y; quote it when you message on Signal. Contact opens the owner's Signal link; the same link is in the Details heading and the toolbar. Capacity combines GPU and node counts, preserving upper limits and leaving unknown counts unspecified. Search and filter offers, sort prices, hide or resize columns, and copy cells. Click View details for fabric, payment terms, contract value, and the full note. Columns lets you show every field or restore the default view. The Pricing panel compares quoted 3-year and 5-year options for the same allocation, including upfront terms.

Download saves the filtered rows in their current sort order as an Excel-compatible CSV, including all columns and full notes.

The grid shows hourly rates and payment terms for the owner's allocations. Details shows contract value (GPUs × rate × 8,760 hours × years, billed 24/7 for the full term), the upfront amount on contract value, the fabric, and the full note. Rates are USD per GPU-hour and exclude taxes. The January 1,152-GPU rate is a lower bound, shown as "Above". Unknowns are listed as TBD.

The app runs entirely in the browser and deploys as static files to Cloudflare Pages. It has no database, login, payments, or analytics.

## Run locally

Use Node.js 22 or later and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

```sh
npm test
npm run build
npm run preview
```

## Update the inventory

Edit [`src/contracts.ts`](src/contracts.ts). Each row is a contract option. Options for the same capacity share an `allocation` identifier, so adding all row capacities would double-count inventory.

Keep unknown values explicit. Taken allocations, missing prices, and rates expressed as a lower bound are excluded from the term comparison. The displayed offers belong to the site owner; public pricing research is not inventory.

See [`ARCHITECTURAL.md`](ARCHITECTURAL.md) for the data rules and component flow.

## Deploy to Cloudflare Pages

The included configuration targets the `gpu-contracts` Pages project and its `main` production branch.

```sh
npx wrangler login
npm run deploy
```

For a fork, create a Pages project in your own Cloudflare account, then update the project name in `wrangler.jsonc` and the `deploy` script in `package.json`. Only `dist/` is deployed. No credentials belong in the repository.

## License

[MIT](LICENSE), copyright 2026 sdan.
