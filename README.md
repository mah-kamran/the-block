# The Block — buyer-side auction prototype

The buyer side of a vehicle auction marketplace: browse and search 200 dealer-listed
vehicles, inspect specs, condition and damage, and bid in live auctions.

**Stack:** React 19 + Vite + TypeScript (CSS Modules) · ASP.NET Core 9 minimal API · in-memory data.

> The original challenge brief is in [`docs/CHALLENGE.md`](docs/CHALLENGE.md); the plan I worked from is in [`docs/PLAN.md`](docs/PLAN.md).

## How to run

Prerequisites: **Node 20+** and the **.NET 9 SDK** (9.0.200 or later — the solution uses the `.slnx` format).

```bash
git clone <this repo> && cd the-block
npm run install:all      # root tooling, client packages, dotnet restore
npm run dev              # starts API on :5080 and web on :5173
```

Open **http://localhost:5173**. Vite proxies `/api` to the .NET server, so there is no CORS or env setup.

Browsing is open to everyone. To bid, sign in with one of the seeded demo accounts (password `demo123` for all):

| Username | Name |
|---|---|
| `alice` | Alice Chen |
| `bob` | Bob Tremblay |
| `carol` | Carol Singh |

To see the outbid flow in one browser: sign in as Alice, bid, sign out, sign in as Bob, outbid her, then sign back in as Alice.

Other scripts:

```bash
npm test                 # xUnit (server) + Vitest (client)
npm run build            # production client build + Release server build
npm run dev:api          # server only
npm run dev:web          # client only
```

Running the two halves separately works too: `dotnet run --project server/TheBlock.Api` and `npm --prefix client run dev`.


## What I built

**Inventory** — search (tokenised, so "2023 explorer" or a lot number works), a price range (on current bid, falling back to starting bid) plus facet filters with live counts (auction status, make, body style, province, title), seven sort orders including "Most bids", a "Top 5 most bid" toggle that ranks the five most popular vehicles within whatever else is selected, and pagination. Every piece of query state lives in the URL, so views are shareable and the back button behaves. Cards show state with a ticking countdown, current or starting bid, bid count, reserve status, a warning chip for salvage/rebuilt titles, and your own standing ("You lead" / "Outbid").

**Vehicle detail** — gallery, specs, a condition section with a graded meter, the report, a title-status callout and damage notes, selling dealership, and bid history. The bid panel defaults to the minimum bid, offers quick-bid chips, validates as you type with a message that says exactly what is wrong, then confirms before placing. Buy Now has its own confirmation. While an auction is live the page polls every 10 s, so being outbid from another browser shows up without a refresh.

**Bidding rules (server-side)** — minimum bid = current bid + increment ($250 under $10k, $500 under $50k, $1,000 above); bids must land on an increment; a bid at or above Buy Now is redirected to Buy Now; you cannot outbid yourself; only live auctions accept bids. Rejections return **409** with a reason code, a human message and the fresh minimum so the client corrects itself in one round trip.

**Accounts and My Bids** — cookie-based sessions with three seeded demo users. Bids are recorded against the signed-in user, so they follow you across sign-out, sign-in and browsers. A **My Bids** page groups everything you have bid on into Outbid, Leading, Won and Closed, with the amount needed to retake the lead.

**Mobile** — filters become a slide-in sheet; the bid panel becomes a bottom sheet opened from a fixed price bar.

## Assumptions and scope

- **Seeded accounts, no registration.** Three demo users live in `server/TheBlock.Api/Auth/seed-users.json`; passwords are hashed at startup with ASP.NET's `PasswordHasher`. Sessions are an HttpOnly, SameSite cookie issued by ASP.NET cookie authentication. Because the client is same-origin through the Vite proxy, no tokens or CORS are involved. The brief said auth was optional; it was added after the core was done because "my bids follow me" is the part of identity a buyer actually feels.
- **Auction times are normalised.** The dataset's `auction_start` values are a fixed week in April 2026 with no end time. At startup the server maps that range onto *[now − 4 days, now + 3 days]* and gives every auction a 72-hour window, which yields a realistic mix of upcoming, live and ended lots that keeps progressing while the server runs.
- **Seeded bids have no history.** The dataset gives a current bid and a count but no individual bids. The UI shows those as one summary row ("16 earlier bids") rather than fabricating a timeline. Bids placed through the API are recorded individually on top.
- **In-memory only.** State resets on server restart. With 200 records and no persistence requirement, a database would add setup friction for reviewers without changing any product decision.
- **Placeholder images** come from `placehold.co`, so the UI needs a network connection to show them.
- Not built, deliberately: seller tooling, checkout/payments, proxy (max) bidding, watchlists, push notifications, i18n beyond `en-CA` formatting.

