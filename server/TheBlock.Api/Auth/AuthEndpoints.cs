using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace TheBlock.Api.Auth;

public sealed record LoginRequest(string Username, string Password);
public sealed record UserView(string Id, string Username, string DisplayName);

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/login", async (LoginRequest body, HttpContext http, UserStore users) =>
        {
            if (string.IsNullOrWhiteSpace(body.Username) || string.IsNullOrWhiteSpace(body.Password))
                return Results.BadRequest(new { message = "Username and password are required." });

            var user = users.Authenticate(body.Username, body.Password);
            if (user is null)
                return Results.Json(new { message = "Incorrect username or password." }, statusCode: StatusCodes.Status401Unauthorized);

            var identity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim("display_name", user.DisplayName),
            ], CookieAuthenticationDefaults.AuthenticationScheme);

            await http.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity),
                new AuthenticationProperties { IsPersistent = true });

            return Results.Ok(ToView(user));
        });

        group.MapPost("/logout", async (HttpContext http) =>
        {
            await http.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.NoContent();
        });

        group.MapGet("/me", (HttpContext http, UserStore users) =>
        {
            var id = CurrentUserId(http.User);
            var user = id is null ? null : users.FindById(id);
            return user is null ? Results.Unauthorized() : Results.Ok(ToView(user));
        });

        return app;
    }

    /// <summary>The buyer id for the signed-in user, or null when anonymous.</summary>
    public static string? CurrentUserId(ClaimsPrincipal principal) =>
        principal.Identity?.IsAuthenticated == true ? principal.FindFirstValue(ClaimTypes.NameIdentifier) : null;

    public static UserView ToView(User u) => new(u.Id, u.Username, u.DisplayName);
}
