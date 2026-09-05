/**
 * NER Landslide Intelligence, Early Warning & Emergency Response Platform
 * Main Application Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineSyncProvider } from './context/OfflineSyncContext';
import { Header } from './components/Header';
import { IndiaMap } from './components/IndiaMap';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AlertsAndRoadsView } from './components/AlertsAndRoadsView';
import { EvidenceRagView } from './components/EvidenceRagView';
import { AiCopilotView } from './components/AiCopilotView';
import { CitizenReportModal } from './components/CitizenReportModal';
import { AuthModal } from './components/AuthModal';
import { ShieldCheck, Lock } from 'lucide-react';
import { ADMIN_EMAIL } from './lib/supabase';

import {
  LocationPoint,
  RiskAssessment,
  WeatherData,
  OutlookDay,
  CitizenReport,
  Alert,
  RoadSegment,
  CriticalAsset
} from './types';
import { api } from './services/api';
import { CURATED_INDIA_LOCATIONS } from '../server/locations';

const AppContent: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const [currentTab, setCurrentTab] = useState<string>('map');
  const [selectedLocation, setSelectedLocation] = useState<LocationPoint>(CURATED_INDIA_LOCATIONS[0]);

  const [currentRisk, setCurrentRisk] = useState<RiskAssessment | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [outlook, setOutlook] = useState<OutlookDay[]>([]);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [userReports, setUserReports] = useState<CitizenReport[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [roads, setRoads] = useState<RoadSegment[]>([]);
  const [assets, setAssets] = useState<CriticalAsset[]>([]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [dataFreshness, setDataFreshness] = useState('LIVE INGESTION');

  // Fetch location-specific data (Risk, Weather, Outlook, Roads, Assets, Reports)
  const refreshLocationData = useCallback(async (loc: LocationPoint) => {
    try {
      const [riskRes, weatherRes, outlookRes, roadRes, assetRes, reportRes] = await Promise.all([
        api.getRisk(loc.latitude, loc.longitude),
        api.getRainfall(loc.latitude, loc.longitude),
        api.getOutlook(loc.latitude, loc.longitude),
        api.getRoads(loc.latitude, loc.longitude, 120),
        api.getAssets(loc.latitude, loc.longitude, 100),
        api.getReports({ lat: loc.latitude, lon: loc.longitude, radius: 100 })
      ]);

      setCurrentRisk(riskRes);
      setWeather(weatherRes);
      setOutlook(outlookRes.outlook);
      setRoads(roadRes.roads);
      setAssets(assetRes.assets);
      setReports(reportRes.reports);
      setDataFreshness(weatherRes.status === 'LIVE' ? 'LIVE (Open-Meteo & GSI)' : 'RECENT TELEMETRY');
    } catch (err) {
      console.error('Failed to load location data:', err);
    }
  }, []);

  // Fetch global platform data (Alerts, all reports, user's reports)
  const refreshGlobalData = useCallback(async () => {
    try {
      const [alertRes, allRepRes] = await Promise.all([
        api.getAlerts(),
        api.getReports()
      ]);
      setAlerts(alertRes.alerts);
      setReports(allRepRes.reports);

      if (user) {
        const uRepRes = await api.getUserReports();
        setUserReports(uRepRes.reports);
      } else {
        setUserReports([]);
      }
    } catch (err) {
      console.error('Failed to load global data:', err);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    refreshLocationData(selectedLocation);
    refreshGlobalData();
  }, [selectedLocation, refreshLocationData, refreshGlobalData]);

  // Refresh user reports when auth state changes
  useEffect(() => {
    if (user) {
      api.getUserReports()
        .then(res => setUserReports(res.reports))
        .catch(() => setUserReports([]));
    } else {
      setUserReports([]);
    }
  }, [user]);

  // Auto-redirect away from admin tab if user is not sankettiwari943@gmail.com
  useEffect(() => {
    const isExplicitAdmin = Boolean(
      user &&
      user.email &&
      (user.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() || user.email === 'sankettiwari943@gmail.com')
    );
    if (currentTab === 'admin' && !isExplicitAdmin) {
      setCurrentTab('map');
    }
  }, [user, currentTab]);

  // Handle selection of arbitrary coordinates anywhere on the India Map
  const handleSelectArbitraryCoordinates = async (lat: number, lon: number) => {
    try {
      const rev = await api.reverseGeocode(lat, lon);
      const customLoc: LocationPoint = {
        id: `coord_${lat.toFixed(3)}_${lon.toFixed(3)}`,
        name: rev.name,
        district: rev.district,
        state: rev.state,
        region: 'Other',
        latitude: lat,
        longitude: lon,
        elevationM: 1200,
        landslideZoneCategory: 'Moderate Susceptibility',
        criticalHighways: ['Regional Highway']
      };
      setSelectedLocation(customLoc);
    } catch {
      const customLoc: LocationPoint = {
        id: `coord_${lat.toFixed(3)}_${lon.toFixed(3)}`,
        name: `Sector ${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`,
        district: 'Regional District',
        state: 'India',
        region: 'Other',
        latitude: lat,
        longitude: lon,
        elevationM: 1000,
        landslideZoneCategory: 'Moderate Susceptibility',
        criticalHighways: []
      };
      setSelectedLocation(customLoc);
    }
  };

  // Handle road location zoom
  const handleSelectRoadLocation = (coords: [number, number]) => {
    const c0 = Number(coords[0]);
    const c1 = Number(coords[1]);
    let lat = c0;
    let lon = c1;
    if (c0 > 60 && c1 <= 40) {
      lon = c0;
      lat = c1;
    } else if (c1 > 60 && c0 <= 40) {
      lat = c0;
      lon = c1;
    }
    handleSelectArbitraryCoordinates(lat, lon);
    setCurrentTab('map');
  };

  const isExplicitAdmin = Boolean(
    user &&
    user.email &&
    (user.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() || user.email === 'sankettiwari943@gmail.com')
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'admin' && !isExplicitAdmin) {
            setIsAuthModalOpen(true);
            return;
          }
          setCurrentTab(tab);
        }}
        selectedLocation={selectedLocation}
        onSelectLocation={(loc) => setSelectedLocation(loc)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        dataFreshness={dataFreshness}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentTab === 'map' && (
          <IndiaMap
            selectedLocation={selectedLocation}
            onSelectLocation={(loc) => setSelectedLocation(loc)}
            onSelectArbitraryCoordinates={handleSelectArbitraryCoordinates}
            currentRisk={currentRisk}
            reports={reports}
            alerts={alerts}
            roads={roads}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onViewDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'dashboard' && (
          <UserDashboard
            location={selectedLocation}
            risk={currentRisk}
            weather={weather}
            outlook={outlook}
            reports={reports}
            userReports={userReports}
            alerts={alerts}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onOpenMap={() => setCurrentTab('map')}
            onRefreshData={refreshGlobalData}
          />
        )}

        {currentTab === 'alerts' && (
          <AlertsAndRoadsView
            alerts={alerts}
            roads={roads}
            assets={assets}
            onSelectRoadLocation={handleSelectRoadLocation}
          />
        )}

        {currentTab === 'evidence' && (
          <EvidenceRagView />
        )}

        {currentTab === 'copilot' && (
          <AiCopilotView
            location={selectedLocation}
            risk={currentRisk}
            weather={weather}
          />
        )}

        {currentTab === 'admin' && (
          isExplicitAdmin ? (
            <AdminDashboard
              reports={reports}
              alerts={alerts}
              onRefreshData={() => {
                refreshLocationData(selectedLocation);
                refreshGlobalData();
              }}
            />
          ) : (
            <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-rose-200 rounded-2xl text-center shadow-xl space-y-4">
              <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Restricted Disaster Authority Zone</h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  The Command &amp; Verification Console and CAP broadcast engine are strictly restricted to authorized NDMA administrator (<code className="bg-slate-100 text-rose-700 px-1.5 py-0.5 rounded font-mono font-bold">{ADMIN_EMAIL}</code>).
                </p>
              </div>
              <button
                id="btn-admin-gate-signin"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
              >
                Sign In as Verified Administrator
              </button>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 text-xs text-slate-500 py-3.5 px-4 text-center sm:flex sm:justify-between sm:items-center sm:px-6 shadow-xs">
        <div className="font-medium text-slate-600">
          NER Landslide Intelligence Platform &bull; Geological Survey of India &bull; NDMA Disaster Management Framework
        </div>
        <div className="mt-1 sm:mt-0 font-mono text-[11px] text-slate-400">
          Deterministic Geotechnical Core &bull; Open-Meteo ECMWF/GFS &bull; MapLibre WebGL
        </div>
      </footer>

      {/* Citizen Report Modal */}
      <CitizenReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultLocation={selectedLocation}
        onReportSubmitted={() => {
          refreshLocationData(selectedLocation);
          refreshGlobalData();
        }}
        onOpenAuthModal={() => {
          setIsReportModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <OfflineSyncProvider>
        <AppContent />
      </OfflineSyncProvider>
    </AuthProvider>
  );
}
