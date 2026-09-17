using Microsoft.Extensions.Time.Testing;
using TheBlock.Api.Data;
using TheBlock.Api.Domain;

namespace TheBlock.Api.Tests;

public class VehicleQueryTests
{
    private static Vehicle V(string id, decimal starting, decimal? current, string make = "Ford") => new(
        Id: id, Vin: id, Year: 2020, Make: make, Model: "M", Trim: "T", BodyStyle: "SUV",
        ExteriorColor: "", InteriorColor: "", Engine: "", Transmission: "", Drivetrain: "", OdometerKm: 0,
        FuelType: "", ConditionGrade: 3, ConditionReport: "", DamageNotes: [], TitleStatus: "clean",
        Province: "Ontario", City: "", AuctionStart: new DateTime(2026, 4, 1), StartingBid: starting, ReservePrice: null, BuyNowPrice: null,
        Images: [], SellingDealership: "", Lot: id, CurrentBid: current, BidCount: current is null ? 0 : 1);

    private static VehicleQuery Build(params Vehicle[] vehicles)
    {
        var repo = new VehicleRepository(vehicles);
        var clock = new AuctionClock(new FakeTimeProvider(), repo.All.Select(v => v.AuctionStart));
        return new VehicleQuery(new BidStore(repo), clock);
    }

    private static VehicleQueryParams P(decimal? min = null, decimal? max = null, string[]? make = null, int? top = null, string sort = "price_asc") =>
        new(null, make ?? [], [], [], [], [], min, max, top, sort, 1, 50);

    private static Vehicle WithBids(string id, int bidCount) =>
        V(id, 5_000, 5_000 + 500 * bidCount) with { BidCount = bidCount };

    [Fact]
    public void Price_filter_uses_current_bid_when_present_else_starting_bid()
    {
        var q = Build(V("a", 5_000, null), V("b", 5_000, 12_000), V("c", 20_000, null));

        var result = q.Run(P(min: 10_000, max: 15_000), null);

        Assert.Equal(["b"], result.Items.Select(i => i.Id));
    }

    [Fact]
    public void Price_bounds_reflect_other_filters_but_not_the_price_filter_itself()
    {
        var q = Build(V("a", 5_000, null), V("b", 5_000, 12_000), V("c", 20_000, null, make: "Kia"));

        var result = q.Run(P(min: 10_000, make: ["Ford"]), null);

        Assert.Equal(1, result.Total);
        Assert.Equal(5_000, result.Facets.Price.Min);
        Assert.Equal(12_000, result.Facets.Price.Max);
    }

    [Fact]
    public void Top_keeps_the_most_bid_vehicles_ranked_by_bid_count()
    {
        var q = Build(WithBids("a", 3), WithBids("b", 18), WithBids("c", 0), WithBids("d", 9), WithBids("e", 12));

        var result = q.Run(P(top: 3, sort: "ending_soon"), null);

        Assert.Equal(3, result.Total);
        Assert.Equal(["b", "e", "d"], result.Items.Select(i => i.Id));
    }

    [Fact]
    public void Top_applies_after_other_filters_and_respects_an_explicit_sort()
    {
        var q = Build(WithBids("a", 3), WithBids("b", 18) with { Make = "Kia" }, WithBids("d", 9), WithBids("e", 12));

        var result = q.Run(P(top: 2, make: ["Ford"], sort: "price_asc"), null);

        Assert.Equal(["d", "e"], result.Items.Select(i => i.Id)); // top two Fords by bids (e, d), then re-sorted by price asc
    }
}
