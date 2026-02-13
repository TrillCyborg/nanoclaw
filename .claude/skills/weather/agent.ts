/**
 * Weather Skill - MCP Tool Definitions (Agent/Container Side)
 *
 * Provides weather information using wttr.in API
 */

// @ts-ignore - SDK available in container environment only
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

export interface SkillToolsContext {
  groupFolder: string;
  isMain: boolean;
}

/**
 * Create weather MCP tools
 */
export function createWeatherTools(ctx: SkillToolsContext) {
  return [
    tool(
      'get_weather',
      `Get current weather conditions for a location.

Returns temperature, conditions, humidity, wind, and other weather data.
Uses wttr.in weather service which supports city names, zip codes, and coordinates.`,
      {
        location: z.string().describe('Location name (e.g., "New York", "London", "90210", "40.7,-74.0")')
      },
      async (args: { location: string }) => {
        try {
          // Use wttr.in API for weather data
          // Format: ?format=j1 returns JSON with detailed weather info
          const url = `https://wttr.in/${encodeURIComponent(args.location)}?format=j1`;
          const response = await fetch(url);

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get weather data for "${args.location}". Please check the location name and try again.` }],
              isError: true
            };
          }

          const data = await response.json();

          // Extract current conditions
          const current = data.current_condition?.[0];
          if (!current) {
            return {
              content: [{ type: 'text', text: `No weather data available for "${args.location}".` }],
              isError: true
            };
          }

          // Extract nearest area for location name
          const nearestArea = data.nearest_area?.[0];
          const locationName = nearestArea ?
            `${nearestArea.areaName?.[0]?.value || args.location}, ${nearestArea.country?.[0]?.value || ''}`.trim() :
            args.location;

          // Format the weather report
          const tempC = current.temp_C;
          const tempF = current.temp_F;
          const feelsLikeC = current.FeelsLikeC;
          const feelsLikeF = current.FeelsLikeF;
          const condition = current.weatherDesc?.[0]?.value || 'Unknown';
          const humidity = current.humidity;
          const windSpeed = current.windspeedKmph;
          const windDir = current.winddir16Point;
          const pressure = current.pressure;
          const visibility = current.visibility;
          const cloudCover = current.cloudcover;
          const uvIndex = current.uvIndex;

          const report = `*Weather for ${locationName}*

*Current Conditions:* ${condition}
*Temperature:* ${tempC}°C (${tempF}°F)
*Feels Like:* ${feelsLikeC}°C (${feelsLikeF}°F)
*Humidity:* ${humidity}%
*Wind:* ${windSpeed} km/h ${windDir}
*Pressure:* ${pressure} mb
*Visibility:* ${visibility} km
*Cloud Cover:* ${cloudCover}%
*UV Index:* ${uvIndex}`;

          return {
            content: [{ type: 'text', text: report }]
          };

        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text', text: `Error fetching weather: ${errorMsg}` }],
            isError: true
          };
        }
      }
    ),

    tool(
      'get_weather_forecast',
      `Get weather forecast for a location.

Returns multi-day weather forecast with temperatures, conditions, and precipitation.`,
      {
        location: z.string().describe('Location name (e.g., "New York", "London", "90210")'),
        days: z.number().min(1).max(3).default(3).describe('Number of days to forecast (1-3, default 3)')
      },
      async (args: { location: string; days: number }) => {
        try {
          const url = `https://wttr.in/${encodeURIComponent(args.location)}?format=j1`;
          const response = await fetch(url);

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get forecast for "${args.location}".` }],
              isError: true
            };
          }

          const data = await response.json();

          const nearestArea = data.nearest_area?.[0];
          const locationName = nearestArea ?
            `${nearestArea.areaName?.[0]?.value || args.location}, ${nearestArea.country?.[0]?.value || ''}`.trim() :
            args.location;

          const weather = data.weather;
          if (!weather || weather.length === 0) {
            return {
              content: [{ type: 'text', text: `No forecast data available for "${args.location}".` }],
              isError: true
            };
          }

          // Build forecast report
          let report = `*Weather Forecast for ${locationName}*\n`;

          const numDays = Math.min(args.days, weather.length);
          for (let i = 0; i < numDays; i++) {
            const day = weather[i];
            const date = day.date;
            const maxTempC = day.maxtempC;
            const maxTempF = day.maxtempF;
            const minTempC = day.mintempC;
            const minTempF = day.mintempF;
            const condition = day.hourly?.[4]?.weatherDesc?.[0]?.value || 'Unknown'; // Noon conditions
            const chanceOfRain = day.hourly?.[4]?.chanceofrain || '0';
            const uvIndex = day.uvIndex;

            report += `\n*${date}*`;
            report += `\n${condition}`;
            report += `\n🌡️ High: ${maxTempC}°C (${maxTempF}°F) | Low: ${minTempC}°C (${minTempF}°F)`;
            report += `\n💧 Rain: ${chanceOfRain}% | ☀️ UV: ${uvIndex}\n`;
          }

          return {
            content: [{ type: 'text', text: report }]
          };

        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text', text: `Error fetching forecast: ${errorMsg}` }],
            isError: true
          };
        }
      }
    )
  ];
}
