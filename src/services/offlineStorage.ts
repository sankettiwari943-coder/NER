/**
 * Offline Resilience & IndexedDB Storage Engine (SIH-26001 Aligned)
 * Provides local caching and offline hazard report queuing for remote NER hill sectors with intermittent connectivity.
 */

import { OfflineQueuedReport, CitizenReport, RiskAssessment } from '../types';

const DB_NAME = 'NER_Landslide_Intelligence_Offline_DB';
const DB_VERSION = 1;

const STORES = {
  QUEUED_REPORTS: 'queued_reports',
  CACHED_RISK: 'cached_risk_assessments',
  CACHED_INCIDENTS: 'cached_incidents'
};

class OfflineStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB is not supported on this platform'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Queued Offline Reports Store
        if (!db.objectStoreNames.contains(STORES.QUEUED_REPORTS)) {
          const reportStore = db.createObjectStore(STORES.QUEUED_REPORTS, { keyPath: 'localId' });
          reportStore.createIndex('created_at', 'created_at', { unique: false });
          reportStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // 2. Cached Vector & Point Risk Store
        if (!db.objectStoreNames.contains(STORES.CACHED_RISK)) {
          db.createObjectStore(STORES.CACHED_RISK, { keyPath: 'key' });
        }

        // 3. Cached Incidents Store
        if (!db.objectStoreNames.contains(STORES.CACHED_INCIDENTS)) {
          db.createObjectStore(STORES.CACHED_INCIDENTS, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // -------------------------------------------------------------
  // Offline Hazard Reports Queue
  // -------------------------------------------------------------

  public async saveQueuedReport(report: Omit<OfflineQueuedReport, 'localId' | 'created_at' | 'syncStatus'>): Promise<OfflineQueuedReport> {
    const db = await this.getDB();
    const queuedItem: OfflineQueuedReport = {
      ...report,
      localId: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
      syncStatus: 'QUEUED',
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUED_REPORTS, 'readwrite');
      const store = tx.objectStore(STORES.QUEUED_REPORTS);
      const req = store.add(queuedItem);

      req.onsuccess = () => resolve(queuedItem);
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllQueuedReports(): Promise<OfflineQueuedReport[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUED_REPORTS, 'readonly');
      const store = tx.objectStore(STORES.QUEUED_REPORTS);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async removeQueuedReport(localId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUED_REPORTS, 'readwrite');
      const store = tx.objectStore(STORES.QUEUED_REPORTS);
      const req = store.delete(localId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async clearAllQueuedReports(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUED_REPORTS, 'readwrite');
      const store = tx.objectStore(STORES.QUEUED_REPORTS);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getQueuedCount(): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUED_REPORTS, 'readonly');
      const store = tx.objectStore(STORES.QUEUED_REPORTS);
      const req = store.count();

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // -------------------------------------------------------------
  // Local Risk & Incident Cache
  // -------------------------------------------------------------

  public async cacheRiskAssessment(lat: number, lon: number, assessment: RiskAssessment): Promise<void> {
    const db = await this.getDB();
    const key = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CACHED_RISK, 'readwrite');
      const store = tx.objectStore(STORES.CACHED_RISK);
      const req = store.put({ key, assessment, cachedAt: new Date().toISOString() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getCachedRiskAssessment(lat: number, lon: number): Promise<RiskAssessment | null> {
    const db = await this.getDB();
    const key = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CACHED_RISK, 'readonly');
      const store = tx.objectStore(STORES.CACHED_RISK);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result ? req.result.assessment : null);
      req.onerror = () => reject(req.error);
    });
  }

  public async cacheIncidents(incidents: CitizenReport[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CACHED_INCIDENTS, 'readwrite');
      const store = tx.objectStore(STORES.CACHED_INCIDENTS);
      incidents.forEach(inc => store.put(inc));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getCachedIncidents(): Promise<CitizenReport[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CACHED_INCIDENTS, 'readonly');
      const store = tx.objectStore(STORES.CACHED_INCIDENTS);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
}

export const offlineStorage = new OfflineStorageService();
