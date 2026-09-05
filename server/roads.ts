/**
 * Road Network & Corridor Exposure Engine (SIH-26001 Aligned)
 * Models: Landslide Vulnerability -> Road Exposure = f(Hazard Score, Traffic Density, Strategic Cutoff Risk)
 * Classifications: URGENT ACTION, MONITOR, PRE-ALERT
 */

export interface RoadSegment {
  id: string;
  highwayNumber: string;
  name: string;
  corridor: string;
  chainage: string; // e.g. "Chainage KM 14–22"
  state: string;
  startCoords: [number, number];
  endCoords: [number, number];
  currentStatus: 'CLEAR' | 'CAUTION_DEBRIS' | 'REGULATED_ONE_WAY' | 'SEVERELY_DISRUPTED' | 'CLOSED';
  statusType: 'AUTHORITATIVE' | 'ESTIMATED';
  susceptibilityRank: 'HIGH' | 'VERY HIGH' | 'CRITICAL';
  vulnerableChokePoints: string[];
  detourRouteName: string;
  detourDistanceKm: number;
  criticalAssetsServed: string[];
  trafficDensity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME_DEFENSE_CORRIDOR';
  strategicCutoffRisk: 'HIGH' | 'VERY_HIGH' | 'CRITICAL_ISOLATION';
  roadExposureScore: number; // 0-100 f(Hazard Score, Traffic Density, Strategic Cutoff Risk)
  exposureClassification: 'URGENT ACTION' | 'MONITOR' | 'PRE-ALERT';
  operationalAction: string;
}

export interface CriticalAsset {
  id: string;
  name: string;
  category: 'HOSPITAL' | 'HYDROPOWER' | 'BRIDGE' | 'TELECOM' | 'RELIEF_CAMP' | 'SUBSTATION';
  locationName: string;
  latitude: number;
  longitude: number;
  vulnerabilityStatus: 'SECURE' | 'WATCH' | 'HIGH_EXPOSURE';
  importance: 'TIER_1_CRITICAL' | 'TIER_2_REGIONAL';
}

function calculateRoadExposure(
  baseHazard: number,
  traffic: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME_DEFENSE_CORRIDOR',
  cutoffRisk: 'HIGH' | 'VERY_HIGH' | 'CRITICAL_ISOLATION'
): { score: number; classification: 'URGENT ACTION' | 'MONITOR' | 'PRE-ALERT' } {
  const trafficMultiplier = traffic === 'EXTREME_DEFENSE_CORRIDOR' ? 1.35 : traffic === 'HIGH' ? 1.2 : traffic === 'MODERATE' ? 1.0 : 0.85;
  const cutoffMultiplier = cutoffRisk === 'CRITICAL_ISOLATION' ? 1.4 : cutoffRisk === 'VERY_HIGH' ? 1.2 : 1.0;

  const rawScore = (baseHazard * 0.55) * trafficMultiplier * cutoffMultiplier;
  const score = Math.max(10, Math.min(99, Math.round(rawScore)));

  let classification: 'URGENT ACTION' | 'MONITOR' | 'PRE-ALERT' = 'PRE-ALERT';
  if (score >= 75) {
    classification = 'URGENT ACTION';
  } else if (score >= 50) {
    classification = 'MONITOR';
  } else {
    classification = 'PRE-ALERT';
  }

  return { score, classification };
}

