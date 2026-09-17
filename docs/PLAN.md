# The Block — Implementation Plan

Buyer side of a vehicle auction platform. React + Vite + TypeScript frontend,
ASP.NET Core (.NET 9) minimal-API backend, in-memory data. Timebox 3–4 h.

## What the data tells us

| Fact | Consequence |
|---|---|
| 200 vehicles, all fields present, ids and lots unique | Load once into memory, index by id. No DB. |
| 88 have a current bid (1–18 bids), 112 have none | Cards must handle "No bids yet — starting at $X". |
| 140 have a reserve, 64 of those already met | "Reserve met / not met / no reserve" badge is a real trust signal. |
| 39 have a Buy Now price; generator keeps current_bid ≤ buy_now − 500 | Buy Now button on detail; a bid must never exceed buy_now (server rule). |
| Prices are multiples of $500 | Increment table stays in $500 units below $50k. |
| auction_start spans 2026-03-31 → 2026-04-06, no end time | Normalize relative to now and invent a fixed duration. |
| 3–6 placeholder images each | Gallery with thumbnails; placehold.co is external, show a skeleton. |
| 15 makes, 5 body styles, 7 provinces, 3 title statuses | Facet filters, all small enough for checkbox lists. |
| 14 salvage, 16 rebuilt titles | Title status gets a warning colour on cards, not buried in specs. |

## Architecture

```
the-block/
├── data/vehicles.json          # untouched source of truth
├── server/                     # ASP.NET Core 9 minimal API
│   ├── TheBlock.Api/
│   │   ├── Program.cs          # DI, endpoints mapping, static JSON load
│   │   ├── Domain/             # Vehicle, Bid, AuctionState, BiddingRules, AuctionClock
│   │   ├── Data/               # VehicleRepository (in-memory), BidStore
│   │   ├── Endpoints/          # VehicleEndpoints.cs, BidEndpoints.cs
│   │   └── Contracts/          # DTOs returned to the client
│   └── TheBlock.Api.Tests/     # xUnit: BiddingRules + AuctionClock
├── client/                     # React 19 + Vite + TS, CSS Modules
│   └── src/
│       ├── api/                # typed fetch client + TanStack Query hooks
│       ├── pages/              # InventoryPage, VehicleDetailPage, NotFound
│       ├── components/         # VehicleCard, Filters, SearchBar, BidPanel, Gallery, StateBadge, Countdown, Price
│       ├── lib/                # format.ts (CAD, km, dates), buyer.ts (localStorage id)
│       └── styles/             # tokens.css (colours, spacing, type), global.css
├── package.json                # root: `npm run dev` runs both via concurrently
└── README.md                   # replaced with the submission README
```

Vite proxies `/api` → `http://localhost:5080`, so no CORS config in dev.

### Why a backend when frontend-only is allowed
Bid validation and concurrency are the only real domain logic. Doing them
client-side would be theatre. The server is the single authority on
"is this bid valid" and the client mirrors the rules only for instant feedback.

## Backend design

### Auction clock (time normalization)
Dataset range [2026-03-31 09:00, 2026-04-06 20:00] is linearly mapped onto
[now − 4 d, now + 3 d] at startup. Each auction runs **72 h** from its shifted start, giving roughly 45% live, 45% upcoming, 10% ended.

```
Upcoming : now <  start
Live     : start ≤ now < end
Ended    : now ≥ end
```
The offset is computed once and stored, so states progress naturally while the
server runs. `AuctionClock` takes `TimeProvider` so tests can freeze time.

### Bidding rules (pure, unit-tested)
- Auction must be Live.
- Minimum next bid = `current_bid + increment(current_bid)`, or `starting_bid` if no bids.
- Increment table: `< $10k → $250`, `< $50k → $500`, `≥ $50k → $1,000`.
- Bid must be a whole-dollar multiple of the increment.
- If `buy_now_price` is set, bid must be `< buy_now_price` (use Buy Now instead).
- Buyer cannot outbid themselves when already high bidder (returns 409 `already_high_bidder`).
- Buy Now: only when Live; ends the auction immediately with `sold` = true.

