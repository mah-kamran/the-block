namespace TheBlock.Api.Domain;

public sealed record Bid(string BuyerId, decimal Amount, DateTime PlacedAt);
