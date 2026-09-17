using TheBlock.Api.Domain;

namespace TheBlock.Api.Contracts;

public static class VehicleMapper
{
    public static AuctionInfo ToAuctionInfo(AuctionLedger ledger, AuctionClock clock, string? buyerId)
    {
        var v = ledger.Vehicle;
        var state = clock.StateOf(v);
        if (ledger.Sold) state = AuctionState.Ended;

        return new AuctionInfo(
            State: state.ToString().ToLowerInvariant(),
            StartsAt: clock.StartOf(v),
            EndsAt: clock.EndOf(v),
            StartingBid: v.StartingBid,
            CurrentBid: ledger.CurrentBid,
            BidCount: ledger.BidCount,
            MinimumBid: BiddingRules.MinimumBid(v.StartingBid, ledger.CurrentBid),
            Increment: BiddingRules.IncrementFor(ledger.CurrentBid),
            HasReserve: v.ReservePrice is not null,
            ReserveMet: ledger.ReserveMet,
            BuyNowPrice: v.BuyNowPrice,
            Sold: ledger.Sold,
            YourStatus: StatusFor(ledger, state, buyerId));
    }

    private static BuyerStatus StatusFor(AuctionLedger ledger, AuctionState state, string? buyerId)
    {
        if (buyerId is null) return BuyerStatus.None;
        if (ledger.Sold) return ledger.SoldToBuyerId == buyerId ? BuyerStatus.Won : BuyerStatus.None;
        var participated = ledger.Bids.Any(b => b.BuyerId == buyerId);
        if (!participated) return BuyerStatus.None;
        if (ledger.HighBidderId == buyerId) return state == AuctionState.Ended ? BuyerStatus.Won : BuyerStatus.HighBidder;
        return BuyerStatus.Outbid;
    }

    public static VehicleSummary ToSummary(AuctionLedger ledger, AuctionClock clock, string? buyerId)
    {
        var v = ledger.Vehicle;
        return new VehicleSummary(
            v.Id, v.Lot, v.Title, v.Year, v.Make, v.Model, v.Trim, v.BodyStyle,
            v.OdometerKm, v.TitleStatus, v.ConditionGrade, v.City, v.Province,
            Image: v.Images.FirstOrDefault() ?? string.Empty,
            Auction: ToAuctionInfo(ledger, clock, buyerId));
    }

    public static VehicleDetail ToDetail(AuctionLedger ledger, AuctionClock clock, string? buyerId)
    {
        var v = ledger.Vehicle;
        var recent = ledger.Bids
            .OrderByDescending(b => b.PlacedAt)
            .Take(10)
            .Select(b => new BidView(b.Amount, b.PlacedAt, IsYou: b.BuyerId == buyerId))
            .ToList();

        return new VehicleDetail(
            v.Id, v.Lot, v.Vin, v.Title, v.Year, v.Make, v.Model, v.Trim, v.BodyStyle,
            v.ExteriorColor, v.InteriorColor, v.Engine, v.Transmission, v.Drivetrain,
            v.OdometerKm, v.FuelType, v.ConditionGrade, v.ConditionReport, v.DamageNotes,
            v.TitleStatus, v.City, v.Province, v.SellingDealership, v.Images,
            Auction: ToAuctionInfo(ledger, clock, buyerId),
            RecentBids: recent);
    }
}
