import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { gameService } from "../../services/gameService";
import BoardDrawingTrajectoryReplay from "../game/BoardDrawingTrajectoryReplay";
import DrawingPerformancePanel from "../../components/dashboard/DrawingPerformancePanel";
import ArmReachVisualizer from "../game/ArmReachVisualizer";
import PatientConfigPanel from "../../components/dashboard/PatientConfigPanel";
import {
  ArrowLeft,
  TrendingUp,
  Target,
  Clock,
  Zap,
  Settings, X
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import thumbImage from "../../assets/hands/hand_thumb_active_1779432908101.png";
import indexImage from "../../assets/hands/hand_index_active_1779432920829.png";
import middleImage from "../../assets/hands/hand_middle_active_1779432935604.png";
import ringImage from "../../assets/hands/hand_ring_active_1779432950085.png";
import pinkyImage from "../../assets/hands/hand_pinky_active_1779432966168.png";

const CoordinateVisualizer = ({ coordinates }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setCurrentIdx(0);
    setIsPlaying(false);
  }, [coordinates]);

  useEffect(() => {
    if (isPlaying) {
      const intervalTime = Math.max(10, Math.min(200, 150 / playbackSpeed));
      timerRef.current = setInterval(() => {
        setCurrentIdx((prev) => {
          if (prev >= coordinates.length - 1) {
            if (isLooping) {
              return 0;
            } else {
              setIsPlaying(false);
              return prev;
            }
          }
          return prev + 1;
        });
      }, intervalTime);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, coordinates, playbackSpeed, isLooping]);

  const validCoords = Array.isArray(coordinates)
    ? coordinates.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')
    : [];

  if (validCoords.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-150 dark:border-gray-700 text-center mt-6 shadow-sm">
        <div className="mb-3 text-5xl">🖐️</div>
        <p className="font-bold text-gray-800 dark:text-gray-200 mb-1 text-lg">No Movement Data Yet</p>
        <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
          Hand trajectory is recorded automatically during gameplay. Play a session to see movement path, velocity profile, and tremor analysis.
        </p>
      </div>
    );
  }

  const safeIdx = Math.min(currentIdx, validCoords.length - 1);
  const currentPoint = validCoords[safeIdx] || validCoords[0];

  let totalDistance = 0;
  let maxSpeed = 0;
  let jitterSum = 0;
  const speeds = [];

  for (let i = 1; i < validCoords.length; i++) {
    const p1 = validCoords[i - 1];
    const p2 = validCoords[i];
    const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    totalDistance += d;

    const dt = p2.timestamp !== undefined && p1.timestamp !== undefined 
      ? (p2.timestamp - p1.timestamp) 
      : 0.15;
    const speed = d / (dt || 0.15);
    speeds.push(speed);
    if (speed > maxSpeed) maxSpeed = speed;

    if (i > 1) {
      const prevSpeed = speeds[i - 2];
      jitterSum += Math.abs(speed - prevSpeed);
    }
  }

  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const jitterScore = speeds.length > 1 ? (jitterSum / (speeds.length - 1)) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-850 rounded-xl p-6 border border-gray-150 dark:border-gray-800 mt-4 shadow-sm transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b dark:border-gray-800 pb-4">
        <div>
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400">
            Movement Path Trajectory & Replay
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
            Visualize relative hand displacement, velocity profiles, and clinical tremor patterns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-green-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-green-200 dark:border-emerald-800/40 text-xs font-bold rounded-full">
            {coordinates.length} positions
          </span>
          <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800/40 text-xs font-bold rounded-full">
            Dynamic Sample Rate
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col justify-between">
          <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-inner group">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:5%_5%] opacity-20"></div>
            
            <svg viewBox="0 0 100 100" className="w-full h-full p-4" preserveAspectRatio="none">
              <polyline
                points={validCoords.map(p => `${p.x * 100},${p.y * 100}`).join(' ')}
                fill="none"
                stroke="#4b5563"
                strokeWidth="0.75"
                strokeDasharray="2,2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              <polyline
                points={validCoords.slice(0, safeIdx + 1).map(p => `${p.x * 100},${p.y * 100}`).join(' ')}
                fill="none"
                stroke="#10B981"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-75"
              />

              <circle cx={validCoords[0].x * 100} cy={validCoords[0].y * 100} r="1.5" fill="#3B82F6" stroke="#fff" strokeWidth="0.5" />
              <circle cx={validCoords[validCoords.length-1].x * 100} cy={validCoords[validCoords.length-1].y * 100} r="1.5" fill="#EF4444" stroke="#fff" strokeWidth="0.5" />

              <circle
                cx={currentPoint.x * 100}
                cy={currentPoint.y * 100}
                r="3.5"
                fill="#3B82F6"
                fillOpacity="0.4"
                className="animate-pulse"
              />
              <circle
                cx={currentPoint.x * 100}
                cy={currentPoint.y * 100}
                r="1.8"
                fill="#3B82F6"
                stroke="#fff"
                strokeWidth="0.5"
              />
            </svg>

            <div className="absolute top-3 left-3 flex gap-2 text-[10px] bg-black/75 px-2.5 py-1 rounded-lg border border-gray-800 text-gray-300 font-bold backdrop-blur-sm shadow-md">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Start</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Path</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> End</span>
            </div>
            
            <div className="absolute bottom-3 right-3 text-[10px] bg-black/75 px-2 py-1 rounded-lg border border-gray-800 text-gray-400 font-mono">
              Point {safeIdx + 1}/{validCoords.length}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2.5 rounded-xl flex items-center justify-center text-white transition-all transform active:scale-95 ${
                  isPlaying 
                    ? "bg-amber-500 hover:bg-amber-600" 
                    : "bg-primary-500 hover:bg-primary-600"
                }`}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => { setIsPlaying(false); setCurrentIdx(0); }}
                className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl transition-all active:scale-95 border dark:border-gray-600"
                title="Reset"
              >
                <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                </svg>
              </button>

              <div className="flex-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={validCoords.length - 1}
                  value={safeIdx}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentIdx(parseInt(e.target.value));
                  }}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
              </div>

              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="px-2 py-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none cursor-pointer dark:text-white"
              >
                <option value="0.5">0.5x</option>
                <option value="1">1.0x</option>
                <option value="2">2.0x</option>
                <option value="4">4.0x</option>
              </select>

              <button
                type="button"
                onClick={() => setIsLooping(!isLooping)}
                className={`p-2 rounded-lg border transition-all ${
                  isLooping 
                    ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800" 
                    : "bg-transparent text-gray-400 border-gray-200 dark:border-gray-700"
                }`}
                title="Loop"
              >
                <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 border dark:border-gray-800 flex flex-col justify-between">
          

          <div className="mt-4 bg-white dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700">
            <h5 className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
              Live Tracker (Frame {safeIdx + 1})
            </h5>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <p className="text-gray-400 font-medium">Coordinates X, Y</p>
                <p className="font-bold font-mono text-gray-800 dark:text-gray-200">
                  {currentPoint.x.toFixed(3)}, {currentPoint.y.toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Session Time</p>
                <p className="font-bold font-mono text-gray-800 dark:text-gray-200">
                  {currentPoint.timestamp != null ? `${currentPoint.timestamp.toFixed(2)}s` : `${(safeIdx * 0.15).toFixed(2)}s`}
                </p>
              </div>
            </div>
            {currentPoint.elbowAngle !== undefined && currentPoint.elbowAngle !== null && (
              <div className="mt-3 pt-2.5 border-t dark:border-gray-700 grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <p className="text-gray-400 font-medium">Elbow Angle</p>
                  <p className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {currentPoint.elbowAngle}°
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Shoulder Angle</p>
                  <p className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {currentPoint.shoulderAngle}°
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Trunk Twist</p>
                  <p className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {currentPoint.trunkTwist}°
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FINGER_COLORS = {
  leftPinky: "#EC4899",   // Pink
  leftRing: "#F59E0B",    // Amber
  leftMiddle: "#EAB308",  // Yellow
  leftIndex: "#10B981",   // Emerald
  rightIndex: "#14B8A6",  // Teal
  rightMiddle: "#3B82F6", // Blue
  rightRing: "#6366F1",   // Indigo
  rightPinky: "#A855F7",  // Purple
  // Generic fallbacks
  thumb: "#F97316",       // Orange
  index: "#34D399",
  middle: "#60A5FA",
  ring: "#818CF8",
  pinky: "#C084FC",
  default: "#6B7280"      // Gray
};

// Logical left-to-right keyboard sorting weights
const FINGER_SORT_ORDER = {
  // Left Hand
  Q: 10, A: 11, Z: 12,
  W: 20, S: 21, X: 22,
  E: 30, D: 31, C: 32,
  R: 40, F: 41, V: 42, T: 43, G: 44, B: 45,
  // Right Hand
  Y: 50, H: 51, N: 52, U: 53, J: 54, M: 55,
  I: 60, K: 61, ",": 62,
  O: 70, L: 71, ".": 72,
  P: 80, ";": 81, "/": 82,
  // Space
  " ": 90
};

const FingerClickVisualizer = ({ session, fingerTimeouts, movements, isDarkMode }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timerRef = useRef(null);

  // Determine exactly which fingers were involved in this session
  const activeFingersSet = useMemo(() => {
    const fingers = new Set();
    if (movements) {
      movements.forEach(m => {
        if (m.finger) fingers.add(m.finger);
        if (m.expectedFinger) fingers.add(m.expectedFinger);
      });
    }
    return fingers;
  }, [movements]);

  // 1. Map keys from fingerTimeouts
  // 2. Sort keys left-to-right
  // 3. Map keys to a single horizontal row
  const activeKeyCoords = useMemo(() => {
    const keyDataMap = {};

    if (fingerTimeouts) {
      const mode = session?.mode || 'laptop';
      const map = {
        leftPinky: 'A', leftRing: 'S', leftMiddle: 'D', leftIndex: 'F',
        rightIndex: 'H', rightMiddle: 'J', rightRing: 'K', rightPinky: 'L'
      };
      if (mode === 'mobile') {
        const keys = Object.keys(fingerTimeouts);
        if (keys.includes('thumb')) {
          map.thumb = 'A'; map.index = 'S'; map.middle = 'D'; map.ring = 'F'; map.pinky = 'G';
        } else {
          map.pinky = 'A'; map.ring = 'S'; map.middle = 'D'; map.index = 'F';
        }
      }

      Object.keys(fingerTimeouts).forEach(finger => {
        const k = map[finger];
        if (k && fingerTimeouts[finger] !== -1) {
          keyDataMap[k] = { key: k, expectedFinger: finger, isDisabled: fingerTimeouts[finger] === 0 };
        }
      });
    }

    if (movements && Object.keys(keyDataMap).length === 0) {
      movements.forEach(m => {
        if (m.key) {
          const k = m.key.toUpperCase();
          if (!keyDataMap[k]) {
            keyDataMap[k] = { key: k, expectedFinger: m.expectedFinger, isDisabled: false };
          }
        }
      });
    }

    const getSortWeight = (k) => FINGER_SORT_ORDER[k] || 100;

    // Sort keys logically based on keyboard position
    const sortedKeys = Object.values(keyDataMap).sort((a, b) => getSortWeight(a.key) - getSortWeight(b.key));

    const coords = {};
    sortedKeys.forEach((item, index) => {
      coords[item.key] = {
        expectedFinger: item.expectedFinger,
        isDisabled: item.isDisabled
      };
    });

    return coords;
  }, [movements, fingerTimeouts, session?.mode]);

  useEffect(() => {
    setActiveStep(0);
    setIsPlaying(false);
  }, [movements]);

  useEffect(() => {
    if (isPlaying) {
      const intervalTime = Math.max(200, 1000 / playbackSpeed);
      timerRef.current = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= movements.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalTime);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, movements, playbackSpeed]);

  if (!movements || movements.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No playing data recorded for this session.
      </div>
    );
  }

  const currentMove = movements[activeStep];
  const previousMove = activeStep > 0 ? movements[activeStep - 1] : null;

  // Helper formats: "leftIndex" -> "L Index"
  const formatFingerShort = (str) => {
    if (!str) return "";
    const lower = str.toLowerCase();
    if (lower.includes("left")) return "L " + str.replace(/left/i, "").charAt(0).toUpperCase() + str.replace(/left/i, "").slice(1);
    if (lower.includes("right")) return "R " + str.replace(/right/i, "").charAt(0).toUpperCase() + str.replace(/right/i, "").slice(1);
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatFingerFull = (str) => {
    if (!str) return "N/A";
    const spaced = str.replace(/([A-Z])/g, " $1");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  // Use all timeouts defined in the session
  const filteredTimeouts = fingerTimeouts
    ? Object.entries(fingerTimeouts).filter(([_, timeout]) => timeout !== -1)
    : [];

  return (
    <div className="space-y-4">

      {/* Session Finger Timeouts / Matrix Panel - NOW FILTERED */}
      {filteredTimeouts.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
            Active Fingers & Time Limits
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredTimeouts.map(([finger, timeout]) => {
              const dotColor = FINGER_COLORS[finger] || FINGER_COLORS.default;
              return (
                <div
                  key={finger}
                  className={`flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 shadow-sm ${timeout === 0 ? 'opacity-50 grayscale' : ''}`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-sm"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className={`font-medium ${timeout === 0 ? 'line-through' : ''}`}>{formatFingerFull(finger)}</span>
                  <span className="text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md ml-1 font-mono">
                    {timeout === 0 ? 'DISABLED' : `${timeout}s`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <div className="relative w-full py-16 px-2 sm:px-6 bg-gray-900 rounded-2xl border border-gray-800 shadow-inner overflow-hidden flex flex-nowrap gap-2 sm:gap-4 items-center justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:5%_10%] opacity-20 pointer-events-none"></div>

        {Object.entries(activeKeyCoords)
          .sort((a, b) => FINGER_SORT_ORDER[a[0]] - FINGER_SORT_ORDER[b[0]])
          .map(([letter, pos]) => {
            const isCurrent = currentMove?.key?.toUpperCase() === letter;
            const isPrevious = previousMove?.key?.toUpperCase() === letter && !isCurrent;
            const wasPlayed = activeFingersSet.has(pos.expectedFinger);

            let bgClass = "bg-gray-800";
            let borderClass = "border-gray-700";
            let textClass = "text-gray-400";
            let opacityClass = "opacity-100";
            let customStyle = {};

            if (pos.isDisabled) {
              opacityClass = "opacity-30";
              bgClass = "bg-gray-950";
              borderClass = "border-gray-900";
            } else if (!wasPlayed) {
              opacityClass = "opacity-60"; // Faint because it was never played
            }

            if (isCurrent) {
              bgClass = "";
              customStyle.backgroundColor = FINGER_COLORS[currentMove?.finger] || FINGER_COLORS.default;
              borderClass = currentMove.correct ? "border-emerald-500 border-4 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "border-red-500 border-4 scale-110 shadow-[0_0_15px_rgba(239,68,68,0.5)]";
              textClass = "text-white font-bold";
              opacityClass = "opacity-100 z-10";
            } else if (isPrevious) {
              borderClass = previousMove.correct ? "border-emerald-800 border-2" : "border-red-800 border-2";
              textClass = "text-gray-300";
            }

            return (
              <div
                key={letter}
                className={`relative flex-1 flex flex-col items-center justify-center h-24 sm:h-32 max-w-[120px] rounded-xl border-2 transition-all duration-300 ${bgClass} ${borderClass} ${textClass} ${opacityClass}`}
                style={customStyle}
              >
                <span className="text-2xl sm:text-4xl font-black">{letter}</span>
                <span className="text-[10px] sm:text-xs mt-2 uppercase tracking-wider opacity-80">{formatFingerShort(pos.expectedFinger)}</span>
                {pos.isDisabled && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap transform -rotate-12 border border-white/20">DISABLED</div>
                )}
              </div>
            );
          })}
      </div>

      {/* Live Metrics overlay */}
      {currentMove && (
        <div className="w-full flex justify-between items-center bg-gray-900/80 backdrop-blur-sm border border-gray-800 p-4 rounded-xl text-white text-xs font-mono shadow-md">
          <div className="flex flex-col">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Step</span>
            <span className="text-sm">{activeStep + 1} / {movements.length}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Pressed Key</span>
            <span className={`font-bold text-xl ${currentMove.correct ? "text-emerald-400" : "text-red-400"}`}>
              {currentMove.key === 'none' ? '—' : currentMove.key}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Action</span>
            <span className="flex items-center gap-1 text-sm">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentMove.finger === 'none' ? '#ef4444' : (FINGER_COLORS[currentMove.finger] || FINGER_COLORS.default) }}
              />
              {currentMove.finger === 'none' ? 'Timeout (Missed)' : formatFingerFull(currentMove.finger)}
            </span>
            {currentMove.finger !== currentMove.expectedFinger && (
              <span className="text-[10px] text-red-400 mt-1">
                Expected: {formatFingerFull(currentMove.expectedFinger)}
              </span>
            )}
          </div>

          <div className="flex flex-col text-right">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Speed</span>
            <span className={`text-sm ${currentMove.responsetime === -1
              ? "text-yellow-400"
              : (fingerTimeouts && currentMove.responsetime > (fingerTimeouts[currentMove.finger] || 99))
                ? "text-red-400"
                : "text-emerald-400"
              }`}
            >
              {currentMove.responsetime === -1 ? 'TIMEOUT' : `${currentMove.responsetime}s`}
            </span>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-4 py-2 text-white font-bold text-xs rounded-xl transition-all active:scale-95 ${isPlaying ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-500 hover:bg-blue-600"
            }`}
        >
          {isPlaying ? "Pause" : "Play Action"}
        </button>
        <button
          type="button"
          onClick={() => { setIsPlaying(false); setActiveStep(0); }}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition-all active:scale-95 border dark:border-gray-600"
        >
          Reset
        </button>

        <input
          type="range"
          min="0"
          max={movements.length - 1}
          value={activeStep}
          onChange={(e) => { setIsPlaying(false); setActiveStep(parseInt(e.target.value)); }}
          className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />

        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
          className="px-2 py-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 border dark:border-gray-600 rounded-lg outline-none cursor-pointer dark:text-white"
        >
          <option value="0.5">0.5x</option>
          <option value="1">1.0x</option>
          <option value="2">2.0x</option>
        </select>
      </div>
    </div>
  );
};


