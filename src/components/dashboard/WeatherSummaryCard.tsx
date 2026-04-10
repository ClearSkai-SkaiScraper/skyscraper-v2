import { Cloud, Droplets, Eye, Gauge, Sun, Wind } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardWeather } from "@/lib/weather/weatherstack";

type Props = {
  weather: DashboardWeather | null;
};

export function WeatherSummaryCard({ weather }: Props) {
  if (!weather) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Today&apos;s Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Live weather is temporarily unavailable. Check your Weatherstack API key configuration.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-background">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Today&apos;s Weather
          </CardTitle>
          <p className="text-xs text-muted-foreground">{weather.location}</p>
        </div>
        {weather.iconUrl && (
          <img
            src={weather.iconUrl}
            alt={weather.condition}
            className="h-12 w-12 rounded-full bg-background/60 p-1"
          />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Temperature */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl font-bold text-foreground">
              {Number.isFinite(weather.temperature) ? `${weather.temperature}°F` : "—"}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{weather.condition}</div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            Feels like{" "}
            <span className="font-semibold text-foreground">
              {Number.isFinite(weather.feelsLike) ? `${weather.feelsLike}°F` : "—"}
            </span>
          </div>
        </div>

        {/* Weather Details Grid */}
        <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
          {/* Wind */}
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs">
              <div className="font-medium text-foreground">
                {weather.windSpeed != null ? `${weather.windSpeed} mph` : "—"}
              </div>
              <div className="text-muted-foreground">Wind</div>
            </div>
          </div>

          {/* Humidity */}
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs">
              <div className="font-medium text-foreground">
                {weather.humidity != null ? `${weather.humidity}%` : "—"}
              </div>
              <div className="text-muted-foreground">Humidity</div>
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs">
              <div className="font-medium text-foreground">
                {weather.visibility != null ? `${weather.visibility} mi` : "—"}
              </div>
              <div className="text-muted-foreground">Visibility</div>
            </div>
          </div>

          {/* Pressure */}
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs">
              <div className="font-medium text-foreground">
                {weather.pressure != null ? `${weather.pressure} mb` : "—"}
              </div>
              <div className="text-muted-foreground">Pressure</div>
            </div>
          </div>

          {/* UV Index */}
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs">
              <div className="font-medium text-foreground">
                {weather.uvIndex != null ? weather.uvIndex : "—"}
              </div>
              <div className="text-muted-foreground">UV Index</div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs">
              <div className="font-medium text-foreground">Live</div>
              <div className="text-muted-foreground">Updated</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