## Notable decisions

**Identity is just where the buyer id comes from.** The ledger always keyed bids by an opaque buyer id. The first version generated it in the browser; the auth version reads it from the session cookie's claims. `BiddingRules`, `AuctionLedger`, `BidStore` and the status computation did not change when auth was added, which is the test of whether the seam was in the right place.

**Why a backend at all when frontend-only was allowed.** Bid validation and concurrency are the only real domain logic in this product. Doing them in the browser would be theatre — nothing stops a second tab from disagreeing. The server is the single authority; the client mirrors the rules (`client/src/lib/bidding.ts`) purely for instant feedback, and the tests for both sides pin the same increment table.

**Per-vehicle lock.** `BidStore.Mutate` runs read → validate → write under a lock keyed by vehicle id, so two buyers bidding at the same instant are serialised and the loser gets a 409 with the new minimum instead of silently clobbering the winner. There is a 50-way concurrency test for this.

**`TimeProvider` in the clock.** `AuctionClock` takes an injected `TimeProvider`, so the state-boundary tests freeze time instead of sleeping.

**URL as state.** Filters, search, sort and page are all in the query string. It made the "clear all" and back-button behaviour fall out for free and is what a buyer would expect when sharing a search with a colleague.

**Reserve status as a first-class signal.** 140 of 200 vehicles have a reserve and 64 have already met it. Whether the reserve is met is the difference between "this will sell" and "this might not", so it is on every card and in the panel, not buried in a tooltip.

**Title status is a warning, not a spec.** 30 vehicles are salvage or rebuilt. That changes what a buyer should pay, so it gets a red chip on the card and a plain-language callout on the detail page.

**CSS Modules over a utility framework.** Scoped, readable per component, one `tokens.css` for colour, type and spacing. No build-time dependency on a framework's class vocabulary for a reviewer to learn.

## Testing

- **Server (xUnit, 37 tests):** `BiddingRules` — every increment band, minimum-bid derivation, and each rejection reason including the Buy Now ceiling and self-outbid; `AuctionClock` — window mapping and Upcoming→Live→Ended boundaries with a fake clock; `BidStore` — seeded-state layering and a 50-thread race that asserts bids strictly increase; `VehicleQuery` — price filtering semantics, facet bounds, and top-N ranking; `AuthFlow` — end-to-end over HTTP with `WebApplicationFactory`: anonymous can browse but not bid, wrong password is rejected, and bids follow the user across sign-out and a different sign-in on the same client.
- **Client (Vitest + Testing Library, 31 tests):** formatting helpers, the client-side rule mirror, and `BidPanel` behaviour — defaulting to the minimum, blocking review with an explanatory message, confirm-then-place, the non-live and outbid states, and the sign-in prompt for anonymous visitors. The API client maps a 409 to `BidRejectedError` and other failures to `ApiError` with the server's message, and builds the inventory query string. The auth hooks treat 401 as anonymous and drop the whole query cache on sign-in and sign-out. `PriceRange` commits on blur or Enter, swaps a backwards range, and adopts URL changes; `StateBadge` shows Sold over any state and the right countdown wording.
- **Manual:** the full bid / outbid / Buy Now / sold flow exercised over HTTP against every 409 path, and a viewport pass for the mobile layouts.

Run everything with `npm test`.

## What I'd do with more time

1. **Real-time push** (SSE or SignalR) instead of 10-second polling on the detail page, and live badges on inventory cards.
2. **Registration and password reset** — accounts are seeded only; the store and hashing are in place for a register endpoint.
3. **Proxy bidding** (set a maximum, let the server bid on your behalf) — the ledger design supports it, the UI does not yet.
4. **Persistence** — swap the in-memory store for SQLite/Postgres behind the same `BidStore` interface.
5. **Auction-end handling** — soft-close extension when a bid lands in the final minutes, and a proper "you won / reserve not met" outcome flow.
6. **Accessibility audit** with a screen reader; the structure is there (labels, live regions, dialogs) but it has not been tested with real assistive tech.
7. **E2E test** (Playwright) for the bid flow across two browser contexts.

## How I used AI

I used Claude Code as a pair programmer. I chose the stack (.NET 9 API, React with CSS Modules) and the working rhythm: plan first, build in reviewable steps, commit only after I had looked at the result. Claude drafted the plan in `docs/PLAN.md` — the normalised time window, the increment bands, treating seeded bids as a summary row, the reserve and title-status emphasis — and I approved or adjusted it before any code was written. Claude then wrote most of the code and tests to that plan; I reviewed each step in the running app and in the diff before it was committed. Tests caught at least one thing review did not: a rule-ordering bug where a bid above Buy Now reported an increment error instead of pointing at Buy Now. Everything in the repo is something I can walk through line by line.