const LaptopMovementVisualizer = ({ movements, isDarkMode }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timerRef = useRef(null);

  useEffect(() => {
    setActiveStep(0);
    setIsPlaying(false);
  }, [movements]);

  useEffect(() => {
    if (isPlaying) {
      const intervalTime = Math.max(200, 1000 / playbackSpeed);
      timerRef.current = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= movements.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalTime);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, movements, playbackSpeed]);

  if (!movements || movements.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No transition vector data recorded for this session.
      </div>
    );
  }

  const points = [];
  movements.forEach((m) => {
    if (m.fromX && m.fromY && m.fromKey) points.push({ x: m.fromX, y: m.fromY, label: m.fromKey });
    if (m.toX && m.toY && m.toKey) points.push({ x: m.toX, y: m.toY, label: m.toKey });
  });

  const uniqueKeysMap = {};
  points.forEach(p => {
    if (p.label) uniqueKeysMap[p.label] = p;
  });
  const uniqueKeys = Object.values(uniqueKeysMap);

  if (uniqueKeys.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No valid coordinates found in movement logs.
      </div>
    );
  }

  const xCoords = uniqueKeys.map(p => p.x);
  const yCoords = uniqueKeys.map(p => p.y);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);

  const normX = (x) => {
    if (maxX === minX) return 50;
    return 15 + ((x - minX) / (maxX - minX)) * 70;
  };

  const normY = (y) => {
    if (maxY === minY) return 25;
    return 20 + ((y - minY) / (maxY - minY)) * 10;
  };

  const currentMove = movements[activeStep];

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-[2.5/1] bg-gray-900 rounded-2xl border border-gray-800 shadow-inner overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:5%_10%] opacity-20"></div>
        
        <svg viewBox="0 0 100 50" className="w-full h-full p-4">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 2 L 10 5 L 0 8 z" fill="#3b82f6" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 2 L 10 5 L 0 8 z" fill="#ef4444" />
            </marker>
          </defs>

          {movements.map((m, idx) => {
            if (!m.fromX || !m.toX) return null;
            return (
              <line
                key={`line-${idx}`}
                x1={normX(m.fromX)}
                y1={normY(m.fromY)}
                x2={normX(m.toX)}
                y2={normY(m.toY)}
                stroke="#374151"
                strokeWidth="0.4"
                strokeDasharray="1,1"
              />
            );
          })}

          {currentMove && currentMove.fromX && currentMove.toX && (
            <line
              x1={normX(currentMove.fromX)}
              y1={normY(currentMove.fromY)}
              x2={normX(currentMove.toX)}
              y2={normY(currentMove.toY)}
              stroke="#EF4444"
              strokeWidth="1.2"
              markerEnd="url(#arrow-active)"
              className="transition-all duration-300"
            />
          )}

          {uniqueKeys.map((k) => {
            const isActive = currentMove && (currentMove.fromKey === k.label || currentMove.toKey === k.label);
            const isToKey = currentMove && currentMove.toKey === k.label;
            return (
              <g key={k.label} transform={`translate(${normX(k.x)}, ${normY(k.y)})`}>
                <circle
                  r="3.5"
                  fill={isToKey ? "#EF4444" : isActive ? "#3B82F6" : "#1F2937"}
                  stroke="#fff"
                  strokeWidth="0.5"
                  className="transition-colors duration-200"
                />
                <text
                  textAnchor="middle"
                  dy="0.8"
                  fontSize="2.5"
                  fontWeight="bold"
                  fill="#fff"
                >
                  {k.label}
                </text>
              </g>
            );
          })}
        </svg>

        {currentMove && (
          <div className="absolute bottom-3 left-3 right-3 flex justify-between bg-black/80 backdrop-blur-sm border border-gray-800 p-2.5 rounded-xl text-white text-[10px] font-mono">
            <div>
              <span className="text-gray-400">Step:</span> {activeStep + 1} / {movements.length}
            </div>
            <div>
              <span className="text-gray-400">Move:</span> {currentMove.fromKey} ➔ {currentMove.toKey}
            </div>
            <div>
              <span className="text-gray-400">Dist:</span> {currentMove.distance} px
            </div>
            <div>
              <span className="text-gray-400">Vector:</span> ({currentMove.dx}, {currentMove.dy})
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-3 py-1.5 text-white font-bold text-xs rounded-xl transition-all active:scale-95 ${
            isPlaying ? "bg-amber-500 hover:bg-amber-600" : "bg-primary-500 hover:bg-primary-600"
          }`}
        >
          {isPlaying ? "Pause" : "Play Path"}
        </button>
        <button
          type="button"
          onClick={() => { setIsPlaying(false); setActiveStep(0); }}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition-all active:scale-95 border dark:border-gray-600"
        >
          Reset
        </button>

        <input
          type="range"
          min="0"
          max={movements.length - 1}
          value={activeStep}
          onChange={(e) => { setIsPlaying(false); setActiveStep(parseInt(e.target.value)); }}
          className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
        />

        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
          className="px-2 py-1 text-xs font-bold bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none cursor-pointer dark:text-white"
        >
          <option value="0.5">0.5x</option>
          <option value="1">1.0x</option>
          <option value="2">2.0x</option>
        </select>
      </div>
    </div>
  );
};

const PianoReactionGameAnalytics = ({ session, isDarkMode }) => {
  const mode = session?.mode || "laptop";
  const fingerTimeouts = session?.fingerTimeouts || { thumb: 5, index: 5, middle: 5, ring: 5, pinky: 5 };
  const laptopMovements = session?.laptopMovements || [];
  const mobileMovements = session?.mobileMovements || [];

  if (mode === "laptop") {
    const totalDistance = laptopMovements.reduce((sum, m) => sum + (m.distance || 0), 0);
    const avgDistance = laptopMovements.length > 0 ? totalDistance / laptopMovements.length : 0;

    const laptopFingerKeys = ['leftPinky', 'leftRing', 'leftMiddle', 'leftIndex', 'rightIndex', 'rightMiddle', 'rightRing', 'rightPinky'];
    const laptopFingerImages = { leftPinky: pinkyImage, leftRing: ringImage, leftMiddle: middleImage, leftIndex: indexImage, rightIndex: indexImage, rightMiddle: middleImage, rightRing: ringImage, rightPinky: pinkyImage };
    const laptopFingerNames = { leftPinky: "L Pinky", leftRing: "L Ring", leftMiddle: "L Middle", leftIndex: "L Index", rightIndex: "R Index", rightMiddle: "R Middle", rightRing: "R Ring", rightPinky: "R Pinky" };

    const laptopFingerStats = laptopFingerKeys.map(finger => {
      const movements = mobileMovements.filter(m => m.expectedFinger === finger);
      const total = movements.length;
      const correct = movements.filter(m => m.correct === 1).length;
      const incorrect = movements.filter(m => m.correct === -1).length;
      const timeouts = movements.filter(m => m.correct === 0).length;
      
      const correctMovements = movements.filter(m => m.correct === 1 && m.responsetime > 0);
      const avgResponse = correctMovements.length > 0
        ? correctMovements.reduce((sum, m) => sum + m.responsetime, 0) / correctMovements.length
        : 0;
        
      const accuracy = total > 0
        ? (correct / total) * 100
        : 0;

      return {
        finger,
        name: laptopFingerNames[finger],
        image: laptopFingerImages[finger],
        total,
        correct,
        incorrect,
        timeouts,
        avgResponse,
        accuracy,
        timeout: fingerTimeouts[finger] || 5
      };
    }).filter(f => f.total > 0);

    return (
      <div className="space-y-6 mt-4">
        {laptopFingerStats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {laptopFingerStats.map(f => (
              <div key={f.finger} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-20 h-20 opacity-10 grayscale hover:grayscale-0 transition-all duration-300 pointer-events-none">
                   <img src={f.image} alt={f.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="w-10 h-10 p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center">
                    <img src={f.image} alt={f.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-semibold">
                    Limit: {f.timeout}s
                  </span>
                </div>
                <h4 className="font-bold text-sm text-gray-800 dark:text-white mb-1">{f.name} Finger</h4>
                <p className="text-[11px] text-gray-400 mb-3">{f.correct} of {f.total} CORRECT</p>
                
                <div className="space-y-2 pt-2 border-t dark:border-gray-700">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Response</span>
                    <span className="font-bold text-primary-600 dark:text-primary-400">{f.avgResponse.toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Accuracy</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{f.accuracy.toFixed(0)}%</span>
                  </div>
                  {f.incorrect > 0 && (
                    <div className="flex justify-between text-xs text-red-500">
                      <span>Incorrect</span>
                      <span className="font-bold">{f.incorrect}</span>
                    </div>
                  )}
                  {f.timeouts > 0 && (
                    <div className="flex justify-between text-xs text-amber-500">
                      <span>Timeouts</span>
                      <span className="font-bold">{f.timeouts}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Total Pixel Distance Moved</p>
            <p className="text-3xl font-black text-primary-600 dark:text-primary-400">
              {totalDistance.toFixed(1)} px
            </p>
            <p className="text-xs text-gray-400 mt-1">Sum of physical movement deltas between keys</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Avg Transition Distance</p>
            <p className="text-3xl font-black text-secondary-600 dark:text-secondary-400">
              {avgDistance.toFixed(1)} px
            </p>
            <p className="text-xs text-gray-400 mt-1">Average pixel travel per key response</p>
          </div>
        </div>
{/* 
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-150 dark:border-gray-700 shadow-sm">
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">Wrist/Arm Movement Vector Trajectory</h3>
          <p className="text-xs text-gray-400 mb-4">Sequential coordinate path mapping response targets in absolute pixel coordinates.</p>
          <LaptopMovementVisualizer movements={laptopMovements} isDarkMode={isDarkMode} />
        </div> */}

        {laptopFingerStats.length > 0 && (
          <div className="gap-6 mt-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-150 dark:border-gray-700 shadow-sm mb-4">
              <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">Finger Dexterity Profile</h3>
              <p className="text-xs text-gray-400 mb-4">Response times and accuracy compared across active fingers.</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={laptopFingerStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1F2937" : "#F3F4F6"} />
                    <XAxis dataKey="name" tick={{ fill: isDarkMode ? "#9CA3AF" : "#6B7280", fontSize: 11 }} />
                    <YAxis yAxisId="left" orientation="left" unit="s" tick={{ fill: isDarkMode ? "#9CA3AF" : "#6B7280", fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fill: isDarkMode ? "#9CA3AF" : "#6B7280", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: isDarkMode ? "#111827" : "#FFFFFF", borderColor: isDarkMode ? "#374151" : "#E5E7EB", borderRadius: "8px" }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="avgResponse" fill="#3B82F6" name="Avg Response (s)" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="accuracy" fill="#10B981" name="Accuracy (%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-150 dark:border-gray-700 shadow-sm">
              <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">Finger Playboard Simulation</h3>
              <p className="text-xs text-gray-400 mb-4">Visual reconstruction of finger transitions and accuracy.</p>
              <FingerClickVisualizer session={session} fingerTimeouts={session?.fingerTimeouts} movements={mobileMovements} isDarkMode={isDarkMode} />
            </div>
          </div>
        )}
      </div>
    );
  } else {
    const fingerKeys = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    const fingerImages = { thumb: thumbImage, index: indexImage, middle: middleImage, ring: ringImage, pinky: pinkyImage };
    const fingerNames = { thumb: "Thumb", index: "Index", middle: "Middle", ring: "Ring", pinky: "Pinky" };

    const fingerStats = fingerKeys.map(finger => {
      const movements = mobileMovements.filter(m => m.expectedFinger === finger);
      const total = movements.length;
      const correct = movements.filter(m => m.correct === 1).length;
      const incorrect = movements.filter(m => m.correct === -1).length;
      const timeouts = movements.filter(m => m.correct === 0).length;
      
      const correctMovements = movements.filter(m => m.correct === 1 && m.responsetime > 0);
      const avgResponse = correctMovements.length > 0
        ? correctMovements.reduce((sum, m) => sum + m.responsetime, 0) / correctMovements.length
        : 0;
        
      const accuracy = total > 0
        ? (correct / total) * 100
        : 0;

      return {
        finger,
        name: fingerNames[finger],
        image: fingerImages[finger],
        total,
        correct,
        incorrect,
        timeouts,
        avgResponse,
        accuracy,
        timeout: fingerTimeouts[finger] || 5
      };
    }).filter(f => f.total > 0);

    return (
      <div className="space-y-6 mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {fingerStats.map(f => (
            <div key={f.finger} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-20 h-20 opacity-10 grayscale hover:grayscale-0 transition-all duration-300 pointer-events-none">
                 <img src={f.image} alt={f.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="w-10 h-10 p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center">
                  <img src={f.image} alt={f.name} className="w-full h-full object-contain" />
                </div>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-semibold">
                  Limit: {f.timeout}s
                </span>
              </div>
              <h4 className="font-bold text-sm text-gray-800 dark:text-white mb-1">{f.name} Finger</h4>
              <p className="text-[11px] text-gray-400 mb-3">{f.correct} of {f.total} CORRECT</p>
              
              <div className="space-y-2 pt-2 border-t dark:border-gray-700">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Response</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">{f.avgResponse.toFixed(2)}s</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Accuracy</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{f.accuracy.toFixed(0)}%</span>
                </div>
                {f.incorrect > 0 && (
                  <div className="flex justify-between text-xs text-red-500">
                    <span>Incorrect</span>
                    <span className="font-bold">{f.incorrect}</span>
                  </div>
                )}
                {f.timeouts > 0 && (
                  <div className="flex justify-between text-xs text-amber-500">
                    <span>Timeouts</span>
                    <span className="font-bold">{f.timeouts}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-150 dark:border-gray-700 shadow-sm">
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">Finger Dexterity Profile</h3>
          <p className="text-xs text-gray-400 mb-4">Response times and accuracy compared across active fingers.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fingerStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1F2937" : "#F3F4F6"} />
                <XAxis dataKey="name" tick={{ fill: isDarkMode ? "#9CA3AF" : "#6B7280", fontSize: 11 }} />
                <YAxis yAxisId="left" orientation="left" unit="s" tick={{ fill: isDarkMode ? "#9CA3AF" : "#6B7280", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fill: isDarkMode ? "#9CA3AF" : "#6B7280", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? "#111827" : "#FFFFFF", borderColor: isDarkMode ? "#374151" : "#E5E7EB", borderRadius: "8px" }} />
                <Legend />
                <Bar yAxisId="left" dataKey="avgResponse" fill="#3B82F6" name="Avg Response (s)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="accuracy" fill="#10B981" name="Accuracy (%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }
};

const GAMES_LIST = [
  {
    type: "type1",
    name: "Piano Therapy Game",
    path: "/piano-reaction",
    desc: "Tests and improves cognitive reaction speeds by tapping highlighted piano keys in response to stimuli.",
    clinicalFocus: "Cognitive processing speed, manual dexterity, and hand-eye coordination.",
    hasCoordinates: false,
    icon: "🎹",
    color: "from-violet-700 to-indigo-800",
    accent: "#7C3AED",
  },
  {
    type: "board_drawing",
    name: "Shape Tracer",
    path: "/board-drawing",
    desc: "Traces complex board paths to evaluate distal hand movements, precision, and tremor control.",
    clinicalFocus: "Fine motor control, hand tremor reduction, and continuous movement precision.",
    hasCoordinates: false,
    icon: "✏️",
    color: "from-blue-700 to-cyan-800",
    accent: "#2563EB",
  },
  {
    type: "fruit_basket",
    name: "Arm Orchard",
    path: "/fruit-basket",
    desc: "Grasp and move falling fruits into a basket using full arm gestures to improve range of motion.",
    clinicalFocus: "Gross motor coordination, shoulder/elbow articulation, and spatial reaching velocity.",
    hasCoordinates: true,
    icon: "🍎",
    color: "from-orange-600 to-amber-700",
    accent: "#EA580C",
  },
];

const PatientAnalytics = () => {
  const { isDarkMode } = useAuth();
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLevelSpanModal, setShowLevelSpanModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [newLevelSpan, setNewLevelSpan] = useState(5);
  const [isMounted, setIsMounted] = useState(false);

  const [selectedGameType, setSelectedGameType] = useState("type1");
  const [selectedSession, setSelectedSession] = useState(0);
  const [pianoSubTab, setPianoSubTab] = useState("finger"); // "finger" or "ankle"

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const response = await gameService.getDetailedAnalytics(patientId);
      setAnalytics(response.analytics);
      setNewLevelSpan(response.analytics.user.currentlevelspan);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      alert("Failed to load patient analytics");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const updateLevelSpan = async () => {
    try {
      await gameService.updateLevelSpan(patientId, newLevelSpan);
      alert("Level span updated successfully!");
      setShowLevelSpanModal(false);
      loadAnalytics();
    } catch (error) {
      alert("Failed to update level span");
    }
  };

  const selectedGame = useMemo(() => {
    return GAMES_LIST.find(g => g.type === selectedGameType) || GAMES_LIST[0];
  }, [selectedGameType]);

  const activeGameData = useMemo(() => {
    if (!analytics?.games) return null;
    return analytics.games.find(g => g.type === selectedGameType) || null;
  }, [analytics, selectedGameType]);

  const sessions = useMemo(() => {
    const rawSessions = activeGameData?.sessions || [];
    if (selectedGameType === "type1") {
      return rawSessions.filter((s) => {
        const gameType = s.gameType || s.session?.gameType;
        const mode = s.mode || s.session?.mode;
        const hasCoords = (s.coordinates && s.coordinates.length > 0) || (s.session?.coordinates && s.session?.coordinates.length > 0);
        const isWrist = gameType === "piano_ankle" || mode === "piano_finger" || hasCoords;

        if (pianoSubTab === "finger") {
          return !isWrist;
        } else {
          return isWrist;
        }
      });
    }
    return rawSessions;
  }, [activeGameData, selectedGameType, pianoSubTab]);

  const overallStats = useMemo(() => {
    if (selectedGameType === "type1") {
      let totalCorrect = 0;
      let totalIncorrect = 0;
      let totalNotDone = 0;
      let totalResponseTime = 0;
      let validResponseCount = 0;
      let totalScore = 0;

      sessions.forEach(session => {
        totalScore += session.sessionScore || 0;
        const playList = session.play || session.session?.play || [];
        playList.forEach(entry => {
          if (entry.correct === 1) {
            totalCorrect++;
            if (entry.responsetime !== -1 && entry.responsetime !== undefined) {
              totalResponseTime += entry.responsetime;
              validResponseCount++;
            }
          } else if (entry.correct === -1) {
            totalIncorrect++;
            if (entry.responsetime !== -1 && entry.responsetime !== undefined) {
              totalResponseTime += entry.responsetime;
              validResponseCount++;
            }
          } else if (entry.correct === 0) {
            totalNotDone++;
          }
        });
      });

      const avgResponseTime = validResponseCount > 0 
        ? parseFloat((totalResponseTime / validResponseCount).toFixed(2))
        : 0;

      const accuracy = (totalCorrect + totalIncorrect + totalNotDone) > 0
        ? parseFloat(((totalCorrect / (totalCorrect + totalIncorrect + totalNotDone)) * 100).toFixed(2))
        : 0;

      return {
        totalSessions: sessions.length,
        totalScore,
        totalCorrect,
        totalIncorrect,
        totalNotDone,
        avgResponseTime,
        accuracy
      };
    }

    return activeGameData?.overallStats || {
      totalSessions: 0,
      totalScore: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      totalNotDone: 0,
      avgResponseTime: 0,
      accuracy: 0
    };
  }, [activeGameData, selectedGameType, sessions]);

  const reversedSessions = useMemo(() => [...sessions].reverse(), [sessions]);
  const selectedSessionData = useMemo(() => reversedSessions[selectedSession], [reversedSessions, selectedSession]);
  const sessionObject = useMemo(() => selectedSessionData?.session || selectedSessionData, [selectedSessionData]);
  const selectedCoordinates = useMemo(() => sessionObject?.coordinates || [], [sessionObject]);
  const selectedBoardDrawingAttempts = useMemo(
    () =>
      sessionObject?.boardDrawingAttempts ||
      selectedSessionData?.boardDrawingAttempts ||
      selectedSessionData?.session?.boardDrawingAttempts ||
      [],
    [sessionObject, selectedSessionData],
  );

  const scatterData = useMemo(() => {
    return selectedSessionData?.play?.map((entry, index) => ({
      attempt: index + 1,
      responsetime:
        entry.responsetime === -1
          ? analytics?.user?.currentlevelspan + 0.5
          : entry.responsetime,
      actualTime: entry.responsetime,
      correct: entry.correct,
      color:
        entry.correct === 1
          ? "#10b981"
          : entry.correct === -1
            ? "#ef4444"
            : "#f59e0b",
    })) || [];
  }, [selectedSessionData, analytics]);

  const sessionPerformanceData = useMemo(() => {
    return sessions.map((session, index) => {
      const correct = session.play?.filter((p) => p.correct === 1).length || 0;
      const incorrect = session.play?.filter((p) => p.correct === -1).length || 0;
      const notDone = session.play?.filter((p) => p.correct === 0).length || 0;

      return {
        name: `S${index + 1}`,
        date: new Date(session.time).toLocaleDateString(),
        correct,
        incorrect,
        notDone,
        total: session.play?.length || 0,
      };
    });
  }, [sessions]);

  const pieData = useMemo(() => {
    return [
      {
        name: "Correct",
        value: overallStats.totalCorrect,
        color: "#10b981",
      },
      {
        name: "Incorrect",
        value: overallStats.totalIncorrect,
        color: "#ef4444",
      },
      {
        name: "Not Done",
        value: overallStats.totalNotDone,
        color: "#f59e0b",
      },
    ];
  }, [overallStats]);

  const avgResponseTimeTrend = useMemo(() => {
    return sessions.map((session, index) => {
      const validResponses = session.play?.filter((p) => p.responsetime !== -1) || [];
      const avgTime =
        validResponses.length > 0
          ? (
              validResponses.reduce((sum, p) => sum + p.responsetime, 0) /
              validResponses.length
            ).toFixed(2)
          : 0;

      return {
        session: `S${index + 1}`,
        avgResponseTime: parseFloat(avgTime),
        levelspan: session.levelspan,
      };
    });
  }, [sessions]);

  const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-900 p-3 rounded-lg shadow-xl border dark:border-gray-800 text-xs">
          <p className="font-bold text-gray-800 dark:text-gray-100 mb-1">
            Attempt #{data.attempt}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Time:{" "}
            <span className="font-semibold text-blue-600">
              {data.actualTime === -1 ? "Exceeded" : `${data.actualTime}s`}
            </span>
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Status:{" "}
            <span
              className={`font-semibold ${
                data.correct === 1
                  ? "text-green-600"
                  : data.correct === -1
                    ? "text-red-600"
                    : "text-yellow-600"
              }`}
            >
              {data.correct === 1
                ? "✓ Correct"
                : data.correct === -1
                  ? "✗ Incorrect"
                  : "⊘ Not Done"}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-black" : "bg-gray-50"}`}
      >
        <div className="text-primary-500 text-xl animate-pulse font-bold">
          Loading analytics...
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-black" : "bg-gray-50"}`}
      >
        <div className="text-gray-500 text-xl font-bold">No data available</div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-4 md:p-6 transition-colors duration-500 ${isDarkMode ? "bg-black text-white" : "bg-gray-50 text-gray-800"}`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-premium p-8 mb-6 border dark:border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <button
              onClick={() => navigate("/doctor/dashboard")}
              className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLevelSpanModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-secondary-600 transition shadow-lg"
              >
                <Settings className="w-5 h-5" />
                Update Level Span
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-600 transition shadow-lg"
              >
                <Settings className="w-5 h-5" />
                Configure Parameters
              </button>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              Patient Analytics
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xl font-medium mb-3">
              {analytics.user.email}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                Default Level Span: {analytics.user.currentlevelspan} seconds
              </span>
            </div>
          </div>
        </div>

        {/* Game Selector Tabs */}
        <div className="flex flex-wrap gap-2 bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 mb-6 shadow-sm">
          {GAMES_LIST.map(g => {
            const gameData = analytics.games?.find(game => game.type === g.type);
            const playCount = gameData?.overallStats?.totalSessions || 0;
            return (
              <button
                key={g.type}
                onClick={() => { setSelectedGameType(g.type); setSelectedSession(0); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedGameType === g.type
                    ? 'bg-gray-900 text-white shadow-md dark:bg-white dark:text-gray-900'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-base">{g.icon}</span>
                <span>{g.name}</span>
                {playCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-[9px] font-bold">
                    {playCount}
                  </span>
                )}
                {selectedGameType === g.type && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sub-tab Selector for Piano Therapy Game */}
        {selectedGameType === "type1" && (
          <div className="flex gap-2 p-1.5 bg-gray-100/80 dark:bg-gray-950/40 backdrop-blur-md rounded-2xl border border-gray-200/50 dark:border-gray-800/50 mb-6 max-w-md">
            <button
              onClick={() => { setPianoSubTab("finger"); setSelectedSession(0); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 ${
                pianoSubTab === "finger"
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <span>🖐️</span>
              <span>Finger Dexterity</span>
            </button>
            <button
              onClick={() => { setPianoSubTab("ankle"); setSelectedSession(0); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 ${
                pianoSubTab === "ankle"
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <span>⌚</span>
              <span>Wrist Movement</span>
            </button>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="text-7xl mb-4">{selectedGame?.icon}</div>
            <p className="text-xl font-bold text-gray-400 mb-2">No sessions recorded yet</p>
            <p className="text-gray-500 max-w-sm mx-auto">This patient has not played {selectedGame?.name} yet.</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-primary-100">Total Sessions</p>
                  <TrendingUp className="w-6 h-6" />
                </div>
                <p className="text-4xl font-bold">
                  {overallStats.totalSessions}
                </p>
              </div>

              <div className="bg-gradient-to-br from-success-500 to-success-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-green-100">Accuracy</p>
                  <Target className="w-6 h-6" />
                </div>
                <p className="text-4xl font-bold">
                  {overallStats.accuracy.toFixed(1)}%
                </p>
                <p className="text-xs text-green-100 mt-1">
                  {overallStats.totalCorrect} correct /{" "}
                  {overallStats.totalCorrect + overallStats.totalIncorrect} attempted
                </p>
              </div>

              <div className="bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-yellow-100">Avg Response</p>
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-4xl font-bold">
                  {overallStats.avgResponseTime}s
                </p>
                <p className="text-xs text-yellow-100 mt-1">Valid responses only</p>
              </div>

              <div className="bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-purple-100">Session Points</p>
                  <Zap className="w-6 h-6" />
                </div>
                <p className="text-4xl font-bold">{overallStats.totalScore}</p>
                <p className="text-xs text-purple-100 mt-1">
                  Cumulative Game Score
                </p>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Scatter Plot */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-premium p-8 border dark:border-gray-800">
                <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">
                  Response Time Analysis
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Selected Session {reversedSessions.length - selectedSession} - Individual response times
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Green = Correct, Red = Incorrect, Yellow = Not Done (exceeded{" "}
                    {selectedSessionData?.levelspan || analytics.user.currentlevelspan}s)
                  </span>
                </p>
                {scatterData.length > 0 ? (
                  <div className="h-[300px]">
                    {isMounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            type="number"
                            dataKey="attempt"
                            name="Attempt"
                            label={{
                              value: "Attempt Number",
                              position: "insideBottom",
                              offset: -10,
                            }}
                          />
                          <YAxis
                            type="number"
                            dataKey="responsetime"
                            name="Time"
                            label={{
                              value: "Response Time (s)",
                              angle: -90,
                              position: "insideLeft",
                            }}
                            domain={[0, (selectedSessionData?.levelspan || analytics.user.currentlevelspan) + 1]}
                          />
                          <Tooltip content={<CustomScatterTooltip />} />
                          <Scatter data={scatterData} fill="#8884d8">
                            {scatterData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    No attempt data available for this session
                  </div>
                )}
              </div>

              {/* Bar Chart */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-premium p-8 border dark:border-gray-800">
                <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">
                  Session Performance
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Correct vs Incorrect vs Not Done per session
                </p>
                {sessionPerformanceData.length > 0 ? (
                  <div className="h-[300px]">
                    {isMounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sessionPerformanceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="correct" fill="#10b981" name="Correct" />
                          <Bar
                            dataKey="incorrect"
                            fill="#ef4444"
                            name="Incorrect"
                          />
                          <Bar dataKey="notDone" fill="#f59e0b" name="Not Done" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    No session data available
                  </div>
                )}
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-premium p-8 border dark:border-gray-800">
                <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">
                  Overall Distribution
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  All attempts across all sessions
                </p>
                <div className="h-[300px]">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent, value }) =>
                            `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-premium p-8 border dark:border-gray-800">
                <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">
                  Response Time Trend
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Average response time per session
                </p>
                {avgResponseTimeTrend.length > 0 ? (
                  <div className="h-[300px]">
                    {isMounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={avgResponseTimeTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="session" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="avgResponseTime"
                            stroke="#667eea"
                            strokeWidth={3}
                            dot={{ fill: "#667eea", r: 6 }}
                            name="Avg Response Time (s)"
                          />
                          <Line
                            type="monotone"
                            dataKey="levelspan"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: "#f59e0b", r: 4 }}
                            name="Level Span (s)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    No trend data available
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Session Replay and Analysis */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-premium p-8 border dark:border-gray-800 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b dark:border-gray-800 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">
                    Detailed Session Analysis
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                    Select a session below to view granular telemetry, paths, and response metrics.
                  </p>
                </div>
                {selectedSessionData && (() => {
                  const isBoard = selectedGameType === "board_drawing";
                  const total = isBoard
                    ? (selectedSessionData.boardDrawingAttempts?.length || 0)
                    : (selectedSessionData.play?.length || 0);
                  const correct = isBoard
                    ? (selectedSessionData.boardDrawingAttempts?.filter(a => a.success).length || 0)
                    : (selectedSessionData.play?.filter(p => p.correct === 1).length || 0);
                  const incorrect = isBoard
                    ? (selectedSessionData.boardDrawingAttempts?.filter(a => !a.success).length || 0)
                    : (selectedSessionData.play?.filter(p => p.correct === -1).length || 0);
                  const timeouts = isBoard
                    ? 0
                    : (selectedSessionData.play?.filter(p => p.correct === 0).length || 0);

                  return (
                    <div className="flex gap-2 text-xs">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold rounded-full border border-blue-200 dark:border-blue-800/50">
                        🎯 {total} total
                      </span>
                      <span className="px-2.5 py-1 bg-green-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold rounded-full border border-green-200 dark:border-emerald-800/50">
                        ✓ {correct} correct
                      </span>
                      <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold rounded-full border border-red-200 dark:border-red-800/50">
                        ✗ {incorrect} wrong
                      </span>
                      {!isBoard && timeouts > 0 && (
                        <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold rounded-full border border-amber-200 dark:border-amber-800/50">
                          ⏳ {timeouts} timeouts
                        </span>
                      )}
                      <span className="px-2.5 py-1 bg-yellow-50 dark:bg-amber-900/25 text-amber-800 dark:text-amber-200 font-bold rounded-full border border-yellow-200 dark:border-amber-800/50">
                        ⭐ {selectedSessionData.sessionScore || 0} score
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Session Selector Pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {reversedSessions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedSession(i)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all border ${
                      selectedSession === i
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-md font-black'
                        : 'bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-850'
                    }`}
                  >
                    Session {reversedSessions.length - i} · {new Date(s.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>

              {selectedSessionData ? (
                <div className="space-y-6">
                  {selectedGameType === "board_drawing" && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Shape Tracer Trajectory Replay</h3>
                      <BoardDrawingTrajectoryReplay attempts={selectedBoardDrawingAttempts} />
                      <DrawingPerformancePanel userId={patientId} />
                    </div>
                  )}

                  {selectedGameType !== "board_drawing" && (selectedGame?.hasCoordinates || (selectedGameType === "type1" && pianoSubTab === "ankle")) && selectedCoordinates.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                        {selectedGameType === "fruit_basket" ? "Arm Kinematics & Replay" : "Hand/Cursor Movement Trajectory"}
                      </h3>
                      {selectedGameType === "fruit_basket" ? (
                        <ArmReachVisualizer coordinates={selectedCoordinates} />
                      ) : (
                        <CoordinateVisualizer coordinates={selectedCoordinates} />
                      )}
                    </div>
                  )}
                  {selectedGameType === "fruit_basket" && sessionObject?.play && sessionObject.play.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-150 dark:border-gray-700 shadow-sm mt-6">
                      <h3 className="text-base font-bold text-gray-800 dark:text-white mb-2">Event Kinematics</h3>
                      <p className="text-xs text-gray-400 mb-4">Joint angles recorded at each fruit interaction moment.</p>

                      {/* Session Meta */}
                      {sessionObject.sessionMeta && (
                        <div className="flex flex-wrap gap-3 mb-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            sessionObject.sessionMeta.mode === 'ASSISTIVE'
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            Mode: {sessionObject.sessionMeta.mode || '—'}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                            Left Hand: {sessionObject.sessionMeta.handFunctionLeft || '—'}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Right Hand: {sessionObject.sessionMeta.handFunctionRight || '—'}
                          </span>
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b dark:border-gray-700">
                              <th className="py-2 text-xs font-semibold text-gray-500">Event</th>
                              <th className="py-2 text-xs font-semibold text-gray-500">Hand</th>
                              <th className="py-2 text-xs font-semibold text-gray-500">Trial Time (s)</th>
                              <th className="py-2 text-xs font-semibold text-gray-500">Elbow Angle</th>
                              <th className="py-2 text-xs font-semibold text-gray-500">Shoulder Abd.</th>
                              <th className="py-2 text-xs font-semibold text-gray-500">Arm Elevation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessionObject.play
                              .filter(p => ["pick", "drop_success", "drop_miss", "timeout"].includes(p.eventName))
                              .map((entry, idx) => {
                                const fmtAngle = (v) => (v == null || v === -1) ? <span className="text-gray-300 dark:text-gray-600">N/A</span> : `${Math.round(v)}°`;
                                return (
                                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0 text-sm">
                                    <td className="py-3 font-semibold">
                                      {entry.eventName === "pick"         && <span className="px-2 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs">Pick</span>}
                                      {entry.eventName === "drop_success" && <span className="px-2 py-1 bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded text-xs">✓ Drop</span>}
                                      {entry.eventName === "drop_miss"    && <span className="px-2 py-1 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded text-xs">✗ Miss</span>}
                                      {entry.eventName === "timeout"      && <span className="px-2 py-1 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs">⏱ Timeout</span>}
                                    </td>
                                    <td className="py-3 text-xs font-bold">
                                      {entry.hand === "Left"  && <span className="text-indigo-500">◀ Left</span>}
                                      {entry.hand === "Right" && <span className="text-emerald-500">Right ▶</span>}
                                      {!entry.hand && <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{entry.trialDurationSec != null ? entry.trialDurationSec.toFixed(2) : '--'}</td>
                                    <td className="py-3 text-orange-500 font-bold font-mono text-xs">{fmtAngle(entry.elbowAngle)}</td>
                                    <td className="py-3 text-amber-500 font-bold font-mono text-xs">{fmtAngle(entry.shoulderAngle)}</td>
                                    <td className="py-3 text-indigo-500 font-bold font-mono text-xs">{fmtAngle(entry.verticalAngle)}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedGameType === "type1" && pianoSubTab === "finger" && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                        {sessionObject?.mode === 'mobile' ? 'Mobile Finger Dexterity Analytics' : 'Laptop Movement Analytics'}
                      </h3>
                      <PianoReactionGameAnalytics
                        session={sessionObject}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  No session selected or available.
                </div>
              )}
            </div>

            {/* Session History Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-premium p-8 border dark:border-gray-800">
              <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-6 tracking-tight">
                Session History
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-100 dark:border-gray-800">
                      <th className="text-left py-4 px-4 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                        Date
                      </th>
                      <th className="text-left py-4 px-4 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                        Level Span
                      </th>
                      <th className="text-left py-4 px-4 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                        Attempts
                      </th>
                      <th className="text-left py-4 px-4 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                        Correct
                      </th>
                      <th className="text-left py-4 px-4 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                        Incorrect
                      </th>
                      <th className="text-left py-4 px-4 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                        Not Done
                      </th>
                      <th className="text-left py-4 px-4 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                        Accuracy
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reversedSessions.map((session, index) => {
                      const correct = session.play?.filter(
                        (p) => p.correct === 1,
                      ).length || 0;
                      const incorrect = session.play?.filter(
                        (p) => p.correct === -1,
                      ).length || 0;
                      const notDone = session.play?.filter(
                        (p) => p.correct === 0,
                      ).length || 0;
                      const accuracy =
                        correct + incorrect > 0
                          ? ((correct / (correct + incorrect)) * 100).toFixed(1)
                          : 0;

                      return (
                        <tr
                          key={index}
                          onClick={() => setSelectedSession(index)}
                          className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                            selectedSession === index ? 'bg-primary-50/40 dark:bg-primary-900/25 font-semibold' : ''
                          }`}
                        >
                          <td className="py-4 px-4 text-sm">
                            {new Date(session.time).toLocaleString()}
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-xs font-bold">
                              {session.levelspan}s
                            </span>
                          </td>
                          <td className="py-4 px-4 font-bold text-sm tracking-tight">
                            {session.play?.length || 0}
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-bold">
                              {correct}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-bold">
                              {incorrect}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full text-xs font-bold">
                              {notDone}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-black text-primary-600 dark:text-primary-400">
                              {accuracy}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Game Parameter Config Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-500/10 p-2 rounded-xl">
                    <Settings className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">
                      Game Parameters
                    </h2>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      Configure patient-specific game difficulty and tracking zones
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConfigModal(false)}
                  className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <PatientConfigPanel patientId={patientId} userRole="doctor" />
              </div>
            </div>
          </div>
        )}

        {/* Level Span Update Modal */}
        {showLevelSpanModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-8 max-w-md w-full shadow-2xl border dark:border-gray-800">
              <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-4 tracking-tight">
                Update Level Span
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
                Adjust how many seconds the patient has to respond to each
                letter.
              </p>
              <div className="mb-8">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                  Current Level Span:{" "}
                  <span className="text-primary-500 text-3xl ml-2">
                    {newLevelSpan}s
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={newLevelSpan}
                  onChange={(e) => setNewLevelSpan(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">
                  <span>1s (Harder)</span>
                  <span>10s (Easier)</span>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={updateLevelSpan}
                  className="flex-1 bg-primary-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-600 transition shadow-xl shadow-primary-500/20"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewLevelSpan(analytics.user.currentlevelspan);
                    setShowLevelSpanModal(false);
                  }}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientAnalytics;
