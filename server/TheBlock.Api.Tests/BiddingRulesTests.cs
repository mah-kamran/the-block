using TheBlock.Api.Domain;

namespace TheBlock.Api.Tests;

public class BiddingRulesTests
{
    [Theory]
    [InlineData(null, 0)]
    [InlineData(3_500, 250)]
    [InlineData(9_750, 250)]
    [InlineData(10_000, 500)]
    [InlineData(49_500, 500)]
    [InlineData(50_000, 1_000)]
    [InlineData(77_000, 1_000)]
    public void Increment_scales_with_price_band(int? current, int expected) =>
        Assert.Equal(expected, BiddingRules.IncrementFor(current));

    [Fact]
    public void Minimum_is_starting_bid_when_no_bids() =>
        Assert.Equal(14_500m, BiddingRules.MinimumBid(14_500m, null));

    [Fact]
    public void Minimum_is_current_plus_increment_when_bids_exist() =>
        Assert.Equal(23_300m, BiddingRules.MinimumBid(14_500m, 22_800m));

    private static BidRejection? Validate(
        decimal amount,
        AuctionState state = AuctionState.Live,
        bool sold = false,
        decimal starting = 14_500m,
        decimal? current = 22_800m,
        decimal? buyNow = null,
        string? highBidder = "other",
        string buyer = "me") =>
        BiddingRules.Validate(state, sold, starting, current, buyNow, highBidder, buyer, amount);

    [Fact]
    public void Accepts_minimum_bid() => Assert.Null(Validate(23_300m));

    [Fact]
    public void Accepts_multiple_increments_above_minimum() => Assert.Null(Validate(24_800m));

    [Fact]
    public void Accepts_starting_bid_on_fresh_auction() => Assert.Null(Validate(14_500m, current: null, highBidder: null));

    [Fact]
    public void Accepts_any_amount_at_or_above_start_on_fresh_auction() => Assert.Null(Validate(14_610m, current: null, highBidder: null));

    [Fact]
    public void Rejects_below_minimum() => Assert.Equal(BidRejection.BelowMinimum, Validate(23_000m));

    [Fact]
    public void Rejects_off_increment() => Assert.Equal(BidRejection.NotOnIncrement, Validate(23_400m));

    [Fact]
    public void Rejects_when_not_live() => Assert.Equal(BidRejection.NotLive, Validate(23_300m, state: AuctionState.Upcoming));

    [Fact]
    public void Rejects_when_ended() => Assert.Equal(BidRejection.NotLive, Validate(23_300m, state: AuctionState.Ended));

    [Fact]
    public void Rejects_when_sold() => Assert.Equal(BidRejection.Sold, Validate(23_300m, sold: true));

    [Fact]
    public void Rejects_bid_at_or_above_buy_now() => Assert.Equal(BidRejection.ExceedsBuyNow, Validate(25_000m, buyNow: 25_000m));

    [Fact]
    public void Accepts_bid_just_under_buy_now() => Assert.Null(Validate(24_800m, buyNow: 25_000m));

    [Fact]
    public void Rejects_outbidding_yourself() => Assert.Equal(BidRejection.AlreadyHighBidder, Validate(23_300m, highBidder: "me"));
}
