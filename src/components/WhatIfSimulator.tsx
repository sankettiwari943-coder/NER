/**
 * What-If Landslide Risk Simulator Component
 * Dynamically adjusts scenario risk based on rainfall anomaly, slope cut angle, soil saturation, and seismic triggers.
 * Strictly preserves the baseline risk as immutable reference!
 */

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ShieldAlert,
  Zap,
  Mountain,
  CloudRain,
  Layers
} from 'lucide-react';
import { LocationPoint, RiskAssessment, SimulationResult } from '../types';
import { api } from '../services/api';

interface WhatIfSimulatorProps {
  baselineLocation: LocationPoint;
  baselineRisk: RiskAssessment | null;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  baselineLocation,
  baselineRisk,
}) => {
  const [rainfallAnomalyPct, setRainfallAnomalyPct] = useState<number>(0);
  const [slopeAdjustmentDeg, setSlopeAdjustmentDeg] = useState<number>(0);
  const [soilSaturationAdjustmentPct, setSoilSaturationAdjustmentPct] = useState<number>(0);
  const [seismicTrigger, setSeismicTrigger] = useState<boolean>(false);

  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Trigger simulation on any slider change
  useEffect(() => {
    let isCancelled = false;
    async function runSim() {
      setLoading(true);
      try {
        const res = await api.simulateWhatIf({
          baselineLat: baselineLocation.latitude,
          baselineLon: baselineLocation.longitude,
          rainfallAnomalyPct,
          slopeAdjustmentDeg,
          soilSaturationAdjustmentPct,
          seismicTrigger,
        });
        if (!isCancelled) {
          setSimulation(res);
        }
      } catch (err) {
        console.error('Simulation error:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    runSim();
    return () => {
      isCancelled = true;
    };
  }, [
    baselineLocation,
    rainfallAnomalyPct,
    slopeAdjustmentDeg,
    soilSaturationAdjustmentPct,
    seismicTrigger
  ]);

  const handleReset = () => {
    setRainfallAnomalyPct(0);
    setSlopeAdjustmentDeg(0);
    setSoilSaturationAdjustmentPct(0);
    setSeismicTrigger(false);
  };

  const isModified =
    rainfallAnomalyPct !== 0 ||
    slopeAdjustmentDeg !== 0 ||
    soilSaturationAdjustmentPct !== 0 ||
    seismicTrigger;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-6 shadow-sm">
      {/* Simulator Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Deterministic What-If Risk Simulator</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 font-bold">
              SIMULATION MODE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Test geotechnical resilience at {baselineLocation.name}. Baseline records remain permanent and unmodified.
          </p>
        </div>

        {isModified && (
          <button
            id="btn-reset-simulator"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium shadow-2xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Baseline</span>
          </button>
        )}
      </div>

      {/* Side-by-Side Comparison: Baseline vs Scenario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Baseline Risk (IMMUTABLE) */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500 font-bold uppercase">
              BASELINE RISK (IMMUTABLE)
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
              style={{
                backgroundColor: (simulation?.baseline.warningColor || '#10B981') + '15',
                color: simulation?.baseline.warningColor || '#10B981',
                border: `1px solid ${simulation?.baseline.warningColor || '#10B981'}40`
              }}
            >
              {simulation?.baseline.riskLevel || 'LOW'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono text-slate-900">
              {simulation?.baseline.riskScore ?? '--'}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ 100</span>
          </div>

          <p className="text-xs text-slate-500">
            Current deterministic evaluation from real-time precipitation and terrain data.
          </p>

          <div className="text-[11px] text-slate-400 border-t border-slate-200 pt-2 font-medium">
            Status: Strictly Locked as Baseline Ground Truth
          </div>
        </div>

        {/* Card 2: Scenario Risk */}
        <div className="bg-indigo-50/40 border border-indigo-200 rounded-lg p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-indigo-900 font-bold uppercase">
              SCENARIO RISK
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
              style={{
                backgroundColor: (simulation?.scenario.warningColor || '#10B981') + '20',
                color: simulation?.scenario.warningColor || '#10B981',
                border: `1px solid ${simulation?.scenario.warningColor || '#10B981'}40`
              }}
            >
              {simulation?.scenario.riskLevel || 'LOW'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono text-slate-900">
              {simulation?.scenario.riskScore ?? '--'}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ 100</span>
          </div>

          <p className="text-xs text-slate-600">
            Projected risk with active parameter perturbations.
          </p>

          <div className="text-[11px] text-indigo-700 border-t border-indigo-100 pt-2 font-mono font-medium">
            {loading ? 'Recalculating...' : 'Deterministic Factor Synthesis'}
          </div>
        </div>

        {/* Card 3: Delta & Shift Analysis */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500 font-bold uppercase">
              VARIANCE / DELTA
            </span>
            {simulation && (
              <span className={`flex items-center gap-1 font-mono text-xs font-bold ${
                simulation.deltaScore > 0 ? 'text-rose-600' : (simulation.deltaScore < 0 ? 'text-emerald-600' : 'text-slate-500')
              }`}>
                {simulation.deltaScore > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {simulation.deltaScore > 0 ? `+${simulation.deltaScore}` : simulation.deltaScore} pts
              </span>
            )}
          </div>

          <div className="text-xs text-slate-700 leading-relaxed">
            {simulation?.summary || 'No parameters adjusted.'}
          </div>

          <div className="border-t border-slate-200 pt-2 text-[11px] text-slate-500">
            Shift: <strong className="text-slate-800">{simulation?.baseline.riskLevel}</strong> &rarr; <strong className="text-slate-800">{simulation?.scenario.riskLevel}</strong>
          </div>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Slider 1: Rainfall Anomaly */}
        <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-800 flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-blue-600" />
              <span>Rainfall Cloudburst / Anomaly</span>
            </label>
            <span className="font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
              {rainfallAnomalyPct > 0 ? `+${rainfallAnomalyPct}%` : `${rainfallAnomalyPct}%`}
            </span>
          </div>
          <input
            id="slider-rainfall-anomaly"
            type="range"
            min="-50"
            max="200"
            step="5"
            value={rainfallAnomalyPct}
            onChange={(e) => setRainfallAnomalyPct(Number(e.target.value))}
            className="w-full accent-indigo-600 bg-slate-200 h-2 rounded cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-50% (Drought)</span>
            <span>0% (Normal Baseline)</span>
            <span>+200% (Cloudburst Surge)</span>
          </div>
        </div>

        {/* Slider 2: Slope Cutting / Excavation */}
        <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-800 flex items-center gap-2">
              <Mountain className="w-4 h-4 text-amber-600" />
              <span>Slope Toe Excavation / Angle Delta</span>
            </label>
            <span className="font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
              {slopeAdjustmentDeg > 0 ? `+${slopeAdjustmentDeg}°` : `${slopeAdjustmentDeg}°`}
            </span>
          </div>
          <input
            id="slider-slope-adjustment"
            type="range"
            min="-10"
            max="25"
            step="1"
            value={slopeAdjustmentDeg}
            onChange={(e) => setSlopeAdjustmentDeg(Number(e.target.value))}
            className="w-full accent-indigo-600 bg-slate-200 h-2 rounded cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-10° (Terracing / Bench)</span>
            <span>0° (Natural Profile)</span>
            <span>+25° (Steep Road Cut)</span>
          </div>
        </div>

        {/* Slider 3: Soil Saturation / Antecedent Moisture */}
        <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Antecedent Soil Pore Pressure / Saturation</span>
            </label>
            <span className="font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
              {soilSaturationAdjustmentPct > 0 ? `+${soilSaturationAdjustmentPct}%` : `${soilSaturationAdjustmentPct}%`}
            </span>
          </div>
          <input
            id="slider-soil-saturation"
            type="range"
            min="-30"
            max="50"
            step="5"
            value={soilSaturationAdjustmentPct}
            onChange={(e) => setSoilSaturationAdjustmentPct(Number(e.target.value))}
            className="w-full accent-indigo-600 bg-slate-200 h-2 rounded cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-30% (Dry Sub-surface)</span>
            <span>0% (Baseline Moisture)</span>
            <span>+50% (Saturated Colluvium)</span>
          </div>
        </div>

        {/* Toggle 4: Seismic Tremor Trigger */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
          <div className="space-y-1">
            <label className="font-bold text-xs text-slate-800 flex items-center gap-2 cursor-pointer">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Seismic Acceleration / Ground Tremor</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Simulate micro-tremor or tectonic vibration (PGA &gt; 0.15g) destabilizing friction angle.
            </p>
          </div>
          <button
            id="toggle-seismic-trigger"
            onClick={() => setSeismicTrigger(!seismicTrigger)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs ${
              seismicTrigger
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {seismicTrigger ? 'TRIGGER ACTIVE (+15 pts)' : 'INACTIVE'}
          </button>
        </div>
      </div>
    </div>
  );
};
