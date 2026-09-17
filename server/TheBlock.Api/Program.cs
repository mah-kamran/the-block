using System.Text.Json.Serialization;
using TheBlock.Api.Data;
using TheBlock.Api.Domain;
using TheBlock.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(System.Text.Json.JsonNamingPolicy.SnakeCaseLower)));

// Data lives in the repo root (../../data/vehicles.json relative to this project). Override with DataPath.
var dataPath = builder.Configuration["DataPath"]
               ?? Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "..", "data", "vehicles.json"));

var repository = VehicleRepository.LoadFromFile(dataPath);
builder.Services.AddSingleton(repository);
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton(sp => new AuctionClock(sp.GetRequiredService<TimeProvider>(), repository.All.Select(v => v.AuctionStart)));
builder.Services.AddSingleton<BidStore>();
builder.Services.AddSingleton<VehicleQuery>();

var app = builder.Build();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", vehicles = repository.All.Count }));
app.MapVehicleEndpoints();

app.Run();
