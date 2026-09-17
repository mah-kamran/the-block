namespace TheBlock.Api.Domain;

/// <summary>Immutable vehicle listing as loaded from data/vehicles.json.</summary>
public sealed record Vehicle(
    string Id,
    string Vin,
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
    string Province,
    string City,
    DateTime AuctionStart,
    decimal StartingBid,
    decimal? ReservePrice,
    decimal? BuyNowPrice,
    IReadOnlyList<string> Images,
    string SellingDealership,
    string Lot,
    decimal? CurrentBid,
    int BidCount)
{
    public string Title => $"{Year} {Make} {Model} {Trim}";
}
