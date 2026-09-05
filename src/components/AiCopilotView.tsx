/**
 * AI Emergency Response Copilot View
 * Structured operational briefing for disaster response coordinators with 0-2h, 2-6h, 6-24h time-windowed actions.
 * Clearly labels EVIDENCE-BACKED, ESTIMATED, and AI-GENERATED RECOMMENDATIONS.
 */

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Building,
  Shield,
  Loader2,
  RefreshCw,
  Sparkles,
  MapPin
} from 'lucide-react';
import { LocationPoint, RiskAssessment, WeatherData, CopilotBriefing } from '../types';
import { api } from '../services/api';

interface AiCopilotViewProps {
  location: LocationPoint | null;
  risk: RiskAssessment | null;
  weather: WeatherData | null;
}

export const AiCopilotView: React.FC<AiCopilotViewProps> = ({
  location,
  risk,
  weather,
}) => {
  const [briefing, setBriefing] = useState<CopilotBriefing | null>(null);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBriefing = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const [briefRes, prioRes] = await Promise.all([
        api.getCopilotBriefing({
          locationName: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          riskAssessment: risk || undefined,
          weather: weather || undefined,
        }),
        api.getPriorities()
      ]);
      setBriefing(briefRes);
      setPriorities(prioRes.priorities);
    } catch (err) {
      console.error('Failed to generate copilot briefing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, [location]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-500">
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>INCIDENT COMMAND AI COPILOT</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Emergency Response & Evacuation Action Plan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational briefing synthesized from real rainfall, deterministic geotechnical score, and GSI/NDMA SOPs.
          </p>
        </div>

        <button
          id="btn-refresh-copilot"
          onClick={fetchBriefing}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium shadow-2xs transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Regenerate Briefing</span>
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-900">Synthesizing Tactical Briefing...</p>
          <p className="text-xs text-slate-500">Correlating rainfall gauges, citizen reports, and road cascade models.</p>
        </div>
      ) : briefing ? (
        <div className="space-y-6">
          {/* Situation & Priority Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-indigo-600">
                {briefing.responsePriority}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Target Sector: {location?.name} ({location?.district})
              </span>
            </div>

            <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
              {briefing.situationSummary}
            </p>
          </div>

          {/* Time-Windowed Tactical Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 0-2 Hours: Immediate Lockdown & Warning */}
            <div className="bg-white border border-rose-200 rounded-xl p-4 text-xs space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-rose-600" />
                  <span>WINDOW: 0 - 2 HOURS</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 font-mono border border-rose-200 font-bold">IMMEDIATE</span>
              </div>
              <div className="space-y-2">
                {briefing.immediateActions0to2h.map((act, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-800 bg-rose-50/40 p-2.5 rounded-lg border border-rose-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{act}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2-6 Hours: Mobilization & Evacuation */}
            <div className="bg-white border border-amber-200 rounded-xl p-4 text-xs space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>WINDOW: 2 - 6 HOURS</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 font-mono border border-amber-200 font-bold">MOBILIZE</span>
              </div>
              <div className="space-y-2">
                {briefing.immediateActions2to6h.map((act, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-800 bg-amber-50/40 p-2.5 rounded-lg border border-amber-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{act}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 6-24 Hours: Secondary Stabilization & Relief */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>WINDOW: 6 - 24 HOURS</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-mono border border-slate-200 font-bold">STABILIZE</span>
              </div>
              <div className="space-y-2">
                {briefing.immediateActions6to24h.map((act, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{act}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Road Network & Critical Lifelines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Road Considerations */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <span>Road Network & Traffic Diversions</span>
              </div>
              <ul className="space-y-2">
                {briefing.roadConsiderations.map((rc, i) => (
                  <li key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
                    {rc}
                  </li>
                ))}
              </ul>
            </div>

            {/* Critical Assets & Resources */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-2">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>Critical Infrastructure & Resource Requisitions</span>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500">EXPOSED LIFELINE ASSETS:</div>
                <ul className="space-y-1">
                  {briefing.criticalInfrastructure.map((ci, i) => (
                    <li key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                      {ci}
                    </li>
                  ))}
                </ul>

                <div className="text-[11px] font-bold text-slate-500 pt-2">RESOURCE REQUIREMENTS:</div>
                <ul className="space-y-1">
                  {briefing.resourceRequirements.map((rr, i) => (
                    <li key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                      &bull; {rr}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* National Priority Rankings */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              National Landslide Priority Rankings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {priorities.map((p, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-indigo-600 font-mono text-xs">{p.priorityRank}</span>
                    <span className="font-mono text-[10px] text-slate-500 font-medium">{p.actionWindow}</span>
                  </div>
                  <div className="font-bold text-slate-900">{p.location}</div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{p.justification}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-slate-500 text-xs">
          Select an active location to generate the operational response briefing.
        </div>
      )}
    </div>
  );
};
