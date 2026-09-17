using Microsoft.Extensions.Time.Testing;
using TheBlock.Api.Domain;

namespace TheBlock.Api.Tests;

public class AuctionClockTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 17, 12, 0, 0, TimeSpan.Zero);

    private static Vehicle VehicleStartingAt(DateTime start) => new(
        Id: "v", Vin: "vin", Year: 2020, Make: "Make", Model: "Model", Trim: "Trim", BodyStyle: "SUV",
        ExteriorColor: "", InteriorColor: "", Engine: "", Transmission: "", Drivetrain: "", OdometerKm: 0,
        FuelType: "", ConditionGrade: 3, ConditionReport: "", DamageNotes: [], TitleStatus: "clean",
        Province: "", City: "", AuctionStart: start, StartingBid: 1000, ReservePrice: null, BuyNowPrice: null,
        Images: [], SellingDealership: "", Lot: "A-1", CurrentBid: null, BidCount: 0);

    [Fact]
    public void Maps_dataset_range_onto_window_around_now()
    {
        var first = new DateTime(2026, 3, 31, 9, 0, 0);
        var last = new DateTime(2026, 4, 6, 20, 0, 0);
        var clock = new AuctionClock(new FakeTimeProvider(Now), [first, last]);

        Assert.Equal(Now.UtcDateTime - AuctionClock.WindowBefore, clock.StartOf(VehicleStartingAt(first)));
        Assert.Equal(Now.UtcDateTime + AuctionClock.WindowAfter, clock.StartOf(VehicleStartingAt(last)));
    }

    [Fact]
    public void Earliest_auction_has_ended_and_latest_is_upcoming()
    {
        var first = new DateTime(2026, 3, 31, 9, 0, 0);
        var last = new DateTime(2026, 4, 6, 20, 0, 0);
        var clock = new AuctionClock(new FakeTimeProvider(Now), [first, last]);

        Assert.Equal(AuctionState.Ended, clock.StateOf(VehicleStartingAt(first)));
        Assert.Equal(AuctionState.Upcoming, clock.StateOf(VehicleStartingAt(last)));
    }

    [Fact]
    public void State_progresses_as_time_advances()
    {
        var time = new FakeTimeProvider(Now);
        // Source range maps onto [now-4d, now+3d]; a start 6/7 through the range lands ~2 days in the future.
        var start = new DateTime(2026, 4, 6);
        var clock = new AuctionClock(time, [new DateTime(2026, 3, 31), new DateTime(2026, 4, 7)]);
        var vehicle = VehicleStartingAt(start);
        Assert.True(clock.StartOf(vehicle) > Now.UtcDateTime);

        time.SetUtcNow(new DateTimeOffset(clock.StartOf(vehicle), TimeSpan.Zero) - TimeSpan.FromSeconds(1));
        Assert.Equal(AuctionState.Upcoming, clock.StateOf(vehicle));

        time.SetUtcNow(new DateTimeOffset(clock.StartOf(vehicle), TimeSpan.Zero));
        Assert.Equal(AuctionState.Live, clock.StateOf(vehicle));

        time.SetUtcNow(new DateTimeOffset(clock.EndOf(vehicle), TimeSpan.Zero));
        Assert.Equal(AuctionState.Ended, clock.StateOf(vehicle));
    }

    [Theory]
    [InlineData(-1, AuctionState.Upcoming)]
    [InlineData(0, AuctionState.Live)]
    [InlineData(71, AuctionState.Live)]
    [InlineData(72, AuctionState.Ended)]
    public void StateAt_boundaries(int hoursAfterStart, AuctionState expected)
    {
        var start = Now.UtcDateTime;
        var end = start + AuctionClock.AuctionDuration;
        Assert.Equal(expected, AuctionClock.StateAt(start.AddHours(hoursAfterStart), start, end));
    }
}
