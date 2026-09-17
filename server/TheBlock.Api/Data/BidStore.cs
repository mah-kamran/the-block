using System.Collections.Concurrent;
using TheBlock.Api.Domain;

namespace TheBlock.Api.Data;

/// <summary>
/// Holds one ledger per vehicle and serialises mutations per vehicle so two buyers
/// bidding at the same instant are resolved in order rather than clobbering each other.
/// </summary>
public sealed class BidStore
{
    private readonly ConcurrentDictionary<string, AuctionLedger> _ledgers;
    private readonly ConcurrentDictionary<string, object> _locks = new();

    public BidStore(VehicleRepository vehicles)
    {
        _ledgers = new ConcurrentDictionary<string, AuctionLedger>(
            vehicles.All.Select(v => new KeyValuePair<string, AuctionLedger>(v.Id, new AuctionLedger(v))));
    }

    public AuctionLedger Get(string vehicleId) => _ledgers[vehicleId];

    /// <summary>Runs <paramref name="mutate"/> under the vehicle's lock and returns its result.</summary>
    public T Mutate<T>(string vehicleId, Func<AuctionLedger, T> mutate)
    {
        var gate = _locks.GetOrAdd(vehicleId, _ => new object());
        lock (gate)
        {
            return mutate(_ledgers[vehicleId]);
        }
    }

    public IEnumerable<AuctionLedger> All => _ledgers.Values;
}
