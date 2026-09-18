using TheBlock.Api.Contracts;
using TheBlock.Api.Data;
using TheBlock.Api.Domain;

namespace TheBlock.Api.Endpoints;

public sealed record MyBid(VehicleSummary Vehicle, decimal YourHighestBid, DateTime LastBidAt);

public static class MyBidsEndpoints
{
    public static IEndpointRouteBuilder MapMyBidsEndpoints(this IEndpointRouteBuilder app)
    {
        // Every vehicle the signed-in buyer has bid on, most recent activity first. Standing is in Vehicle.Auction.YourStatus.
        app.MapGet("/api/me/bids", (HttpRequest request, BidStore store, AuctionClock clock) =>
        {
            var buyerId = VehicleEndpoints.BuyerId(request)!;
            var mine = store.All
                .Select(ledger => new { ledger, bids = ledger.Bids.Where(b => b.BuyerId == buyerId).ToList() })
                .Where(x => x.bids.Count > 0)
                .Select(x => new MyBid(
                    VehicleMapper.ToSummary(x.ledger, clock, buyerId),
                    YourHighestBid: x.bids.Max(b => b.Amount),
                    LastBidAt: x.bids.Max(b => b.PlacedAt)))
                .OrderByDescending(m => m.LastBidAt)
                .ToList();
            return Results.Ok(mine);
        }).RequireAuthorization();

        return app;
    }
}
