using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace TheBlock.Api.Tests;

/// <summary>End-to-end over HTTP: login sets a cookie, bids require it, My Bids reflects the signed-in user.</summary>
public class AuthFlowTests : IClassFixture<AuthFlowTests.Factory>
{
    public sealed class Factory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            var root = FindRepoRoot();
            builder.UseSetting("DataPath", Path.Combine(root, "data", "vehicles.json"));
            builder.UseSetting("UsersPath", Path.Combine(root, "server", "TheBlock.Api", "Auth", "seed-users.json"));
        }

        private static string FindRepoRoot()
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "data", "vehicles.json"))) dir = dir.Parent;
            return dir?.FullName ?? throw new InvalidOperationException("repo root not found");
        }
    }

    private readonly Factory _factory;
    public AuthFlowTests(Factory factory) => _factory = factory;

    private HttpClient Client() => _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

    private static async Task Login(HttpClient c, string user)
    {
        var res = await c.PostAsJsonAsync("/api/auth/login", new { username = user, password = "demo123" });
        res.EnsureSuccessStatusCode();
    }

    private static async Task<(string id, decimal minimum)> FirstLiveVehicle(HttpClient c)
    {
        var page = await c.GetFromJsonAsync<System.Text.Json.JsonElement>("/api/vehicles?state=live&sort=price_asc&pageSize=1");
        var item = page.GetProperty("items")[0];
        return (item.GetProperty("id").GetString()!, item.GetProperty("auction").GetProperty("minimumBid").GetDecimal());
    }

    [Fact]
    public async Task Anonymous_can_browse_but_not_bid()
    {
        var c = Client();
        var list = await c.GetAsync("/api/vehicles?pageSize=1");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);

        var (id, min) = await FirstLiveVehicle(c);
        var bid = await c.PostAsJsonAsync($"/api/vehicles/{id}/bids", new { amount = min });
        Assert.Equal(HttpStatusCode.Unauthorized, bid.StatusCode);

        var me = await c.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
    }

    [Fact]
    public async Task Wrong_password_is_rejected()
    {
        var c = Client();
        var res = await c.PostAsJsonAsync("/api/auth/login", new { username = "alice", password = "nope" });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Bids_follow_the_user_not_the_browser()
    {
        // Alice signs in and bids.
        var alice = Client();
        await Login(alice, "alice");
        var (id, min) = await FirstLiveVehicle(alice);
        var placed = await alice.PostAsJsonAsync($"/api/vehicles/{id}/bids", new { amount = min });
        Assert.Equal(HttpStatusCode.Created, placed.StatusCode);

        var aliceBids = await alice.GetFromJsonAsync<System.Text.Json.JsonElement>("/api/me/bids");
        Assert.Contains(aliceBids.EnumerateArray(), b => b.GetProperty("vehicle").GetProperty("id").GetString() == id);

        // Same "browser" logs out and Bob logs in: Bob has no bids and sees no standing on that vehicle.
        await alice.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.Unauthorized, (await alice.GetAsync("/api/auth/me")).StatusCode);

        await Login(alice, "bob");
        var bobBids = await alice.GetFromJsonAsync<System.Text.Json.JsonElement>("/api/me/bids");
        Assert.Empty(bobBids.EnumerateArray());
        var detail = await alice.GetFromJsonAsync<System.Text.Json.JsonElement>($"/api/vehicles/{id}");
        Assert.Equal("none", detail.GetProperty("auction").GetProperty("yourStatus").GetString());

        // Alice returns on the same browser and her standing is intact.
        await alice.PostAsync("/api/auth/logout", null);
        await Login(alice, "alice");
        detail = await alice.GetFromJsonAsync<System.Text.Json.JsonElement>($"/api/vehicles/{id}");
        Assert.Equal("high_bidder", detail.GetProperty("auction").GetProperty("yourStatus").GetString());
    }
}
