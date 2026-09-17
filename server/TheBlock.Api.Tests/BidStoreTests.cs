using TheBlock.Api.Data;
using TheBlock.Api.Domain;

namespace TheBlock.Api.Tests;

public class BidStoreTests
{
    private static Vehicle Sample(decimal? currentBid = 22_800m, int bidCount = 16) => new(
        Id: "v1", Vin: "vin", Year: 2023, Make: "Ford", Model: "Bronco", Trim: "Big Bend", BodyStyle: "SUV",
        ExteriorColor: "", InteriorColor: "", Engine: "", Transmission: "", Drivetrain: "", OdometerKm: 0,
        FuelType: "", ConditionGrade: 3.8m, ConditionReport: "", DamageNotes: [], TitleStatus: "clean",
        Province: "", City: "", AuctionStart: DateTime.UtcNow, StartingBid: 14_500m, ReservePrice: 25_000m, BuyNowPrice: null,
        Images: [], SellingDealership: "", Lot: "A-0043", CurrentBid: currentBid, BidCount: bidCount);

    [Fact]
    public void Ledger_seeds_from_dataset_and_layers_new_bids_on_top()
    {
        var ledger = new AuctionLedger(Sample());
        Assert.Equal(22_800m, ledger.CurrentBid);
        Assert.Equal(16, ledger.BidCount);
        Assert.False(ledger.ReserveMet);

        ledger.Record(new Bid("me", 25_000m, DateTime.UtcNow));
        Assert.Equal(25_000m, ledger.CurrentBid);
        Assert.Equal(17, ledger.BidCount);
        Assert.Equal("me", ledger.HighBidderId);
        Assert.True(ledger.ReserveMet);
    }

    [Fact]
    public void Concurrent_bidders_are_serialised_and_only_valid_bids_land()
    {
        var store = new BidStore(new VehicleRepository([Sample(currentBid: null, bidCount: 0)]));
        var accepted = 0;

        // 50 buyers race to bid the same amounts; under the lock each bid is validated against the latest state,
        // so only strictly increasing bids win and the ledger never sees a regression.
        Parallel.For(0, 50, i =>
        {
            store.Mutate("v1", ledger =>
            {
                var amount = 14_500m + 250m * (i % 10);
                var rejection = BiddingRules.Validate(AuctionState.Live, ledger.Sold, 14_500m, ledger.CurrentBid,
                    null, ledger.HighBidderId, $"buyer-{i}", amount);
                if (rejection is null)
                {
                    ledger.Record(new Bid($"buyer-{i}", amount, DateTime.UtcNow));
                    Interlocked.Increment(ref accepted);
                }
                return 0;
            });
        });

        var final = store.Get("v1");
        Assert.Equal(accepted, final.Bids.Count);
        Assert.True(final.Bids.Zip(final.Bids.Skip(1)).All(pair => pair.Second.Amount > pair.First.Amount), "bids must strictly increase");
        Assert.Equal(final.Bids.Max(b => b.Amount), final.CurrentBid);
    }
}
