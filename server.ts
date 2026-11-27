import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, type Schema } from '@google/genai';
import {
  COMMUTE_OPTIONS,
  HOUSEHOLD_OPTIONS,
  INDOOR_EQUIPMENT_OPTIONS,
  CITY_PRESETS,
  type CityPresetId,
  type CommuteMode,
  type HouseholdMember,
  type IndoorEquipment,
  type UserAirConfig,
  type WeatherTelemetry,
} from './src/types/aqi';
import { clampAqi, sanitizeLocation, sanitizePlainText } from './src/utils/sanitize';
import { getAqiDetailedBand, getResolvedCityName } from './src/utils/aqiMath';
import { validateAirQualityPlan } from './src/utils/schemaValidator';
import { validateWeatherTelemetry } from './src/utils/weatherMath';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const VALID_CITIES = new Set<CityPresetId>(CITY_PRESETS.map((c) => c.id));
const VALID_HOUSEHOLD = new Set<HouseholdMember>(HOUSEHOLD_OPTIONS.map((h) => h.id));
const VALID_INDOOR = new Set<IndoorEquipment>(INDOOR_EQUIPMENT_OPTIONS.map((i) => i.id));
const VALID_COMMUTE = new Set<CommuteMode>(COMMUTE_OPTIONS.map((c) => c.id));

const PLAN_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: [
    'advisoryHeadline',
    'advisoryDetail',
    'dominantPollutant',
    'safeVentilationWindow',
    'routine',
    'actions',
  ],
  properties: {
    advisoryHeadline: {
      type: Type.STRING,
      description: 'Concise 8-14 word editorial smog headline for the city and AQI.',
    },
    advisoryDetail: {
      type: Type.STRING,
      description: 'Two concise sentences of actionable air-quality guidance tailored to the household.',
    },
    dominantPollutant: {
      type: Type.STRING,
      description: 'Primary pollutant string such as PM2.5 & NO2.',
    },
    safeVentilationWindow: {
      type: Type.STRING,
      description: 'Recommended clock window for opening windows safely.',
    },
    routine: {
      type: Type.ARRAY,
      description: 'Exactly 3 blocks covering morning, afternoon, and evening.',
      items: {
        type: Type.OBJECT,
        required: [
          'id',
          'timeOfDay',
          'timeWindow',
          'title',
          'riskLevel',
          'summary',
          'steps',
          'rationale',
        ],
        properties: {
          id: { type: Type.STRING },
          timeOfDay: { type: Type.STRING, enum: ['morning', 'afternoon', 'evening'] },
          timeWindow: { type: Type.STRING },
          title: { type: Type.STRING },
          riskLevel: { type: Type.STRING, enum: ['low', 'moderate', 'high'] },
          summary: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          rationale: {
            type: Type.STRING,
            description: 'Clear 2-sentence environmental science explanation.',
          },
        },
      },
    },
    actions: {
      type: Type.ARRAY,
      description: '9-12 checkable actions distributed evenly across zero_cost, indoor_setup, and sustainable_swaps.',
      items: {
        type: Type.OBJECT,
        required: [
          'id',
          'category',
          'title',
          'description',
          'pm25ReductionPct',
          'weeklyCo2SavedKg',
          'effortLabel',
        ],
        properties: {
          id: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: ['zero_cost', 'indoor_setup', 'sustainable_swaps'],
          },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          pm25ReductionPct: { type: Type.NUMBER },
          weeklyCo2SavedKg: { type: Type.NUMBER },
          effortLabel: { type: Type.STRING },
        },
      },
    },
  },
};

