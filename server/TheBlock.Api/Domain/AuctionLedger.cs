namespace TheBlock.Api.Domain;

/// <summary>
/// Mutable bidding state for one vehicle. The dataset seeds a current bid and a bid count
/// from bidders we know nothing about; bids placed through the API are recorded individually.
/// </summary>
public sealed class AuctionLedger
{
    private readonly List<Bid> _bids = new();

    public AuctionLedger(Vehicle vehicle)
    {
        Vehicle = vehicle;
        SeedBidCount = vehicle.BidCount;
        SeedCurrentBid = vehicle.CurrentBid;
    }

    public Vehicle Vehicle { get; }
    public int SeedBidCount { get; }
    public decimal? SeedCurrentBid { get; }
    public bool Sold { get; private set; }
    public string? SoldToBuyerId { get; private set; }

    public IReadOnlyList<Bid> Bids => _bids;
    public Bid? HighBid => _bids.Count == 0 ? null : _bids[^1];
    public decimal? CurrentBid => HighBid?.Amount ?? SeedCurrentBid;
    public int BidCount => SeedBidCount + _bids.Count;
    public string? HighBidderId => HighBid?.BuyerId;
    public bool ReserveMet => Vehicle.ReservePrice is null || (CurrentBid ?? 0) >= Vehicle.ReservePrice;

    public void Record(Bid bid) => _bids.Add(bid);

    public void MarkSold(string buyerId, decimal price, DateTime at)
    {
        _bids.Add(new Bid(buyerId, price, at));
        Sold = true;
        SoldToBuyerId = buyerId;
    }
}