### Concurrency
`BidStore` holds a `SemaphoreSlim`/lock per vehicle id. Read → validate → write
happens inside it. Losers get **409** with `{ reason, minimumBid, currentBid }`
so the UI can re-render the correct minimum without a refetch.

### Buyer identity
No auth. Client generates a UUID once into localStorage and sends
`X-Buyer-Id` on every request. Server uses it to compute `yourStatus`:
`none | high_bidder | outbid` per vehicle.

### API
```
GET  /api/vehicles?q=&make=&bodyStyle=&province=&state=&titleStatus=&sort=&page=&pageSize=
     → { items: VehicleSummary[], total, page, pageSize, facets }
GET  /api/vehicles/{id}            → VehicleDetail (includes bid history, yourStatus, minimumBid)
POST /api/vehicles/{id}/bids       { amount }  → 201 VehicleDetail | 409 BidRejected | 400
POST /api/vehicles/{id}/buy-now    → 200 VehicleDetail | 409
GET  /api/buyers/me/bids           → vehicles this buyer has bid on (stretch)
```
`sort`: `ending_soon` (default; Live first by end asc, then Upcoming, then Ended),
`price_asc`, `price_desc`, `year_desc`, `odometer_asc`, `newly_listed`.
Search `q` matches year, make, model, trim, VIN, lot (case-insensitive, tokenized so
"2023 bronco" works).

## Frontend design

### Inventory page
- Header with search. Left rail filters on desktop; collapsible "Filters (n)" sheet on mobile.
- Facets: auction state, make, body style, province, title status. Counts shown per facet.
- Sort dropdown. Result count. Filters live in the URL (`useSearchParams`) so views are shareable and back-button works.
- Card: image, `year make model trim`, lot, odometer, location, state badge + countdown,
  current bid (or "Starting at"), bid count, reserve badge, your-status chip.
- Grid: 3 cols ≥1200, 2 cols ≥720, 1 col below. 20 per page with pagination.
- Skeleton cards while loading, designed empty state for no results.

### Detail page
- Two-column ≥960: gallery + facts left, sticky bid panel right. Single column on mobile,
  bid panel becomes a fixed bottom bar with "Place bid" opening a sheet.
- Bid panel: state + countdown, current bid, reserve status, minimum next bid,
  quick buttons (+1, +2, +5 increments), custom amount input with inline validation,
  confirm step ("Bid $23,500 on lot A-0043?"), Buy Now button when available.
  After success: "You're the high bidder" state. On 409: message + minimum updates.
- Below: specs grid, condition (grade meter 1–5 + report), damage notes list,
  title status callout when not clean, dealership + location, bid history table.
- Detail refetches every 10 s while Live so outbids surface (cheap stretch, TanStack `refetchInterval`).

### Styling
CSS Modules per component, shared `tokens.css` custom properties. System font stack.
One accent colour, semantic colours for live/upcoming/ended/warning. Focus rings kept.
en-CA formatting for currency and numbers.

## Testing
- xUnit: `BiddingRules` (min bid, increments, buy-now ceiling, self-outbid, not live),
  `AuctionClock` state boundaries, one repository search test.
- Vitest + Testing Library: `BidPanel` validation messages, `format.ts`.
- Manual: mobile viewport pass in devtools.

## Build order (target 3.5 h)
1. Scaffold server + client, Vite proxy, root `npm run dev`, README stub. **20 min**
2. Server: load JSON, AuctionClock, list + detail endpoints, facets. **30 min**
3. Client: tokens, InventoryPage, cards, search, filters, URL state. **50 min**
4. Server: BiddingRules + BidStore + bid/buy-now endpoints + xUnit. **30 min**
5. Client: DetailPage, Gallery, BidPanel flow, 409 handling, your-status chips. **50 min**
6. Mobile polish, empty/error states, README (decisions, assumptions, time). **30 min**

Stretch, only if 1–6 are solid: My Bids page, watchlist, live polling badge on cards.

## Out of scope (documented in README)
Auth, persistence across restarts, seller tooling, payments, proxy bidding,
image hosting, i18n beyond en-CA, real-time push (polling instead).