function parseAndSanitizeConfig(body: unknown): UserAirConfig | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }
  const record = body as Record<string, unknown>;

  const cityId =
    typeof record.cityId === 'string' && VALID_CITIES.has(record.cityId as CityPresetId)
      ? (record.cityId as CityPresetId)
      : 'delhi';

  const customLocation =
    typeof record.customLocation === 'string' ? sanitizeLocation(record.customLocation) : '';

  const aqi = typeof record.aqi === 'number' ? clampAqi(record.aqi) : 150;

  const household: HouseholdMember[] = Array.isArray(record.household)
    ? record.household.filter(
        (item): item is HouseholdMember =>
          typeof item === 'string' && VALID_HOUSEHOLD.has(item as HouseholdMember)
      )
    : [];

  const indoorSetup: IndoorEquipment[] = Array.isArray(record.indoorSetup)
    ? record.indoorSetup.filter(
        (item): item is IndoorEquipment =>
          typeof item === 'string' && VALID_INDOOR.has(item as IndoorEquipment)
      )
    : [];

  const commuteMode: CommuteMode =
    typeof record.commuteMode === 'string' && VALID_COMMUTE.has(record.commuteMode as CommuteMode)
      ? (record.commuteMode as CommuteMode)
      : 'public_transit';

  return {
    cityId,
    customLocation,
    aqi,
    household: Array.from(new Set(household)),
    indoorSetup: Array.from(new Set(indoorSetup)),
    commuteMode,
  };
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface OpenWeatherApiPayload {
  name?: unknown;
  main?: {
    temp?: unknown;
    feels_like?: unknown;
    humidity?: unknown;
  };
  wind?: {
    speed?: unknown;
  };
  weather?: Array<{
    description?: unknown;
    main?: unknown;
  }>;
}

const WEATHER_SERVER_CACHE = new Map<string, WeatherTelemetry>();
const WEATHER_SERVER_TTL_MS = 1000 * 60 * 5;

