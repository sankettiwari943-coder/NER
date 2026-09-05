/**
 * Native Offline Resilience & IndexedDB Storage Engine (SIH-26001 Core USP)
 * Database: NER_Landslide_DB
 * Object Stores:
 * - offline_reports: Queued field hazard submissions with photos and coordinates when disconnected.
 * - cached_map_tiles: Offline basemap tile cache for disconnected field operation in remote NER hills.
 * - cached_risk_assessments: Point & sector risk cache.
 * - cached_incidents: Verified incident feed cache.
 */

import { OfflineQueuedReport, CitizenReport, RiskAssessment } from '../types';

export interface StoredOfflineReport {
  id: string;
  timestamp: number | string;
  lat: number;
  lng: number;
  corridorChainage?: string;
  issueType: string;
  imageBase64?: string;
  status: 'pending_sync' | 'synced' | 'failed';
  locationName?: string;
  description?: string;
  severity?: string;
}

const DB_NAME = 'NER_Landslide_DB';
const DB_VERSION = 1;

export const DB_STORES = {
  OFFLINE_REPORTS: 'offline_reports',
  CACHED_TILES: 'cached_map_tiles',
  CACHED_RISK: 'cached_risk_assessments',
  CACHED_INCIDENTS: 'cached_incidents'
};

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'rep_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

class OfflineStorageEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB is not available on this platform'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Primary Offline Reports Store
        if (!db.objectStoreNames.contains(DB_STORES.OFFLINE_REPORTS)) {
          const reportStore = db.createObjectStore(DB_STORES.OFFLINE_REPORTS, { keyPath: 'id' });
          reportStore.createIndex('timestamp', 'timestamp', { unique: false });
          reportStore.createIndex('status', 'status', { unique: false });
        }

        // 2. Cached Map Tiles Store
        if (!db.objectStoreNames.contains(DB_STORES.CACHED_TILES)) {
          db.createObjectStore(DB_STORES.CACHED_TILES, { keyPath: 'key' });
        }

        // 3. Cached Risk Assessments
        if (!db.objectStoreNames.contains(DB_STORES.CACHED_RISK)) {
          db.createObjectStore(DB_STORES.CACHED_RISK, { keyPath: 'key' });
        }

        // 4. Cached Incidents
        if (!db.objectStoreNames.contains(DB_STORES.CACHED_INCIDENTS)) {
          db.createObjectStore(DB_STORES.CACHED_INCIDENTS, { keyPath: 'id' });
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

  // =========================================================================
  // Offline Hazard Report Queuing (SIH Core USP)
  // =========================================================================

  /**
   * Save an offline report directly to IndexedDB
   */
  public async saveOfflineReport(report: {
    lat: number;
    lng: number;
    corridorChainage?: string;
    issueType: string;
    imageBase64?: string;
    locationName?: string;
    description?: string;
    severity?: string;
  }): Promise<StoredOfflineReport> {
    const db = await this.getDB();
    const id = generateUUID();
    const record: StoredOfflineReport = {
      id,
      timestamp: Date.now(),
      lat: report.lat,
      lng: report.lng,
      corridorChainage: report.corridorChainage || 'General Corridor',
      issueType: report.issueType || 'Landslide Hazard',
      imageBase64: report.imageBase64,
      status: 'pending_sync',
      locationName: report.locationName || `${report.lat.toFixed(4)}°N, ${report.lng.toFixed(4)}°E`,
      description: report.description || '',
      severity: report.severity || 'HIGH',
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORES.OFFLINE_REPORTS, 'readwrite');
      const store = tx.objectStore(DB_STORES.OFFLINE_REPORTS);
      const req = store.add(record);

      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieve all pending offline reports
   */
  public async getAllPendingReports(): Promise<StoredOfflineReport[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORES.OFFLINE_REPORTS, 'readonly');
      const store = tx.objectStore(DB_STORES.OFFLINE_REPORTS);
      const req = store.getAll();

      req.onsuccess = () => {
        const all: StoredOfflineReport[] = req.result || [];
        const pending = all.filter(r => r.status === 'pending_sync');
        resolve(pending);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Mark an offline report as synced
   */
  public async markReportSynced(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORES.OFFLINE_REPORTS, 'readwrite');
      const store = tx.objectStore(DB_STORES.OFFLINE_REPORTS);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.status = 'synced';
          store.put(record);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  /**
   * Remove a specific offline report
   */
  public async removeOfflineReport(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORES.OFFLINE_REPORTS, 'readwrite');
      const store = tx.objectStore(DB_STORES.OFFLINE_REPORTS);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Count of pending offline reports
   */
  public async getPendingCount(): Promise<number> {
    const pending = await this.getAllPendingReports();
    return pending.length;
  }

  // =========================================================================
  // Backward-Compatible Adapter Methods for OfflineQueuedReport
  // =========================================================================

  public async saveQueuedReport(report: Omit<OfflineQueuedReport, 'localId' | 'created_at' | 'syncStatus'>): Promise<OfflineQueuedReport> {
    const stored = await this.saveOfflineReport({
      lat: report.latitude,
      lng: report.longitude,
      issueType: report.hazard_type,
      imageBase64: report.photoBase64,
      locationName: report.location_name,
      description: report.description,
      severity: report.severity,
    });

    const queuedItem: OfflineQueuedReport = {
      localId: stored.id,
      hazard_type: stored.issueType,
      severity: (stored.severity as any) || 'HIGH',
      location_name: stored.locationName || '',
      latitude: stored.lat,
      longitude: stored.lng,
      description: stored.description || '',
      photoBase64: stored.imageBase64,
      created_at: new Date(stored.timestamp).toISOString(),
      syncStatus: 'QUEUED',
    };

    return queuedItem;
  }

  public async getAllQueuedReports(): Promise<OfflineQueuedReport[]> {
    const pending = await this.getAllPendingReports();
    return pending.map(p => ({
      localId: p.id,
      hazard_type: p.issueType,
      severity: (p.severity as any) || 'HIGH',
      location_name: p.locationName || '',
      latitude: p.lat,
      longitude: p.lng,
      description: p.description || '',
      photoBase64: p.imageBase64,
      created_at: typeof p.timestamp === 'number' ? new Date(p.timestamp).toISOString() : String(p.timestamp),
      syncStatus: 'QUEUED',
    }));
  }

  public async removeQueuedReport(localId: string): Promise<void> {
    return this.removeOfflineReport(localId);
  }

  public async clearAllQueuedReports(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORES.OFFLINE_REPORTS, 'readwrite');
      const store = tx.objectStore(DB_STORES.OFFLINE_REPORTS);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getQueuedCount(): Promise<number> {
    return this.getPendingCount();
  }

  // =========================================================================
  // Local Risk, Incidents & Tile Cache
  // =========================================================================

  public async cacheTile(key: string, dataUrl: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORES.CACHED_TILES, 'readwrite');
      const store = tx.objectStore(DB_STORES.CACHED_TILES);
      const req = store.put({ key, dataUrl, cachedAt: Date.now() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getCachedTile(key: string): Promise<string | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORES.CACHED_TILES, 'readonly');
      const store = tx.objectStore(DB_STORES.CACHED_TILES);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
      req.onerror = () => reject(req.error);
    });
  }

  public async cacheRiskAssessment(lat: number, lon: number, assessment: RiskAssessment): Promise<void> {
    const db = await this.getDB();
    const key = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORES.CACHED_RISK, 'readwrite');
      const store = tx.objectStore(DB_STORES.CACHED_RISK);
      const req = store.put({ key, assessment, cachedAt: new Date().toISOString() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getCachedRiskAssessment(lat: number, lon: number): Promise<RiskAssessment | null> {
    const db = await this.getDB();
    const key = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORES.CACHED_RISK, 'readonly');
      const store = tx.objectStore(DB_STORES.CACHED_RISK);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result ? req.result.assessment : null);
      req.onerror = () => reject(req.error);
    });
  }

  public async cacheIncidents(incidents: CitizenReport[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORES.CACHED_INCIDENTS, 'readwrite');
      const store = tx.objectStore(DB_STORES.CACHED_INCIDENTS);
      incidents.forEach(inc => store.put(inc));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getCachedIncidents(): Promise<CitizenReport[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORES.CACHED_INCIDENTS, 'readonly');
      const store = tx.objectStore(DB_STORES.CACHED_INCIDENTS);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
}

export const offlineStorage = new OfflineStorageEngine();
