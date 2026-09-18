using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.Cookies;
using TheBlock.Api.Auth;
using TheBlock.Api.Data;
using TheBlock.Api.Domain;
using TheBlock.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(System.Text.Json.JsonNamingPolicy.SnakeCaseLower)));

// Data lives in the repo root (../../data/vehicles.json relative to this project). Override with DataPath.
var dataPath = builder.Configuration["DataPath"]
               ?? Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "..", "data", "vehicles.json"));
var usersPath = builder.Configuration["UsersPath"]
                ?? Path.Combine(AppContext.BaseDirectory, "Auth", "seed-users.json");

var repository = VehicleRepository.LoadFromFile(dataPath);
builder.Services.AddSingleton(repository);
builder.Services.AddSingleton(UserStore.LoadFromFile(usersPath));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton(sp => new AuctionClock(sp.GetRequiredService<TimeProvider>(), repository.All.Select(v => v.AuctionStart)));
builder.Services.AddSingleton<BidStore>();
builder.Services.AddSingleton<VehicleQuery>();

// Cookie session. The client is same-origin (Vite proxies /api), so a plain HttpOnly cookie is enough.
// API callers get 401/403 status codes instead of redirects to a login page.
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.Cookie.Name = "theblock.session";
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Lax;
        o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        o.SlidingExpiration = true;
        o.ExpireTimeSpan = TimeSpan.FromDays(7);
        o.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
        o.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", vehicles = repository.All.Count }));
app.MapAuthEndpoints();
app.MapVehicleEndpoints();
app.MapBidEndpoints();
app.MapMyBidsEndpoints();

app.Run();

// Lets the integration tests reference the entry point via WebApplicationFactory<Program>.
public partial class Program;
