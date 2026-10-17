import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  User,
  Phone,
  Mail,
  Award,
  Scale,
  Ruler,
  Droplets,
  Save,
  Loader2,
  ArrowLeft,
  WifiOff,
  UploadCloud,
  Trash2,
  Wifi,
  Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import offlineBuffer from "../../services/offlineBuffer";
import { gameService } from "../../services/gameService";
import LightingSettings from "../../components/common/LightingSettings";

function PatientSetting() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    degree: "",
    patientDetails: {
      weight: "",
      height: "",
      blood: "",
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [offlineSessions, setOfflineSessions] = useState([]);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [isSyncingId, setIsSyncingId] = useState(null);

  useEffect(() => {
    fetchProfileDetails();
  }, []);

  async function fetchProfileDetails() {
    try {
      const res = await api.get("/users/get-user-details");
      if (res.data.success) {
        const u = res.data.user;
        setFormData({
          name: u.name || "",
          phone: u.phone || "",
          email: u.email || "",
          degree: u.degree || "",
          patientDetails: {
            weight: u.patientDetails?.weight || "",
            height: u.patientDetails?.height || "",
            blood: u.patientDetails?.blood || "",
          },
        });
      } else {
        setError("Failed to load profile details.");
      }
    } catch (err) {
      setError("Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    if (name.startsWith("pd_")) {
      const field = name.replace("pd_", "");
      setFormData((prev) => ({
        ...prev,
        patientDetails: { ...prev.patientDetails, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.put("/users/user-details", formData);
      if (res.data.success) {
        setSuccess("Profile updated successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Failed to update profile.");
      }
    } catch (err) {
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary-500 w-8 h-8" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/patient/dashboard")}
          className="mr-4 p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-500">
            Manage your profile and health metrics
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 px-4 py-3 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-emerald-950/40 border border-green-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-2xl text-sm font-medium">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Personal Information */}
          <div className="premium-card p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              Personal Information
            </h2>

            <div className="space-y-5">
              <InputGroup
                label="Full Name"
                icon={<User size={18} />}
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
              />
              <InputGroup
                label="Email Address"
                icon={<Mail size={18} />}
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                type="email"
              />
              <InputGroup
                label="Phone Number"
                icon={<Phone size={18} />}
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 234 567 890"
              />
              <InputGroup
                label="Occupation/Degree"
                icon={<Award size={18} />}
                name="degree"
                value={formData.degree}
                onChange={handleChange}
                placeholder="Student / Professional"
              />
            </div>
          </div>

          {/* Health Metrics */}
          <div className="premium-card p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Scale className="w-5 h-5 text-secondary-500" />
              Health Metrics
            </h2>

            <div className="space-y-5">
              <InputGroup
                label="Weight (kg)"
                icon={<Scale size={18} />}
                name="pd_weight"
                value={formData.patientDetails.weight}
                onChange={handleChange}
                placeholder="70"
                type="number"
              />
              <InputGroup
                label="Height (cm)"
                icon={<Ruler size={18} />}
                name="pd_height"
                value={formData.patientDetails.height}
                onChange={handleChange}
                placeholder="175"
                type="number"
              />
              <InputGroup
                label="Blood Group"
                icon={<Droplets size={18} />}
                name="pd_blood"
                value={formData.patientDetails.blood}
                onChange={handleChange}
                placeholder="A+"
              />
            </div>

            <div className="mt-8 p-4 bg-secondary-50 dark:bg-gray-800/80 rounded-2xl border border-secondary-200 dark:border-gray-700 italic text-xs text-secondary-800 dark:text-secondary-300">
              Note: These metrics are used to personalize your therapy plan and
              track physical progress over time.
            </div>
          </div>
        </div>

        {/* Camera Lighting & Quality Settings */}
        <div className="premium-card p-8 mt-8">
          <LightingSettings />
        </div>

        {/* Offline Game Sessions Buffer */}
        <div className="premium-card p-8 mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-indigo-500" />
              Offline Game Sessions Buffer
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Auto Sync
              </span>
              <button
                type="button"
                onClick={() => {
                  const newVal = !autoSyncEnabled;
                  setAutoSyncEnabled(newVal);
                  localStorage.setItem('hci_auto_sync_buffer', newVal.toString());
                }}
                className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${
                  autoSyncEnabled ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
                    autoSyncEnabled ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            These sessions were saved locally because you were offline or had a slow connection. 
            They will be securely pushed to the server when your connection is stable.
          </p>

          <div className="space-y-4">
            {offlineSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <Wifi className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No offline sessions.</p>
                <p className="text-xs">Your connection is stable and all data is synced.</p>
              </div>
            ) : (
              offlineSessions.map((session) => (
                <div 
                  key={session.id} 
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    session.isPushed 
                      ? "bg-gray-50 border-gray-100 opacity-60" 
                      : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${session.isPushed ? "bg-gray-200" : "bg-indigo-50"}`}>
                      {session.isPushed ? <Settings className="w-5 h-5 text-gray-500" /> : <Save className="w-5 h-5 text-indigo-500" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{session.gameName}</h4>
                      <div className="text-xs text-gray-500 flex gap-3 mt-1">
                        <span>{new Date(session.timestamp).toLocaleDateString()} at {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>{session.sizeKB} KB</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!session.isPushed && (
                      <button
                        type="button"
                        disabled={isSyncingId === session.id}
                        onClick={async () => {
                          setIsSyncingId(session.id);
                          try {
                            if (session.gameType === 'board_drawing') {
                              await gameService.saveBoardDrawingSession(session.payload);
                            } else {
                              await gameService.saveGameSession(session.payload);
                            }
                            offlineBuffer.markAsPushed(session.id);
                            setOfflineSessions(offlineBuffer.getSessions());
                            window.dispatchEvent(new Event('refresh_user_data'));
                          } catch (err) {
                            console.error('Manual push failed', err);
                            alert("Failed to push session. The network might still be offline.");
                          } finally {
                            setIsSyncingId(null);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isSyncingId === session.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5" />
                        )}
                        {isSyncingId === session.id ? "Pushing..." : "Push"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this offline session? Data will be lost.")) {
                          offlineBuffer.deleteSession(session.id);
                          setOfflineSessions(offlineBuffer.getSessions());
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary-500 text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary-600 disabled:opacity-50 transition-all shadow-lg shadow-primary-200 active:scale-95"
          >
            {saving ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? "Saving Profile..." : "Save Profile Details"}
          </button>
        </div>
      </form>
    </div>
  );
}

const InputGroup = ({ label, icon, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
      {label}
    </label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
        {icon}
      </div>
      <input
        {...props}
        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-primary-100 focus:ring-4 focus:ring-primary-50 transition-all outline-none rounded-2xl text-gray-700 placeholder:text-gray-300 border-2"
      />
    </div>
  </div>
);

export default PatientSetting;
