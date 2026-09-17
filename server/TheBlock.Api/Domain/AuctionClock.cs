namespace TheBlock.Api.Domain;

/// <summary>
/// The dataset's auction_start values are synthetic and fixed in the past.
/// At startup we linearly map the dataset's date range onto a window around "now"
/// so the prototype shows a believable mix of upcoming, live and ended auctions,
/// and states keep progressing while the server runs.
/// </summary>
public sealed class AuctionClock
{
    public static readonly TimeSpan AuctionDuration = TimeSpan.FromHours(72);
    public static readonly TimeSpan WindowBefore = TimeSpan.FromDays(4);
    public static readonly TimeSpan WindowAfter = TimeSpan.FromDays(3);

    private readonly TimeProvider _time;
    private readonly DateTime _sourceMin;
    private readonly double _scale;
    private readonly DateTime _targetMin;

    public AuctionClock(TimeProvider time, IEnumerable<DateTime> sourceStarts)
    {
        _time = time;
        var starts = sourceStarts.ToList();
        if (starts.Count == 0) throw new ArgumentException("At least one auction start is required.", nameof(sourceStarts));

        _sourceMin = starts.Min();
        var sourceMax = starts.Max();
        var sourceSpan = (sourceMax - _sourceMin).Ticks;

        var now = time.GetUtcNow().UtcDateTime;
        _targetMin = now - WindowBefore;
        var targetSpan = (WindowBefore + WindowAfter).Ticks;
        _scale = sourceSpan == 0 ? 0 : (double)targetSpan / sourceSpan;
    }

    public DateTime Now => _time.GetUtcNow().UtcDateTime;

    public DateTime StartOf(Vehicle v)
    {
        var offset = (v.AuctionStart - _sourceMin).Ticks * _scale;
        return _targetMin.AddTicks((long)offset);
    }

    public DateTime EndOf(Vehicle v) => StartOf(v) + AuctionDuration;

    public AuctionState StateOf(Vehicle v) => StateAt(Now, StartOf(v), EndOf(v));

    public static AuctionState StateAt(DateTime now, DateTime start, DateTime end)
    {
        if (now < start) return AuctionState.Upcoming;
        if (now < end) return AuctionState.Live;
        return AuctionState.Ended;
    }
}
