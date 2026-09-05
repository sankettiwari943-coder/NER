/**
 * India-wide & NER Location Intelligence & Geocoding Service.
 * Prioritizes North Eastern Region (NER) hill corridors for SIH-26001.
 */

export interface LocationPoint {
  id: string;
  name: string;
  district: string;
  state: string;
  region: 'Eastern Himalayas / Northeast' | 'Western Himalayas' | 'Western Ghats' | 'Central / Peninsular' | 'Other';
  latitude: number;
  longitude: number;
  elevationM: number;
  landslideZoneCategory: 'Very High Susceptibility' | 'High Susceptibility' | 'Moderate Susceptibility' | 'Low Susceptibility';
  criticalHighways: string[];
}

export const CURATED_INDIA_LOCATIONS: LocationPoint[] = [
  // 1. North Eastern Region (NER) Prioritized
  {
    id: 'loc_kohima',
    name: 'Kohima (Phesama & Jotsoma Slopes)',
    district: 'Kohima',
    state: 'Nagaland',
    region: 'Eastern Himalayas / Northeast',
    latitude: 25.6747,
    longitude: 94.1105,
    elevationM: 1444,
    landslideZoneCategory: 'Very High Susceptibility',
    criticalHighways: ['NH-29 (Dimapur-Kohima-Imphal Trans-National Lifeline)', 'Kohima-Zunheboto Road']
  },
  {
    id: 'loc_haflong',
    name: 'Haflong & Jatinga Valley',
    district: 'Dima Hasao',
    state: 'Assam',
    region: 'Eastern Himalayas / Northeast',
    latitude: 25.1706,
    longitude: 93.0184,
    elevationM: 968,
    landslideZoneCategory: 'Very High Susceptibility',
    criticalHighways: ['NH-27 (East-West Highway Corridor)', 'Lumding-Badarpur Railway Corridor']
  },
  {
    id: 'loc_shillong',
    name: 'Shillong (East Khasi Hills)',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    region: 'Eastern Himalayas / Northeast',
    latitude: 25.5788,
    longitude: 91.8933,
    elevationM: 1525,
    landslideZoneCategory: 'High Susceptibility',
    criticalHighways: ['NH-6 (Guwahati-Shillong-Silchar Corridor)', 'Cherrapunji-Dawki Highway']
  },
  {
    id: 'loc_gangtok',
    name: 'Gangtok & Teesta Basin',
    district: 'East Sikkim',
    state: 'Sikkim',
    region: 'Eastern Himalayas / Northeast',
    latitude: 27.3389,
    longitude: 88.6065,
    elevationM: 1650,
    landslideZoneCategory: 'Very High Susceptibility',
    criticalHighways: ['NH-10 (Siliguri-Sevoke-Gangtok Lifeline)', 'Indira Bypass Corridor']
  },
  {
    id: 'loc_aizawl',
    name: 'Aizawl (Ramhlun & Hunthar Sinking Slopes)',
    district: 'Aizawl',
    state: 'Mizoram',
    region: 'Eastern Himalayas / Northeast',
    latitude: 23.7271,
    longitude: 92.7176,
    elevationM: 1132,
    landslideZoneCategory: 'Very High Susceptibility',
    criticalHighways: ['NH-54 (Silchar-Aizawl Corridor)', 'Aizawl-Lunglei Highway']
  },
  {
    id: 'loc_itanagar',
    name: 'Itanagar & Papum Pare Hills',
    district: 'Papum Pare',
    state: 'Arunachal Pradesh',
    region: 'Eastern Himalayas / Northeast',
    latitude: 27.0844,
    longitude: 93.6053,
    elevationM: 320,
    landslideZoneCategory: 'High Susceptibility',
    criticalHighways: ['NH-415', 'Trans-Arunachal Highway Sector']
  },
  {
    id: 'loc_kalimpong',
    name: 'Kalimpong & 29th Mile',
    district: 'Kalimpong',
    state: 'West Bengal',
    region: 'Eastern Himalayas / Northeast',
    latitude: 27.0594,
    longitude: 88.4695,
    elevationM: 1247,
    landslideZoneCategory: 'Very High Susceptibility',
    criticalHighways: ['NH-10 Teesta Valley', 'Kalimpong-Lava-Rishyap Road']
  },
  {
    id: 'loc_darjeeling',
    name: 'Darjeeling (Paglajhora & Rohini)',
    district: 'Darjeeling',
    state: 'West Bengal',
    region: 'Eastern Himalayas / Northeast',
    latitude: 27.0410,
    longitude: 88.2663,
    elevationM: 2042,
    landslideZoneCategory: 'Very High Susceptibility',
    criticalHighways: ['NH-110 (Siliguri-Darjeeling Hill Cart Road)', 'Rohini Road']
  },

  // 2. Western Himalayas
  {
    id: 'loc_joshimath',
    name: 'Joshimath (Helang & Auli Cut Slopes)',
    district: 'Chamoli',
    state: 'Uttarakhand',
    region: 'Western Himalayas',
    latitude: 30.5564,
    longitude: 79.5653,
    elevationM: 1890,
    landslideZoneCategory: 'Very High Susceptibility',
    criticalHighways: ['NH-58 (Rishikesh-Badrinath)', 'Joshimath-Auli Road']
  },
  {
    id: 'loc_rudraprayag',
    name: 'Rudraprayag',
    district: 'Rudraprayag',
    state: 'Uttarakhand',
    region: 'Western Himalayas',
    latitude: 30.2844,
    longitude: 78.9811,
    elevationM: 895,
    landslideZoneCategory: 'Very High Susceptibility',
    criticalHighways: ['NH-58', 'NH-107 (Rudraprayag-Kedarnath)']
  },
  {
    id: 'loc_shimla',
    name: 'Shimla & Nigulsari Choke',
    district: 'Shimla',
    state: 'Himachal Pradesh',
    region: 'Western Himalayas',
    latitude: 31.1048,
    longitude: 77.1734,
    elevationM: 2276,
    landslideZoneCategory: 'High Susceptibility',
    criticalHighways: ['NH-5 (Hindustan-Tibet Road)', 'Kalka-Shimla NH-22']
  },

  // 3. Western Ghats
  {
    id: 'loc_wayanad',
    name: 'Wayanad (Meppadi / Chooralmala)',
    district: 'Wayanad',
    state: 'Kerala',
    region: 'Western Ghats',
    latitude: 11.5511,
    longitude: 76.1264,
    elevationM: 780,
    landslideZoneCategory: 'Very High Susceptibility',
    criticalHighways: ['NH-766 (Kozhikode-Kollegal Thamarassery Churam)', 'Meppadi-Chooralmala Link']
  },
  {
    id: 'loc_munnar',
    name: 'Munnar & Gap Road Escarpment',
    district: 'Idukki',
    state: 'Kerala',
    region: 'Western Ghats',
    latitude: 10.0889,
    longitude: 77.0595,
    elevationM: 1532,
    landslideZoneCategory: 'Very High Susceptibility',
    criticalHighways: ['NH-85 (Kochi-Dhanushkodi Gap Road)', 'Munnar-Marayoor Route']
  }
];