export const CRITICAL_HIGHWAYS: RoadSegment[] = [
  // 1. NH-29 Kohima–Dimapur Ghat Section (Nagaland)
  (() => {
    const { score, classification } = calculateRoadExposure(86, 'EXTREME_DEFENSE_CORRIDOR', 'CRITICAL_ISOLATION');
    return {
      id: 'rd_nh29_nagaland',
      highwayNumber: 'NH-29',
      name: 'Dimapur - Kohima - Imphal Trans-National Lifeline',
      corridor: 'Kohima - Dimapur Ghat Section',
      chainage: 'Chainage KM 14–22 (Old KMC Dumping Ground / Phesama Sinking Zone)',
      state: 'Nagaland',
      startCoords: [25.6747, 94.1105],
      endCoords: [25.9064, 93.7275],
      currentStatus: 'SEVERELY_DISRUPTED',
      statusType: 'AUTHORITATIVE',
      susceptibilityRank: 'CRITICAL',
      vulnerableChokePoints: ['Phesama Landslip Zone', 'KM 18 Mudflow Toe Scour', 'Old KMC Choke Point'],
      detourRouteName: 'Via Jotsoma - Khonoma - Tsiesema By-pass (Restricted Light Vehicles Only)',
      detourDistanceKm: 68,
      criticalAssetsServed: ['Naga Hospital Authority Kohima', 'Assam Rifles HQ Forward Logistics', 'Doyang Hydropower Grid Link'],
      trafficDensity: 'EXTREME_DEFENSE_CORRIDOR',
      strategicCutoffRisk: 'CRITICAL_ISOLATION',
      roadExposureScore: score,
      exposureClassification: classification,
      operationalAction: 'Deploy BRO heavy earthmovers at KM 18. Restrict heavy commercial trucks to night convoy windows during rainfall intervals.',
    };
  })(),

  // 2. NH-27 Haflong–Silchar Choke Point (Dima Hasao, Assam)
  (() => {
    const { score, classification } = calculateRoadExposure(88, 'HIGH', 'CRITICAL_ISOLATION');
    return {
      id: 'rd_nh27_haflong',
      highwayNumber: 'NH-27',
      name: 'East-West Corridor (Haflong - Silchar Sector)',
      corridor: 'Haflong - Jatinga - Silchar Mountain Pass',
      chainage: 'Chainage KM 88–104 (Diyungbra to Jatinga Valley Choke Point)',
      state: 'Assam (Dima Hasao)',
      startCoords: [25.1706, 93.0184],
      endCoords: [24.8333, 92.7789],
      currentStatus: 'REGULATED_ONE_WAY',
      statusType: 'AUTHORITATIVE',
      susceptibilityRank: 'CRITICAL',
      vulnerableChokePoints: ['Jatinga Sinking Escarpment', 'KM 94 Culvert Scour Face', 'Diyung River Cutting Zone'],
      detourRouteName: 'Via Meghalaya NH-6 Shillong-Silchar Corridor (Overcrowded)',
      detourDistanceKm: 185,
      criticalAssetsServed: ['Haflong Civil Hospital', 'NF Railway Lumding-Badarpur Choke Corridor', 'Barak Valley Food Supply Depot'],
      trafficDensity: 'HIGH',
      strategicCutoffRisk: 'CRITICAL_ISOLATION',
      roadExposureScore: score,
      exposureClassification: classification,
      operationalAction: 'Maintain SDRF quick response unit at Jatinga. Continuous pore-water drainage monitoring on upper cut slopes.',
    };
  })(),

  // 3. NH-10 Sevoke–Teesta–Rangpo Corridor (Sikkim / West Bengal)
  (() => {
    const { score, classification } = calculateRoadExposure(84, 'HIGH', 'CRITICAL_ISOLATION');
    return {
      id: 'rd_nh10_sikkim',
      highwayNumber: 'NH-10',
      name: 'Siliguri - Teesta - Gangtok Lifeline',
      corridor: 'Sevoke - Teesta Bazaar - Rangpo Sector',
      chainage: 'Chainage KM 28–44 (29th Mile / Likhu Bhir Shear Corridor)',
      state: 'West Bengal / Sikkim',
      startCoords: [26.885, 88.471],
      endCoords: [27.177, 88.514],
      currentStatus: 'CAUTION_DEBRIS',
      statusType: 'AUTHORITATIVE',
      susceptibilityRank: 'CRITICAL',
      vulnerableChokePoints: ['29th Mile Active Slips', 'Birik Dara Rockfall Face', 'Likhu Bhir Sinking Zone'],
      detourRouteName: 'Via Mungpoo - Jorethang - Namchi Arterial Loop',
      detourDistanceKm: 78,
      criticalAssetsServed: ['STNM Multi-Speciality Hospital Gangtok', 'Teesta Low Dam Project (TLDP-IV)', 'Rangpo Rail-cum-Road Interchange'],
      trafficDensity: 'HIGH',
      strategicCutoffRisk: 'CRITICAL_ISOLATION',
      roadExposureScore: score,
      exposureClassification: classification,
      operationalAction: 'Regulated one-way convoy movement. Night transit suspended during IMD orange/red rainfall warnings.',
    };
  })(),

  // 4. NH-6 Shillong–Jowai–Silchar Mountain Highway (Meghalaya)
  (() => {
    const { score, classification } = calculateRoadExposure(78, 'HIGH', 'VERY_HIGH');
    return {
      id: 'rd_nh6_meghalaya',
      highwayNumber: 'NH-6',
      name: 'Guwahati - Shillong - Silchar National Highway',
      corridor: 'East Jaintia Hills - Ratacherra Sector',
      chainage: 'Chainage KM 62–79 (Sonapur Tunnel Approach / Lumshnong Slips)',
      state: 'Meghalaya',
      startCoords: [25.5788, 91.8933],
      endCoords: [25.0210, 92.3650],
      currentStatus: 'CAUTION_DEBRIS',
      statusType: 'AUTHORITATIVE',
      susceptibilityRank: 'VERY HIGH',
      vulnerableChokePoints: ['Sonapur Tunnel Flash Mudflow Channel', 'Lumshnong Coal Belt Subsidence', 'Khliehriat Cut Slope'],
      detourRouteName: 'Via Jowai - Nartiang - Umrangso Alternate Mountain Track',
      detourDistanceKm: 120,
      criticalAssetsServed: ['NEIGRIHMS Multi-Super Specialty Hospital Shillong', 'Ratacherra Fuel Terminal', 'Barak Valley Commercial Transit'],
      trafficDensity: 'HIGH',
      strategicCutoffRisk: 'VERY_HIGH',
      roadExposureScore: score,
      exposureClassification: classification,
      operationalAction: 'Pre-position high-capacity pumps at Sonapur tunnel portal to clear mud accumulation during cloudbursts.',
    };
  })(),

  // 5. NH-58 Rishikesh–Pipalkoti–Joshimath Corridor (Uttarakhand)
  (() => {
    const { score, classification } = calculateRoadExposure(82, 'HIGH', 'VERY_HIGH');
    return {
      id: 'rd_nh58_uttarakhand',
      highwayNumber: 'NH-58',
      name: 'Rishikesh - Badrinath National Highway',
      corridor: 'Pipalkoti - Helang - Joshimath Sector',
      chainage: 'Chainage KM 210–235 (Helang Shear Zone & Gulabkoti Slips)',
      state: 'Uttarakhand',
      startCoords: [30.432, 79.431],
      endCoords: [30.556, 79.565],
      currentStatus: 'REGULATED_ONE_WAY',
      statusType: 'AUTHORITATIVE',
      susceptibilityRank: 'CRITICAL',
      vulnerableChokePoints: ['Helang Active Shear Face', 'Pipalkoti Slope Undercutting', 'Gulabkoti Sinking Zone'],
      detourRouteName: 'Rudraprayag-Karnaprayag-Gwaldam-Almora Alternate Link',
      detourDistanceKm: 145,
      criticalAssetsServed: ['Joshimath Army Base Hospital', 'Tapovan Vishnugad Hydropower Tunnel', 'Alaknanda River Bridge'],
      trafficDensity: 'HIGH',
      strategicCutoffRisk: 'VERY_HIGH',
      roadExposureScore: score,
      exposureClassification: classification,
      operationalAction: 'Staging of SDRF at Joshimath. Heavy rock breaker teams deployed along Helang sector.',
    };
  })(),

  // 6. NH-766 Thamarassery Churam Ghat Pass (Wayanad, Kerala)
  (() => {
    const { score, classification } = calculateRoadExposure(80, 'HIGH', 'VERY_HIGH');
    return {
      id: 'rd_nh766_wayanad',
      highwayNumber: 'NH-766',
      name: 'Kozhikode - Kollegal Thamarassery Churam Pass',
      corridor: 'Adivaram - Lakkidi - Vythiri Ghat',
      chainage: 'Chainage KM 18–32 (Hairpin Bends 5 to 9 Escarpment)',
      state: 'Kerala',
      startCoords: [11.512, 76.012],
      endCoords: [11.551, 76.126],
      currentStatus: 'CAUTION_DEBRIS',
      statusType: 'AUTHORITATIVE',
      susceptibilityRank: 'CRITICAL',
      vulnerableChokePoints: ['Hairpin 7 Debris Chute', 'Lakkidi View Point Rockfall Face', 'Vythiri Overburden Sump'],
      detourRouteName: 'Via Kuttiyadi - Mananthavady Mountain Route',
      detourDistanceKm: 64,
      criticalAssetsServed: ['Wayanad District Medical College Mananthavady', 'Banasura Sagar Hydel Dam Embankment', 'Kalpetta Emergency Operations Center'],
      trafficDensity: 'HIGH',
      strategicCutoffRisk: 'VERY_HIGH',
      roadExposureScore: score,
      exposureClassification: classification,
      operationalAction: 'Strict night vehicular ban during heavy downpours. CCTV drone surveillance on hairpin slope toe erosion.',
    };
  })()
];

