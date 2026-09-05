/**
 * India & NER Geospatial Landslide Intelligence Map Component (SIH-26001 Aligned)
 * Powered by MapLibre GL JS (WebGL Production-Grade Geospatial Map)
 * Multi-layer basemap support: OpenStreetMap Standard, Esri World Imagery (Satellite), OpenTopoMap.
 * Dual-Satellite Intelligence Fusion & Empirical Override visualization.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  Layers,
  MapPin,
  AlertTriangle,
  Radio,
  Eye,
  Crosshair,
  Compass,
  Maximize2,
  Minimize2,
  Info,
  Shield,
  RotateCcw,
  Satellite,
  Activity,
  CloudRain,
  Mountain,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { LocationPoint, CitizenReport, Alert, RoadSegment, RiskAssessment } from '../types';
import { CURATED_INDIA_LOCATIONS } from '../../server/locations';

interface IndiaMapProps {
  selectedLocation: LocationPoint | null;
  onSelectLocation: (loc: LocationPoint) => void;
  onSelectArbitraryCoordinates: (lat: number, lon: number) => void;
  currentRisk: RiskAssessment | null;
  reports: CitizenReport[];
  alerts: Alert[];
  roads: RoadSegment[];
  onOpenReportModal: () => void;
  onViewDashboard: () => void;
  onOpenEvidence?: () => void;
}

type BasemapStyle = 'osm' | 'satellite' | 'topo';

export const IndiaMap: React.FC<IndiaMapProps> = ({
  selectedLocation,
  onSelectLocation,
  onSelectArbitraryCoordinates,
  currentRisk,
  reports,
  alerts,
  roads,
  onOpenReportModal,
  onViewDashboard,
  onOpenEvidence,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [basemap, setBasemap] = useState<BasemapStyle>('osm');
  const [layersVisible, setLayersVisible] = useState({
    riskZones: true,
    citizenReports: true,
    emergencyAlerts: true,
    criticalRoads: true,
    dualSatelliteOverlay: true,
  });

  const [mapLoaded, setMapLoaded] = useState(false);
  const [clickedCoord, setClickedCoord] = useState<{ lat: number; lon: number } | null>(null);

  // Basemap Tile TileURLs (Keyless, Free of watermark issues)
  const getBasemapSource = (style: BasemapStyle) => {
    switch (style) {
      case 'satellite':
        return {
          type: 'raster' as const,
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: '&copy; Esri, Maxar, Earthstar Geographics'
        };
      case 'topo':
        return {
          type: 'raster' as const,
          tiles: [
            'https://tile.opentopomap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '&copy; OpenTopoMap &copy; OpenStreetMap'
        };
      case 'osm':
      default:
        return {
          type: 'raster' as const,
          tiles: [
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors'
        };
    }
  };

  // Initialize MapLibre GL with North Eastern Region as default focus
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default coordinates: Kohima / Nagaland (NER Focus)
    const initialLat = selectedLocation ? selectedLocation.latitude : 25.6747;
    const initialLon = selectedLocation ? selectedLocation.longitude : 94.1105;
    const initialZoom = selectedLocation ? 9.2 : 9.0;

    const sourceConfig = getBasemapSource(basemap);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'base-raster-source': sourceConfig
        },
        layers: [
          {
            id: 'base-raster-layer',
            type: 'raster',
            source: 'base-raster-source',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [initialLon, initialLat],
      zoom: initialZoom,
      maxBounds: [
        [65.0, 6.0],   // Southwest coordinates of India maritime perimeter
        [98.5, 37.5]   // Northeast coordinates of India
      ],
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      setMapLoaded(true);
    });

    // Handle map click anywhere across India / NER
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setClickedCoord({ lat, lon: lng });
      onSelectArbitraryCoordinates(lat, lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Basemap Tiles when selected style changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const source = map.getSource('base-raster-source') as any;
    if (source && source.setTiles) {
      const newSource = getBasemapSource(basemap);
      source.setTiles(newSource.tiles);
    }
  }, [basemap, mapLoaded]);

  // Pan to selected location when changed from header search or selector
  useEffect(() => {
    if (!mapRef.current || !selectedLocation) return;
    mapRef.current.flyTo({
      center: [selectedLocation.longitude, selectedLocation.latitude],
      zoom: 9.5,
      essential: true,
      duration: 1800
    });
  }, [selectedLocation]);

  // Update Markers when data or layer visibility changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear existing overlay markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 1. Curated Risk Zones & NER Hotspots
    if (layersVisible.riskZones) {
      CURATED_INDIA_LOCATIONS.forEach(loc => {
        const isSelected = selectedLocation?.id === loc.id;
        const isNER = loc.region.includes('Northeast') || loc.region.includes('Eastern');

        const el = document.createElement('div');
        el.className = 'cursor-pointer group';
        el.innerHTML = `
          <div class="flex items-center justify-center ${isNER ? 'w-8 h-8 ring-2 ring-indigo-400' : 'w-7 h-7'} rounded-full ${
            loc.landslideZoneCategory === 'Very High Susceptibility'
              ? 'bg-rose-600 text-white shadow-rose-900/40'
              : 'bg-amber-600 text-white shadow-amber-900/40'
          } shadow-lg transition-transform duration-200 group-hover:scale-125 ${isSelected ? 'scale-125 ring-4 ring-white' : ''}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectLocation(loc);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([loc.longitude, loc.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`
              <div class="p-2.5 text-xs font-sans text-neutral-900 max-w-[240px]">
                <div class="font-bold text-sm text-slate-900">${loc.name}</div>
                <div class="text-slate-500">${loc.district}, ${loc.state}</div>
                <div class="mt-1 font-semibold text-rose-700">${loc.landslideZoneCategory}</div>
                <div class="mt-0.5 text-slate-600">Elevation: ${loc.elevationM}m &bull; ${loc.region}</div>
                <div class="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-1 text-[11px] text-indigo-700 font-medium">
                  <span>🛰️ Dual-Satellite Active</span>
                </div>
              </div>
            `)
          )
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    }

    // 2. Verified & Citizen Incident Reports
    if (layersVisible.citizenReports) {
      reports.forEach(report => {
        const el = document.createElement('div');
        el.className = 'cursor-pointer';
        el.innerHTML = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full ${
            report.severity === 'CRITICAL' ? 'bg-rose-500' :
            report.severity === 'HIGH' ? 'bg-amber-500' : 'bg-emerald-500'
          } text-white border-2 border-white shadow-md hover:scale-125 transition">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([report.longitude, report.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(`
              <div class="p-2.5 text-xs font-sans text-neutral-900 max-w-[230px]">
                <div class="flex items-center justify-between gap-1 font-bold text-xs">
                  <span>${report.hazard_type}</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded ${report.verification_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${report.verification_status}</span>
                </div>
                <div class="text-neutral-500 mt-0.5">${report.location_name}</div>
                <div class="mt-1 text-slate-700 leading-snug">${report.description}</div>
              </div>
            `)
          )
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    }

    // 3. Active Emergency Alerts
    if (layersVisible.emergencyAlerts) {
      alerts.filter(a => a.status === 'ACTIVE').forEach(alert => {
        const el = document.createElement('div');
        el.className = 'cursor-pointer animate-pulse';
        el.innerHTML = `
          <div class="flex items-center justify-center w-8 h-8 rounded-full ${
            alert.severity === 'CRITICAL' ? 'bg-rose-700 ring-4 ring-rose-400/50' : 'bg-amber-600 ring-4 ring-amber-400/50'
          } text-white shadow-xl hover:scale-125 transition">
            <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([alert.longitude, alert.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 15 }).setHTML(`
              <div class="p-3 text-xs font-sans text-neutral-900 max-w-[260px]">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">${alert.severity} EARLY WARNING</span>
                <div class="font-bold text-sm mt-1 text-slate-900">${alert.title}</div>
                <div class="text-slate-500 mt-0.5">${alert.location_name}</div>
                <div class="mt-1 text-slate-600 text-[11px]">${alert.affected_area}</div>
                <div class="mt-2 p-1.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-medium text-[11px]">
                  <strong>Action:</strong> ${alert.recommended_action}
                </div>
              </div>
            `)
          )
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    }

    // 4. Critical Highway Choke Points & Exposure
    if (layersVisible.criticalRoads) {
      roads.forEach(road => {
        const el = document.createElement('div');
        el.className = 'cursor-pointer';
        el.innerHTML = `
          <div class="px-2 py-0.5 rounded bg-slate-900 text-slate-100 font-mono text-[10px] font-bold border ${road.exposureClassification === 'URGENT ACTION' ? 'border-rose-500 ring-2 ring-rose-500/40' : 'border-slate-700'} shadow-md flex items-center gap-1 hover:scale-110 transition">
            <span class="w-2 h-2 rounded-full ${road.currentStatus === 'CLEAR' ? 'bg-emerald-500' : road.exposureClassification === 'URGENT ACTION' ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}"></span>
            ${road.highwayNumber}
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([road.startCoords[1], road.startCoords[0]])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(`
              <div class="p-2.5 text-xs font-sans text-neutral-900 max-w-[240px]">
                <div class="font-bold text-sm text-slate-900">${road.highwayNumber}: ${road.name}</div>
                <div class="text-slate-500 mt-0.5">${road.corridor} &bull; ${road.chainage}</div>
                <div class="mt-1 font-semibold text-slate-800">Exposure: <span class="${road.exposureClassification === 'URGENT ACTION' ? 'text-rose-700 font-bold' : 'text-amber-700'}">${road.exposureClassification} (${road.roadExposureScore}/100)</span></div>
                <div class="mt-1 text-[11px] text-slate-600">Detour: ${road.detourRouteName} (+${road.detourDistanceKm} km)</div>
              </div>
            `)
          )
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    }
  }, [mapLoaded, layersVisible, selectedLocation, reports, alerts, roads]);

  // Handle Current Pin Drop on Arbitrary Map Click
  useEffect(() => {
    if (!mapRef.current || !clickedCoord) return;

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
    }

    const pinEl = document.createElement('div');
    pinEl.className = 'flex flex-col items-center animate-bounce';
    pinEl.innerHTML = `
      <div class="w-4 h-4 rounded-full bg-rose-600 border-2 border-white shadow-xl ring-4 ring-rose-500/40"></div>
      <div class="w-1 h-3 bg-rose-600 -mt-0.5"></div>
    `;

    selectedMarkerRef.current = new maplibregl.Marker({ element: pinEl, anchor: 'bottom' })
      .setLngLat([clickedCoord.lon, clickedCoord.lat])
      .addTo(mapRef.current);
  }, [clickedCoord]);

  const focusNER = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [93.8, 25.6],
      zoom: 8.5,
      duration: 1500
    });
  };

  const resetToAllIndia = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [78.9629, 22.5937],
      zoom: 4.5,
      duration: 1500
    });
  };

  return (
    <div className="relative w-full h-[calc(100vh-6.5rem)] min-h-[520px] bg-slate-100 overflow-hidden select-none">
      {/* MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Operational Map Controls (Top-Left) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-[280px] sm:max-w-xs">
        {/* Basemap Style Switcher (Keyless Tiles) */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-2.5 text-slate-800 shadow-lg text-xs flex items-center justify-between gap-1">
          <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Satellite className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tile Style:</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button
              id="btn-basemap-osm"
              onClick={() => setBasemap('osm')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${basemap === 'osm' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              OSM
            </button>
            <button
              id="btn-basemap-satellite"
              onClick={() => setBasemap('satellite')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${basemap === 'satellite' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Satellite
            </button>
            <button
              id="btn-basemap-topo"
              onClick={() => setBasemap('topo')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${basemap === 'topo' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Topo
            </button>
          </div>
        </div>

        {/* Layer Toggles Card */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 text-slate-800 shadow-lg text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-1.5 font-bold tracking-wide uppercase text-slate-800">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Map Overlays</span>
            </div>
            <span className="text-[10px] text-indigo-600 font-mono font-bold bg-indigo-50 px-1.5 py-0.5 rounded">SIH-26001</span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 transition text-slate-700">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                <span>NER & High-Risk Zones</span>
              </span>
              <input
                type="checkbox"
                checked={layersVisible.riskZones}
                onChange={(e) => setLayersVisible({ ...layersVisible, riskZones: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-0 bg-white w-3.5 h-3.5 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 transition text-slate-700">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                <span>Citizen Reports ({reports.length})</span>
              </span>
              <input
                type="checkbox"
                checked={layersVisible.citizenReports}
                onChange={(e) => setLayersVisible({ ...layersVisible, citizenReports: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-0 bg-white w-3.5 h-3.5 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 transition text-slate-700">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse inline-block"></span>
                <span>Active Alerts ({alerts.filter(a => a.status === 'ACTIVE').length})</span>
              </span>
              <input
                type="checkbox"
                checked={layersVisible.emergencyAlerts}
                onChange={(e) => setLayersVisible({ ...layersVisible, emergencyAlerts: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-0 bg-white w-3.5 h-3.5 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 transition text-slate-700">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                <span>Arterial Corridors ({roads.length})</span>
              </span>
              <input
                type="checkbox"
                checked={layersVisible.criticalRoads}
                onChange={(e) => setLayersVisible({ ...layersVisible, criticalRoads: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-0 bg-white w-3.5 h-3.5 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Quick View Navigation */}
        <div className="flex items-center gap-2">
          <button
            id="btn-focus-ner"
            onClick={focusNER}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md transition"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Focus NER Sector</span>
          </button>
          <button
            id="btn-reset-india-map"
            onClick={resetToAllIndia}
            className="px-3 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-md transition"
            title="View Entire India"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Interactive Location & Dual-Satellite Inspector Card (Bottom-Right / Floating) */}
      <div className="absolute bottom-4 right-4 z-10 max-w-sm sm:max-w-md w-full bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-4 shadow-xl text-slate-800 space-y-3 max-h-[calc(100vh-10rem)] overflow-y-auto">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                DUAL-SATELLITE & TELEMETRY
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {currentRisk?.freshness || 'LIVE'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">{selectedLocation?.name || 'Selected Sector Point'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {selectedLocation ? `${selectedLocation.district}, ${selectedLocation.state}` : `${clickedCoord ? `${clickedCoord.lat.toFixed(3)}°N, ${clickedCoord.lon.toFixed(3)}°E` : 'Click anywhere on map to evaluate'}`}
            </p>
          </div>

          {currentRisk && (
            <div className="text-right shrink-0">
              <div
                className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wider"
                style={{ backgroundColor: currentRisk.warningColor + '18', color: currentRisk.warningColor, border: `1px solid ${currentRisk.warningColor}50` }}
              >
                {currentRisk.riskLevel}
              </div>
              <div className="text-xl font-mono font-bold mt-0.5 text-slate-900">
                {currentRisk.compositeScore ?? currentRisk.riskScore}<span className="text-xs text-slate-400 font-normal">/100</span>
              </div>
            </div>
          )}
        </div>

        {/* Empirical Override Alert Notice */}
        {currentRisk?.empiricalOverrideApplied && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">EMPIRICAL SAFETY OVERRIDE ACTIVE:</strong>
              <div className="text-rose-700 mt-0.5">{currentRisk.empiricalOverrideReason}</div>
            </div>
          </div>
        )}

        {/* Dual-Satellite Intelligence Cards */}
        {currentRisk?.dualSatellite && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Sentinel-1 SAR Card */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-slate-900">🛰️ Sentinel-1 SAR</span>
                <span className="text-[10px] font-mono font-bold text-indigo-600">+{currentRisk.dualSatellite.sentinel1Sar.pointsContribution} pts</span>
              </div>
              <div className="text-[11px] font-mono text-slate-700">
                Creep: <strong className="text-rose-700">{currentRisk.dualSatellite.sentinel1Sar.deformationRateMmPerYear} mm/yr</strong>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                Phase: {currentRisk.dualSatellite.sentinel1Sar.interferometricPhaseShiftDeg}° &bull; Coherence: {currentRisk.dualSatellite.sentinel1Sar.insarCoherence}
              </div>
              <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded mt-1">
                ⚡ Radar penetrates clouds
              </div>
            </div>

            {/* Sentinel-2 Optical Card */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-slate-900">📷 Sentinel-2 Optical</span>
                <span className="text-[10px] font-mono font-bold text-indigo-600">+{currentRisk.dualSatellite.sentinel2Optical.pointsContribution} pts</span>
              </div>
              <div className="text-[11px] font-mono text-slate-700">
                NDVI Loss: <strong className="text-amber-700">-{currentRisk.dualSatellite.sentinel2Optical.ndviLossPct}%</strong>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                BSI Index: {currentRisk.dualSatellite.sentinel2Optical.bareSoilIndexBsi} &bull; Cloud: {currentRisk.dualSatellite.sentinel2Optical.cloudCoverPct}%
              </div>
              <div className="text-[10px] text-slate-500 italic truncate mt-1">
                {currentRisk.dualSatellite.sentinel2Optical.cloudCoverMitigationNote.substring(0, 32)}...
              </div>
            </div>
          </div>
        )}

        {/* Contributing Factors Preview */}
        {currentRisk && (
          <div className="space-y-1 text-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Multi-Factor Susceptibility Breakdown:
            </div>
            {currentRisk.contributingFactors.map((factor, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-700 text-[11px] py-0.5 border-b border-slate-100">
                <span className="truncate max-w-[200px]">{factor.factor}</span>
                <span className="font-mono font-bold text-indigo-600">+{factor.weightedScore} pts</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-1 flex items-center gap-2">
          <button
            id="btn-map-view-dashboard"
            onClick={onViewDashboard}
            className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-xs border border-slate-300 shadow-2xs transition"
          >
            Dashboard
          </button>
          <button
            id="btn-map-report-hazard"
            onClick={onOpenReportModal}
            className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs shadow-sm transition"
          >
            Report Hazard
          </button>
        </div>
      </div>

      {/* Map Hint Pill (Top Center) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-[11px] text-slate-600 shadow-md">
        <Info className="w-3.5 h-3.5 text-indigo-600" />
        <span>NER Landslide Early Warning &bull; Click anywhere to evaluate point-specific dual-satellite hazard</span>
      </div>
    </div>
  );
};
