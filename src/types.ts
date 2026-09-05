/**
 * TypeScript types for NER Landslide Platform (SIH-26001 Aligned)
 */

export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization?: string;
  phone?: string;
  created_at: string;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface FactorContribution {
  factor: string;
  category: 'HYDROLOGY' | 'TOPOGRAPHY' | 'GEOLOGY' | 'HISTORICAL' | 'SATELLITE_OPTICAL' | 'SATELLITE_SAR';
  weight: number;
  rawScore: number;
  weightedScore: number;
  displayValue: string;
  explanation: string;
}

export interface Sentinel1SarData {
  satellite: 'Sentinel-1 C-Band SAR';
  deformationRateMmPerYear: number;
  interferometricPhaseShiftDeg: number;
  insarCoherence: number;
  pointsContribution: number;
  radarPenetrationAdvantage: string; // "Radar penetrates monsoonal cloud cover"
  orbitPass: 'Ascending' | 'Descending';
  lastAcquisition: string;
}

export interface Sentinel2OpticalData {
  satellite: 'Sentinel-2 MSI Optical';
  ndviLossPct: number;
  bareSoilIndexBsi: number;
  canopyLossScarpPts: number;
  pointsContribution: number;
  cloudCoverPct: number;
  cloudCoverMitigationNote: string;
  lastAcquisition: string;
}

export interface DualSatelliteIntelligence {
  active: boolean;
  sentinel1Sar: Sentinel1SarData;
  sentinel2Optical: Sentinel2OpticalData;
  totalSatelliteBonusPts: number;
  fusionSummary: string;
}

export interface DynamicTelemetryFeatures {
  precipitation24hMm: number;
  precipitation72hMm: number;
  soilSaturationPct: number;
  slopeAngleDeg: number;
  drainageMorphometry: string;
}

export interface RiskAssessment {
  riskScore: number;
  compositeScore: number;
  riskLevel: RiskLevel;
  warningColor: string;
  contributingFactors: FactorContribution[];
  dynamicFeatures: DynamicTelemetryFeatures;
  dualSatellite: DualSatelliteIntelligence;
  hydrologicalTrigger: number;
  topographicVulnerability: number;
  geotechnicalFactor: number;
  historicalSusceptibilityFactor: number;
  empiricalOverrideApplied: boolean;
  empiricalOverrideReason?: string;
  dataQuality: 'HIGH' | 'MEDIUM' | 'ESTIMATED';
  freshness: 'LIVE' | 'RECENT' | 'FORECAST' | 'ESTIMATED' | 'SIMULATED';
  evaluatedAt: string;
  calculatedBy: string;
  weatherSummary?: {
    status: string;
    freshnessLabel: string;
    precip24h: number;
    precip72h: number;
    temp: number | null;
    desc: string;
  };
}

export interface WeatherData {
  status: 'LIVE' | 'RECENT' | 'FORECAST' | 'UNAVAILABLE' | 'ESTIMATED';
  freshnessLabel: string;
  updatedAt: string;
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  relativeHumidity: number | null;
  currentPrecipitationMmH: number;
  precipitation24hMm: number;
  precipitation72hMm: number;
  targetDate?: string;
  isForecast?: boolean;
  forecastDate?: string;
  forecastDaily: Array<{
    dayOffset: number;
    date: string;
    precipitationMm: number;
    precipitationProbability: number;
    status: 'FORECAST';
  }>;
  weatherDescription: string;
  isProviderLive: boolean;
  providerInfo?: {
    name: string;
    hasCustomKey: boolean;
    mode: string;
  };
}

export interface OutlookDay {
  dayLabel: string;
  date: string;
  forecastPrecipitationMm: number;
  precipitationProbability: number;
  riskScore: number;
  riskLevel: RiskLevel;
  warningColor: string;
  status: 'FORECAST' | 'UNAVAILABLE';
  dataFreshness: string;
}

export interface LocationPoint {
  id: string;
  name: string;
  district: string;
  state: string;
  region: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  landslideZoneCategory: string;
  criticalHighways: string[];
}

export interface CitizenReport {
  id: string;
  user_id: string;
  user_name: string;
  hazard_type: string;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  location_name: string;
  latitude: number;
  longitude: number;
  photo_url?: string;
  image_url?: string;
  photo?: string;
  photo_storage_key?: string;
  verification_status: 'UNVERIFIED' | 'UNDER REVIEW' | 'VERIFIED' | 'REJECTED' | 'RESOLVED';
  ai_status?: string;
  ai_observation?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  distanceKm?: number;
  isOfflineQueued?: boolean;
}

