namespace TheBlock.Api.Contracts;

public enum BuyerStatus
{
    None,
    HighBidder,
    Outbid,
    Won,
}

public sealed record AuctionInfo(
    string State,
    DateTime StartsAt,
    DateTime EndsAt,
    decimal StartingBid,
    decimal? CurrentBid,
    int BidCount,
    decimal MinimumBid,
    decimal Increment,
    bool HasReserve,
    bool ReserveMet,
    decimal? BuyNowPrice,
    bool Sold,
    BuyerStatus YourStatus);

public sealed record VehicleSummary(
    string Id,
    string Lot,
    string Title,
    int Year,
    string Make,
    string Model,
    string Trim,
    string BodyStyle,
    int OdometerKm,
    string TitleStatus,
    decimal ConditionGrade,
    string City,
    string Province,
    string Image,
    AuctionInfo Auction);

public sealed record BidView(decimal Amount, DateTime PlacedAt, bool IsYou);

public sealed record VehicleDetail(
    string Id,
    string Lot,
    string Vin,
    string Title,
    int Year,
    string Make,
    string Model,
    string Trim,
    string BodyStyle,
    string ExteriorColor,
    string InteriorColor,
    string Engine,
    string Transmission,
    string Drivetrain,
    int OdometerKm,
    string FuelType,
    decimal ConditionGrade,
    string ConditionReport,
    IReadOnlyList<string> DamageNotes,
    string TitleStatus,
    string City,
    string Province,
    string SellingDealership,
    IReadOnlyList<string> Images,
    AuctionInfo Auction,
    IReadOnlyList<BidView> RecentBids);

public sealed record FacetValue(string Value, int Count);

public sealed record Facets(
    IReadOnlyList<FacetValue> State,
    IReadOnlyList<FacetValue> Make,
    IReadOnlyList<FacetValue> BodyStyle,
    IReadOnlyList<FacetValue> Province,
    IReadOnlyList<FacetValue> TitleStatus);

public sealed record PagedVehicles(
    IReadOnlyList<VehicleSummary> Items,
    int Total,
    int Page,
    int PageSize,
    Facets Facets);