function getOpenWeatherKey(): string | null {
  const key = process.env.OPENWEATHER_API_KEY?.trim();
  if (!key || key === 'MY_OPENWEATHER_API_KEY') {
    return null;
  }
  return key;
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/weather', async (req: Request, res: Response): Promise<void> => {
    const apiKey = getOpenWeatherKey();
    if (!apiKey) {
      res.status(503).json({
        configured: false,
        error:
          'OpenWeather API key not configured. Add OPENWEATHER_API_KEY in Settings > Secrets for live weather telemetry.',
      });
      return;
    }

    const rawCityId = typeof req.query.cityId === 'string' ? req.query.cityId : 'delhi';
    const cityId: CityPresetId = VALID_CITIES.has(rawCityId as CityPresetId)
      ? (rawCityId as CityPresetId)
      : 'delhi';

    const rawLocation = typeof req.query.location === 'string' ? req.query.location : '';
    const cleanLocation = sanitizeLocation(rawLocation);

    const preset = CITY_PRESETS.find((c) => c.id === cityId);

    const upstreamUrl = new URL('https://api.openweathermap.org/data/2.5/weather');
    let cacheKey = '';

    if (cityId !== 'custom' && preset?.lat !== undefined && preset.lon !== undefined) {
      upstreamUrl.searchParams.set('lat', String(preset.lat));
      upstreamUrl.searchParams.set('lon', String(preset.lon));
      cacheKey = `preset:${cityId}`;
    } else {
      if (cleanLocation.length < 2) {
        res.status(400).json({ error: 'Provide a valid city name for weather lookup.' });
        return;
      }
      upstreamUrl.searchParams.set('q', cleanLocation);
      cacheKey = `custom:${cleanLocation.toLowerCase()}`;
    }

    upstreamUrl.searchParams.set('units', 'metric');
    upstreamUrl.searchParams.set('appid', apiKey);

    const cached = WEATHER_SERVER_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < WEATHER_SERVER_TTL_MS) {
      res.status(200).json({ weather: cached, source: 'openweather-cache' });
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const upstreamRes = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (upstreamRes.status === 404) {
        res.status(404).json({
          error: `Location "${cleanLocation || preset?.label || 'city'}" not found on OpenWeather.`,
        });
        return;
      }

      if (upstreamRes.status === 401) {
        res.status(503).json({
          configured: false,
          error: 'OpenWeather API key was rejected (401). Verify OPENWEATHER_API_KEY in Settings > Secrets.',
        });
        return;
      }

      if (!upstreamRes.ok) {
        res.status(502).json({
          error: `OpenWeather service returned status ${upstreamRes.status}.`,
        });
        return;
      }

      const raw = (await upstreamRes.json()) as OpenWeatherApiPayload;
      const tempC = typeof raw.main?.temp === 'number' ? raw.main.temp : Number.NaN;
      const feelsC =
        typeof raw.main?.feels_like === 'number' ? raw.main.feels_like : tempC;
      const humidityPct =
        typeof raw.main?.humidity === 'number' ? raw.main.humidity : Number.NaN;
      // OpenWeather metric wind speed is m/s; convert to km/h
      const windMs = typeof raw.wind?.speed === 'number' ? raw.wind.speed : 0;
      const windKmh = windMs * 3.6;
      const rawDesc =
        typeof raw.weather?.[0]?.description === 'string'
          ? raw.weather[0].description
          : typeof raw.weather?.[0]?.main === 'string'
            ? raw.weather[0].main
            : 'Clear';
      const formattedCondition = sanitizePlainText(
        rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1),
        60
      );
      const resolvedName =
        typeof raw.name === 'string' && sanitizePlainText(raw.name, 80)
          ? sanitizePlainText(raw.name, 80)
          : preset?.label ?? cleanLocation;

      const validated = validateWeatherTelemetry({
        cityResolved: resolvedName,
        temperatureC: tempC,
        feelsLikeC: feelsC,
        humidityPct,
        windSpeedKmh: windKmh,
        condition: formattedCondition || 'Ambient',
        fetchedAt: Date.now(),
      });

      if (!validated) {
        res.status(502).json({ error: 'Received incomplete meteorological data from OpenWeather.' });
        return;
      }

      WEATHER_SERVER_CACHE.set(cacheKey, validated);
      res.status(200).json({ weather: validated, source: 'openweather' });
    } catch {
      res.status(502).json({ error: 'Unable to reach OpenWeather API right now.' });
    }
  });

  app.post('/api/plan', async (req: Request, res: Response): Promise<void> => {
    const config = parseAndSanitizeConfig(req.body);
    if (!config) {
      res.status(400).json({ error: 'Invalid air quality configuration payload.' });
      return;
    }

    const optionalWeather =
      typeof req.body === 'object' && req.body !== null && 'weather' in req.body
        ? validateWeatherTelemetry((req.body as Record<string, unknown>).weather)
        : null;

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
      });
      return;
    }

    const cityName = getResolvedCityName(config);
    const band = getAqiDetailedBand(config.aqi);

    // Compact, token-efficient structured prompt
    const promptLines = [
      `City: ${cityName} | AQI: ${config.aqi} (${band})`,
      `Household: ${config.household.length > 0 ? config.household.join(', ') : 'general adult'}`,
      `Indoor: ${config.indoorSetup.length > 0 ? config.indoorSetup.join(', ') : 'standard apartment'}`,
      `Commute: ${config.commuteMode}`,
    ];
    if (optionalWeather) {
      promptLines.push(
        `Live Weather: ${optionalWeather.temperatureC}°C, Humidity ${optionalWeather.humidityPct}%, Wind ${optionalWeather.windSpeedKmh} km/h (${optionalWeather.condition})`
      );
    }
    promptLines.push(
      'Return strict JSON only: 3 routine blocks (morning, afternoon, evening, 3 concise steps each, scientific rationale) and 12 actionable items (4 zero_cost, 4 indoor_setup, 4 sustainable_swaps) with realistic pm25ReductionPct (2-25) and weeklyCo2SavedKg (0.2-10).'
    );
    const prompt = promptLines.join('\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are VayuShield, an urban air-quality and low-emission environmental scientist. Output compact, medically responsible, evidence-based JSON strictly following the schema. Zero conversational filler.',
          responseMimeType: 'application/json',
          responseSchema: PLAN_RESPONSE_SCHEMA,
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Received an empty response from Gemini API.' });
        return;
      }

      const parsed: unknown = JSON.parse(rawText);
      const validated = validateAirQualityPlan(parsed);
      if (!validated) {
        res.status(502).json({ error: 'Gemini response did not pass schema validation.' });
        return;
      }

      res.status(200).json({ plan: validated, source: 'gemini' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach Gemini API.';
      res.status(502).json({
        error: `Gemini generation unavailable (${message.slice(0, 80)}).`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VayuShield server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start VayuShield server:', err);
  process.exit(1);
});
