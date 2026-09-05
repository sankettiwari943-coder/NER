/**
 * User Dashboard Component
 * Clean, structured overview of location risk, real rainfall, 10-day outlook, citizen reports, and alerts.
 */

import React, { useState } from 'react';
import {
  Activity,
  CloudRain,
  Mountain,
  AlertTriangle,
  Calendar,
  Layers,
  MapPin,
  Clock,
  ShieldCheck,
  FileCheck,
  ChevronRight,
  TrendingUp,
  Droplets,
  Sliders
} from 'lucide-react';
import { LocationPoint, RiskAssessment, WeatherData, OutlookDay, CitizenReport, Alert } from '../types';
import { WhatIfSimulator } from './WhatIfSimulator';

interface UserDashboardProps {
  location: LocationPoint | null;
  risk: RiskAssessment | null;
  weather: WeatherData | null;
  outlook: OutlookDay[];
  reports: CitizenReport[];
  userReports: CitizenReport[];
  alerts: Alert[];
  onOpenReportModal: () => void;
  onOpenMap: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  location,
  risk,
  weather,
  outlook,
  reports,
  userReports,
  alerts,
  onOpenReportModal,
  onOpenMap,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'simulator' | 'myreports'>('overview');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-slate-500 font-semibold tracking-wider">GEOSPATIAL INTELLIGENCE DOSSIER</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {risk?.freshness || 'LIVE'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 mt-0.5">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <span>{location?.name || 'Selected Location'}</span>
            <span className="text-sm font-normal text-slate-500">
              ({location?.district || 'Sector'}, {location?.state || 'India'})
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordinates: {location ? `${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°E` : '--'} &bull; Elevation: {location?.elevationM || '--'}m &bull; {location?.landslideZoneCategory || 'Himalayan Corridor'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-subtab-overview"
            onClick={() => setActiveSubTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeSubTab === 'overview'
                ? 'bg-white text-indigo-700 font-semibold border border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Risk Overview & Outlook
          </button>
          <button
            id="btn-subtab-simulator"
            onClick={() => setActiveSubTab('simulator')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition ${
              activeSubTab === 'simulator'
                ? 'bg-white text-indigo-700 font-semibold border border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>What-If Simulator</span>
          </button>
          <button
            id="btn-subtab-myreports"
            onClick={() => setActiveSubTab('myreports')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeSubTab === 'myreports'
                ? 'bg-white text-indigo-700 font-semibold border border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            My Reports ({userReports.length})
          </button>
        </div>
      </div>

      {/* SUBTAB: WHAT-IF SIMULATOR */}
      {activeSubTab === 'simulator' && location && (
        <WhatIfSimulator
          baselineLocation={location}
          baselineRisk={risk}
        />
      )}

      {/* SUBTAB: USER'S SUBMITTED REPORTS */}
      {activeSubTab === 'myreports' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">My Submitted Incident Reports</h2>
              <p className="text-xs text-slate-500">Field observations logged by your account. Verified records sync to public and emergency feeds.</p>
            </div>
            <button
              id="btn-new-report-dashboard"
              onClick={onOpenReportModal}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium shadow-sm transition"
            >
              Submit New Report
            </button>
          </div>

          {userReports.length === 0 ? (
            <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">No reports submitted yet.</p>
              <p className="text-xs text-slate-500 mt-1">Capture landslide tension cracks, debris slides, or blocked culverts to aid regional response.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userReports.map(rep => (
                <div key={rep.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex gap-3 text-xs shadow-2xs">
                  {rep.photo_url && (
                    <img src={rep.photo_url} alt="Hazard photo" className="w-20 h-20 object-cover rounded-lg border border-slate-200 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-rose-700 truncate">{rep.hazard_type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rep.verification_status === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : rep.verification_status === 'UNDER REVIEW'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {rep.verification_status}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] truncate font-medium">{rep.location_name}</div>
                    <div className="text-slate-700 mt-1 line-clamp-2">{rep.description}</div>
                    <div className="text-slate-400 text-[10px] mt-2 font-mono">
                      Submitted on {new Date(rep.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 3 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KPI 1: Risk Assessment */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">DETERMINISTIC RISK SCORE</span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: (risk?.warningColor || '#10B981') + '15', color: risk?.warningColor || '#10B981', border: `1px solid ${risk?.warningColor || '#10B981'}40` }}
                >
                  {risk?.riskLevel || 'LOW'}
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
                    {risk?.riskScore ?? '--'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ 100 MAXIMUM SUSCEPTIBILITY</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${risk?.riskScore || 0}%`,
                      backgroundColor: risk?.warningColor || '#10B981'
                    }}
                  />
                </div>
              </div>
              <div className="text-xs text-slate-500 border-t border-slate-100 pt-2.5 flex items-center justify-between">
                <span>Calculated: GSI-NLSM Model</span>
                <span className="text-slate-400 font-mono font-medium">Q: {risk?.dataQuality || 'HIGH'}</span>
              </div>
            </div>

            {/* KPI 2: Live Precipitation */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">RAINFALL INGESTION</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {weather?.status || 'LIVE'}
                </span>
              </div>
              <div className="my-3 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-slate-900">
                    {weather?.precipitation24hMm ?? '--'}
                  </span>
                  <span className="text-xs text-slate-500">mm in past 24 hours</span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                  <span>72-Hour Accumulation: <strong>{weather?.precipitation72hMm ?? '--'} mm</strong></span>
                </div>
              </div>
              <div className="text-xs text-slate-500 border-t border-slate-100 pt-2.5 flex items-center justify-between">
                <span>Conditions: {weather?.weatherDescription || 'Overcast'}</span>
                <span className="font-mono text-slate-700 font-medium">{weather?.temperatureC ? `${weather.temperatureC}°C` : '--'}</span>
              </div>
            </div>

            {/* KPI 3: Regional Hazards & Active Alerts */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">REGIONAL ALERT STATUS</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {alerts.filter(a => a.status === 'ACTIVE').length} Active
                </span>
              </div>
              <div className="my-2">
                {alerts.filter(a => a.status === 'ACTIVE').length > 0 ? (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="truncate">{alerts[0].title}</span>
                    </div>
                    <p className="text-[11px] text-rose-700 mt-1 line-clamp-1">{alerts[0].recommended_action}</p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-2">
                    No active emergency alerts declared in this sector.
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500 border-t border-slate-100 pt-2.5 flex items-center justify-between">
                <span>Nearby Citizen Reports: <strong className="text-slate-700">{reports.length}</strong></span>
                <button onClick={onOpenMap} className="text-indigo-600 font-semibold hover:underline">View Map &rarr;</button>
              </div>
            </div>
          </div>

          {/* Empirical Safety Override Banner */}
          {risk?.empiricalOverrideTriggered && (
            <div className="bg-rose-600 text-white rounded-xl p-4 shadow-md flex items-start gap-3 border-2 border-rose-400">
              <AlertTriangle className="w-5 h-5 text-white shrink-0 mt-0.5 animate-bounce" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black tracking-wider uppercase text-xs bg-white text-rose-900 px-2 py-0.5 rounded">
                    EMPIRICAL SAFETY OVERRIDE ACTIVE
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-100">
                    STATUS FORCED TO CRITICAL
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed">
                  {risk.empiricalOverrideReason || 'Rainfall exceeds 90mm and slope > 45°. Instantaneous shear failure probable.'}
                </p>
              </div>
            </div>
          )}

          {/* Dual-Satellite Intelligence Fusion Card (SIH-26001 Requirement) */}
          {risk?.dualSatellite && (
            <div className="bg-white border-2 border-indigo-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Dual-Satellite Intelligence Fusion (Sentinel-1 SAR + Sentinel-2 Optical)
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  Total Satellite Contribution: +{risk.dualSatellite.totalSatellitePoints} pts
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sentinel-1 SAR */}
                <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950">Sentinel-1 C-Band SAR</span>
                    <span className="font-mono font-extrabold text-indigo-700">+{risk.dualSatellite.sentinel1Sar.points} pts</span>
                  </div>
                  <div className="text-slate-800 font-medium">
                    Ground Deformation: <strong className="font-mono text-rose-700">{risk.dualSatellite.sentinel1Sar.groundDeformationRateMmYr} mm/yr</strong> &bull; Phase Shift: <span className="font-mono">{risk.dualSatellite.sentinel1Sar.interferometricPhaseShiftRad} rad</span>
                  </div>
                  <div className="p-2 rounded bg-indigo-100/70 border border-indigo-300/80 text-[11px] text-indigo-900 font-semibold">
                    &bull; {risk.dualSatellite.sentinel1Sar.cloudPenetrationNote}
                  </div>
                </div>

                {/* Sentinel-2 Optical */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950">Sentinel-2 MSI Optical</span>
                    <span className="font-mono font-extrabold text-emerald-700">+{risk.dualSatellite.sentinel2Optical.points} pts</span>
                  </div>
                  <div className="text-slate-800 font-medium">
                    NDVI Loss: <strong className="font-mono text-emerald-800">{(risk.dualSatellite.sentinel2Optical.ndviLoss * 100).toFixed(1)}%</strong> &bull; Bare Soil Index: <span className="font-mono text-amber-700">{risk.dualSatellite.sentinel2Optical.bareSoilIndex}</span>
                  </div>
                  <div className="p-2 rounded bg-emerald-100/70 border border-emerald-300/80 text-[11px] text-emerald-900 font-semibold">
                    &bull; {risk.dualSatellite.sentinel2Optical.spectralSummary}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explainable Risk: Factor Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Why Does This Risk Score Exist?</h2>
                <p className="text-xs text-slate-500">Deterministic decomposition of geotechnical, hydrological, topographic, and dual-satellite contributors.</p>
              </div>
              <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">Sum = {risk?.riskScore ?? '--'}/100</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {risk?.contributingFactors.map((factor, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{factor.factor}</span>
                    <span className="font-mono text-sm font-bold text-indigo-600">+{factor.weightedScore} pts</span>
                  </div>
                  <div className="text-slate-700 font-medium">{factor.displayValue}</div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">{factor.explanation}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 10-Day Landslide Risk Outlook */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>10-Day Landslide Risk Outlook</span>
                </h2>
                <p className="text-xs text-slate-500">Multi-day risk projection calculated using forecast precipitation and slope susceptibility.</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200 uppercase font-semibold">
                ALL VALUES MARKED FORECAST
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
              {outlook.map((day, idx) => (
                <div
                  key={idx}
                  className={`bg-slate-50 border rounded-lg p-2.5 text-center text-xs space-y-1 transition hover:border-slate-300 hover:shadow-2xs ${
                    idx === 0 ? 'ring-2 ring-indigo-500/40 border-indigo-300 bg-indigo-50/30' : 'border-slate-200'
                  }`}
                >
                  <div className="font-bold text-slate-800 text-[11px]">{day.dayLabel}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{day.date.slice(5)}</div>
                  <div className="py-1">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                      style={{ color: day.warningColor, backgroundColor: day.warningColor + '18' }}
                    >
                      {day.riskScore}
                    </span>
                  </div>
                  <div className="text-[10px] font-medium text-slate-600 truncate">{day.riskLevel}</div>
                  <div className="text-[10px] text-blue-600 font-mono font-semibold">{day.forecastPrecipitationMm} mm</div>
                  <div className="text-[9px] text-slate-400 font-mono tracking-tighter">FORECAST</div>
                </div>
              ))}
            </div>
          </div>

          {/* Nearby Field Observations */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500" />
                  <span>Nearby Citizen Field Observations</span>
                </h2>
                <p className="text-xs text-slate-500">Reports submitted by observers in this geographic zone.</p>
              </div>
              <button
                id="btn-report-hazard-dashboard-list"
                onClick={onOpenReportModal}
                className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium shadow-2xs transition"
              >
                + Add Observation
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reports.slice(0, 3).map((rep) => (
                <div key={rep.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-700 truncate">{rep.hazard_type}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                      {rep.verification_status}
                    </span>
                  </div>
                  <p className="text-slate-700 line-clamp-2">{rep.description}</p>
                  {rep.ai_observation && (
                    <div className="p-2 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600">
                      {rep.ai_observation}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200 pt-1.5 font-medium">
                    <span>{rep.location_name}</span>
                    <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
