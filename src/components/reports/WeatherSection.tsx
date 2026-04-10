/**
 * Weather Report Section Component
 *
 * Displays weather data in PDF reports.
 */

"use client";

import type { WeatherData } from "@/lib/integrations/weather";

export interface WeatherSectionProps {
  weatherData: WeatherData;
  showGraphs?: boolean;
  showRadar?: boolean;
}

export default function WeatherSection({
  weatherData,
  showGraphs = true,
  showRadar = false,
}: WeatherSectionProps) {
  return (
    <div className="weather-section rounded-lg bg-white p-6 shadow">
      {/* Header */}
      <div className="mb-6 border-b-2 border-blue-600 pb-3">
        <h2 className="text-2xl font-bold text-gray-900">Weather Analysis - Date of Loss</h2>
        <p className="mt-1 text-sm text-gray-600">
          {new Date(weatherData.date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Storm Summary */}
      {weatherData.location && (
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-800">Storm Summary</h3>
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium text-gray-900">
                  {weatherData.location.city}, {weatherData.location.state}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Coordinates</p>
                <p className="font-medium text-gray-900">
                  {weatherData.location.lat.toFixed(4)}°, {weatherData.location.lon.toFixed(4)}°
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hail Data */}
      {weatherData.hailData && (
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-800">Hail Report</h3>
          <div className="rounded border-l-4 border-red-600 bg-red-50 p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Max Size</p>
                <p className="text-2xl font-bold text-red-600">{weatherData.hailData.maxSize}&quot;</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-lg font-semibold text-gray-900">
                  {weatherData.hailData.duration} min
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Density</p>
                <p className="text-lg font-semibold capitalize text-gray-900">
                  {weatherData.hailData.density}
                </p>
              </div>
            </div>

            {weatherData.hailData.distribution && showGraphs && (
              <div className="mt-4 border-t border-red-200 pt-4">
                <p className="mb-2 text-sm font-semibold text-gray-700">Size Distribution:</p>
                <div className="space-y-1">
                  {Object.entries(weatherData.hailData.distribution).map(([size, percentage]) => (
                    <div key={size} className="flex items-center gap-2">
                      <span className="w-12 text-xs text-gray-600">{size}</span>
                      <div className="h-4 flex-1 rounded-full bg-gray-200">
                        {/* eslint-disable-next-line react/forbid-dom-props */}
                        <div
                          className="h-4 rounded-full bg-red-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs text-gray-600">{percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wind Data */}
      {weatherData.windData && (
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-800">Wind Report</h3>
          <div className="rounded border-l-4 border-orange-600 bg-orange-50 p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Max Speed</p>
                <p className="text-2xl font-bold text-orange-600">
                  {weatherData.windData.maxSpeed} mph
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Direction</p>
                <p className="text-lg font-semibold text-gray-900">
                  {weatherData.windData.direction}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Gusts</p>
                <p className="text-lg font-semibold text-gray-900">
                  {weatherData.windData.gustSpeed} mph
                </p>
              </div>
            </div>

            {showGraphs && (
              <div className="mt-4 border-t border-orange-200 pt-4">
                <p className="mb-2 text-sm font-semibold text-gray-700">Wind Speed Over Time:</p>
                <div className="flex h-24 items-end gap-1">
                  {[45, 52, 68, 75, 62, 48, 35, 28].map((speed, idx) => (
                    /* eslint-disable-next-line react/forbid-dom-props */
                    <div
                      key={idx}
                      className="flex-1 rounded-t bg-orange-500"
                      style={{ height: `${(speed / 75) * 100}%` }}
                      title={`${speed} mph`}
                    />
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-600">
                  <span>Start</span>
                  <span>Peak</span>
                  <span>End</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Temperature & Conditions */}
      <div className="mb-6">
        <h3 className="mb-3 text-lg font-semibold text-gray-800">Conditions</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Temperature</p>
            <p className="text-xl font-semibold text-gray-900">{weatherData.temperature}°F</p>
          </div>
          <div className="rounded bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Humidity</p>
            <p className="text-xl font-semibold text-gray-900">{weatherData.humidity}%</p>
          </div>
          <div className="rounded bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Precipitation</p>
            <p className="text-xl font-semibold text-gray-900">{weatherData.precipitation}&quot;</p>
          </div>
        </div>
      </div>

      {/* Radar Image Placeholder */}
      {showRadar && (
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-800">Storm Track & Radar</h3>
          <div className="flex h-64 items-center justify-center rounded-lg bg-gray-200">
            <p className="text-gray-500">[Radar imagery would appear here in PDF]</p>
          </div>
        </div>
      )}

      {/* Data Source */}
      <div className="mt-6 border-t border-gray-200 pt-4 text-xs text-gray-500">
        <p>
          Data Source: {weatherData.source} | Retrieved: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
