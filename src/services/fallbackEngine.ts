import {
  CITY_PRESETS,
  type ActionItem,
  type AirQualityPlan,
  type RiskLevel,
  type RoutineBlock,
  type UserAirConfig,
} from '../types/aqi';
import { getAqiSeverity, getResolvedCityName } from '../utils/aqiMath';
import { clampAqi } from '../utils/sanitize';

/**
 * Deterministic client-side environmental intelligence engine.
 * Works instantaneously offline or when no API key is configured, generating
 * scientifically grounded advice tailored to city, AQI, household vulnerability,
 * indoor setup, and commute profile.
 */
export function generateFallbackPlan(config: UserAirConfig): AirQualityPlan {
  const aqi = clampAqi(config.aqi);
  const severity = getAqiSeverity(aqi);
  const cityName = getResolvedCityName(config);
  const preset = CITY_PRESETS.find((c) => c.id === config.cityId);

  const hasKids = config.household.includes('kids');
  const hasElderly = config.household.includes('elderly');
  const hasCommuters = config.household.includes('commuters');
  const hasPets = config.household.includes('pets');
  const hasSensitive = hasKids || hasElderly;

  const hasHepa = config.indoorSetup.includes('hepa_purifier');
  const hasCrossVent = config.indoorSetup.includes('cross_ventilation');
  const hasGasStove = config.indoorSetup.includes('gas_stove');
  const hasPlants = config.indoorSetup.includes('indoor_plants');

  const dominantPollutant = preset?.primaryPollutant ?? (aqi > 200 ? 'PM2.5 & NO2' : 'PM2.5');

  const sensitiveAudience = [
    hasKids ? 'children' : null,
    hasElderly ? 'older adults' : null,
    hasPets ? 'pets' : null,
  ]
    .filter((v): v is string => v !== null)
    .join(', ');

  // Advisory copy
  let advisoryHeadline = '';
  let advisoryDetail = '';
  let safeVentilationWindow = '';

  if (severity === 'good') {
    advisoryHeadline = `Clean dispersion across ${cityName} — ideal window for natural airflow`;
    advisoryDetail = sensitiveAudience
      ? `Ambient particulate levels remain low. Outdoor activity is safe for ${sensitiveAudience}; maintain low-emission commute habits to keep local air clear.`
      : 'Ambient fine particulate levels are well within manageable limits. Open opposing windows during mid-morning to flush indoor CO2 and cooking aerosols.';
    safeVentilationWindow = '07:00 – 11:30 & 15:00 – 18:00';
  } else if (severity === 'moderate') {
    advisoryHeadline = `Elevated urban haze in ${cityName} — time outdoor exposure carefully`;
    advisoryDetail = sensitiveAudience
      ? `Moderate PM2.5 accumulation can irritate airways in ${sensitiveAudience}. Shift vigorous outdoor movement to early afternoon when vertical mixing peaks.`
      : 'Thermal stability traps morning traffic exhaust near street level. Limit strenuous roadside exercise and rely on targeted afternoon ventilation.';
    safeVentilationWindow = '13:00 – 15:30 (Peak boundary mixing)';
  } else {
    advisoryHeadline = `Severe smog episode in ${cityName} — enforce indoor clean-air containment`;
    advisoryDetail = sensitiveAudience
      ? `Hazardous PM2.5 penetrates deep alveolar tissue. Keep ${sensitiveAudience} indoors with sealed perimeter gaps, run continuous filtration, and wear fitted N95 respirators outdoors.`
      : 'Severe temperature inversion is trapping fine particulates at breathing height. Avoid outdoor exertion, seal window drafts, and prioritize sealed clean-air zones indoors.';
    safeVentilationWindow = 'Keep sealed; brief 10-min flush at 14:00 only';
  }

  // Morning / Afternoon / Evening risk calibration
  const morningRisk: RiskLevel =
    severity === 'severe' ? 'high' : severity === 'moderate' ? 'high' : 'low';
  const afternoonRisk: RiskLevel =
    severity === 'severe' ? 'high' : severity === 'moderate' ? 'moderate' : 'low';
  const eveningRisk: RiskLevel =
    severity === 'severe' ? 'high' : severity === 'moderate' ? 'high' : 'moderate';

  const routine: RoutineBlock[] = [
    {
      id: 'routine-morning',
      timeOfDay: 'morning',
      timeWindow: '06:00 – 10:30',
      title:
        severity === 'good'
          ? 'Morning Fresh-Air Flush & Active Start'
          : 'Inversion Shield & Protected Commute',
      riskLevel: morningRisk,
      summary:
        severity === 'good'
          ? 'Flush overnight indoor CO2 buildup before mid-day traffic warms the urban corridor.'
          : 'Cool surface air traps overnight emissions and morning rush exhaust close to ground level.',
      steps: [
        severity === 'good'
          ? 'Open opposite-facing windows for 25 minutes to exchange stale bedroom CO2.'
          : hasKids || hasElderly
            ? 'Move morning walks indoors and keep school/clinic transit windows closed on recirculation.'
            : 'Delay outdoor jogging past 11:00; wear an N95 mask if commuting along arterial roads.',
        hasGasStove
          ? 'Run kitchen exhaust or crack the kitchen window strictly while cooking breakfast to vent NO2.'
          : 'Avoid burning incense, dhoop, or scented candles that spike indoor PM2.5 rapidly.',
        hasPets
          ? 'Keep morning pet walks brief and wipe paws with a damp microfiber cloth on return.'
          : 'Wet-mop high-traffic entryways instead of dry sweeping to prevent dust resuspension.',
      ],
      rationale:
        'Before sunrise through 10:00 AM, radiative ground cooling creates a shallow atmospheric boundary layer (thermal inversion). Traffic and biomass emissions compress into the lowest 150 meters of air, often doubling PM2.5 compared to mid-afternoon.',
    },
    {
      id: 'routine-afternoon',
      timeOfDay: 'afternoon',
      timeWindow: '11:30 – 16:30',
      title:
        severity === 'severe'
          ? 'Controlled Indoor Maintenance Window'
          : 'Solar Dispersion & Smart Ventilation',
      riskLevel: afternoonRisk,
      summary:
        severity === 'severe'
          ? 'Surface warming slightly thins haze, offering the lowest-risk window for essential errands.'
          : 'Convective solar heating lifts the mixing layer, reducing street-level particulate density.',
      steps: [
        severity === 'severe'
          ? 'Run a brief 10-minute controlled air exchange around 14:00 only to clear indoor CO2, then reseal.'
          : hasCrossVent
            ? 'Open cross-ventilation paths for 20–30 minutes between 13:00 and 15:00 for fresh dilution.'
            : 'Cycle indoor air by opening shaded windows briefly away from main road corridors.',
        hasHepa
          ? 'Step HEPA purifier down to medium speed during occupied hours to maintain <35 µg/m³ quietly.'
          : 'Use damp microfiber dusting on hard surfaces so settled coarse PM10 does not re-aerosolize.',
        hasCommuters
          ? 'Batch mid-day errands into a single trip or shift to off-peak transit to cut tailpipe exposure.'
          : 'Stay hydrated with warm water and antioxidant-rich produce to support mucosal clearance.',
      ],
      rationale:
        'Midday solar irradiance warms the earth surface, creating vertical convective currents that expand the planetary boundary layer up to 1–2 km. This natural dilution window provides the lowest daily PM2.5 concentration while keeping indoor CO2 below 1,000 ppm.',
    },
    {
      id: 'routine-evening',
      timeOfDay: 'evening',
      timeWindow: '17:30 – 22:30',
      title:
        severity === 'good'
          ? 'Low-Emission Evening Wind-Down'
          : 'Evening Rush Lockdown & Bedroom Clean Zone',
      riskLevel: eveningRisk,
      summary:
        severity === 'good'
          ? 'Maintain steady indoor air freshness while minimizing evening kitchen aerosols.'
          : 'Sunset cools the ground rapidly as commuter traffic peaks, causing sharp nocturnal smog buildup.',
      steps: [
        severity === 'good'
          ? 'Close road-facing windows during peak 18:00–20:00 traffic flow to block diesel particulates.'
          : 'Close all exterior windows by 17:30 and seal under-door gaps with draft stoppers.',
        hasHepa
          ? 'Pre-clean the primary bedroom on high HEPA speed 45 minutes before sleep, then switch to sleep mode.'
          : 'Create a single low-leakage sleeping room and run a damp cloth across window sills before dusk.',
        hasGasStove
          ? 'Use rear stove burners with lid-covered simmering to cut cooking PM2.5 and NO2 plumes by over half.'
          : 'Avoid harsh aerosol room fresheners or bleach sprays in closed rooms at night.',
      ],
      rationale:
        'As solar heating stops around dusk, the boundary layer collapses rapidly while evening rush traffic and localized waste/solid-fuel burning peak. Establishing a clean bedroom zone protects 7–8 hours of continuous overnight respiratory recovery.',
    },
  ];

  // Tailored checkable actions across the 3 tabs
  const actions: ActionItem[] = [
    // Zero-Cost Hacks
    {
      id: 'zc-wet-mop',
      category: 'zero_cost',
      title: 'Switch from dry brooming to damp microfiber mopping',
      description:
        'Dry sweeping lifts settled PM10 and fine soot back into the breathing zone for up to 2 hours.',
      pm25ReductionPct: 9,
      weeklyCo2SavedKg: 0.4,
      effortLabel: '5 min daily',
    },
    {
      id: 'zc-vent-timing',
      category: 'zero_cost',
      title: 'Sync window ventilation to the 13:00–15:30 dispersion window',
      description:
        'Avoiding dawn and dusk window openings prevents peak thermal-inversion smog from entering.',
      pm25ReductionPct: severity === 'severe' ? 16 : 11,
      weeklyCo2SavedKg: 0.6,
      effortLabel: 'Zero cost',
    },
    {
      id: 'zc-smoke-free-indoors',
      category: 'zero_cost',
      title: 'Eliminate indoor incense, candles, and mosquito coils',
      description:
        'A single burning coil or incense stick can elevate indoor PM2.5 above 180 µg/m³ in closed rooms.',
      pm25ReductionPct: 14,
      weeklyCo2SavedKg: 0.5,
      effortLabel: 'Instant win',
    },
    {
      id: 'zc-recirculate-cabin',
      category: 'zero_cost',
      title:
        config.commuteMode === 'walk_cycle' || config.commuteMode === 'two_wheeler'
          ? 'Route via tree-lined inner streets away from arterial corridors'
          : 'Engage cabin AC air-recirculation in heavy traffic zones',
      description:
        config.commuteMode === 'walk_cycle' || config.commuteMode === 'two_wheeler'
          ? 'Shifting just one block off a high-volume highway drops direct tailpipe PM2.5 intake by up to 35%.'
          : 'Keeping vehicle vents on recirculation prevents concentrated diesel exhaust from entering the cabin.',
      pm25ReductionPct: 10,
      weeklyCo2SavedKg: 0.8,
      effortLabel: 'Every commute',
    },

    // Indoor Setup
    {
      id: 'is-hepa-placement',
      category: 'indoor_setup',
      title: hasHepa
        ? 'Optimize HEPA placement & vacuum pre-filter weekly'
        : 'Build a clean-air bedroom sanctuary with a DIY box-fan MERV-13 filter',
      description: hasHepa
        ? 'Place your unit 30 cm off walls in the bedroom with doors closed; clean pre-filters preserve CADR airflow.'
        : 'Pairing a high-MERV pleated filter with a standard fan delivers affordable particulate capture during smog spikes.',
      pm25ReductionPct: hasHepa ? 18 : 22,
      weeklyCo2SavedKg: 0.3,
      effortLabel: '10 min setup',
    },
    {
      id: 'is-draft-seals',
      category: 'indoor_setup',
      title: 'Install silicone weatherstripping on exterior door & window gaps',
      description:
        'Reduces outdoor smog infiltration rate by nearly half when AQI crosses 200.',
      pm25ReductionPct: severity === 'severe' ? 15 : 10,
      weeklyCo2SavedKg: 1.4,
      effortLabel: 'One-time',
    },
    {
      id: 'is-kitchen-hood',
      category: 'indoor_setup',
      title: hasGasStove
        ? 'Use rear burners + lids + exhaust on every gas cooking session'
        : 'Pre-heat oil moderately and cover pans to trap cooking aerosols',
      description: hasGasStove
        ? 'Gas combustion emits sharp bursts of NO2 and ultrafine particles; rear burners capture 60% more plume into vents.'
        : 'High-heat frying releases dense indoor PM2.5; lidded cookware cuts aerosol dispersion dramatically.',
      pm25ReductionPct: hasGasStove ? 13 : 8,
      weeklyCo2SavedKg: 0.9,
      effortLabel: 'Every meal',
    },
    {
      id: 'is-botanical-humidity',
      category: 'indoor_setup',
      title: hasPlants
        ? 'Wipe indoor plant leaves weekly & keep humidity at 40–50%'
        : 'Maintain 40–50% indoor humidity and entry shoe-free zones',
      description:
        'Wiping foliage removes settled dust while balanced humidity helps airborne particulates settle faster out of reach.',
      pm25ReductionPct: 6,
      weeklyCo2SavedKg: 0.2,
      effortLabel: 'Weekly habit',
    },

    // Sustainable Swaps
    {
      id: 'ss-commute-shift',
      category: 'sustainable_swaps',
      title:
        config.commuteMode === 'car_cab' || config.commuteMode === 'two_wheeler'
          ? 'Replace 2 solo motor trips per week with metro, bus, or carpool'
          : 'Combine neighborhood errands into one zero-tailpipe walking loop',
      description:
        config.commuteMode === 'car_cab' || config.commuteMode === 'two_wheeler'
          ? 'Directly cuts urban NO2 and fine brake-dust emissions while shrinking your weekly carbon footprint.'
          : 'Prevents cold-start engine emissions, which generate disproportionate particulate pollution over short distances.',
      pm25ReductionPct: 6,
      weeklyCo2SavedKg:
        config.commuteMode === 'car_cab'
          ? 9.4
          : config.commuteMode === 'two_wheeler'
            ? 5.2
            : 2.8,
      effortLabel: '2x weekly',
    },
    {
      id: 'ss-electric-cooking',
      category: 'sustainable_swaps',
      title: hasGasStove
        ? 'Shift boiling & morning tea to an electric kettle or induction plate'
        : 'Batch-cook staples with pressure cookers to trim energy demand',
      description: hasGasStove
        ? 'Eliminates open indoor flame combustion during quick daily tasks, lowering both indoor NO2 and LPG emissions.'
        : 'Reduces peak thermal load and indirect power-plant particulate emissions across the urban grid.',
      pm25ReductionPct: hasGasStove ? 11 : 4,
      weeklyCo2SavedKg: hasGasStove ? 3.2 : 1.9,
      effortLabel: 'Daily swap',
    },
    {
      id: 'ss-delivery-batching',
      category: 'sustainable_swaps',
      title: 'Consolidate grocery & parcel orders to one weekly delivery slot',
      description:
        'Cuts last-mile two-wheeler and diesel van idling in residential streets.',
      pm25ReductionPct: 3,
      weeklyCo2SavedKg: 2.6,
      effortLabel: 'Weekly',
    },
    {
      id: 'ss-tire-idle',
      category: 'sustainable_swaps',
      title: 'Turn off engine at >30s signals & check tire pressure monthly',
      description:
        'Eliminating unnecessary idling reduces localized intersection smog and improves fuel economy by 4–6%.',
      pm25ReductionPct: 4,
      weeklyCo2SavedKg: 3.1,
      effortLabel: 'Low effort',
    },
  ];

  return {
    advisoryHeadline,
    advisoryDetail,
    dominantPollutant,
    safeVentilationWindow,
    routine,
    actions,
  };
}
