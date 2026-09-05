/**
 * Header and Navigation Component
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mountain,
  AlertTriangle,
  FileText,
  Bot,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Search,
  MapPin,
  Menu,
  X,
  Camera,
  Activity,
  Layers,
  Radio,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LocationPoint } from '../types';
import { api } from '../services/api';

import { useOfflineSync } from '../context/OfflineSyncContext';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  selectedLocation: LocationPoint | null;
  onSelectLocation: (loc: LocationPoint) => void;
  onOpenReportModal: () => void;
  onOpenAuthModal: () => void;
  dataFreshness: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  selectedLocation,
  onSelectLocation,
  onOpenReportModal,
  onOpenAuthModal,
  dataFreshness,
}) => {
  const { user, logout, fastLogin } = useAuth();
  const { isOnline, queuedCount, isSyncing, triggerManualSync } = useOfflineSync();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationPoint[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { results } = await api.searchLocations(searchQuery);
        setSearchResults(results);
        setShowSearchDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const navItems = [
    { id: 'map', label: 'India Map', icon: Layers },
    { id: 'dashboard', label: 'User Dashboard', icon: Activity },
    { id: 'alerts', label: 'Alerts & Roads', icon: AlertTriangle },
    { id: 'evidence', label: 'Evidence & RAG', icon: FileText },
    { id: 'copilot', label: 'AI Copilot', icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-800 shadow-xs">
      {/* Top Banner: Status, Offline Indicator & Rapid Role Switcher */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-200">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Online/Offline Visual Indicator */}
          {!isOnline || queuedCount > 0 ? (
            <div className="flex items-center gap-1.5 bg-amber-950/80 text-amber-300 px-2.5 py-0.5 rounded border border-amber-700/60 font-mono font-bold text-[11px]">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>Offline Mode ({queuedCount} {queuedCount === 1 ? 'report' : 'reports'} queued)</span>
              {isOnline && (
                <button
                  id="btn-manual-sync-now"
                  onClick={() => triggerManualSync()}
                  disabled={isSyncing}
                  className="ml-1 px-1.5 py-0.2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded text-[10px] font-extrabold uppercase transition cursor-pointer"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 font-mono text-[11px]">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-emerald-400">Online Sync Active</span>
            </div>
          )}

          <span className="hidden sm:inline text-slate-600">|</span>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>FEED:</span>
            <span className="text-slate-200 font-mono">{dataFreshness}</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-indigo-400 font-mono font-medium">Dual-Satellite SAR & Optical</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!user ? (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-400">Quick Test:</span>
              <button
                id="btn-quick-analyst"
                onClick={() => fastLogin('USER')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Analyst
              </button>
              <button
                id="btn-quick-admin"
                onClick={() => fastLogin('ADMIN')}
                className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/60 transition"
              >
                NDMA Admin
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Logged in:</span>
              <span className="font-medium text-slate-200 truncate max-w-[140px]">{user.full_name}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                user.role === 'ADMIN' ? 'bg-rose-900/80 text-rose-200 border border-rose-700/60' : 'bg-indigo-900/80 text-indigo-200 border border-indigo-700/60'
              }`}>
                {user.role}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
        {/* Brand & Emblem */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('map')}>
          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-2xs">
            <Mountain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900">NER Landslide Platform</span>
              <span className="hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-200 text-slate-600 uppercase font-mono font-medium">
                India-Wide Early Warning
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Geospatial Intelligence &bull; Deterministic Risk &bull; Citizen Field Reports
            </p>
          </div>
        </div>

        {/* Global Location Search */}
        <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md relative" ref={searchRef}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="input-global-location-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) setShowSearchDropdown(true);
              }}
              placeholder={selectedLocation ? `Location: ${selectedLocation.name}, ${selectedLocation.state}` : 'Search Indian city, district, highway, or hills...'}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-2xs"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 max-h-72 overflow-y-auto">
              <div className="p-1.5 text-[11px] text-slate-500 font-semibold border-b border-slate-100 bg-slate-50">
                MATCHED INDIAN LOCATIONS
              </div>
              {searchResults.map((loc) => (
                <button
                  key={loc.id}
                  id={`btn-loc-${loc.id}`}
                  onClick={() => {
                    onSelectLocation(loc);
                    setShowSearchDropdown(false);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-start gap-2.5 transition text-slate-800"
                >
                  <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="overflow-hidden">
                    <div className="text-sm font-semibold text-slate-800 truncate">{loc.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {loc.district}, {loc.state} &bull; <span className="font-mono font-medium text-slate-700">{loc.elevationM}m</span> &bull; {loc.landslideZoneCategory}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls & Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Admin Tab (Role Aware) */}
          <button
            id="nav-admin"
            onClick={() => onSelectTab('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              currentTab === 'admin'
                ? 'bg-rose-50 text-rose-700 font-semibold border border-rose-200 shadow-2xs'
                : user?.role === 'ADMIN'
                ? 'text-rose-600 hover:bg-rose-50/70 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            <span>Admin</span>
            {user?.role === 'ADMIN' && (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Citizen Field Report Button */}
          <button
            id="btn-report-hazard-header"
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Report Hazard</span>
            <span className="sm:hidden">Report</span>
          </button>

          {/* User Auth Action */}
          {user ? (
            <div className="relative group">
              <button
                id="btn-user-profile-menu"
                onClick={logout}
                title="Log out"
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-rose-600 transition"
              >
                <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-600" />
              </button>
            </div>
          ) : (
            <button
              id="btn-header-signin"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition"
            >
              <UserIcon className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            id="btn-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            id="mobile-nav-admin"
            onClick={() => {
              onSelectTab('admin');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition ${
              currentTab === 'admin'
                ? 'bg-rose-50 text-rose-700 font-semibold border border-rose-200'
                : 'text-rose-700 hover:bg-rose-50/70 font-semibold'
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-rose-600" />
            <span>Admin Operations</span>
          </button>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="text-xs text-slate-500">Signed in as</div>
                  <div className="text-sm font-semibold text-slate-800">{user.full_name} ({user.role})</div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-rose-600 font-semibold hover:underline"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenAuthModal();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2 text-sm bg-indigo-600 hover:bg-indigo-700 font-medium rounded-lg text-white shadow-sm"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
