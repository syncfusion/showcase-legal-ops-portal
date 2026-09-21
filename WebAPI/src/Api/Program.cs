using System.Text.Json;
using System.Text.Json.Serialization;
using LegalMatterContractPortal.Api.Endpoints;
using LegalMatterContractPortal.Api.Hosting;
using LegalMatterContractPortal.Infrastructure;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

// ── Services ───────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();

// JSON: camelCase with enums as strings.
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.WriteIndented = false;
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.Configure<ApiBehaviorOptions>(o => o.SuppressMapClientErrors = true);

builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);
builder.Services.AddHostedService<StartupSeederHostedService>();

// OpenAPI + Swagger UI.
builder.Services.AddOpenApi();
builder.Services.AddSwaggerGen();

builder.Services.AddProblemDetails();
builder.Services.AddResponseCompression(opts => opts.EnableForHttps = true);

// CORS origins for the Vite dev server.
var corsOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

var enableSwagger = builder.Configuration.GetValue<bool>("Swagger:Enabled");

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Legal Matter & Contract Management Portal API v1");
    c.RoutePrefix = "swagger";          // browse at /swagger
});

// ── Pipeline ───────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseCors("DevCors");
}

// Skip HTTPS redirect in Development so the Vite proxy can call HTTP.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseResponseCompression();

// Problem details for unhandled exceptions.
app.UseExceptionHandler(exApp => exApp.Run(async ctx =>
{
    var feature = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
    var ex = feature?.Error;
    var isDev = app.Environment.IsDevelopment();

    if (ex is not null)
    {
        var logger = ctx.RequestServices.GetRequiredService<ILoggerFactory>()
            .CreateLogger("UnhandledException");
        logger.LogError(ex, "Unhandled exception on {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
    }

    ctx.Response.StatusCode = 500;
    ctx.Response.ContentType = "application/problem+json";
    await ctx.Response.WriteAsJsonAsync(new
    {
        type = "https://datatracker.ietf.org/doc/html/rfc9110#section-15.6.1",
        title = isDev && ex is not null ? ex.GetType().Name + ": " + ex.Message : "An unexpected error occurred.",
        detail = isDev ? ex?.ToString() : null,
        status = 500,
        traceId = System.Diagnostics.Activity.Current?.Id ?? ctx.TraceIdentifier
    });
}));

// ── Endpoints (GET-only) ──────────────────────────────────────────
app.MapDashboardEndpoints();
app.MapMatterEndpoints();
app.MapContractEndpoints();
app.MapWorkflowEndpoints();
app.MapAnalyticsEndpoints();
app.MapLookupAndDocumentEndpoints();

// OpenAPI document at /openapi/v1.json.
app.MapOpenApi();
app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();

app.Run();