export interface OfflineQueuedReport {
  localId: string;
  hazard_type: string;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  location_name: string;
  latitude: number;
  longitude: number;
  photoBase64?: string;
  photoFileName?: string;
  created_at: string;
  syncStatus: 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
}

export interface ReportStatusHistory {
  id: string;
  report_id: string;
  previous_status: string;
  new_status: string;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  note?: string;
}

export interface Alert {
  id: string;
  title: string;
  severity: 'ADVISORY' | 'WARNING' | 'CRITICAL';
  location_name: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  source: 'SYSTEM' | 'CITIZEN' | 'ADMIN' | 'AI-ASSISTED' | 'OFFICIAL';
  status: 'ACTIVE' | 'RESOLVED' | 'PENDING_APPROVAL';
  affected_area: string;
  recommended_action: string;
  report_id?: string;
  created_at: string;
  updated_at: string;
  evidenceSummary?: string;
  authorityApprovalRequired?: boolean;
}

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

export type CorridorRisk = RoadSegment;

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

export interface EvidenceDocument {
  id: string;
  title: string;
  sourceOrganization: string;
  publicationYear: number;
  documentType: string;
  urlReference: string;
  summary: string;
}

export interface RagCitation {
  source: string;
  document: string;
  clause: string;
  relevance: number;
  url: string;
  excerpt: string;
}

export interface RagQueryResult {
  query: string;
  answer: string;
  citations: RagCitation[];
  evidenceRetrievedCount: number;
}

export interface RagExplanation {
  hotspotName: string;
  latitude: number;
  longitude: number;
  geotechnicalSynthesis: string;
  rainfallExceedanceStatement: string; // e.g. "Continuous antecedent precipitation of 142mm exceeded I-D threshold..."
  bedrockShearEvaluation: string;
  authoritativeCitations: RagCitation[];
  recommendedSopAction: string;
  nlfcBulletinRef: string;
  ndmaSopClause: string;
}

export interface SimulationResult {
  baseline: RiskAssessment;
  scenario: RiskAssessment;
  deltaScore: number;
  deltaLevel: string;
  summary: string;
  triggerFactors: string[];
}

export interface CopilotBriefing {
  situationSummary: string;
  immediateActions0to2h: string[];
  immediateActions2to6h: string[];
  immediateActions6to24h: string[];
  roadConsiderations: string[];
  criticalInfrastructure: string[];
  resourceRequirements: string[];
  responsePriority: string;
  evidenceBackedReasoning: string[];
}

export interface SystemHealthData {
  systemState: string;
  components: {
    database: { name: string; status: string; engine: string; details: any };
    objectStorage: { name: string; status: string; storagePath: string };
    geminiAi: { name: string; status: string; mode: string };
    weatherProvider: { name: string; status: string; interval: string };
    ragVectorEngine: { name: string; status: string; documentsCount: number };
    mapProvider?: { name: string; status: string; mode: string };
  };
  auditLogsRecent: Array<{
    id: string;
    user_id: string;
    action: string;
    target_resource: string;
    details: string;
    timestamp: string;
  }>;
  checkedAt: string;
}

export interface AnalyticsData {
  totalReports: number;
  reportsByStatus: {
    unverified: number;
    underReview: number;
    verified: number;
    rejected: number;
    resolved: number;
  };
  totalAlerts: number;
  alertsBySeverity: {
    critical: number;
    warning: number;
    advisory: number;
  };
  criticalHighwaysMonitored: number;
  criticalAssetsMonitored: number;
  authoritativeEvidenceDocs: number;
  dataFreshnessStatus: string;
  pendingApprovalAlertsCount?: number;
}

export interface SmsLog {
  id: string;
  recipient_phone: string;
  recipient_name?: string;
  recipient_sector: string;
  alert_title?: string;
  message?: string;
  message_body?: string;
  dispatched_by?: string;
  severity?: 'CRITICAL' | 'WARNING' | 'ADVISORY' | 'INFO' | string;
  trigger_type?: 'INCIDENT_VERIFIED' | 'CAP_BROADCAST' | 'GATE_APPROVED' | 'TEST_BROADCAST' | string;
  delivery_status?: 'DELIVERED' | 'SENT' | 'FAILED' | 'DELIVERED_CARRIER' | string;
  gateway_response?: string;
  dispatched_at?: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  phone_number?: string;
  assigned_sector?: string;
  sms_alerts_enabled?: boolean;
  full_name?: string;
  email?: string;
  updated_at?: string;
}