export async function searchIndiaLocations(query: string): Promise<LocationPoint[]> {
  const q = query.trim().toLowerCase();
  if (!q) return CURATED_INDIA_LOCATIONS.slice(0, 8);

  const matched = CURATED_INDIA_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(q) ||
    loc.district.toLowerCase().includes(q) ||
    loc.state.toLowerCase().includes(q) ||
    loc.criticalHighways.some(h => h.toLowerCase().includes(q))
  );

  return matched;
}

export async function reverseGeocodeIndia(lat: number, lon: number) {
  // Find nearest curated location if close (<35km)
  let nearest: LocationPoint | null = null;
  let minDistance = Infinity;

  for (const loc of CURATED_INDIA_LOCATIONS) {
    const dist = Math.hypot(loc.latitude - lat, loc.longitude - lon) * 111;
    if (dist < minDistance) {
      minDistance = dist;
      nearest = loc;
    }
  }

  if (nearest && minDistance <= 35) {
    return {
      name: nearest.name,
      district: nearest.district,
      state: nearest.state,
      formatted: `${nearest.name}, ${nearest.district}, ${nearest.state} (~${minDistance.toFixed(1)}km)`,
      elevationM: nearest.elevationM,
      landslideZoneCategory: nearest.landslideZoneCategory,
      criticalHighways: nearest.criticalHighways,
    };
  }

  // Geocoding heuristic
  let state = 'India';
  let district = 'Regional Sector';

  if (lat >= 24.0 && lat <= 28.0 && lon >= 93.0 && lon <= 96.0) {
    state = 'Nagaland / Manipur / Assam';
    district = 'NER Mountain Sector';
  } else if (lat >= 25.0 && lat <= 26.5 && lon >= 90.0 && lon <= 93.0) {
    state = 'Meghalaya';
    district = 'Khasi-Garo Hills';
  } else if (lat >= 27.0 && lat <= 28.5 && lon >= 88.0 && lon <= 89.5) {
    state = 'Sikkim';
    district = 'Himalayan Ridge';
  } else if (lat >= 29.0 && lat <= 31.5 && lon >= 78.0 && lon <= 81.0) {
    state = 'Uttarakhand';
    district = 'Garhwal / Kumaon Himalayas';
  } else if (lat >= 8.5 && lat <= 13.0 && lon >= 75.0 && lon <= 77.5) {
    state = 'Kerala';
    district = 'Western Ghats Corridor';
  }

  return {
    name: `Sector (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E)`,
    district,
    state,
    formatted: `Hill Sector ${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E, ${district}, ${state}`,
    elevationM: 1100,
    landslideZoneCategory: 'Geotechnical Assessment Sector',
    criticalHighways: ['State Highway Link'],
  };
}
