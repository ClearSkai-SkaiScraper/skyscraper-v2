import { httpsCallable } from "firebase/functions";
import { useCallback,useState } from "react";

import { functions } from "@/lib/firebase";
import { logger } from "@/lib/logger";

interface WeatherData {
  location: string;
  date: string;
  conditions: string;
  temperature: {
    high: number;
    low: number;
    unit: string;
  };
  wind: {
    speed: number;
    direction: string;
    unit: string;
  };
  precipitation: {
    chance: number;
    amount: number;
    unit: string;
  };
  pressure: {
    value: number;
    unit: string;
  };
  humidity: number;
  visibility: {
    value: number;
    unit: string;
  };
}

interface DOLData {
  location: string;
  date: string;
  event_type: string;
  wind_speeds: {
    sustained: number;
    gusts: number;
    unit: string;
  };
  hail_size: {
    diameter: number;
    unit: string;
  };
  rainfall: {
    amount: number;
    unit: string;
  };
  severity_score: number;
  verification_status: string;
  report_id: string;
}

export function useWeatherIntegration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuickDOL = useCallback(
    async (location: string, date: string): Promise<DOLData | null> => {
      if (!location.trim() || !date.trim()) {
        setError("Location and date are required");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const getQuickDOLFunction = httpsCallable(functions, "getQuickDOL");
        const result = await getQuickDOLFunction({
          location: location.trim(),
          date: date.trim(),
        });

        if (result.data) {
          return result.data as DOLData;
        }

        setError("No DOL data found for the specified location and date");
        return null;
      } catch (err) {
        logger.error("Error fetching DOL data:", err);
        setError("Failed to fetch DOL data. Please try again.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getWeatherReport = useCallback(
    async (location: string, date: string): Promise<WeatherData | null> => {
      if (!location.trim() || !date.trim()) {
        setError("Location and date are required");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const getWeatherReportFunction = httpsCallable(functions, "getWeatherReport");
        const result = await getWeatherReportFunction({
          location: location.trim(),
          date: date.trim(),
        });

        if (result.data) {
          return result.data as WeatherData;
        }

        setError("No weather data found for the specified location and date");
        return null;
      } catch (err) {
        logger.error("Error fetching weather data:", err);
        setError("Failed to fetch weather data. Please try again.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getWeatherAnalysis = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (location: string, dateRange: { start: string; end: string }): Promise<any> => {
      if (!location.trim() || !dateRange.start || !dateRange.end) {
        setError("Location and date range are required");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const getWeatherAnalysisFunction = httpsCallable(functions, "getWeatherAnalysis");
        const result = await getWeatherAnalysisFunction({
          location: location.trim(),
          dateRange,
        });

        if (result.data) {
          return result.data;
        }

        setError("No weather analysis data found for the specified parameters");
        return null;
      } catch (err) {
        logger.error("Error fetching weather analysis:", err);
        setError("Failed to fetch weather analysis. Please try again.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getWeatherForPDF = useCallback(
    async (location: string, claimDate: string) => {
      setLoading(true);
      setError(null);

      try {
        // Fetch both DOL and weather data in parallel for efficiency
        const [dolData, weatherData] = await Promise.allSettled([
          getQuickDOL(location, claimDate),
          getWeatherReport(location, claimDate),
        ]);

        const result = {
          dol: dolData.status === "fulfilled" ? dolData.value : null,
          weather: weatherData.status === "fulfilled" ? weatherData.value : null,
          location,
          date: claimDate,
          fetchedAt: new Date().toISOString(),
        };

        return result;
      } catch (err) {
        logger.error("Error fetching weather data for PDF:", err);
        setError("Failed to fetch weather data for PDF generation");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getQuickDOL, getWeatherReport]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    getQuickDOL,
    getWeatherReport,
    getWeatherAnalysis,
    getWeatherForPDF,
    clearError,
  };
}

// Helper function to format weather data for PDF inclusion
export function formatWeatherForPDF(weatherData: WeatherData | null, dolData: DOLData | null) {
  if (!weatherData && !dolData) {
    return {
      hasData: false,
      summary: "No weather or DOL data available",
      details: null,
    };
  }

  const sections: Array<{
    title: string;
    data: Record<string, string | number>;
  }> = [];

  if (weatherData) {
    sections.push({
      title: "Weather Conditions",
      data: {
        location: weatherData.location,
        date: weatherData.date,
        conditions: weatherData.conditions,
        temperature: `${weatherData.temperature.high}°${weatherData.temperature.unit} / ${weatherData.temperature.low}°${weatherData.temperature.unit}`,
        wind: `${weatherData.wind.speed} ${weatherData.wind.unit} ${weatherData.wind.direction}`,
        precipitation: `${weatherData.precipitation.chance}% chance, ${weatherData.precipitation.amount} ${weatherData.precipitation.unit}`,
        humidity: `${weatherData.humidity}%`,
        pressure: `${weatherData.pressure.value} ${weatherData.pressure.unit}`,
        visibility: `${weatherData.visibility.value} ${weatherData.visibility.unit}`,
      },
    });
  }

  if (dolData) {
    sections.push({
      title: "Date of Loss Verification",
      data: {
        location: dolData.location,
        date: dolData.date,
        eventType: dolData.event_type,
        windSpeeds: `Sustained: ${dolData.wind_speeds.sustained} ${dolData.wind_speeds.unit}, Gusts: ${dolData.wind_speeds.gusts} ${dolData.wind_speeds.unit}`,
        hailSize: `${dolData.hail_size.diameter} ${dolData.hail_size.unit}`,
        rainfall: `${dolData.rainfall.amount} ${dolData.rainfall.unit}`,
        severityScore: dolData.severity_score,
        verificationStatus: dolData.verification_status,
        reportId: dolData.report_id,
      },
    });
  }

  return {
    hasData: true,
    summary: sections.map((s) => s.title).join(" & "),
    sections,
  };
}
