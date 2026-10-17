import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, Save, AlertCircle, Clock, ShieldCheck, Sun, Moon } from "lucide-react";
import axios from "axios";
import { API_BASE_URL, TESTING_PIANO_SEQUENCE, TESTING_SHAPE_SEQUENCE, TESTING_FRUIT_BASKET_SEQUENCE } from "../../constants";
import { useSettings } from "../../context/SettingsContext";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { fetchSettings: refreshGlobalSettings } = useSettings();
  const [settings, setSettings] = useState({
    testingMode: true,
    pianoSessionSeconds: 300,
    boardDrawingSessionSeconds: 300,
    fruitBasketSessionSeconds: 300,
    testingPianoDisabledKeys: [],
    testingPianoKeyTimer: 5,
    testingPianoSequence: TESTING_PIANO_SEQUENCE,
    testingShapeSequence: TESTING_SHAPE_SEQUENCE,
    testingFruitBasketSequence: TESTING_FRUIT_BASKET_SEQUENCE,
    boardDrawingAssistiveMode: true,
    fruitBasketCoordSampleMs: 150,
    boardDrawingCoordSampleMs: 150,
    testingShapeTimer: 120,
    testingShapeSessionSeconds: 600,
    testingPianoWristKeysCount: 4,
    testingPianoWristTimer: 5,
    testingPianoWristSequence: TESTING_PIANO_SEQUENCE,
    fruitBasketCooldownSeconds: 3,
    fruitBasketMaxAttempts: 3,
    fruitBasketAttemptTimeoutSeconds: 10
  });
  const { isDarkMode, toggleDarkMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings`);
      if (response.data) {
        setSettings({
          testingMode: response.data.testingMode ?? true,
          pianoSessionSeconds: response.data.pianoSessionSeconds ?? 300,
          boardDrawingSessionSeconds: response.data.boardDrawingSessionSeconds ?? 300,
          fruitBasketSessionSeconds: response.data.fruitBasketSessionSeconds ?? 300,
          testingPianoDisabledKeys: response.data.testingPianoDisabledKeys ?? [],
          testingPianoKeyTimer: response.data.testingPianoKeyTimer ?? 5,
          testingPianoSequence: response.data.testingPianoSequence ?? TESTING_PIANO_SEQUENCE,
          testingShapeSequence: response.data.testingShapeSequence ?? TESTING_SHAPE_SEQUENCE,
          testingFruitBasketSequence: response.data.testingFruitBasketSequence ?? TESTING_FRUIT_BASKET_SEQUENCE,
          boardDrawingAssistiveMode: response.data.boardDrawingAssistiveMode ?? true,
          fruitBasketCoordSampleMs: response.data.fruitBasketCoordSampleMs ?? 150,
          boardDrawingCoordSampleMs: response.data.boardDrawingCoordSampleMs ?? 150,
          testingShapeTimer: response.data.testingShapeTimer ?? 120,
          testingShapeSessionSeconds: response.data.testingShapeSessionSeconds ?? 600,
          testingPianoWristKeysCount: response.data.testingPianoWristKeysCount ?? 4,
          testingPianoWristTimer: response.data.testingPianoWristTimer ?? 5,
          testingPianoWristSequence: response.data.testingPianoWristSequence ?? TESTING_PIANO_SEQUENCE,
          fruitBasketCooldownSeconds: response.data.fruitBasketCooldownSeconds ?? 3,
          fruitBasketMaxAttempts: response.data.fruitBasketMaxAttempts ?? 3,
          fruitBasketAttemptTimeoutSeconds: response.data.fruitBasketAttemptTimeoutSeconds ?? 10,
        });
      }
    } catch (err) {
      setMessage({ text: "Failed to load settings.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: "", type: "" });
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_BASE_URL}/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh the global SettingsContext so all game components get new values immediately
      await refreshGlobalSettings();
      setMessage({ text: "Global Settings updated successfully!", type: "success" });
    } catch (err) {
      setMessage({ text: "Failed to update settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseInt(value, 10) || 0
    }));
  };

  const handleArrayChange = (e, field) => {
    const val = e.target.value;
    const array = val.split(',').map(s => s.trim()).filter(s => s !== "");
    setSettings(prev => ({
      ...prev,
      [field]: array
    }));
  };

  const handleNumArrayChange = (e, field) => {
    const val = e.target.value;
    const array = val.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    setSettings(prev => ({
      ...prev,
      [field]: array
    }));
  };

  const handleJSONChange = (e, field) => {
    const val = e.target.value;
    try {
      const parsed = JSON.parse(val);
      setSettings(prev => ({
        ...prev,
        [field]: parsed
      }));
    } catch (err) {
      // Ignore parse errors while typing, but user should type valid JSON eventually
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Settings...</div>;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-800"} p-6 md:p-10 relative`}>
      <div className="absolute top-6 right-6">
        <button 
          onClick={toggleDarkMode}
          className="p-2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
          title="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-gray-300" /> : <Moon className="w-5 h-5 text-gray-600" />}
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className={`flex flex-col md:flex-row justify-between items-center p-6 rounded-2xl shadow-sm border gap-4 transition-colors ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isDarkMode ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Control Panel</h1>
              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Manage global game settings and configurations</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 px-4 py-2 hover:opacity-80 transition-colors rounded-lg font-medium ${isDarkMode ? "bg-red-900/30 text-red-400" : "bg-red-50 text-red-600"}`}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border ${
            message.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
              : 'bg-green-50 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-300 border-green-200 dark:border-emerald-800/60'
          }`}>
            <AlertCircle className="w-5 h-5 shrink-0" />
            {message.text}
          </div>
        )}

        <div className={`rounded-2xl shadow-sm border p-8 transition-colors ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
          <div className={`flex items-center gap-3 mb-6 pb-6 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
            <Settings className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold">Global Configuration</h2>
          </div>

          <div className="space-y-8">
            {/* Assistive Mode Toggle */}
            <div className={`p-5 border rounded-xl mb-6 ${isDarkMode ? "bg-purple-900/20 border-purple-900/50" : "bg-purple-50/50 border-purple-100"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Shape Tracer Assistive Mode</h3>
                  <p className={`text-sm max-w-lg mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Allow users to draw shapes with any hand posture (open palm, fist, etc) rather than requiring a closed fist. On by default.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="boardDrawingAssistiveMode"
                    checked={settings.boardDrawingAssistiveMode}
                    onChange={handleChange}
                    className="sr-only peer" 
                  />
                  <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>

            {/* Testing Mode Toggle */}
            <div className={`p-5 border rounded-xl ${isDarkMode ? "bg-blue-900/20 border-blue-900/50" : "bg-blue-50/50 border-blue-100"}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Deterministic Testing Mode</h3>
                  <p className={`text-sm max-w-lg mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    When enabled, all game algorithms use a fixed sequence of targets instead of random variables. This ensures every user gets the exact same experience for testing purposes.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="testingMode"
                    checked={settings.testingMode}
                    onChange={handleChange}
                    className="sr-only peer" 
                  />
                  <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {settings.testingMode && (
                <div className={`mt-4 pt-4 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <h4 className="text-sm font-semibold mb-3">Testing Sequences & Constraints</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Piano Disabled Keys (comma separated)</label>
                      <input 
                        type="text" 
                        value={settings.testingPianoDisabledKeys.join(', ')} 
                        onChange={(e) => handleArrayChange(e, 'testingPianoDisabledKeys')}
                        placeholder="e.g. C4, D4"
                        className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                      />
                      <p className="text-[10px] text-gray-500 mt-0.5">Leave empty for none (default for testing)</p>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <label className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Piano Key Timer (seconds)</label>
                      <input 
                        type="number" 
                        name="testingPianoKeyTimer"
                        value={settings.testingPianoKeyTimer} 
                        onChange={handleChange}
                        min="1"
                        max="20"
                        className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                      />
                      <p className="text-[10px] text-gray-500 mt-0.5">Time given per key in deterministic mode</p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Piano Wrist Keys Count (2-9)</label>
                      <input 
                        type="number" 
                        name="testingPianoWristKeysCount"
                        value={settings.testingPianoWristKeysCount} 
                        onChange={handleChange}
                        min="2"
                        max="9"
                        className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                      />
                      <p className="text-[10px] text-gray-500 mt-0.5">Number of active keys for Piano Wrist mode in testing</p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Piano Wrist Key Timer (seconds)</label>
                      <input 
                        type="number" 
                        name="testingPianoWristTimer"
                        value={settings.testingPianoWristTimer} 
                        onChange={handleChange}
                        min="1"
                        max="20"
                        className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                      />
                      <p className="text-[10px] text-gray-500 mt-0.5">Time given per key in Piano Wrist mode in testing</p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Drawing Shape Timer (seconds)</label>
                      <input 
                        type="number" 
                        name="testingShapeTimer"
                        value={settings.testingShapeTimer} 
                        onChange={handleChange}
                        min="10"
                        max="600"
                        className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                      />
                      <p className="text-[10px] text-gray-500 mt-0.5">Time given per shape in Trace & Master in testing (default: 120s)</p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Drawing Shape Session Timer (seconds)</label>
                      <input 
                        type="number" 
                        name="testingShapeSessionSeconds"
                        value={settings.testingShapeSessionSeconds} 
                        onChange={handleChange}
                        min="60"
                        max="3600"
                        className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                      />
                      <p className="text-[10px] text-gray-500 mt-0.5">Total session duration for Trace & Master in testing (default: 600s)</p>
                    </div>
                    <div className="md:col-span-2 mt-4 pt-4 border-t dark:border-gray-700">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Deterministic Sequences</h4>
                      
                      <div className="space-y-4">
                        {/* Piano Sequence */}
                        <div className="flex flex-col gap-1">
                          <label className={`text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Piano Finger Dexterity Sequence (Comma Separated Indices 0-8)</label>
                          <textarea
                            rows={3}
                            defaultValue={settings.testingPianoSequence?.join(', ')}
                            onChange={(e) => handleNumArrayChange(e, 'testingPianoSequence')}
                            className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"} font-mono text-xs`}
                          />
                        </div>

                        {/* Piano Wrist Sequence */}
                        <div className="flex flex-col gap-1">
                          <label className={`text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Piano Wrist Movement Sequence (Comma Separated Indices 0-8)</label>
                          <textarea
                            rows={3}
                            defaultValue={settings.testingPianoWristSequence?.join(', ')}
                            onChange={(e) => handleNumArrayChange(e, 'testingPianoWristSequence')}
                            className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"} font-mono text-xs`}
                          />
                        </div>

                        {/* Piano Mobile Sequence */}
                        <div className="flex flex-col gap-1">
                          <label className={`text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Piano Mobile (Comma Separated Indices 0-4)</label>
                          <textarea
                            rows={3}
                            defaultValue={settings.testingPianoMobileSequence?.join(', ')}
                            onChange={(e) => handleNumArrayChange(e, 'testingPianoMobileSequence')}
                            className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"} font-mono text-xs`}
                          />
                        </div>

                        {/* Shape Sequence */}
                        <div className="flex flex-col gap-1">
                          <label className={`text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Shape Tracer / Board Drawing (Comma Separated Names)</label>
                          <textarea
                            rows={2}
                            defaultValue={settings.testingShapeSequence?.join(', ')}
                            onChange={(e) => handleArrayChange(e, 'testingShapeSequence')}
                            className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"} font-mono text-xs`}
                          />
                        </div>

                        {/* Arm Orchard Sequence */}
                        <div className="flex flex-col gap-1">
                          <label className={`text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Arm Orchard Sequence (Valid JSON Array)</label>
                          <textarea
                            rows={4}
                            defaultValue={JSON.stringify(settings.testingFruitBasketSequence, null, 2)}
                            onChange={(e) => handleJSONChange(e, 'testingFruitBasketSequence')}
                            className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"} font-mono text-xs`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session Timers inside Testing Mode */}
                  <div className={`mt-6 pt-4 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className={`w-5 h-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                      <h4 className="text-sm font-semibold">Game Session Timers (Seconds)</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: "Piano Therapy Game", name: "pianoSessionSeconds" },
                        { label: "Shape Tracer", name: "shapeTracingSessionSeconds" },
                        { label: "Board Drawing", name: "boardDrawingSessionSeconds" },
                        { label: "Arm Orchard", name: "fruitBasketSessionSeconds" },
                      ].map((game) => (
                        <div key={game.name} className="flex flex-col gap-1">
                          <label className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{game.label}</label>
                          <input
                            type="number"
                            name={game.name}
                            value={settings[game.name]}
                            onChange={handleChange}
                            className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                            min="10"
                            max="3600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Arm Orchard Game Settings inside Testing Mode */}
                  <div className={`mt-6 pt-4 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Settings className={`w-5 h-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                      <h4 className="text-sm font-semibold">Arm Orchard Game Settings</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Cooldown Time (seconds)</label>
                        <input type="number" name="fruitBasketCooldownSeconds" value={settings.fruitBasketCooldownSeconds} onChange={handleChange}
                          className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`} min="1" max="10" />
                        <p className="text-[10px] text-gray-500 mt-0.5">Time between fruit spawns</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Max Attempts per Trial</label>
                        <input type="number" name="fruitBasketMaxAttempts" value={settings.fruitBasketMaxAttempts} onChange={handleChange}
                          className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`} min="1" max="10" />
                        <p className="text-[10px] text-gray-500 mt-0.5">Attempts allowed before trial fails</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Attempt Timeout (seconds)</label>
                        <input type="number" name="fruitBasketAttemptTimeoutSeconds" value={settings.fruitBasketAttemptTimeoutSeconds} onChange={handleChange}
                          className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`} min="2" max="60" />
                        <p className="text-[10px] text-gray-500 mt-0.5">Timer for each attempt/failure</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Trajectory Sampling Intervals */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Settings className={`w-5 h-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                <h3 className="text-lg font-semibold">Trajectory Sampling Intervals (ms)</h3>
              </div>
              <p className={`text-sm mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Controls how often body/hand coordinates are recorded during gameplay. Lower = more data, higher = less storage.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: "Arm Orchard Sampling (ms)", name: "fruitBasketCoordSampleMs" },
                  { label: "Shape Tracer Sampling (ms)", name: "boardDrawingCoordSampleMs" },
                ].map((field) => (
                  <div key={field.name} className="flex flex-col gap-2">
                    <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{field.label}</label>
                    <input
                      type="number"
                      name={field.name}
                      value={settings[field.name]}
                      onChange={handleChange}
                      className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                      min="50"
                      max="5000"
                      step="50"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className={`pt-6 border-t flex justify-end ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
