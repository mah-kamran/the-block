using System.Text.Json;
using Microsoft.AspNetCore.Identity;

namespace TheBlock.Api.Auth;

/// <summary>In-memory user directory seeded from a JSON file. Passwords are hashed at load time.</summary>
public sealed class UserStore
{
    private static readonly JsonSerializerOptions ReadOptions = new() { PropertyNameCaseInsensitive = true };
    private readonly Dictionary<string, User> _byUsername;
    private readonly Dictionary<string, User> _byId;
    private readonly PasswordHasher<User> _hasher = new();

    public UserStore(IEnumerable<SeedUser> seeds)
    {
        var users = seeds.Select(s =>
        {
            var user = new User(s.Id, s.Username.ToLowerInvariant(), s.DisplayName, PasswordHash: string.Empty);
            return user with { PasswordHash = _hasher.HashPassword(user, s.Password) };
        }).ToList();

        _byUsername = users.ToDictionary(u => u.Username);
        _byId = users.ToDictionary(u => u.Id);
    }

    public IReadOnlyCollection<User> All => _byId.Values;

    public User? FindById(string id) => _byId.GetValueOrDefault(id);

    /// <summary>Returns the user when the credentials match, otherwise null. Same cost on unknown user and wrong password.</summary>
    public User? Authenticate(string username, string password)
    {
        if (!_byUsername.TryGetValue(username.Trim().ToLowerInvariant(), out var user))
        {
            // Burn a hash so timing doesn't reveal whether the username exists.
            _hasher.VerifyHashedPassword(new User("", "", "", ""), _hasher.HashPassword(new User("", "", "", ""), "x"), password);
            return null;
        }
        return _hasher.VerifyHashedPassword(user, user.PasswordHash, password) switch
        {
            PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded => user,
            _ => null,
        };
    }

    public static UserStore LoadFromFile(string path)
    {
        using var stream = File.OpenRead(path);
        var seeds = JsonSerializer.Deserialize<List<SeedUser>>(stream, ReadOptions)
                    ?? throw new InvalidDataException($"No users found in {path}");
        return new UserStore(seeds);
    }
}
