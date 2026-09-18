namespace TheBlock.Api.Auth;

public sealed record User(string Id, string Username, string DisplayName, string PasswordHash);

/// <summary>Shape of the seed file. Passwords are plain text there because these are published demo accounts.</summary>
public sealed record SeedUser(string Id, string Username, string DisplayName, string Password);