export const REGIONAL_CRITICAL_ASSETS: CriticalAsset[] = [
  {
    id: 'ast_001',
    name: 'Joshimath Military Base & Emergency Hospital',
    category: 'HOSPITAL',
    locationName: 'Joshimath Cantonment, Chamoli, Uttarakhand',
    latitude: 30.5540,
    longitude: 79.5620,
    vulnerabilityStatus: 'HIGH_EXPOSURE',
    importance: 'TIER_1_CRITICAL',
  },
  {
    id: 'ast_002',
    name: 'STNM Multi-Speciality Hospital Gangtok',
    category: 'HOSPITAL',
    locationName: 'Sochakgang, Gangtok, Sikkim',
    latitude: 27.3250,
    longitude: 88.6120,
    vulnerabilityStatus: 'WATCH',
    importance: 'TIER_1_CRITICAL',
  },
  {
    id: 'ast_003',
    name: 'Naga Hospital Authority Kohima (NHAK)',
    category: 'HOSPITAL',
    locationName: 'Naga Hospital, Kohima, Nagaland',
    latitude: 25.6690,
    longitude: 94.1040,
    vulnerabilityStatus: 'WATCH',
    importance: 'TIER_1_CRITICAL',
  },
  {
    id: 'ast_004',
    name: 'Haflong Civil District Hospital & Emergency Depot',
    category: 'HOSPITAL',
    locationName: 'Haflong Hill Station, Dima Hasao, Assam',
    latitude: 25.1740,
    longitude: 93.0210,
    vulnerabilityStatus: 'HIGH_EXPOSURE',
    importance: 'TIER_1_CRITICAL',
  },
  {
    id: 'ast_005',
    name: 'Teesta Low Dam Hydropower Project (Stage IV)',
    category: 'HYDROPOWER',
    locationName: 'Kalijhora, Darjeeling / Kalimpong Corridor, West Bengal',
    latitude: 26.9180,
    longitude: 88.4350,
    vulnerabilityStatus: 'HIGH_EXPOSURE',
    importance: 'TIER_1_CRITICAL',
  },
  {
    id: 'ast_006',
    name: 'Doyang Hydroelectric Power Station (75 MW)',
    category: 'HYDROPOWER',
    locationName: 'Wokha / Doyang River Basin, Nagaland',
    latitude: 26.1520,
    longitude: 94.2810,
    vulnerabilityStatus: 'SECURE',
    importance: 'TIER_1_CRITICAL',
  }
];

export function getRoadsNearLocation(lat: number, lon: number, radiusKm: number = 180): RoadSegment[] {
  return CRITICAL_HIGHWAYS.filter(road => {
    const dStart = Math.hypot(road.startCoords[0] - lat, road.startCoords[1] - lon) * 111;
    const dEnd = Math.hypot(road.endCoords[0] - lat, road.endCoords[1] - lon) * 111;
    return dStart <= radiusKm || dEnd <= radiusKm;
  });
}

export function getAssetsNearLocation(lat: number, lon: number, radiusKm: number = 150): CriticalAsset[] {
  return REGIONAL_CRITICAL_ASSETS.filter(asset => {
    const dist = Math.hypot(asset.latitude - lat, asset.longitude - lon) * 111;
    return dist <= radiusKm;
  });
}
