/**
 * Citizen Hazard Incident Report Modal
 * Features dedicated camera button (capture="environment"), manual file upload, client-side validation,
 * image preview, coordinates autofill, and server submission.
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  MapPin,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle,
  Loader2,
  Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { LocationPoint } from '../types';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocation: LocationPoint | null;
  onReportSubmitted: () => void;
  onOpenAuthModal: () => void;
}

export const CitizenReportModal: React.FC<CitizenReportModalProps> = ({
  isOpen,
  onClose,
  defaultLocation,
  onReportSubmitted,
  onOpenAuthModal,
}) => {
  const { user } = useAuth();
  const { queueOfflineReport, isOnline } = useOfflineSync();

  const [hazardType, setHazardType] = useState('Debris Flow / Mudslide');
  const [severity, setSeverity] = useState<'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [locationName, setLocationName] = useState(defaultLocation ? `${defaultLocation.name}, ${defaultLocation.district}` : '');
  const [latitude, setLatitude] = useState(defaultLocation ? String(defaultLocation.latitude) : '25.6747');
  const [longitude, setLongitude] = useState(defaultLocation ? String(defaultLocation.longitude) : '94.1105');
  const [description, setDescription] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelection = (file: File | undefined) => {
    setValidationError(null);
    if (!file) return;

    // MIME type check
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      setValidationError('Please select a valid image (JPEG, PNG, WEBP).');
      return;
    }

    // Size limit check (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setValidationError('File size exceeds the 10MB limit.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUseDeviceLocation = () => {
    if (!navigator.geolocation) {
      setValidationError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLatitude(lat.toFixed(5));
        setLongitude(lon.toFixed(5));
        try {
          const rev = await api.reverseGeocode(lat, lon);
          setLocationName(rev.name ? `${rev.name}, ${rev.district}` : `${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`);
        } catch {
          setLocationName(`GPS: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
        }
      },
      (err) => {
        setValidationError(`GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!user) {
      onOpenAuthModal();
      return;
    }

    if (!locationName.trim() || !description.trim()) {
      setValidationError('Location name and detailed description are required.');
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
      setValidationError('Valid numeric coordinates are required.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user || user;

      const payload = {
        user_id: currentUser?.id ?? null,
        reporter_name: currentUser?.full_name || 'Field Observer',
        reporter_email: currentUser?.email || 'citizen@ner.gov.in',
        title: `${hazardType} near ${locationName.trim() || 'Corridor'}`,
        issue_type: hazardType,
        hazard_type: hazardType,
        description: description.trim(),
        location_name: locationName.trim() || 'Kohima - NH-29 Ghat',
        latitude: lat,
        longitude: lon,
        corridor_chainage: 'NH-29 Corridor',
        severity: severity || 'HIGH',
        status: 'PENDING',
        verification_status: 'UNVERIFIED',
        created_at: new Date().toISOString()
      };

      // Check online status
      if (!isOnline || !navigator.onLine) {
        let photoBase64: string | undefined = undefined;
        if (selectedFile) {
          photoBase64 = await fileToBase64(selectedFile);
        }
        await queueOfflineReport({
          hazard_type: hazardType,
          severity,
          location_name: locationName.trim(),
          latitude: lat,
          longitude: lon,
          description: description.trim(),
          photoBase64: photoBase64,
          photoFileName: selectedFile?.name
        });

        setSuccessMessage('Offline Mode: Report stored in IndexedDB. Will sync when reconnected.');
        setTimeout(() => {
          onReportSubmitted();
          onClose();
        }, 1500);
        return;
      }

      // Online submission to Supabase & Live Ingestion Core
      const reportPayload = {
        user_id: currentUser ? currentUser.id : null,
        reporter_name: currentUser?.full_name || 'Field Observer',
        reporter_email: currentUser?.email || 'citizen@ner.gov.in',
        title: `${hazardType} at ${locationName.trim() || 'Field Sector'}`,
        issue_type: hazardType,
        hazard_type: hazardType,
        severity: severity || 'HIGH',
        location_name: locationName.trim() || 'Kohima - NH-29 Ghat',
        latitude: lat,
        longitude: lon,
        corridor_chainage: 'NH-29 Corridor',
        description: description.trim(),
        status: 'PENDING',
        verification_status: 'UNVERIFIED',
        created_at: new Date().toISOString()
      };

      try {
        const { error: sbError } = await supabase
          .from('reports')
          .insert([reportPayload])
          .select();
        if (sbError) {
          console.warn('Direct Supabase insert notification:', sbError.message);
        }
      } catch (insertErr) {
        console.warn('Supabase insert exception:', insertErr);
      }

      const formData = new FormData();
      formData.append('hazard_type', hazardType);
      formData.append('severity', severity);
      formData.append('location_name', locationName.trim());
      formData.append('latitude', String(lat));
      formData.append('longitude', String(lon));
      formData.append('description', description.trim());
      formData.append('user_id', currentUser?.id || 'usr_local');
      formData.append('reporter_name', currentUser?.full_name || 'Field Observer');
      formData.append('reporter_email', currentUser?.email || 'citizen@ner.gov.in');

      if (selectedFile) {
        formData.append('photo', selectedFile);
      }

      await api.submitReport(formData);

      setSuccessMessage('Report submitted successfully to DDMA Verification Queue.');
      setTimeout(() => {
        onReportSubmitted();
        onClose();
      }, 1000);
    } catch (err: any) {
      setValidationError(err.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 text-slate-800 shadow-xl relative my-8">
        <button
          id="btn-close-report-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Log Citizen Field Incident</h2>
            <p className="text-xs text-slate-500">Reports are tagged with coordinates and routed to district analysts.</p>
          </div>
        </div>

        {/* Auth notice if guest */}
        {!user && (
          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">You must be signed in to submit field observations.</span>
            <button
              onClick={onOpenAuthModal}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition cursor-pointer shadow-2xs"
            >
              Sign In
            </button>
          </div>
        )}

        {successMessage ? (
          <div className="my-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {validationError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Photo Capture Controls: Mobile Camera vs Manual Upload */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                INCIDENT PHOTO EVIDENCE (MAX 10MB)
              </label>

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                id="input-camera-file"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileSelection(e.target.files?.[0])}
              />
              <input
                ref={fileInputRef}
                id="input-manual-file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelection(e.target.files?.[0])}
              />

              <div className="grid grid-cols-2 gap-3">
                {/* Dedicated Mobile Camera Button */}
                <button
                  type="button"
                  id="btn-trigger-camera"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-slate-300 hover:border-indigo-500 hover:bg-slate-100/80 text-slate-800 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Open Mobile Camera</span>
                </button>

                {/* Dedicated Manual File Upload Button */}
                <button
                  type="button"
                  id="btn-trigger-file-upload"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-slate-300 hover:border-slate-400 hover:bg-slate-100/80 text-slate-800 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Browse Device Files</span>
                </button>
              </div>

              {/* Image Preview */}
              {previewUrl && (
                <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-900">
                  <img src={previewUrl} alt="Report preview" className="w-full h-44 object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/70 text-[10px] text-slate-200 font-mono">
                    {selectedFile?.name} ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                  </div>
                </div>
              )}
            </div>

            {/* Hazard Type & Severity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">HAZARD TYPE</label>
                <select
                  id="select-hazard-type"
                  value={hazardType}
                  onChange={(e) => setHazardType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Debris Flow / Mudslide">Debris Flow / Mudslide</option>
                  <option value="Rockfall / Boulder Detachment">Rockfall / Boulder Detachment</option>
                  <option value="Slope Tension Cracks">Slope Tension Cracks</option>
                  <option value="Road Shoulder Subsidence">Road Shoulder Subsidence</option>
                  <option value="Colluvium Slump">Colluvium Slump</option>
                  <option value="Catchwater Drain Blockage">Catchwater Drain Blockage</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">SEVERITY</label>
                <select
                  id="select-hazard-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="LOW">LOW (Localized)</option>
                  <option value="MODERATE">MODERATE (Caution)</option>
                  <option value="HIGH">HIGH (Impending Slip)</option>
                  <option value="CRITICAL">CRITICAL (Active Blockage)</option>
                </select>
              </div>
            </div>

            {/* Location & GPS Autofill */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">LOCATION NAME & ROAD SECTOR</label>
                <button
                  type="button"
                  id="btn-use-gps"
                  onClick={handleUseDeviceLocation}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Use Device GPS</span>
                </button>
              </div>
              <input
                id="input-report-location-name"
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. NH-58 Mile 34 near Pipalkoti"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* Latitude / Longitude */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono font-medium text-slate-500 block mb-1">LATITUDE (°N)</label>
                <input
                  id="input-report-latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-medium text-slate-500 block mb-1">LONGITUDE (°E)</label>
                <input
                  id="input-report-longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">DETAILED OBSERVATION</label>
              <textarea
                id="textarea-report-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe visible ground cracking, water seepage, tree tilting, or boulders on carriage way..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                id="btn-cancel-report"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-submit-report"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Logging Report...</span>
                  </>
                ) : (
                  <span>Submit Field Report</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
