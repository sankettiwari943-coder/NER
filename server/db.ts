/**
 * Database storage engine for NER Landslide Platform.
 * Supports PostgreSQL via DATABASE_URL with seamless persistent fallback.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;

export interface User {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  full_name: string;
  role: 'USER' | 'ADMIN';
  organization?: string;
  phone?: string;
  created_at: string;
}

export interface CitizenReport {
  id: string;
  user_id: string;
  user_name: string;
  hazard_type: string;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  location_name: string;
  latitude: number;
  longitude: number;
  photo_url?: string;
  photo_storage_key?: string;
  verification_status: 'UNVERIFIED' | 'UNDER REVIEW' | 'VERIFIED' | 'REJECTED' | 'RESOLVED';
  ai_observation?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportStatusHistory {
  id: string;
  report_id: string;
  previous_status: string;
  new_status: string;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  note?: string;
}

export interface Alert {
  id: string;
  title: string;
  severity: 'ADVISORY' | 'WARNING' | 'CRITICAL';
  location_name: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  source: 'SYSTEM' | 'CITIZEN' | 'ADMIN' | 'AI-ASSISTED' | 'OFFICIAL';
  status: 'ACTIVE' | 'RESOLVED' | 'PENDING_APPROVAL';
  affected_area: string;
  recommended_action: string;
  report_id?: string;
  evidenceSummary?: string;
  authorityApprovalRequired?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  target_resource: string;
  details: string;
  timestamp: string;
  ip?: string;
}

// In-memory / persistent file storage container
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'landslide_store.json');

interface StoreData {
  users: User[];
  citizen_reports: CitizenReport[];
  report_status_history: ReportStatusHistory[];
  alerts: Alert[];
  audit_logs: AuditLog[];
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

// Initial seed data
function getDefaultSeedData(): StoreData {
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const userSalt = crypto.randomBytes(16).toString('hex');

  const adminUser: User = {
    id: 'usr_admin_001',
    email: 'admin@disaster.gov.in',
    password_hash: hashPassword('Admin@12345', adminSalt),
    salt: adminSalt,
    full_name: 'Dr. Rajesh Verma',
    role: 'ADMIN',
    organization: 'National Disaster Management Authority (NDMA)',
    phone: '+91 98101 23456',
    created_at: new Date('2026-01-15T08:00:00Z').toISOString(),
  };

  const citizenUser: User = {
    id: 'usr_user_001',
    email: 'analyst@disaster.gov.in',
    password_hash: hashPassword('User@12345', userSalt),
    salt: userSalt,
    full_name: 'Ananya Sharma',
    role: 'USER',
    organization: 'State Emergency Operations Centre (SEOC)',
    phone: '+91 98765 43210',
    created_at: new Date('2026-02-01T10:30:00Z').toISOString(),
  };

  const seedReports: CitizenReport[] = [
    {
      id: 'rep_001',
      user_id: citizenUser.id,
      user_name: citizenUser.full_name,
      hazard_type: 'Debris Flow & Rockfall',
      description: 'Active debris flow observed along cut slope following intense 24h rainfall. Partial road blockage with falling shale blocks.',
      severity: 'HIGH',
      location_name: 'Joshimath-Helang Road, Chamoli, Uttarakhand',
      latitude: 30.5564,
      longitude: 79.5653,
      photo_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
      verification_status: 'VERIFIED',
      ai_observation: 'AI ASSESSMENT — VERIFY BEFORE RESPONSE: Slope toe undercut with gravelly colluvium detachment. Road shoulder compromised.',
      admin_notes: 'Verified by Chamoli District Emergency Team. BRO unit notified.',
      created_at: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    },
    {
      id: 'rep_002',
      user_id: citizenUser.id,
      user_name: citizenUser.full_name,
      hazard_type: 'Tension Cracks on Hillside',
      description: 'Widening transverse cracks (approx 5-8 cm) visible above settlement ridge after 3 days of antecedent monsoon precipitation.',
      severity: 'CRITICAL',
      location_name: 'Meppadi, Wayanad, Kerala',
      latitude: 11.5511,
      longitude: 76.1264,
      photo_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
      verification_status: 'UNDER REVIEW',
      ai_observation: 'AI ASSESSMENT — VERIFY BEFORE RESPONSE: Saturated lateritic soil overburden with deep longitudinal tension cracks along natural drainage corridor.',
      admin_notes: 'Forwarded to Kerala State Disaster Management Authority (KSDMA) rapid response unit.',
      created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
    },
    {
      id: 'rep_003',
      user_id: citizenUser.id,
      user_name: 'Pema Bhutia',
      hazard_type: 'Road Shoulder Subsidence',
      description: 'Downslope slope failure below the retaining wall on NH-10. Heavy drainage discharge from upper terrace.',
      severity: 'MODERATE',
      location_name: 'Rangpo - Singtam Corridor, Sikkim',
      latitude: 27.1772,
      longitude: 88.5144,
      photo_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
      verification_status: 'UNVERIFIED',
      ai_observation: 'AI ASSESSMENT — VERIFY BEFORE RESPONSE: Toe scour with structural cracking in masonry breast wall. Runoff erosion evident.',
      created_at: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
    }
  ];

  const seedHistory: ReportStatusHistory[] = [
    {
      id: 'rsh_001',
      report_id: 'rep_001',
      previous_status: 'UNVERIFIED',
      new_status: 'VERIFIED',
      changed_by: adminUser.id,
      changed_by_name: adminUser.full_name,
      changed_at: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
      note: 'Verified with GSI nodal field report and Chamoli control room.'
    },
    {
      id: 'rsh_002',
      report_id: 'rep_002',
      previous_status: 'UNVERIFIED',
      new_status: 'UNDER REVIEW',
      changed_by: adminUser.id,
      changed_by_name: adminUser.full_name,
      changed_at: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
      note: 'Urgent assessment assigned to Wayanad Taluk officer.'
    }
  ];

  const seedAlerts: Alert[] = [
    {
      id: 'alt_001',
      title: 'Red Alert: Critical Slumping along NH-29 Kohima Lifeline',
      severity: 'CRITICAL',
      location_name: 'Kohima - Dimapur Corridor (KM 14-22), Nagaland',
      latitude: 25.6747,
      longitude: 94.1105,
      radius_km: 30,
      source: 'OFFICIAL',
      status: 'ACTIVE',
      affected_area: 'NH-29 between Phesama, Old KMC Choke and Jotsoma By-pass',
      recommended_action: 'Halt non-essential heavy commercial transit. Pre-position BRO excavators at KM 18. Divert light traffic via Khonoma-Jotsoma bypass.',
      evidenceSummary: 'Sentinel-1 SAR deformation rate -28.4 mm/yr + 72h antecedent rainfall 142mm exceeding regional threshold.',
      authorityApprovalRequired: false,
      created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    },
    {
      id: 'alt_002',
      title: 'Orange Warning: Intense Precipitation & Overburden Saturation',
      severity: 'WARNING',
      location_name: 'Haflong - Jatinga Valley (NH-27), Dima Hasao, Assam',
      latitude: 25.1706,
      longitude: 93.0184,
      radius_km: 25,
      source: 'SYSTEM',
      status: 'ACTIVE',
      affected_area: 'NH-27 East-West corridor between Haflong and Silchar Pass',
      recommended_action: 'Precautionary evacuation of vulnerable dwellings on steep cut slopes. Strict one-way regulated convoy transit.',
      evidenceSummary: '24h rainfall 78.5mm triggering high pore pressure in Disang-Barail weathered shale overburden.',
      authorityApprovalRequired: false,
      created_at: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
    },
    {
      id: 'alt_003',
      title: 'Yellow Advisory: NH-10 Teesta Valley Slips',
      severity: 'ADVISORY',
      location_name: 'Kalimpong - Rangpo Sector, West Bengal / Sikkim',
      latitude: 27.0594,
      longitude: 88.4695,
      radius_km: 20,
      source: 'AI-ASSISTED',
      status: 'ACTIVE',
      affected_area: 'NH-10 along Teesta river gorge (29th Mile & Birik Dara)',
      recommended_action: 'Regulated one-way convoy movement; night travel restricted during rain.',
      evidenceSummary: 'Active toe-erosion by Teesta River with 18.2% NDVI canopy degradation detected via Sentinel-2 MSI.',
      authorityApprovalRequired: false,
      created_at: new Date(Date.now() - 3600 * 1000 * 14).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 14).toISOString(),
    },
    {
      id: 'alt_004',
      title: 'Red Alert: High Landslide Vulnerability along NH-58',
      severity: 'CRITICAL',
      location_name: 'Chamoli - Rudraprayag Corridor, Uttarakhand',
      latitude: 30.5564,
      longitude: 79.5653,
      radius_km: 25,
      source: 'OFFICIAL',
      status: 'ACTIVE',
      affected_area: 'NH-58 Rishikesh-Badrinath corridor between Pipalkoti and Helang',
      recommended_action: 'Suspend non-essential vehicular traffic, activate SDRF staging post at Joshimath, deploy heavy machinery at vulnerable choke points.',
      evidenceSummary: 'Active shear slip along Main Boundary Thrust fault gouge following heavy torrential precipitation.',
      authorityApprovalRequired: false,
      created_at: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
    },
    // Draft Alerts for Human Verification Gate
    {
      id: 'alt_pending_001',
      title: 'DRAFT CRITICAL: Imminent Toe Failure at Phesama Settlement (NH-29 KM 18)',
      severity: 'CRITICAL',
      location_name: 'Phesama Slope, Kohima District, Nagaland',
      latitude: 25.6540,
      longitude: 94.1080,
      radius_km: 15,
      source: 'AI-ASSISTED',
      status: 'PENDING_APPROVAL',
      affected_area: 'Phesama lower village and NH-29 downstream chainage',
      recommended_action: 'Mandatory immediate evacuation order for 42 households in designated red zone. Mobilize Assam Rifles disaster unit.',
      evidenceSummary: 'AUTOMATED AI TRIGGER: 72h precipitation 164mm + InSAR subsidence velocity -34.2mm/yr + 3 citizen-reported tension cracks (6-10cm wide). Requires District Magistrate sign-off to broadcast.',
      authorityApprovalRequired: true,
      created_at: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
    },
    {
      id: 'alt_pending_002',
      title: 'DRAFT WARNING: Flash Mudflow Surcharge at Sonapur Tunnel Portal (NH-6)',
      severity: 'WARNING',
      location_name: 'Sonapur Tunnel, East Jaintia Hills, Meghalaya',
      latitude: 25.1120,
      longitude: 92.3410,
      radius_km: 18,
      source: 'SYSTEM',
      status: 'PENDING_APPROVAL',
      affected_area: 'NH-6 arterial freight link between Meghalaya and Barak Valley / Tripura',
      recommended_action: 'Pre-position high-volume sludge dewatering pumps. Close tunnel approach during cloudburst cells.',
      evidenceSummary: 'AUTOMATED TELEMETRY TRIGGER: Upstream catchment precipitation peaked at 88mm/2h. Hydrostatic head behind breast wall approaching design threshold. Requires Authority review.',
      authorityApprovalRequired: true,
      created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    }
  ];

  return {
    users: [adminUser, citizenUser],
    citizen_reports: seedReports,
    report_status_history: seedHistory,
    alerts: seedAlerts,
    audit_logs: [
      {
        id: 'aud_001',
        user_id: adminUser.id,
        action: 'REPORT_STATUS_UPDATE',
        target_resource: 'rep_001',
        details: 'Changed status from UNVERIFIED to VERIFIED',
        timestamp: new Date(Date.now() - 3600 * 1000 * 3).toISOString()
      }
    ],
  };
}

function mapUser(row: any): User {
  return {
    id: String(row.id),
    email: String(row.email),
    password_hash: String(row.password_hash),
    salt: String(row.salt),
    full_name: String(row.full_name),
    role: row.role as 'USER' | 'ADMIN',
    organization: row.organization || undefined,
    phone: row.phone || undefined,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function mapReport(row: any): CitizenReport {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    user_name: String(row.user_name),
    hazard_type: String(row.hazard_type),
    description: String(row.description),
    severity: row.severity,
    location_name: String(row.location_name),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    photo_url: row.photo_url || undefined,
    photo_storage_key: row.photo_storage_key || undefined,
    verification_status: row.verification_status,
    ai_observation: row.ai_observation || undefined,
    admin_notes: row.admin_notes || undefined,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapHistory(row: any): ReportStatusHistory {
  return {
    id: String(row.id),
    report_id: String(row.report_id),
    previous_status: String(row.previous_status),
    new_status: String(row.new_status),
    changed_by: String(row.changed_by),
    changed_by_name: String(row.changed_by_name),
    changed_at: row.changed_at instanceof Date ? row.changed_at.toISOString() : String(row.changed_at),
    note: row.note || undefined,
  };
}

function mapAlert(row: any): Alert {
  return {
    id: String(row.id),
    title: String(row.title),
    severity: row.severity,
    location_name: String(row.location_name),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radius_km: Number(row.radius_km),
    source: row.source,
    status: row.status,
    affected_area: String(row.affected_area),
    recommended_action: String(row.recommended_action),
    report_id: row.report_id || undefined,
    evidenceSummary: row.evidenceSummary || undefined,
    authorityApprovalRequired: row.authorityApprovalRequired ?? false,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapAuditLog(row: any): AuditLog {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    action: String(row.action),
    target_resource: String(row.target_resource),
    details: String(row.details),
    timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : String(row.timestamp),
    ip: row.ip || undefined,
  };
}

class DatabaseEngine {
  private store: StoreData;
  private isLoaded: boolean = false;
  private isPostgresConnected: boolean = false;
  private pgPool: pg.Pool | null = null;
  private initPromise: Promise<void>;

  constructor() {
    this.store = getDefaultSeedData();
    this.init();
    this.initPromise = this.initPostgres();
  }

  public async ready(): Promise<void> {
    await this.initPromise;
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.citizen_reports) {
          this.store = parsed;
        }
      } else {
        this.save();
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn('File store init warning, using memory seed:', err);
    }
  }

  private async initPostgres() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return;
    }

    try {
      this.pgPool = new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 5000,
        ssl: databaseUrl.includes('neon.tech') || databaseUrl.includes('supabase') || databaseUrl.includes('sslmode=require')
          ? { rejectUnauthorized: false }
          : undefined,
      });

      // Verify connection
      await this.pgPool.query('SELECT 1');
      this.isPostgresConnected = true;
      console.log('[POSTGRES] Connected successfully to DATABASE_URL');

      // Create tables and indexes if they do not exist
      await this.createPostgresTables();

      // Hydrate or seed
      await this.syncWithPostgres();
    } catch (err: any) {
      this.isPostgresConnected = false;
      console.warn('[POSTGRES] Notice: Initial connection to DATABASE_URL deferred/failed, using local fallback:', err?.message || err);
    }
  }

  private async createPostgresTables() {
    if (!this.pgPool) return;

    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt VARCHAR(64) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL,
        organization VARCHAR(255),
        phone VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS citizen_reports (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        hazard_type VARCHAR(128) NOT NULL,
        description TEXT NOT NULL,
        severity VARCHAR(32) NOT NULL,
        location_name VARCHAR(255) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        photo_url TEXT,
        photo_storage_key TEXT,
        verification_status VARCHAR(32) NOT NULL,
        ai_observation TEXT,
        admin_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS report_status_history (
        id VARCHAR(64) PRIMARY KEY,
        report_id VARCHAR(64) NOT NULL,
        previous_status VARCHAR(32) NOT NULL,
        new_status VARCHAR(32) NOT NULL,
        changed_by VARCHAR(64) NOT NULL,
        changed_by_name VARCHAR(255) NOT NULL,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        note TEXT
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        severity VARCHAR(32) NOT NULL,
        location_name VARCHAR(255) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        radius_km DOUBLE PRECISION NOT NULL,
        source VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        affected_area TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        report_id VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        action VARCHAR(128) NOT NULL,
        target_resource VARCHAR(128) NOT NULL,
        details TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ip VARCHAR(64)
      );

      -- Required performance and relational lookup indexes
      CREATE INDEX IF NOT EXISTS idx_citizen_reports_user_id ON citizen_reports(user_id);
      CREATE INDEX IF NOT EXISTS idx_citizen_reports_created_at ON citizen_reports(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_citizen_reports_status ON citizen_reports(verification_status);
      CREATE INDEX IF NOT EXISTS idx_report_status_history_report_id ON report_status_history(report_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
      CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
    `);
  }

  private async syncWithPostgres() {
    if (!this.pgPool) return;

    try {
      const usersRes = await this.pgPool.query('SELECT COUNT(*) FROM users');
      const userCount = parseInt(usersRes.rows[0].count, 10);

      if (userCount === 0) {
        console.log('[POSTGRES] Seeding PostgreSQL database from initial store...');
        for (const u of this.store.users) {
          await this.pgPool.query(
            `INSERT INTO users (id, email, password_hash, salt, full_name, role, organization, phone, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
            [u.id, u.email, u.password_hash, u.salt, u.full_name, u.role, u.organization || null, u.phone || null, u.created_at]
          );
        }

        for (const r of this.store.citizen_reports) {
          await this.pgPool.query(
            `INSERT INTO citizen_reports (id, user_id, user_name, hazard_type, description, severity, location_name, latitude, longitude, photo_url, photo_storage_key, verification_status, ai_observation, admin_notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) ON CONFLICT (id) DO NOTHING`,
            [r.id, r.user_id, r.user_name, r.hazard_type, r.description, r.severity, r.location_name, r.latitude, r.longitude, r.photo_url || null, r.photo_storage_key || null, r.verification_status, r.ai_observation || null, r.admin_notes || null, r.created_at, r.updated_at]
          );
        }

        for (const h of this.store.report_status_history) {
          await this.pgPool.query(
            `INSERT INTO report_status_history (id, report_id, previous_status, new_status, changed_by, changed_by_name, changed_at, note)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
            [h.id, h.report_id, h.previous_status, h.new_status, h.changed_by, h.changed_by_name, h.changed_at, h.note || null]
          );
        }

        for (const a of this.store.alerts) {
          await this.pgPool.query(
            `INSERT INTO alerts (id, title, severity, location_name, latitude, longitude, radius_km, source, status, affected_area, recommended_action, report_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (id) DO NOTHING`,
            [a.id, a.title, a.severity, a.location_name, a.latitude, a.longitude, a.radius_km, a.source, a.status, a.affected_area, a.recommended_action, a.report_id || null, a.created_at, a.updated_at]
          );
        }
      } else {
        // Load authoritative data from PostgreSQL to keep memory store in sync
        const uRes = await this.pgPool.query('SELECT * FROM users');
        const rRes = await this.pgPool.query('SELECT * FROM citizen_reports ORDER BY created_at DESC');
        const hRes = await this.pgPool.query('SELECT * FROM report_status_history ORDER BY changed_at DESC');
        const aRes = await this.pgPool.query('SELECT * FROM alerts ORDER BY created_at DESC');
        const lRes = await this.pgPool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500');

        this.store.users = uRes.rows.map(mapUser);
        this.store.citizen_reports = rRes.rows.map(mapReport);
        this.store.report_status_history = hRes.rows.map(mapHistory);
        this.store.alerts = aRes.rows.map(mapAlert);
        this.store.audit_logs = lRes.rows.map(mapAuditLog);
        this.save();
        console.log(`[POSTGRES] Synchronized ${uRes.rowCount} users, ${rRes.rowCount} reports, ${aRes.rowCount} alerts from PostgreSQL.`);
      }
    } catch (err) {
      console.warn('[POSTGRES] Sync warning, retaining local store:', err);
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public getStatus() {
    return {
      connected: true,
      engine: this.isPostgresConnected
        ? 'PostgreSQL Relational Engine (Active DATABASE_URL Connected)'
        : process.env.DATABASE_URL
        ? 'PostgreSQL Engine (Connecting / Fallback Active)'
        : 'Resilient Persistent Storage (Local DB)',
      type: this.isPostgresConnected ? 'postgresql' : 'file_store',
      isPostgresActive: this.isPostgresConnected,
      tables: {
        users: this.store.users.length,
        citizen_reports: this.store.citizen_reports.length,
        report_status_history: this.store.report_status_history.length,
        alerts: this.store.alerts.length,
        audit_logs: this.store.audit_logs.length,
      },
      lastUpdated: new Date().toISOString()
    };
  }

  // User Operations
  public async findUserByEmail(email: string): Promise<User | undefined> {
    await this.ready();
    const cleanEmail = email.trim().toLowerCase();
    if (this.pgPool && this.isPostgresConnected) {
      try {
        const res = await this.pgPool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
        if (res.rows.length > 0) {
          const u = mapUser(res.rows[0]);
          const idx = this.store.users.findIndex(item => item.id === u.id);
          if (idx >= 0) this.store.users[idx] = u;
          else this.store.users.push(u);
          return u;
        }
        return undefined;
      } catch (err: any) {
        console.warn('[POSTGRES] findUserByEmail error:', err.message);
      }
    }
    return this.store.users.find(u => u.email.toLowerCase() === cleanEmail);
  }

  public async findUserById(id: string): Promise<User | undefined> {
    await this.ready();
    if (this.pgPool && this.isPostgresConnected) {
      try {
        const res = await this.pgPool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const u = mapUser(res.rows[0]);
          const idx = this.store.users.findIndex(item => item.id === u.id);
          if (idx >= 0) this.store.users[idx] = u;
          else this.store.users.push(u);
          return u;
        }
        return undefined;
      } catch (err: any) {
        console.warn('[POSTGRES] findUserById error:', err.message);
      }
    }
    return this.store.users.find(u => u.id === id);
  }

  public async createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
    await this.ready();
    const newUser: User = {
      ...user,
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
    };

    if (this.pgPool && this.isPostgresConnected) {
      await this.pgPool.query(
        `INSERT INTO users (id, email, password_hash, salt, full_name, role, organization, phone, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [newUser.id, newUser.email.trim(), newUser.password_hash, newUser.salt, newUser.full_name.trim(), newUser.role, newUser.organization || null, newUser.phone || null, newUser.created_at]
      );
    }

    this.store.users.push(newUser);
    this.save();
    return newUser;
  }

  // Citizen Reports Operations
  public async getAllReports(): Promise<CitizenReport[]> {
    await this.ready();
    if (this.pgPool && this.isPostgresConnected) {
      try {
        const res = await this.pgPool.query('SELECT * FROM citizen_reports ORDER BY created_at DESC');
        const list = res.rows.map(mapReport);
        this.store.citizen_reports = list;
        return list;
      } catch (err: any) {
        console.warn('[POSTGRES] getAllReports error:', err.message);
      }
    }
    return [...this.store.citizen_reports].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public async getReportById(id: string): Promise<CitizenReport | undefined> {
    await this.ready();
    if (this.pgPool && this.isPostgresConnected) {
      try {
        const res = await this.pgPool.query('SELECT * FROM citizen_reports WHERE id = $1', [id]);
        if (res.rows.length > 0) return mapReport(res.rows[0]);
      } catch (err: any) {
        console.warn('[POSTGRES] getReportById error:', err.message);
      }
    }
    return this.store.citizen_reports.find(r => r.id === id);
  }

  public async getReportsByUserId(userId: string): Promise<CitizenReport[]> {
    await this.ready();
    if (this.pgPool && this.isPostgresConnected) {
      try {
        const res = await this.pgPool.query('SELECT * FROM citizen_reports WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return res.rows.map(mapReport);
      } catch (err: any) {
        console.warn('[POSTGRES] getReportsByUserId error:', err.message);
      }
    }
    return this.store.citizen_reports
      .filter(r => r.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async createReport(data: Omit<CitizenReport, 'id' | 'verification_status' | 'created_at' | 'updated_at'>): Promise<CitizenReport> {
    await this.ready();
    const newReport: CitizenReport = {
      ...data,
      id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      verification_status: 'UNVERIFIED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this.pgPool && this.isPostgresConnected) {
      await this.pgPool.query(
        `INSERT INTO citizen_reports (id, user_id, user_name, hazard_type, description, severity, location_name, latitude, longitude, photo_url, photo_storage_key, verification_status, ai_observation, admin_notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [newReport.id, newReport.user_id, newReport.user_name, newReport.hazard_type, newReport.description, newReport.severity, newReport.location_name, newReport.latitude, newReport.longitude, newReport.photo_url || null, newReport.photo_storage_key || null, newReport.verification_status, newReport.ai_observation || null, newReport.admin_notes || null, newReport.created_at, newReport.updated_at]
      );
    }

    this.store.citizen_reports.unshift(newReport);
    this.save();
    return newReport;
  }

  public async updateReportStatus(
    reportId: string,
    newStatus: CitizenReport['verification_status'],
    adminUser: User,
    note?: string
  ): Promise<CitizenReport | null> {
    await this.ready();
    let currentReport = await this.getReportById(reportId);
    if (!currentReport) return null;

    const prevStatus = currentReport.verification_status;
    const updatedAt = new Date().toISOString();
    const adminNotes = note || currentReport.admin_notes;

    const historyEntry: ReportStatusHistory = {
      id: `rsh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      report_id: reportId,
      previous_status: prevStatus,
      new_status: newStatus,
      changed_by: adminUser.id,
      changed_by_name: adminUser.full_name,
      changed_at: updatedAt,
      note: note || undefined,
    };

    if (this.pgPool && this.isPostgresConnected) {
      await this.pgPool.query(
        `UPDATE citizen_reports SET verification_status = $1, admin_notes = $2, updated_at = $3 WHERE id = $4`,
        [newStatus, adminNotes || null, updatedAt, reportId]
      );

      await this.pgPool.query(
        `INSERT INTO report_status_history (id, report_id, previous_status, new_status, changed_by, changed_by_name, changed_at, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [historyEntry.id, historyEntry.report_id, historyEntry.previous_status, historyEntry.new_status, historyEntry.changed_by, historyEntry.changed_by_name, historyEntry.changed_at, historyEntry.note || null]
      );
    }

    currentReport.verification_status = newStatus;
    currentReport.updated_at = updatedAt;
    if (adminNotes) currentReport.admin_notes = adminNotes;
    this.store.report_status_history.unshift(historyEntry);

    // Add audit log
    await this.addAuditLog({
      user_id: adminUser.id,
      action: 'UPDATE_REPORT_STATUS',
      target_resource: reportId,
      details: `Status changed from ${prevStatus} to ${newStatus}. Note: ${note || 'None'}`
    });

    this.save();
    return currentReport;
  }

  public async updateReportAiObservation(reportId: string, observation: string): Promise<CitizenReport | null> {
    await this.ready();
    const updatedAt = new Date().toISOString();
    if (this.pgPool && this.isPostgresConnected) {
      await this.pgPool.query(
        `UPDATE citizen_reports SET ai_observation = $1, updated_at = $2 WHERE id = $3`,
        [observation, updatedAt, reportId]
      );
    }

    const report = this.store.citizen_reports.find(r => r.id === reportId);
    if (report) {
      report.ai_observation = observation;
      report.updated_at = updatedAt;
      this.save();
    }
    return report || null;
  }

  public async getReportStatusHistory(reportId: string): Promise<ReportStatusHistory[]> {
    await this.ready();
    if (this.pgPool && this.isPostgresConnected) {
      try {
        const res = await this.pgPool.query('SELECT * FROM report_status_history WHERE report_id = $1 ORDER BY changed_at DESC', [reportId]);
        return res.rows.map(mapHistory);
      } catch (err: any) {
        console.warn('[POSTGRES] getReportStatusHistory error:', err.message);
      }
    }
    return this.store.report_status_history
      .filter(h => h.report_id === reportId)
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  }

  // Alerts Operations
  public async getAllAlerts(): Promise<Alert[]> {
    await this.ready();
    if (this.pgPool && this.isPostgresConnected) {
      try {
        const res = await this.pgPool.query('SELECT * FROM alerts ORDER BY created_at DESC');
        const list = res.rows.map(mapAlert);
        this.store.alerts = list;
        return list;
      } catch (err: any) {
        console.warn('[POSTGRES] getAllAlerts error:', err.message);
      }
    }
    return [...this.store.alerts].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public async createAlert(data: Omit<Alert, 'id' | 'created_at' | 'updated_at'>): Promise<Alert> {
    await this.ready();
    const newAlert: Alert = {
      ...data,
      id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this.pgPool && this.isPostgresConnected) {
      await this.pgPool.query(
        `INSERT INTO alerts (id, title, severity, location_name, latitude, longitude, radius_km, source, status, affected_area, recommended_action, report_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [newAlert.id, newAlert.title, newAlert.severity, newAlert.location_name, newAlert.latitude, newAlert.longitude, newAlert.radius_km, newAlert.source, newAlert.status, newAlert.affected_area, newAlert.recommended_action, newAlert.report_id || null, newAlert.created_at, newAlert.updated_at]
      );
    }

    this.store.alerts.unshift(newAlert);
    this.save();
    return newAlert;
  }

  public async resolveAlert(alertId: string, adminUserId: string): Promise<Alert | null> {
    await this.ready();
    const updatedAt = new Date().toISOString();
    if (this.pgPool && this.isPostgresConnected) {
      await this.pgPool.query(
        `UPDATE alerts SET status = 'RESOLVED', updated_at = $1 WHERE id = $2`,
        [updatedAt, alertId]
      );
    }

    const alert = this.store.alerts.find(a => a.id === alertId);
    if (!alert) return null;
    alert.status = 'RESOLVED';
    alert.updated_at = updatedAt;

    await this.addAuditLog({
      user_id: adminUserId,
      action: 'RESOLVE_ALERT',
      target_resource: alertId,
      details: `Alert '${alert.title}' resolved by administrator`
    });

    this.save();
    return alert;
  }

  public async getPendingAlerts(): Promise<Alert[]> {
    await this.ready();
    const all = await this.getAllAlerts();
    return all.filter(a => a.status === 'PENDING_APPROVAL');
  }

  public async approveAlert(alertId: string, adminUser: User): Promise<Alert | null> {
    await this.ready();
    const alert = this.store.alerts.find(a => a.id === alertId);
    if (!alert) return null;

    const updatedAt = new Date().toISOString();
    alert.status = 'ACTIVE';
    alert.updated_at = updatedAt;
    alert.authorityApprovalRequired = false;

    if (this.pgPool && this.isPostgresConnected) {
      await this.pgPool.query(
        `UPDATE alerts SET status = 'ACTIVE', updated_at = $1 WHERE id = $2`,
        [updatedAt, alertId]
      );
    }

    await this.addAuditLog({
      user_id: adminUser.id,
      action: 'APPROVE_ALERT_BROADCAST',
      target_resource: alertId,
      details: `Human verification sign-off: Approved & Broadcast '${alert.title}' to regional emergency dispatch.`
    });

    this.save();
    return alert;
  }

  public async rejectAlert(alertId: string, adminUser: User, reason?: string): Promise<boolean> {
    await this.ready();
    const idx = this.store.alerts.findIndex(a => a.id === alertId);
    if (idx === -1) return false;

    const alertTitle = this.store.alerts[idx].title;
    this.store.alerts.splice(idx, 1);

    if (this.pgPool && this.isPostgresConnected) {
      await this.pgPool.query(`DELETE FROM alerts WHERE id = $1`, [alertId]);
    }

    await this.addAuditLog({
      user_id: adminUser.id,
      action: 'REJECT_ALERT_DRAFT',
      target_resource: alertId,
      details: `Draft alert rejected by authority to prevent false alarm: '${alertTitle}'. Reason: ${reason || 'False alarm / Inconclusive satellite deformation'}`
    });

    this.save();
    return true;
  }

  // Audit Logs
  public async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    await this.ready();
    const entry: AuditLog = {
      ...log,
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.store.audit_logs.unshift(entry);
    if (this.store.audit_logs.length > 500) {
      this.store.audit_logs.pop();
    }
    this.save();

    if (this.pgPool && this.isPostgresConnected) {
      try {
        await this.pgPool.query(
          `INSERT INTO audit_logs (id, user_id, action, target_resource, details, timestamp, ip)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [entry.id, entry.user_id, entry.action, entry.target_resource, entry.details, entry.timestamp, entry.ip || null]
        );
      } catch (e: any) {
        console.warn('[POSTGRES] audit log write warning:', e.message);
      }
    }
  }

  public async getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    await this.ready();
    if (this.pgPool && this.isPostgresConnected) {
      try {
        const res = await this.pgPool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1', [limit]);
        return res.rows.map(mapAuditLog);
      } catch (err: any) {
        console.warn('[POSTGRES] getAuditLogs error:', err.message);
      }
    }
    return this.store.audit_logs.slice(0, limit);
  }
}

export const db = new DatabaseEngine();
