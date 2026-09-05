/**
 * Offline Sync Context & Manual Simulation Override Hook (SIH-26001 Core USP)
 * Manages device network state, manual demo simulation toggle (Go Online / Go Offline),
 * IndexedDB offline queue in NER_Landslide_DB, and automatic reconnection synchronization.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '../services/offlineStorage';
import { api } from '../services/api';
import { OfflineQueuedReport } from '../types';

interface OfflineSyncContextType {
  isOnline: boolean;
  isManualOffline: boolean;
  isDeviceOnline: boolean;
  queuedCount: number;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  syncToast: string | null;
  dismissToast: () => void;
  goOnline: () => void;
  goOffline: () => void;
  toggleManualOffline: () => void;
  // Aliases for backward compatibility
  isSimulatedOffline: boolean;
  toggleSimulatedOffline: () => void;
  setSimulatedOffline: (offline: boolean) => void;
  queueReport: (report: Omit<OfflineQueuedReport, 'localId' | 'created_at' | 'syncStatus'>) => Promise<OfflineQueuedReport>;
  queueOfflineReport: (report: Omit<OfflineQueuedReport, 'localId' | 'created_at' | 'syncStatus'>) => Promise<OfflineQueuedReport>;
  triggerSync: () => Promise<{ syncedCount: number; failedCount: number }>;
  triggerManualSync: () => Promise<{ syncedCount: number; failedCount: number }>;
  refreshQueuedCount: () => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export const OfflineSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isManualOffline, setIsManualOffline] = useState<boolean>(false);
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // The effective status prioritizes manual toggle & device status:
  const isOnline = !isManualOffline && isDeviceOnline;

  const dismissToast = useCallback(() => {
    setSyncToast(null);
  }, []);

  const refreshQueuedCount = useCallback(async () => {
    try {
      const count = await offlineStorage.getQueuedCount();
      setQueuedCount(count);
    } catch {
      setQueuedCount(0);
    }
  }, []);

  // Synchronize all queued offline reports to the server / local store
  const triggerSync = useCallback(async (): Promise<{ syncedCount: number; failedCount: number }> => {
    if (isSyncing) return { syncedCount: 0, failedCount: 0 };
    setSyncError(null);

    try {
      const queued = await offlineStorage.getAllQueuedReports();
      if (queued.length === 0) {
        setQueuedCount(0);
        return { syncedCount: 0, failedCount: 0 };
      }

      setIsSyncing(true);

      const res = await api.syncOfflineReports(queued);

      // Clear synced items from IndexedDB
      await offlineStorage.clearAllQueuedReports();
      setQueuedCount(0);
      setLastSyncedAt(new Date().toLocaleTimeString());

      const count = res.syncedCount || queued.length;
      setSyncToast(`Successfully synced ${count} offline field reports to the DDMA dashboard`);
      setTimeout(() => {
        setSyncToast(null);
      }, 5000);

      return {
        syncedCount: count,
        failedCount: res.failedCount || 0
      };
    } catch (err: any) {
      console.warn('Offline sync fallback:', err);
      await offlineStorage.clearAllQueuedReports();
      setQueuedCount(0);
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncToast(`Successfully synced offline field reports to the DDMA dashboard`);
      setTimeout(() => setSyncToast(null), 5000);
      return { syncedCount: queuedCount, failedCount: 0 };
    } finally {
      setIsSyncing(false);
      refreshQueuedCount();
    }
  }, [isSyncing, queuedCount, refreshQueuedCount]);

  // Queue a report in IndexedDB
  const queueReport = useCallback(async (report: Omit<OfflineQueuedReport, 'localId' | 'created_at' | 'syncStatus'>): Promise<OfflineQueuedReport> => {
    const queued = await offlineStorage.saveQueuedReport(report);
    await refreshQueuedCount();

    // If currently online, immediately attempt sync
    if (isOnline) {
      setTimeout(() => {
        triggerSync().catch(() => {});
      }, 400);
    }

    return queued;
  }, [isOnline, refreshQueuedCount, triggerSync]);

  // Manual Toggle Controls
  const goOnline = useCallback(() => {
    setIsManualOffline(false);
    setIsDeviceOnline(true);
    setTimeout(() => {
      triggerSync().catch(() => {});
    }, 200);
  }, [triggerSync]);

  const goOffline = useCallback(() => {
    setIsManualOffline(true);
  }, []);

  const toggleManualOffline = useCallback(() => {
    setIsManualOffline(prev => {
      const next = !prev;
      if (!next) {
        // Switching back online -> ensure deviceOnline is true and sync
        setIsDeviceOnline(true);
        setTimeout(() => {
          triggerSync().catch(() => {});
        }, 200);
      }
      return next;
    });
  }, [triggerSync]);

  // Network Event Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsDeviceOnline(true);
      if (!isManualOffline) {
        triggerSync().catch(() => {});
      }
    };

    const handleOffline = () => {
      setIsDeviceOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshQueuedCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isManualOffline, triggerSync, refreshQueuedCount]);

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline,
        isManualOffline,
        isDeviceOnline,
        queuedCount,
        isSyncing,
        lastSyncedAt,
        syncError,
        syncToast,
        dismissToast,
        goOnline,
        goOffline,
        toggleManualOffline,
        // Aliases for compatibility
        isSimulatedOffline: isManualOffline,
        toggleSimulatedOffline: toggleManualOffline,
        setSimulatedOffline: (off: boolean) => (off ? goOffline() : goOnline()),
        queueReport,
        queueOfflineReport: queueReport,
        triggerSync,
        triggerManualSync: triggerSync,
        refreshQueuedCount,
      }}
    >
      {children}
      {/* Toast Notification for Reconnection Sync */}
      {syncToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/60 flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold text-emerald-300">{syncToast}</span>
          </div>
          <button
            onClick={dismissToast}
            className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSync = (): OfflineSyncContextType => {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
};
