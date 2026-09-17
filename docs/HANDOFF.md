# Handoff — continuing this work in a fresh session

Read this first if the terminal or AI session that built the project is gone.
It captures everything that is not derivable from the code or git history.

## What this is

OPENLANE take-home: buyer side of a vehicle auction platform. Owner: Mahnaz Kamran.
Repo lives at `~/dev/the-block`, forked from `https://github.com/kar-dmp/the-block.git`.
The brief is `docs/CHALLENGE.md`; the plan we built from is `docs/PLAN.md`; the
submission README is the root `README.md`.

**Status: feature-complete for submission. Not yet pushed to the fork.**

## How we work (owner's preferences)

- **Nothing is committed until Mahnaz has looked at it** running in the browser and/or in
  `git diff`. Build a step, say "ready for review", wait, then commit on "all good / continue".
- Commit per step with a conventional prefix (`feat(api):`, `feat(web):`, `docs:`, `chore:`)
  and `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Decided up front: **.NET 9** (not 10), **CSS Modules** (not Tailwind), React + Vite client,
  anonymous `X-Buyer-Id` identity, plan kept in `docs/`.
- Mahnaz checks the UI herself; the AI session had no browser access (cli-chrome bridge not
  paired), so visual verification is always hers.

## Run / verify

```bash
npm run install:all   # once
npm run dev           # API :5080 + web :5173 (Vite proxies /api)
npm test              # 34 xUnit + 12 Vitest, all passing as of 1f6fdeb
```
Servers were started with `nohup npm run dev > /tmp/dev.log &`; kill with
`pkill -f TheBlock.Api; pkill -f vite; pkill -f concurrently`. `dotnet run` does **not**
hot-reload — restart after any server change. Vite does hot-reload.

Toolchain on this Mac: Node 26, npm 10, .NET SDKs 9.0.317 and 10.0.400. The `.slnx`
solution was produced by the .NET 10 SDK; SDK 9.0.200+ opens it. No pnpm, no gh CLI.

## Architecture in one screen

```
server/TheBlock.Api
  Domain/   Vehicle (record from JSON), AuctionClock (time normalisation, TimeProvider-injected),
            AuctionState, Bid, AuctionLedger (per-vehicle mutable bid state), BiddingRules (pure)
  Data/     VehicleRepository (loads ../../data/vehicles.json, snake_case), BidStore (ledger per
            vehicle + per-vehicle lock, Mutate<T>), VehicleQuery (search/filter/sort/page/facets)
  Contracts/ DTOs (camelCase out, enums snake_case), VehicleMapper, BidRejected (409 body)
  Endpoints/ VehicleEndpoints (GET list, GET detail), BidEndpoints (POST bids, POST buy-now, GET bids)
server/TheBlock.Api.Tests   xUnit: AuctionClock, BiddingRules, BidStore (50-way race), VehicleQuery
client/src
  api/      types.ts (mirrors contracts), client.ts (fetch + X-Buyer-Id, BidRejectedError),
            hooks.ts (useVehicles, useVehicle w/ live polling), mutations.ts (placeBid, buyNow)
  lib/      format.ts (en-CA), bidding.ts (client mirror of increment rules), buyer.ts, useNow.ts
  pages/    InventoryPage (all state in URL), VehicleDetailPage (+ mobile bottom sheet)
  components/ VehicleCard, StateBadge, Filters, PriceRange, SearchBar, SortSelect, Pagination,
            EmptyState, Layout, Gallery, SpecList, ConditionCard, BidHistory, BidPanel, Button
```

## Decisions and the reasoning behind them

| Decision | Why |
|---|---|
| Backend exists although frontend-only was allowed | Bid validation + concurrency are the only real domain logic; doing it client-side is theatre. Talking point for the walkthrough. |
| Time window `[now−4d, now+3d]`, 72 h auctions | First tried `[now−2d, now+5d]`: nothing had ended. Current split ≈ 88 upcoming / 86 live / 26 ended. |
| Increments $250 <10k, $500 <50k, $1,000 ≥50k | Dataset prices are $500 multiples; bands feel realistic. Same table on client (`lib/bidding.ts`) and server. |
| `ExceedsBuyNow` checked before `NotOnIncrement` | Bug found by test: a bid above Buy Now was reporting an increment error. More useful message wins. |
| Seeded bids shown as one summary row | Dataset has count + high bid but no history; we don't fabricate a timeline. |
| Price filter uses current bid ?? starting bid | Matches the number on the card and the price sort. Bounds computed *before* the price filter so hints don't collapse. |
| Top-N fills to N even with zero-bid vehicles | Product call: "top 5" should always show five. Mahnaz was told it's a one-liner to change. |
| `top` forces `most_bids` sort only when sort is default | Explicit sort re-orders the same five. |
| Search haystack includes city + dealership | "ford" matches 26 not 16 because of dealership names; accepted, make filter is the precise tool. |
| Search example "2023 bronco" from the brief returns 0 | Not a bug: dataset has no 2023 Bronco. |

## Commit history (all on `main`)

```
1f6fdeb feat: price range filter, top-5 most-bid toggle, most-bids sort
833ab72 docs: submission README, move challenge brief to docs/
1906130 feat(web): vehicle detail page and bid flow
e3545ce feat(api): place bid, buy now, bid history endpoints
8920a69 feat(web): inventory page with search, facet filters, sort, pagination
ed66c66 feat(api): vehicle catalogue, auction clock, search/filter/sort endpoints
0e842ad chore: scaffold React client and .NET 9 API
```

## Open items

1. **Push to the fork** and send the link to the OPENLANE contact — Mahnaz's call, not done.
2. **README "Time spent"** says ~4 h; Mahnaz should set her real number. The "How I used AI"
   section is written in her voice — she should confirm the framing.
3. **Mobile visual pass** — bottom sheet (detail) and filter drawer (inventory) only checked by
   resizing on desktop.
4. Stretch ideas not built, listed in README "What I'd do with more time": SSE/SignalR push,
   My Bids page, proxy bidding, persistence, soft-close, a11y audit, Playwright e2e.

## Gotchas learned

- `tsconfig` has `erasableSyntaxOnly`: no TS parameter properties in classes.
- oxlint flags `setState` inside `useEffect`; use the "adjust state during render" pattern
  (see `SearchBar.tsx`, `PriceRange.tsx`).
- `FakeTimeProvider.SetUtcNow` cannot go backwards; pick test vehicles that map into the future.
- xUnit `InlineData` with `null` needs `int?` params, not `double?`.
- Minimal API binding failure (e.g. `page=abc`) returns 400 but logs a dev-page exception; harmless.
