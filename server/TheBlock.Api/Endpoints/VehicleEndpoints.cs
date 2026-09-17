using Microsoft.AspNetCore.Mvc;
using TheBlock.Api.Contracts;
using TheBlock.Api.Data;
using TheBlock.Api.Domain;

namespace TheBlock.Api.Endpoints;

public static class VehicleEndpoints
{
    public const string BuyerHeader = "X-Buyer-Id";

    public static IEndpointRouteBuilder MapVehicleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/vehicles");

        group.MapGet("/", (
            HttpRequest request,
            VehicleQuery query,
            [FromQuery] string? q,
            [FromQuery] string[]? make,
            [FromQuery] string[]? bodyStyle,
            [FromQuery] string[]? province,
            [FromQuery] string[]? state,
            [FromQuery] string[]? titleStatus,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice,
            [FromQuery] int? top,
            [FromQuery] string? sort,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = VehicleQuery.DefaultPageSize) =>
        {
            var p = new VehicleQueryParams(
                q, make ?? [], bodyStyle ?? [], province ?? [], state ?? [], titleStatus ?? [],
                minPrice, maxPrice, top is > 0 ? Math.Min(top.Value, VehicleQuery.MaxPageSize) : null, sort ?? "ending_soon", page, pageSize);
            return Results.Ok(query.Run(p, BuyerId(request)));
        });

        group.MapGet("/{id}", (string id, HttpRequest request, VehicleRepository vehicles, BidStore store, AuctionClock clock) =>
        {
            var vehicle = vehicles.Find(id);
            if (vehicle is null) return Results.NotFound();
            return Results.Ok(VehicleMapper.ToDetail(store.Get(vehicle.Id), clock, BuyerId(request)));
        });

        return app;
    }

    public static string? BuyerId(HttpRequest request)
    {
        var value = request.Headers[BuyerHeader].FirstOrDefault();
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
