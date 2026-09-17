using TheBlock.Api.Domain;

namespace TheBlock.Api.Contracts;

public sealed record PlaceBidRequest(decimal Amount);

/// <summary>409 body. Carries the fresh minimum so the client can correct itself without another round trip.</summary>
public sealed record BidRejected(BidRejection Reason, string Message, decimal MinimumBid, decimal? CurrentBid)
{
    public static BidRejected From(BidRejection reason, AuctionLedger ledger)
    {
        var minimum = BiddingRules.MinimumBid(ledger.Vehicle.StartingBid, ledger.CurrentBid);
        var message = reason switch
        {
            BidRejection.NotLive => "This auction isn't open for bidding right now.",
            BidRejection.Sold => "This vehicle has already been sold.",
            BidRejection.BelowMinimum => $"Your bid must be at least {minimum:C0}.",
            BidRejection.NotOnIncrement => $"Bids move in steps of {BiddingRules.IncrementFor(ledger.CurrentBid):C0} from the current bid.",
            BidRejection.ExceedsBuyNow => $"That's at or above the Buy Now price of {ledger.Vehicle.BuyNowPrice:C0}. Use Buy Now instead.",
            BidRejection.AlreadyHighBidder => "You're already the high bidder.",
            _ => "Bid rejected.",
        };
        return new BidRejected(reason, message, minimum, ledger.CurrentBid);
    }
}
