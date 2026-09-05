/**
 * Admin Dashboard & Verification Control Center
 * Accessible only to users with role ADMIN.
 * Verification queue, photo inspection, AI assessment, audit trail, alert management, and system health.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  Activity,
  Server,
  Layers,
  Search,
  Filter,
  Eye,
  Send,
  Plus,
  RotateCcw,
  Bot
} from 'lucide-react';
import { CitizenReport, ReportStatusHistory, Alert, AnalyticsData, SystemHealthData } from '../types';
import { api } from '../services/api';

interface AdminDashboardProps {
  reports: CitizenReport[];
  alerts: Alert[];
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  reports,
  alerts,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'pending_gate' | 'alerts' | 'analytics' | 'health'>('pending_gate');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);
  const [statusHistory, setStatusHistory] = useState<ReportStatusHistory[]>([]);
  const [reviewNote, setReviewNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Human Verification Gate (Pending Alerts) State
  const [pendingAlerts, setPendingAlerts] = useState<Alert[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // New Alert Form state
  const [showNewAlertModal, setShowNewAlertModal] = useState(false);
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertSeverity, setNewAlertSeverity] = useState<'ADVISORY' | 'WARNING' | 'CRITICAL'>('WARNING');
  const [newAlertLocation, setNewAlertLocation] = useState('NH-29 Kohima Ghat Section, Nagaland');
  const [newAlertLat, setNewAlertLat] = useState('25.6747');
  const [newAlertLon, setNewAlertLon] = useState('94.1105');
  const [newAlertArea, setNewAlertArea] = useState('Chainage KM 14–22 vulnerable ghat slopes');
  const [newAlertAction, setNewAlertAction] = useState('Divert heavy freight via alternative corridor and issue local evacuation notice.');

  // Telemetry & Analytics
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [health, setHealth] = useState<SystemHealthData | null>(null);

  const loadPendingAlerts = async () => {
    setPendingLoading(true);
    try {
      const res = await api.getPendingAlerts();
      setPendingAlerts(res.pendingAlerts);
    } catch (err) {
      console.error('Failed to load pending alerts:', err);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [aData, hData] = await Promise.all([
          api.getAdminAnalytics(),
          api.getAdminSystemHealth()
        ]);
        setAnalytics(aData);
        setHealth(hData);
      } catch (err) {
        console.error('Failed to load admin analytics:', err);
      }
    }
    loadAdminData();
    loadPendingAlerts();
  }, [reports, alerts]);

  // Load history when a report is selected
  useEffect(() => {
    if (selectedReport) {
      api.getReportStatusHistory(selectedReport.id)
        .then(res => setStatusHistory(res.history))
        .catch(err => console.error('Failed to fetch status history:', err));
    } else {
      setStatusHistory([]);
    }
  }, [selectedReport]);

  const handleApprovePendingAlert = async (alertId: string) => {
    try {
      await api.approveAlert(alertId);
      await loadPendingAlerts();
      onRefreshData();
    } catch (err) {
      console.error('Failed to approve alert:', err);
    }
  };

  const handleRejectPendingAlert = async (alertId: string) => {
    try {
      await api.rejectAlert(alertId);
      await loadPendingAlerts();
      onRefreshData();
    } catch (err) {
      console.error('Failed to reject alert:', err);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      const res = await api.updateReportStatus(selectedReport.id, newStatus, reviewNote);
      setSelectedReport(res.report);
      setStatusHistory(res.history);
      setReviewNote('');
      onRefreshData();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerAiObserve = async (reportId: string) => {
    try {
      const res = await api.triggerAiObserve(reportId);
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport({ ...selectedReport, ai_observation: res.observation });
      }
      onRefreshData();
    } catch (err) {
      console.error('Failed to trigger AI observe:', err);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAlert({
        title: newAlertTitle,
        severity: newAlertSeverity,
        location_name: newAlertLocation,
        latitude: parseFloat(newAlertLat),
        longitude: parseFloat(newAlertLon),
        affected_area: newAlertArea,
        recommended_action: newAlertAction,
        source: 'ADMIN'
      });
      setShowNewAlertModal(false);
      setNewAlertTitle('');
      onRefreshData();
    } catch (err) {
      console.error('Failed to create alert:', err);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.resolveAlert(alertId);
      onRefreshData();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const filteredReports = statusFilter === 'ALL'
    ? reports
    : reports.filter(r => r.verification_status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Disaster Authority Command & Verification Console</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 uppercase font-bold">
                AUTHORIZED NDMA / GSI ROLE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and verify citizen submissions, sign off on pending alerts, and audit system integrity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/80 flex-wrap">
          {/* Human Verification Gate Tab */}
          <button
            id="btn-admin-tab-pending-gate"
            onClick={() => setActiveTab('pending_gate')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition cursor-pointer ${
              activeTab === 'pending_gate' ? 'bg-rose-600 text-white shadow-xs font-bold' : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>Human Gate (Pending)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'pending_gate' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-800'
            }`}>
              {pendingAlerts.length}
            </span>
          </button>

          <button
            id="btn-admin-tab-queue"
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition cursor-pointer ${
              activeTab === 'queue' ? 'bg-indigo-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            Verification Queue ({reports.filter(r => r.verification_status === 'UNVERIFIED' || r.verification_status === 'UNDER REVIEW').length})
          </button>
          <button
            id="btn-admin-tab-alerts"
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition cursor-pointer ${
              activeTab === 'alerts' ? 'bg-indigo-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            Broadcasted ({alerts.length})
          </button>
          <button
            id="btn-admin-tab-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition cursor-pointer ${
              activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            Analytics
          </button>
          <button
            id="btn-admin-tab-health"
            onClick={() => setActiveTab('health')}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition cursor-pointer ${
              activeTab === 'health' ? 'bg-indigo-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            System Health
          </button>
        </div>
      </div>

      {/* TAB: HUMAN VERIFICATION GATE (/admin/alerts/pending) */}
      {activeTab === 'pending_gate' && (
        <div className="bg-white border-2 border-rose-200 rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Human Verification Gate & Authority Sign-Off (/admin/alerts/pending)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Draft CRITICAL and WARNING alerts waiting for official authority sign-off before broadcast to citizens, preventing automated false-alarm panic.
              </p>
            </div>

            <button
              onClick={() => loadPendingAlerts()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Draft Queue</span>
            </button>
          </div>

          {pendingLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Loading pending drafts from verification gate...
            </div>
          ) : pendingAlerts.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
              <div className="font-bold text-slate-800">All Clear: No Pending Draft Alerts</div>
              <p className="text-slate-500">Every algorithmic trigger is either signed off or below human intervention threshold.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingAlerts.map((draft) => (
                <div
                  key={draft.id}
                  className="bg-white border-2 border-amber-300/80 rounded-xl p-5 text-xs space-y-3.5 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          draft.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          DRAFT {draft.severity}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                          {draft.source}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(draft.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{draft.title}</h3>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Sector: <strong className="text-slate-700">{draft.location_name}</strong> &bull; {draft.affected_area}
                    </div>

                    {/* Rationale / Grounding */}
                    <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-lg text-amber-900 text-[11px] leading-relaxed">
                      <strong className="block text-[10px] uppercase font-bold text-amber-800 tracking-wider mb-0.5">
                        ALGORITHMIC TRIGGER REASONING:
                      </strong>
                      {draft.recommended_action}
                    </div>
                  </div>

                  {/* Sign-off Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      Requires NDMA sign-off
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        id={`btn-reject-alert-${draft.id}`}
                        onClick={() => handleRejectPendingAlert(draft.id)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs transition cursor-pointer"
                      >
                        Reject Draft
                      </button>
                      <button
                        id={`btn-approve-alert-${draft.id}`}
                        onClick={() => handleApprovePendingAlert(draft.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve & Broadcast</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: VERIFICATION QUEUE */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Queue List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Citizen Field Submissions</h2>
                <p className="text-xs text-slate-500">All submissions default to UNVERIFIED until official sign-off.</p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="select-admin-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Statuses ({reports.length})</option>
                  <option value="UNVERIFIED">Unverified Only</option>
                  <option value="UNDER REVIEW">Under Review Only</option>
                  <option value="VERIFIED">Verified Only</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No incident reports match the current filter.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredReports.map((report) => {
                  const isSelected = selectedReport?.id === report.id;
                  return (
                    <div
                      key={report.id}
                      id={`report-item-${report.id}`}
                      onClick={() => setSelectedReport(report)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-3 ${
                        isSelected
                          ? 'bg-indigo-50/50 border-indigo-400 shadow-xs ring-1 ring-indigo-400/50'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                      }`}
                    >
                      {report.photo_url ? (
                        <img
                          src={report.photo_url}
                          alt="Report thumbnail"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px] shrink-0 font-medium">
                          No Photo
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 truncate">{report.hazard_type}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            report.verification_status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : report.verification_status === 'UNDER REVIEW'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : report.verification_status === 'REJECTED'
                              ? 'bg-slate-100 text-slate-500 border border-slate-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {report.verification_status}
                          </span>
                        </div>

                        <div className="text-slate-500 text-[11px] truncate">{report.location_name}</div>
                        <p className="text-slate-700 text-[11px] mt-1 line-clamp-1">{report.description}</p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-100">
                          <span>Reporter: <strong className="text-slate-600 font-medium">{report.user_name}</strong></span>
                          <span className="font-mono">{new Date(report.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Verification Detail & Action Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            {selectedReport ? (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-indigo-600 font-bold">INCIDENT DOSSIER</span>
                    <span className="text-[10px] font-mono text-slate-400">ID: {selectedReport.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{selectedReport.hazard_type}</h3>
                  <div className="text-xs text-slate-500">{selectedReport.location_name}</div>
                </div>

                {/* Photo View */}
                {selectedReport.photo_url && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 mb-1">FIELD IMAGERY:</div>
                    <img
                      src={selectedReport.photo_url}
                      alt="Incident Photo"
                      className="w-full max-h-56 object-cover rounded-lg border border-slate-200 shadow-2xs"
                    />
                  </div>
                )}

                {/* AI Photo Observation */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                      <Bot className="w-4 h-4 text-indigo-600" />
                      <span>AI Photo Observation</span>
                    </div>
                    {!selectedReport.ai_observation && selectedReport.photo_url && (
                      <button
                        onClick={() => handleTriggerAiObserve(selectedReport.id)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                      >
                        Inspect with AI
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-slate-700 font-mono leading-relaxed">
                    {selectedReport.ai_observation || 'Observation pending physical inspection.'}
                  </div>
                </div>

                {/* Description & Metadata */}
                <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700">
                  <div className="text-slate-500 font-medium">Citizen Description:</div>
                  <div className="text-slate-800">{selectedReport.description}</div>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-200 flex justify-between">
                    <span>Coords: {selectedReport.latitude.toFixed(4)}°N, {selectedReport.longitude.toFixed(4)}°E</span>
                    <span>Severity: <strong className="text-slate-700">{selectedReport.severity}</strong></span>
                  </div>
                </div>

                {/* Action Buttons: Status Transition */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="text-xs font-bold text-slate-700">TRANSITION VERIFICATION STATE:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="btn-admin-verify"
                      onClick={() => handleUpdateStatus('VERIFIED')}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Verify Report</span>
                    </button>
                    <button
                      id="btn-admin-under-review"
                      onClick={() => handleUpdateStatus('UNDER REVIEW')}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Mark Under Review</span>
                    </button>
                    <button
                      id="btn-admin-reject"
                      onClick={() => handleUpdateStatus('REJECTED')}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Reject (False Report)</span>
                    </button>
                    <button
                      id="btn-admin-resolve"
                      onClick={() => handleUpdateStatus('RESOLVED')}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mark Cleared</span>
                    </button>
                  </div>

                  {/* Review Note */}
                  <div className="pt-2">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      OFFICIAL AUDIT NOTE (RECORDED IN AUDIT LOG)
                    </label>
                    <input
                      id="input-admin-review-note"
                      type="text"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="e.g. Field team dispatched; heavy boulder removed by BRO."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Audit Status History */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    STATUS AUDIT TRAIL
                  </div>
                  {statusHistory.length === 0 ? (
                    <div className="text-[11px] text-slate-400">Initial submission record. No subsequent status transitions.</div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {statusHistory.map((h) => (
                        <div key={h.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-0.5 shadow-2xs">
                          <div className="flex justify-between font-mono text-slate-600">
                            <span>{h.previous_status} &rarr; <strong className="text-indigo-600">{h.new_status}</strong></span>
                            <span className="text-slate-400">{new Date(h.changed_at).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-slate-800 font-medium">By: {h.changed_by_name}</div>
                          {h.note && <div className="text-slate-500 italic">"{h.note}"</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400 text-xs">
                Select an incident report from the queue to inspect photos, AI assessment, and take verification action.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ALERTS MANAGEMENT */}
      {activeTab === 'alerts' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Emergency Warning & Advisory Broadcasting</h2>
              <p className="text-xs text-slate-500">Publish high-priority alerts to the public map and response network.</p>
            </div>
            <button
              id="btn-admin-publish-alert"
              onClick={() => setShowNewAlertModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Broadcast New Alert</span>
            </button>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-2xs"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{alert.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      alert.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {alert.status}
                    </span>
                  </div>
                  <div className="text-slate-500">{alert.location_name} &bull; {alert.affected_area}</div>
                  <div className="text-slate-700 mt-1">
                    <strong className="text-slate-900">Recommended Action:</strong> {alert.recommended_action}
                  </div>
                </div>

                {alert.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium shadow-2xs transition cursor-pointer"
                  >
                    Resolve Alert
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ANALYTICS */}
      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <span className="text-xs text-slate-500 uppercase font-mono font-semibold">TOTAL FIELD INCIDENTS</span>
            <div className="text-3xl font-bold font-mono text-slate-900 mt-1">{analytics.totalReports}</div>
            <div className="text-xs text-slate-600 mt-2 space-y-0.5">
              <div>Verified: <strong className="text-emerald-700">{analytics.reportsByStatus.verified}</strong></div>
              <div>Under Review: <strong className="text-blue-700">{analytics.reportsByStatus.underReview}</strong></div>
              <div>Unverified: <strong className="text-amber-700">{analytics.reportsByStatus.unverified}</strong></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <span className="text-xs text-slate-500 uppercase font-mono font-semibold">ACTIVE EMERGENCY ALERTS</span>
            <div className="text-3xl font-bold font-mono text-slate-900 mt-1">{analytics.totalAlerts}</div>
            <div className="text-xs text-slate-600 mt-2 space-y-0.5">
              <div>Critical: <strong className="text-rose-700">{analytics.alertsBySeverity.critical}</strong></div>
              <div>Warning: <strong className="text-amber-700">{analytics.alertsBySeverity.warning}</strong></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <span className="text-xs text-slate-500 uppercase font-mono font-semibold">CRITICAL HIGHWAYS MONITORED</span>
            <div className="text-3xl font-bold font-mono text-slate-900 mt-1">{analytics.criticalHighwaysMonitored}</div>
            <div className="text-xs text-slate-500 mt-2 leading-relaxed">
              NH-58, NH-10, NH-5, NH-44, NH-85 corridors under active telemetry.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <span className="text-xs text-slate-500 uppercase font-mono font-semibold">AUTHORITATIVE EVIDENCE RAG</span>
            <div className="text-3xl font-bold font-mono text-slate-900 mt-1">{analytics.authoritativeEvidenceDocs}</div>
            <div className="text-xs text-slate-500 mt-2 leading-relaxed">
              Peer-reviewed GSI, NDMA & ISRO disaster guidance publications.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM HEALTH & AUDIT TELEMETRY */}
      {activeTab === 'health' && health && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-600" />
                <span>System Health & Infrastructure Telemetry</span>
              </h2>
              <p className="text-xs text-slate-500">Live operational diagnostics across database, storage, and models.</p>
            </div>
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              STATE: {health.systemState}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(health.components).map(([key, comp]: any) => (
              <div key={key} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{comp.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {comp.status}
                  </span>
                </div>
                {comp.engine && <div className="text-slate-500">Engine: {comp.engine}</div>}
                {comp.mode && <div className="text-slate-500">Mode: {comp.mode}</div>}
                {comp.interval && <div className="text-slate-500">Query Frequency: {comp.interval}</div>}
                {comp.note && (
                  <div className="text-amber-800 bg-amber-50/80 p-2 rounded-lg border border-amber-200 mt-1 text-[11px] leading-tight">
                    {comp.note}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Audit Logs */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">RECENT ADMIN AUDIT LOGS:</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {health.auditLogsRecent.map((log) => (
                <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between text-slate-700 shadow-2xs">
                  <span><strong className="text-slate-900">{log.action}</strong> on <code className="text-indigo-600 font-semibold">{log.target_resource}</code> - {log.details}</span>
                  <span className="text-slate-400 font-mono text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Alert Modal */}
      {showNewAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-xl relative">
            <h3 className="text-base font-bold text-slate-900 mb-3">Broadcast Emergency Landslide Alert</h3>
            <form onSubmit={handleCreateAlert} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">ALERT HEADLINE</label>
                <input
                  type="text"
                  value={newAlertTitle}
                  onChange={(e) => setNewAlertTitle(e.target.value)}
                  placeholder="e.g. Flash Rockfall Advisory on NH-58"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">SEVERITY</label>
                  <select
                    value={newAlertSeverity}
                    onChange={(e) => setNewAlertSeverity(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ADVISORY">ADVISORY (Watch)</option>
                    <option value="WARNING">WARNING (Elevated)</option>
                    <option value="CRITICAL">CRITICAL (Immediate Action)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">TARGET LOCATION</label>
                  <input
                    type="text"
                    value={newAlertLocation}
                    onChange={(e) => setNewAlertLocation(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">AFFECTED AREA & KM RADIUS</label>
                <input
                  type="text"
                  value={newAlertArea}
                  onChange={(e) => setNewAlertArea(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">MANDATORY PROTOCOL ACTION</label>
                <textarea
                  rows={2}
                  value={newAlertAction}
                  onChange={(e) => setNewAlertAction(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewAlertModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs transition cursor-pointer"
                >
                  Publish Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
