using TheBlock.Api.Contracts;
using TheBlock.Api.Domain;

namespace TheBlock.Api.Data;

public sealed record VehicleQueryParams(
    string? Q,
    string[] Make,
    string[] BodyStyle,
    string[] Province,
    string[] State,
    string[] TitleStatus,
    string Sort,
    int Page,
    int PageSize);

/// <summary>Search, filter, sort and page the catalogue. Everything is in memory, so this is plain LINQ.</summary>
public sealed class VehicleQuery
{
    public const int MaxPageSize = 60;
    public const int DefaultPageSize = 24;

    private readonly BidStore _store;
    private readonly AuctionClock _clock;

    public VehicleQuery(BidStore store, AuctionClock clock)
    {
        _store = store;
        _clock = clock;
    }

    public PagedVehicles Run(VehicleQueryParams p, string? buyerId)
    {
        var page = Math.Max(1, p.Page);
        var pageSize = Math.Clamp(p.PageSize <= 0 ? DefaultPageSize : p.PageSize, 1, MaxPageSize);
        var now = _clock.Now;

        var rows = _store.All
            .Select(l => ToRow(l, now))
            .Where(r => MatchesSearch(r.Ledger.Vehicle, p.Q))
            .Where(r => In(p.Make, r.Ledger.Vehicle.Make))
            .Where(r => In(p.BodyStyle, r.Ledger.Vehicle.BodyStyle))
            .Where(r => In(p.Province, r.Ledger.Vehicle.Province))
            .Where(r => In(p.TitleStatus, r.Ledger.Vehicle.TitleStatus))
            .Where(r => In(p.State, r.State.ToString()))
            .ToList();

        var facets = new Facets(
            State: Facet(rows, r => r.State.ToString().ToLowerInvariant()),
            Make: Facet(rows, r => r.Ledger.Vehicle.Make),
            BodyStyle: Facet(rows, r => r.Ledger.Vehicle.BodyStyle),
            Province: Facet(rows, r => r.Ledger.Vehicle.Province),
            TitleStatus: Facet(rows, r => r.Ledger.Vehicle.TitleStatus));

        var sorted = Sort(rows, p.Sort);
        var items = sorted
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => VehicleMapper.ToSummary(r.Ledger, _clock, buyerId))
            .ToList();

        return new PagedVehicles(items, rows.Count, page, pageSize, facets);
    }

    private Row ToRow(AuctionLedger l, DateTime now)
    {
        var start = _clock.StartOf(l.Vehicle);
        var end = _clock.EndOf(l.Vehicle);
        var state = l.Sold ? AuctionState.Ended : AuctionClock.StateAt(now, start, end);
        return new Row(l, state, start, end);
    }

    private sealed record Row(AuctionLedger Ledger, AuctionState State, DateTime Start, DateTime End);

    private static bool In(string[] wanted, string value) =>
        wanted.Length == 0 || wanted.Any(w => string.Equals(w, value, StringComparison.OrdinalIgnoreCase));

    /// <summary>Every whitespace-separated token must match some searchable field ("2023 bronco", "A-0043", part of a VIN).</summary>
    private static bool MatchesSearch(Vehicle v, string? q)
    {
        if (string.IsNullOrWhiteSpace(q)) return true;
        var haystack = $"{v.Year} {v.Make} {v.Model} {v.Trim} {v.Vin} {v.Lot} {v.City} {v.SellingDealership}";
        return q.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .All(token => haystack.Contains(token, StringComparison.OrdinalIgnoreCase));
    }

    private static IReadOnlyList<FacetValue> Facet(IEnumerable<Row> rows, Func<Row, string> key) =>
        rows.GroupBy(key)
            .Select(g => new FacetValue(g.Key, g.Count()))
            .OrderByDescending(f => f.Count).ThenBy(f => f.Value)
            .ToList();

    private static IEnumerable<Row> Sort(IEnumerable<Row> rows, string sort) => sort switch
    {
        "price_asc" => rows.OrderBy(r => r.Ledger.CurrentBid ?? r.Ledger.Vehicle.StartingBid),
        "price_desc" => rows.OrderByDescending(r => r.Ledger.CurrentBid ?? r.Ledger.Vehicle.StartingBid),
        "year_desc" => rows.OrderByDescending(r => r.Ledger.Vehicle.Year).ThenBy(r => r.Ledger.Vehicle.OdometerKm),
        "odometer_asc" => rows.OrderBy(r => r.Ledger.Vehicle.OdometerKm),
        "newly_listed" => rows.OrderByDescending(r => r.Start),
        // ending_soon: live auctions by soonest end, then upcoming by soonest start, ended last (most recent first)
        _ => rows.OrderBy(r => r.State switch { AuctionState.Live => 0, AuctionState.Upcoming => 1, _ => 2 })
                 .ThenBy(r => r.State == AuctionState.Ended ? -r.End.Ticks : r.State == AuctionState.Live ? r.End.Ticks : r.Start.Ticks),
    };
}
