/**
 * Offline Sync Context & Hook (SIH-26001 Aligned)
 * Automatically detects online/offline status, queues field hazard reports in IndexedDB,
 * and synchronizes queued records to /api/v1/reports/sync upon reconnection.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '../services/offlineStorage';
import { api } from '../services/api';
import { OfflineQueuedReport, CitizenReport } from '../types';

interface OfflineSyncContextType {
  isOnline: boolean;
  queuedCount: number;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  queueReport: (report: Omit<OfflineQueuedReport, 'localId' | 'created_at' | 'syncStatus'>) => Promise<OfflineQueuedReport>;
  queueOfflineReport: (report: Omit<OfflineQueuedReport, 'localId' | 'created_at' | 'syncStatus'>) => Promise<OfflineQueuedReport>;
  triggerSync: () => Promise<{ syncedCount: number; failedCount: number }>;
  triggerManualSync: () => Promise<{ syncedCount: number; failedCount: number }>;
  refreshQueuedCount: () => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export const OfflineSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refreshQueuedCount = useCallback(async () => {
    try {
      const count = await offlineStorage.getQueuedCount();
      setQueuedCount(count);
    } catch {
      setQueuedCount(0);
    }
  }, []);

  // Synchronize all queued offline reports to the server
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

      return {
        syncedCount: res.syncedCount,
        failedCount: res.failedCount
      };
    } catch (err: any) {
      console.error('Offline sync failed:', err);
      setSyncError(err.message || 'Synchronization failed. Will retry automatically.');
      return { syncedCount: 0, failedCount: queuedCount };
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
    if (navigator.onLine) {
      setTimeout(() => {
        triggerSync().catch(() => {});
      }, 500);
    }

    return queued;
  }, [refreshQueuedCount, triggerSync]);

  // Network Event Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync upon reconnection
      triggerSync().catch(() => {});
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load
    refreshQueuedCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync, refreshQueuedCount]);

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline,
        queuedCount,
        isSyncing,
        lastSyncedAt,
        syncError,
        queueReport,
        queueOfflineReport: queueReport,
        triggerSync,
        triggerManualSync: triggerSync,
        refreshQueuedCount,
      }}
    >
      {children}
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
