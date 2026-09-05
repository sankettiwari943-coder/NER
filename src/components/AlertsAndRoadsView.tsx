import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Compass,
  CornerDownRight,
  Shield,
  Activity,
  CheckCircle,
  Truck,
  Hospital,
  Zap,
  Building,
  Radio,
  Navigation,
  Gauge
} from 'lucide-react';
import { Alert, RoadSegment, CriticalAsset, CorridorRisk } from '../types';
import { api } from '../services/api';

interface AlertsAndRoadsViewProps {
  alerts: Alert[];
  roads: RoadSegment[];
  assets: CriticalAsset[];
  onSelectRoadLocation: (coords: [number, number]) => void;
}

export const AlertsAndRoadsView: React.FC<AlertsAndRoadsViewProps> = ({
  alerts,
  roads,
  assets,
  onSelectRoadLocation,
}) => {
  const [corridorRisks, setCorridorRisks] = useState<CorridorRisk[]>([]);
  const [loadingCorridors, setLoadingCorridors] = useState(false);

  useEffect(() => {
    setLoadingCorridors(true);
    api.getRoadCorridors()
      .then(res => setCorridorRisks(res.corridors))
      .catch(err => console.error('Failed to load arterial corridors:', err))
      .finally(() => setLoadingCorridors(false));
  }, []);

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-500">
            <span>REGIONAL TELEMETRY</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
            <span>HIGHWAY CORRIDORS & EMERGENCY BROADCASTS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Active Alerts & Road Disruption Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor arterial transit bottlenecks, detour viability, and cascade impacts on lifelines.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-bold">
            {activeAlerts.length} Active Alerts
          </span>
          <span className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
            {corridorRisks.length} Arterial Corridors
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
            {roads.length} Monitored Segments
          </span>
        </div>
      </div>

      {/* FEATURED: Arterial Highway Corridor Exposure Engine (SIH-26001 Requirement) */}
      <div className="bg-white border-2 border-amber-300/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                Arterial Highway Corridors & Road Exposure Engine
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Score: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold font-mono">Road Exposure = f(Hazard Score, Traffic Density, Strategic Cutoff Risk)</code>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">URGENT ACTION</span>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">MONITOR</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">PRE-ALERT</span>
          </div>
        </div>

        {/* Road Corridor Priority Scoring Table (SIH-26001 Mandate) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Road Corridor Priority Scoring Table
            </span>
            <span className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Live Priority Matrix
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3">Corridor & Route</th>
                  <th className="py-2.5 px-3">Risk Level & Score</th>
                  <th className="py-2.5 px-3">Current Status</th>
                  <th className="py-2.5 px-3">Required Operational Action</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-slate-700">
                <tr className="bg-rose-50/40 hover:bg-rose-50/70 transition">
                  <td className="py-3 px-3 font-medium">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px]">NH-29</span>
                      <span>Kohima - Dimapur</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">Chainage KM 14–22 (Dzüdza Bridge)</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                      Critical (&gt;85%) &bull; 88%
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white font-mono uppercase">
                      SEVERELY DISRUPTED
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-rose-900">
                    Immediate closure &amp; clearance protocol.
                    <div className="text-[10px] font-normal text-slate-500">Detour: Niuland-Kohima Bypass (+42 km)</div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onSelectRoadLocation([93.8, 25.68])}
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-2xs transition cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>

                <tr className="bg-amber-50/30 hover:bg-amber-50/60 transition">
                  <td className="py-3 px-3 font-medium">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px]">NH-2</span>
                      <span>Imphal - Kohima</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">Chainage KM 38–46 (Mao-Maram)</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                      High (76%) &bull; 76%
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 font-mono uppercase">
                      REGULATED ONE-WAY
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-amber-950">
                    Active monitoring.
                    <div className="text-[10px] font-normal text-slate-500">Detour: Tadubi-Pfutsero Route (+35 km)</div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onSelectRoadLocation([94.05, 25.52])}
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-2xs transition cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-100/60 transition">
                  <td className="py-3 px-3 font-medium">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px]">NH-10</span>
                      <span>Siliguri - Gangtok</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">Chainage KM 24–32 (29th Mile / Likuvir)</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                      High (78%) &bull; 78%
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 font-mono uppercase">
                      REGULATED ONE-WAY
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    Regulated single-lane convoy with BRO escorts.
                    <div className="text-[10px] font-normal text-slate-500">Detour: Lava-Algarah-Gorubathan (+55 km)</div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onSelectRoadLocation([88.45, 27.05])}
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-2xs transition cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-100/60 transition">
                  <td className="py-3 px-3 font-medium">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px]">NH-27</span>
                      <span>Haflong - Silchar</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">Chainage KM 68–74 (Jatinga Chute)</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                      High (82%) &bull; 82%
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 font-mono uppercase">
                      CAUTION DEBRIS
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    Night travel ban &amp; debris clearance standby.
                    <div className="text-[10px] font-normal text-slate-500">Detour: Lumding-Badarpur Highway (+48 km)</div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onSelectRoadLocation([93.05, 25.18])}
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-2xs transition cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Corridor Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {corridorRisks.map((c) => {
            const classification = c.exposureClassification || 'MONITOR';
            const exposureScore = c.roadExposureScore ?? 75;
            return (
              <div
                key={c.id}
                className={`rounded-xl border p-4 text-xs space-y-3 shadow-xs flex flex-col justify-between ${
                  classification === 'URGENT ACTION'
                    ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-300/60'
                    : classification === 'MONITOR'
                    ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/60'
                    : 'bg-blue-50/30 border-blue-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[11px]">
                      {c.highwayNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      classification === 'URGENT ACTION'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : classification === 'MONITOR'
                        ? 'bg-amber-500 text-slate-950 shadow-2xs font-black'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {classification}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                  <div className="text-slate-600 text-xs font-medium">{c.corridor}</div>
                  <div className="text-[11px] font-mono text-indigo-700 font-semibold mt-1">{c.chainage}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{c.state} &bull; Status: <strong className="text-slate-700">{c.currentStatus}</strong></div>
                </div>

                {/* Metrics Formula Breakdown */}
                <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Susceptibility:</span>
                    <strong className="text-rose-700">{c.susceptibilityRank}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Traffic Density:</span>
                    <span className="text-slate-700 font-semibold">{c.trafficDensity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cutoff Risk:</span>
                    <span className="text-slate-700 font-semibold">{c.strategicCutoffRisk}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-sans font-bold">
                    <span className="text-slate-900">Road Exposure Score:</span>
                    <span className="text-indigo-700 font-mono text-xs">{exposureScore}/100</span>
                  </div>
                </div>

                {/* Operational Action & Detour */}
                <div className="text-[11px] text-slate-700 bg-slate-100/80 p-2.5 rounded-lg space-y-1">
                  <div><strong className="text-slate-900">Directive:</strong> {c.operationalAction}</div>
                  <div className="text-slate-500"><strong className="text-slate-700">Detour:</strong> {c.detourRouteName} (+{c.detourDistanceKm} km)</div>
                </div>

                {/* Action Button */}
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="text-[10px] font-mono text-slate-400">
                    Choke points: {c.vulnerableChokePoints?.length || 0}
                  </span>
                  <button
                    onClick={() => onSelectRoadLocation(c.startCoords)}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Inspect Sector</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Early Warnings Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Active Landslide Emergency Alerts</span>
        </h2>

        {activeAlerts.length === 0 ? (
          <div className="p-6 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-500 shadow-xs">
            No critical or high alerts active at this moment. Normal monitoring maintained.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAlerts.map(alert => (
              <div
                key={alert.id}
                className="bg-white border border-rose-200 rounded-xl p-4 text-xs space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {alert.severity}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5">{alert.title}</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-slate-600 leading-relaxed">
                  {alert.affected_area}
                </div>

                <div className="p-2.5 rounded-lg bg-rose-50/80 border border-rose-200 text-rose-900">
                  <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-0.5">
                    MANDATORY DIRECTIVE
                  </div>
                  <div className="text-xs">{alert.recommended_action}</div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                  <span>Sector: <strong className="text-slate-700">{alert.location_name}</strong></span>
                  <span className="font-mono">Radius: {alert.radius_km} km</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mountain Arterial Road Corridors */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Truck className="w-4 h-4 text-amber-600" />
          <span>Mountain Highway Corridors & Blockage Modeling</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roads.map(road => {
            return (
              <div
                key={road.id}
                className="bg-white border border-slate-200 rounded-xl p-5 text-xs space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono font-bold text-slate-900 text-xs">
                        {road.highwayNumber}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{road.name}</span>
                    </div>
                    <p className="text-slate-500 text-xs mt-1">{road.corridor} &bull; {road.state}</p>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider ${
                    road.currentStatus === 'CLEAR'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : road.currentStatus === 'CLOSED'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {road.currentStatus}
                  </span>
                </div>

                {/* Choke Points */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-600">HIGH-VULNERABILITY CHOKE POINTS:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {road.vulnerableChokePoints.map((cp, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] text-slate-700 shadow-2xs font-medium">
                        {cp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Detour Route */}
                <div className="flex items-start gap-2 text-slate-700">
                  <CornerDownRight className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500">Official Alternate Detour:</span>
                    <div className="font-semibold text-slate-900">{road.detourRouteName}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Adds approximately +{road.detourDistanceKm} km travel distance.
                    </div>
                  </div>
                </div>

                {/* Critical Assets Served */}
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Lifelines Served: <strong className="text-slate-700">{road.criticalAssetsServed.join(', ')}</strong></span>
                  <button
                    onClick={() => onSelectRoadLocation(road.endCoords)}
                    className="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold"
                  >
                    Focus on Map &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Infrastructure Assets */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Building className="w-4 h-4 text-indigo-600" />
          <span>Monitored Lifeline Infrastructure (Cascade Vulnerability)</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {assets.map(asset => (
            <div
              key={asset.id}
              className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-400 uppercase font-semibold">{asset.category}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  asset.vulnerabilityStatus === 'HIGH_EXPOSURE'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {asset.vulnerabilityStatus}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs">{asset.name}</h4>
              <p className="text-slate-500 text-[11px]">{asset.locationName}</p>
              <div className="text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-1.5">
                Importance: {asset.importance}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
