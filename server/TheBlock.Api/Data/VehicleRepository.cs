using System.Text.Json;
using TheBlock.Api.Domain;

namespace TheBlock.Api.Data;

/// <summary>In-memory catalogue loaded once from data/vehicles.json.</summary>
public sealed class VehicleRepository
{
    private static readonly JsonSerializerOptions ReadOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    private readonly Dictionary<string, Vehicle> _byId;

    public VehicleRepository(IReadOnlyList<Vehicle> vehicles)
    {
        All = vehicles;
        _byId = vehicles.ToDictionary(v => v.Id, StringComparer.OrdinalIgnoreCase);
    }

    public IReadOnlyList<Vehicle> All { get; }

    public Vehicle? Find(string id) => _byId.GetValueOrDefault(id);

    public static VehicleRepository LoadFromFile(string path)
    {
        using var stream = File.OpenRead(path);
        var vehicles = JsonSerializer.Deserialize<List<Vehicle>>(stream, ReadOptions)
                       ?? throw new InvalidDataException($"No vehicles found in {path}");
        return new VehicleRepository(vehicles);
    }
}
