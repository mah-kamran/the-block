using TheBlock.Api.Contracts;
using TheBlock.Api.Data;
using TheBlock.Api.Domain;

namespace TheBlock.Api.Endpoints;

public static class BidEndpoints
{
    public static IEndpointRouteBuilder MapBidEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/vehicles/{id}");

        group.MapPost("/bids", (string id, PlaceBidRequest body, HttpRequest request, VehicleRepository vehicles, BidStore store, AuctionClock clock) =>
        {
            var buyerId = VehicleEndpoints.BuyerId(request);
            if (buyerId is null) return Results.BadRequest(new { message = $"{VehicleEndpoints.BuyerHeader} header is required." });
            if (body.Amount <= 0 || body.Amount != decimal.Truncate(body.Amount))
                return Results.BadRequest(new { message = "Amount must be a positive whole-dollar value." });

            var vehicle = vehicles.Find(id);
            if (vehicle is null) return Results.NotFound();

            // Validate and record under the vehicle's lock so concurrent bidders are serialised.
            return store.Mutate(vehicle.Id, ledger =>
            {
                var rejection = BiddingRules.Validate(
                    clock.StateOf(vehicle), ledger.Sold, vehicle.StartingBid, ledger.CurrentBid,
                    vehicle.BuyNowPrice, ledger.HighBidderId, buyerId, body.Amount);

                if (rejection is not null)
                    return Results.Conflict(BidRejected.From(rejection.Value, ledger));

                ledger.Record(new Bid(buyerId, body.Amount, clock.Now));
                return Results.Created($"/api/vehicles/{vehicle.Id}", VehicleMapper.ToDetail(ledger, clock, buyerId));
            });
        });

        group.MapPost("/buy-now", (string id, HttpRequest request, VehicleRepository vehicles, BidStore store, AuctionClock clock) =>
        {
            var buyerId = VehicleEndpoints.BuyerId(request);
            if (buyerId is null) return Results.BadRequest(new { message = $"{VehicleEndpoints.BuyerHeader} header is required." });

            var vehicle = vehicles.Find(id);
            if (vehicle is null) return Results.NotFound();
            if (vehicle.BuyNowPrice is null) return Results.BadRequest(new { message = "This vehicle has no Buy Now price." });

            return store.Mutate(vehicle.Id, ledger =>
            {
                if (ledger.Sold) return Results.Conflict(BidRejected.From(BidRejection.Sold, ledger));
                if (clock.StateOf(vehicle) != AuctionState.Live) return Results.Conflict(BidRejected.From(BidRejection.NotLive, ledger));

                ledger.MarkSold(buyerId, vehicle.BuyNowPrice.Value, clock.Now);
                return Results.Ok(VehicleMapper.ToDetail(ledger, clock, buyerId));
            });
        });

        group.MapGet("/bids", (string id, HttpRequest request, VehicleRepository vehicles, BidStore store) =>
        {
            var vehicle = vehicles.Find(id);
            if (vehicle is null) return Results.NotFound();
            var buyerId = VehicleEndpoints.BuyerId(request);
            var bids = store.Get(vehicle.Id).Bids
                .OrderByDescending(b => b.PlacedAt)
                .Select(b => new BidView(b.Amount, b.PlacedAt, b.BuyerId == buyerId));
            return Results.Ok(bids);
        });

        return app;
    }
}
