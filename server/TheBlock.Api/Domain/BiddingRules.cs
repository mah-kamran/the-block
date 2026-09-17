namespace TheBlock.Api.Domain;

public enum BidRejection
{
    NotLive,
    Sold,
    BelowMinimum,
    NotOnIncrement,
    ExceedsBuyNow,
    AlreadyHighBidder,
}

/// <summary>Pure auction rules. No I/O, no clock, fully unit-testable.</summary>
public static class BiddingRules
{
    /// <summary>Minimum step above the current bid, scaled to price band.</summary>
    public static decimal IncrementFor(decimal? currentBid) => currentBid switch
    {
        null => 0,
        < 10_000m => 250m,
        < 50_000m => 500m,
        _ => 1_000m,
    };

    /// <summary>The lowest amount a new bid may be.</summary>
    public static decimal MinimumBid(decimal startingBid, decimal? currentBid) =>
        currentBid is null ? startingBid : currentBid.Value + IncrementFor(currentBid);

    public static BidRejection? Validate(
        AuctionState state,
        bool sold,
        decimal startingBid,
        decimal? currentBid,
        decimal? buyNowPrice,
        string? highBidderId,
        string buyerId,
        decimal amount)
    {
        if (sold) return BidRejection.Sold;
        if (state != AuctionState.Live) return BidRejection.NotLive;
        if (highBidderId is not null && highBidderId == buyerId) return BidRejection.AlreadyHighBidder;

        var minimum = MinimumBid(startingBid, currentBid);
        if (amount < minimum) return BidRejection.BelowMinimum;

        // A bid at or above Buy Now should use Buy Now instead; say so before nitpicking increments.
        if (buyNowPrice is not null && amount >= buyNowPrice) return BidRejection.ExceedsBuyNow;

        // Once bidding has started, bids move in whole increments from the current bid.
        var increment = IncrementFor(currentBid);
        if (increment > 0 && (amount - currentBid!.Value) % increment != 0) return BidRejection.NotOnIncrement;

        return null;
    }
}
