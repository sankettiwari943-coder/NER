/**
 * REST API client for NER Landslide Platform (SIH-26001 Aligned)
 */

import {
  User,
  RiskAssessment,
  WeatherData,
  OutlookDay,
  LocationPoint,
  CitizenReport,
  OfflineQueuedReport,
  ReportStatusHistory,
  Alert,
  RoadSegment,
  CriticalAsset,
  EvidenceDocument,
  RagQueryResult,
  RagExplanation,
  SimulationResult,
  CopilotBriefing,
  SystemHealthData,
  AnalyticsData
} from '../types';

class ApiService {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('ner_auth_token');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('ner_auth_token', token);
      } else {
        localStorage.removeItem('ner_auth_token');
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (this.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json();
  }

  // System
  public getHealth(): Promise<any> {
    return this.request('/api/v1/health');
  }

  // Auth
  public async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await this.request<{ user: User; token: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  public async signup(payload: {
    email: string;
    password: string;
    full_name: string;
    role?: 'USER' | 'ADMIN';
    admin_code?: string;
    organization?: string;
    phone?: string;
  }): Promise<{ user: User; token: string }> {
    const data = await this.request<{ user: User; token: string }>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.token);
    return data;
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  public async getMe(): Promise<{ user: User }> {
    return this.request('/api/v1/auth/me');
  }

  public async getUserReports(): Promise<{ reports: CitizenReport[] }> {
    return this.request('/api/v1/user/reports');
  }

  // Locations
  public async getCuratedLocations(): Promise<{ locations: LocationPoint[] }> {
    return this.request('/api/v1/location');
  }

  public async searchLocations(q: string): Promise<{ results: LocationPoint[] }> {
    return this.request(`/api/v1/location/search?q=${encodeURIComponent(q)}`);
  }

  public async reverseGeocode(lat: number, lon: number): Promise<{ name: string; district: string; state: string; formatted: string }> {
    return this.request(`/api/v1/location/reverse?lat=${lat}&lon=${lon}`);
  }

  // Weather & Risk Evaluation
  public async getRainfall(lat: number, lon: number): Promise<WeatherData> {
    return this.request(`/api/v1/rainfall?lat=${lat}&lon=${lon}`);
  }

  public async getRisk(lat: number, lon: number): Promise<RiskAssessment> {
    return this.request(`/api/v1/risk-evaluation?lat=${lat}&lon=${lon}`);
  }

  public async getRiskEvaluation(lat: number, lon: number): Promise<RiskAssessment> {
    return this.request(`/api/v1/risk-evaluation?lat=${lat}&lon=${lon}`);
  }

  public async analyzeRiskEvaluation(payload: {
    latitude: number;
    longitude: number;
    customSlopeDeg?: number;
    precipitation24hMm?: number;
    precipitation72hMm?: number;
    soilSaturationPct?: number;
    seismicTrigger?: boolean;
  }): Promise<RiskAssessment> {
    return this.request('/api/v1/risk-evaluation', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async simulateWhatIf(payload: {
    baselineLat: number;
    baselineLon: number;
    rainfallAnomalyPct: number;
    slopeAdjustmentDeg: number;
    soilSaturationAdjustmentPct: number;
    seismicTrigger: boolean;
  }): Promise<SimulationResult> {
    return this.request('/api/v1/risk/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getOutlook(lat: number, lon: number): Promise<{ outlook: OutlookDay[]; updatedAt: string }> {
    return this.request(`/api/v1/risk/outlook?lat=${lat}&lon=${lon}`);
  }

  // Roads & Corridors
  public async getRoads(lat: number, lon: number, radius: number = 180): Promise<{ count: number; roads: RoadSegment[] }> {
    return this.request(`/api/v1/roads?lat=${lat}&lon=${lon}&radius=${radius}`);
  }

  public async getRoadCorridors(): Promise<{ count: number; corridors: RoadSegment[]; monitoredAt: string }> {
    return this.request('/api/v1/roads/corridors');
  }

  public async getAssets(lat: number, lon: number, radius: number = 150): Promise<{ count: number; assets: CriticalAsset[] }> {
    return this.request(`/api/v1/assets?lat=${lat}&lon=${lon}&radius=${radius}`);
  }

  // Citizen Reports & Offline Sync
  public async submitReport(formData: FormData): Promise<{ message: string; report: CitizenReport }> {
    return this.request('/api/v1/reports', {
      method: 'POST',
      body: formData,
    });
  }

  public async syncOfflineReports(reports: OfflineQueuedReport[]): Promise<{
    message: string;
    syncedCount: number;
    failedCount: number;
    processedReports: CitizenReport[];
    syncedAt: string;
  }> {
    return this.request('/api/v1/reports/sync', {
      method: 'POST',
      body: JSON.stringify({ reports }),
    });
  }

  public async getReports(params?: { lat?: number; lon?: number; radius?: number; status?: string }): Promise<{ count: number; reports: CitizenReport[] }> {
    const query = new URLSearchParams();
    if (params?.lat !== undefined) query.set('lat', String(params.lat));
    if (params?.lon !== undefined) query.set('lon', String(params.lon));
    if (params?.radius !== undefined) query.set('radius', String(params.radius));
    if (params?.status) query.set('status', params.status);
    return this.request(`/api/v1/reports?${query.toString()}`);
  }

  public async getReportStatusHistory(reportId: string): Promise<{ history: ReportStatusHistory[] }> {
    return this.request(`/api/v1/reports/${reportId}/history`);
  }

  public async updateReportStatus(reportId: string, status: string, note?: string): Promise<{ report: CitizenReport; history: ReportStatusHistory[] }> {
    return this.request(`/api/v1/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  }

  public async triggerAiObserve(reportId: string): Promise<{ observation: string }> {
    return this.request(`/api/v1/reports/${reportId}/ai-observe`, {
      method: 'POST',
    });
  }

  public async getRegionalSummary(locationName: string, radiusKm: number, reports: CitizenReport[]): Promise<{ summary: string }> {
    return this.request('/api/v1/reports/regional-summary', {
      method: 'POST',
      body: JSON.stringify({ locationName, radiusKm, reports }),
    });
  }

  // Alerts & Human Verification Gate
  public async getAlerts(): Promise<{ count: number; alerts: Alert[] }> {
    return this.request('/api/v1/alerts');
  }

  public async getPendingAlerts(): Promise<{ count: number; pendingAlerts: Alert[]; verificationGateStatus: string }> {
    return this.request('/api/v1/admin/alerts/pending');
  }

  public async approveAlert(alertId: string): Promise<{ message: string; alert: Alert }> {
    return this.request(`/api/v1/admin/alerts/${alertId}/approve`, {
      method: 'POST',
    });
  }

  public async rejectAlert(alertId: string, reason?: string): Promise<{ message: string }> {
    return this.request(`/api/v1/admin/alerts/${alertId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public async createAlert(payload: {
    title: string;
    severity: string;
    location_name: string;
    latitude: number;
    longitude: number;
    radius_km?: number;
    source?: string;
    affected_area?: string;
    recommended_action?: string;
  }): Promise<{ alert: Alert }> {
    return this.request('/api/v1/alerts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async resolveAlert(alertId: string): Promise<{ alert: Alert }> {
    return this.request(`/api/v1/alerts/${alertId}/resolve`, {
      method: 'PATCH',
    });
  }

  // Evidence & Grounded RAG
  public async getEvidenceDocs(): Promise<{ count: number; documents: EvidenceDocument[] }> {
    return this.request('/api/v1/evidence');
  }

  public async queryRag(query: string, domainFilter?: string): Promise<RagQueryResult> {
    return this.request('/api/v1/rag/query', {
      method: 'POST',
      body: JSON.stringify({ query, domainFilter }),
    });
  }

  public async getRagExplanation(params: {
    hotspotName?: string;
    locationName?: string;
    latitude?: number;
    longitude?: number;
    rainfallMm?: number;
    precipitation24hMm?: number;
    precipitation72hMm?: number;
    slopeDeg?: number;
    lithology?: string;
  }): Promise<RagExplanation> {
    return this.request('/api/v1/rag-explain', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Copilot & Priorities
  public async getPriorities(): Promise<{ priorities: any[] }> {
    return this.request('/api/v1/priorities');
  }

  public async getCopilotBriefing(payload: {
    locationName: string;
    latitude: number;
    longitude: number;
    riskAssessment?: RiskAssessment;
    weather?: WeatherData;
  }): Promise<CopilotBriefing> {
    return this.request('/api/v1/copilot', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Admin
  public async getAdminAnalytics(): Promise<AnalyticsData> {
    return this.request('/api/v1/admin/analytics');
  }

  public async getAdminSystemHealth(): Promise<SystemHealthData> {
    return this.request('/api/v1/admin/system-health');
  }
}

export const api = new ApiService();
