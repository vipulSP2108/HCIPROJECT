import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { linkGameSession } from "../../../services/assessmentService";
import { useAuth } from "../../../context/AuthContext";
import { gameService } from "../../../services/gameService";
import gameSessionBuffer from "../../../services/gameSessionBuffer";
import offlineBuffer from "../../../services/offlineBuffer";
import SaveExitButton from "../SaveExitButton";
import ExitConfirmModal from "../ExitConfirmModal";
import FullScreenLoader from "../../../components/common/FullScreenLoader";
import { COORD_SAMPLE_INTERVAL_MS, TESTING_PIANO_SEQUENCE, TESTING_PIANO_MOBILE_SEQUENCE } from "../../../constants";
import { useSettings } from "../../../context/SettingsContext";
import { patientConfigService } from "../../../services/patientConfigService";
import {
  Play,
  Pause,
  RotateCcw,
  Home,
  ArrowRight,
} from "lucide-react";
import GameImage1 from "./1.png";
import GameImage2 from "./2.png";
import GameImage3 from "./3.png";

const PRIMARY_BLUE = "#3B82F6";
const LIGHT_BLUE = "#93C5FD";

// --- Onboarding Screen ---
const OnboardingScreen = ({ onNext, currentLevelSpan, isDarkMode }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  const instructionText = `
    Welcome! This is how to play the Piano Therapy Game. 
    Step 1: WATCH. A piano key section will turn black. Your goal is to identify the active key.
    Step 2: TAP QUICKLY. Quickly tap the corresponding black section or press the matching key on your keyboard. Tapping the wrong key gives an Incorrect response.
    Step 3: BE FAST. You have ${currentLevelSpan} seconds to respond. Being too slow results in a Not Done status. 
    Tap Start Game Setup when you are ready.
  `;

  const initializeTTS = () => {
    utteranceRef.current = new SpeechSynthesisUtterance(instructionText);
    utteranceRef.current.rate = 1;
    utteranceRef.current.pitch = 1.5;

    const voices = synthRef.current.getVoices();
    const desiredVoice =
      voices.find((voice) => voice.lang.startsWith("en")) || voices[0];
    if (desiredVoice) {
      utteranceRef.current.voice = desiredVoice;
    }

    utteranceRef.current.onend = () => {
      if (isSpeaking) {
        startSpeaking();
      } else {
        setIsSpeaking(false);
      }
    };
  };

  const startSpeaking = () => {
    if (!utteranceRef.current) initializeTTS();
    if (synthRef.current.paused) {
      synthRef.current.resume();
    } else if (!synthRef.current.speaking) {
      synthRef.current.speak(utteranceRef.current);
    }
    setIsSpeaking(true);
    setIsMuted(false);
  };

  const pauseSpeaking = () => {
    synthRef.current.pause();
    setIsSpeaking(false);
  };

  const toggleMute = () => {
    if (isSpeaking) {
      pauseSpeaking();
      setIsMuted(true);
    } else if (isMuted) {
      startSpeaking();
      setIsMuted(false);
    } else {
      startSpeaking();
    }
  };

  const handleNext = () => {
    synthRef.current.cancel();
    onNext();
  };

  useEffect(() => {
    initializeTTS();
    const timer = setTimeout(startSpeaking, 500);
    const synth = synthRef.current;

    return () => {
      synth.cancel();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center p-4 md:p-10 z-50 overflow-auto transition-colors duration-300 ${isDarkMode ? "bg-black" : "bg-gray-50"}`}
    >
      <div
        className={`max-w-4xl w-full rounded-[2.5rem] shadow-2xl p-6 md:p-10 border-4 relative flex flex-col transition-all duration-300 ${isDarkMode ? "bg-gray-900 border-primary-500/30" : "bg-white border-primary-500"}`}
        style={{ maxHeight: "90vh" }}
      >
        {/* TTS Control Button */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
          <button
            onClick={toggleMute}
            className="p-3 rounded-full transition text-white shadow-lg"
            style={{ backgroundColor: PRIMARY_BLUE }}
            aria-label={
              isSpeaking ? "Pause Instructions" : "Listen to Instructions"
            }
          >
            {isSpeaking ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
          </button>
          <p
            className="text-xs text-center mt-1"
            style={{ color: PRIMARY_BLUE }}
          >
            {isSpeaking ? "Listening" : "Tap to Listen"}
          </p>
        </div>

        <div className="overflow-y-auto pr-2 mb-24">
          <h2 className="text-3xl md:text-5xl font-black text-center mb-6 tracking-tight dark:text-white">
            👋 Welcome! <span className="text-primary-500">How to Play</span>
          </h2>

          <div className="space-y-6 md:space-y-8 text-lg text-gray-700 dark:text-gray-300">
            <p className="text-xl md:text-2xl font-bold text-center">
              Follow these{" "}
              <span className="text-primary-500 underline decoration-primary-500/30 underline-offset-8">
                three simple steps
              </span>{" "}
              to excel.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="flex flex-col items-center p-6 rounded-[2rem] border-2 bg-green-50/30 dark:bg-green-900/10 border-green-500/20 dark:border-green-500/30 transition-transform hover:scale-[1.02]">
                <h3 className="text-xl font-black mb-2 text-green-600 dark:text-green-400 uppercase tracking-widest">
                  Step 1: WATCH
                </h3>
                <p className="text-center mb-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  A piano key section will turn black.
                </p>
                <div className="w-full h-32 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-gray-700 overflow-hidden shadow-inner">
                  <img
                    src={GameImage1}
                    alt="Game"
                    className="w-full h-full object-cover opacity-90"
                  />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-green-700 dark:text-green-500">
                  Goal: Identify the active key.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center p-6 rounded-[2rem] border-2 bg-red-50/30 dark:bg-red-900/10 border-red-500/20 dark:border-red-500/30 transition-transform hover:scale-[1.02]">
                <h3 className="text-xl font-black mb-2 text-red-600 dark:text-red-400 uppercase tracking-widest">
                  Step 2: TAP
                </h3>
                <p className="text-center mb-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Quickly tap the corresponding black.
                </p>
                <div className="w-full h-32 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-gray-700 overflow-hidden shadow-inner">
                  <img
                    src={GameImage2}
                    alt="Game"
                    className="w-full h-full object-cover opacity-90"
                  />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-red-700 dark:text-red-500">
                  Caution: Avoid mistakes!
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center p-6 rounded-[2rem] border-2 bg-yellow-50/30 dark:bg-yellow-900/10 border-yellow-500/20 dark:border-yellow-500/30 transition-transform hover:scale-[1.02]">
                <h3 className="text-xl font-black mb-2 text-yellow-600 dark:text-yellow-400 uppercase tracking-widest">
                  Step 3: SPEED
                </h3>
                <p className="text-center mb-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Respond within {currentLevelSpan} seconds.
                </p>
                <div className="w-full h-32 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-gray-700 overflow-hidden shadow-inner">
                  <img
                    src={GameImage3}
                    alt="Game"
                    className="w-full h-full object-cover opacity-90"
                  />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-500">
                  Warning: Don't be too slow.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Button - fixed at bottom */}
        <div className="absolute bottom-10 left-0 w-full flex justify-center">
          <button
            onClick={handleNext}
            className="flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:shadow-2xl hover:shadow-primary-500/20 transition-all transform hover:-translate-y-1 active:scale-95 shadow-xl"
          >
            Start Game Setup <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

const PlayingGame = ({
  timeRemaining,
  currentLevelSpan,
  currentNumSections,
  isPaused,
  onPause,
  onResume,
  onEnd,
  onReset,
  onBeforeSave,
  currentSection,
  feedbackSection,
  feedbackType,
  attemptCount,
  correctCount,
  incorrectCount,
  notDoneCount,
  accuracy,
  activeKeys,
  noteNames,
  keys,
  handleSectionClick,
  handleKeyPress,
  isMobile,
  isDarkMode,
  platform,
  exerciseType,
  keyboardLayout,
  mobileKeysCount,
  fingerTimeouts,
  disabledKeys,
}) => {
  const containerRef = useRef(null);
  const lastSampleTimeRef = useRef(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const PRIMARY_BLUE = "#3B82F6";
  const LIGHT_BLUE = "#93C5FD";

  const getFingerLabel = (index, totalKeys) => {
    if (platform === 'mobile') {
      if (totalKeys === 4) {
        const labels = ["🤙 Pinky", "💍 Ring", "🖐️ Middle", "✍️ Index"];
        return labels[index] || "";
      } else if (totalKeys === 5) {
        const labels = ["👍 Thumb", "✍️ Index", "🖐️ Middle", "💍 Ring", "🤙 Pinky"];
        return labels[index] || "";
      }
    } else if (platform === 'laptop' && exerciseType === 'piano_finger') {
      if (keyboardLayout === 'both') {
        const labels = [
          "🤙 L Pinky", "💍 L Ring", "🖐️ L Middle", "✍️ L Index",
          "✍️ R Index", "🖐️ R Middle", "💍 R Ring", "🤙 R Pinky"
        ];
        return labels[index] || "";
      } else if (keyboardLayout === 'left') {
        const labels = ["🤙 Pinky", "💍 Ring", "🖐️ Middle", "✍️ Index"];
        return labels[index] || "";
      } else {
        const labels = ["✍️ Index", "🖐️ Middle", "💍 Ring", "🤙 Pinky"];
        return labels[index] || "";
      }
    }
    return "";
  };

  const getFingerForKey = (key) => {
    if (!key) return "";
    const k = key.toUpperCase();
    if (platform === 'laptop') {
      if (exerciseType === 'piano_finger') {
        if (keyboardLayout === 'both') {
          if (k === 'A') return 'leftPinky';
          if (k === 'S') return 'leftRing';
          if (k === 'D') return 'leftMiddle';
          if (k === 'F') return 'leftIndex';
          if (k === 'H') return 'rightIndex';
          if (k === 'J') return 'rightMiddle';
          if (k === 'K') return 'rightRing';
          if (k === 'L') return 'rightPinky';
        } else if (keyboardLayout === 'left') {
          if (k === 'A') return 'leftPinky';
          if (k === 'S') return 'leftRing';
          if (k === 'D') return 'leftMiddle';
          if (k === 'F') return 'leftIndex';
        } else {
          if (k === 'H') return 'rightIndex';
          if (k === 'J') return 'rightMiddle';
          if (k === 'K') return 'rightRing';
          if (k === 'L') return 'rightPinky';
        }
      }
    } else {
      if (mobileKeysCount === 4) {
        const fingers = ['pinky', 'ring', 'middle', 'index'];
        const idx = activeKeys.indexOf(k);
        return fingers[idx] || null;
      } else if (mobileKeysCount === 5) {
        const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
        const idx = activeKeys.indexOf(k);
        return fingers[idx] || null;
      }
    }
    return null;
  };

  const handlePointerMove = (e) => {
    if (isPaused || !containerRef.current || exerciseType !== 'piano_ankle') return;

    const now = Date.now();
    if (now - lastSampleTimeRef.current >= COORD_SAMPLE_INTERVAL_MS) {
      lastSampleTimeRef.current = now;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const normalizedX = Math.max(0, Math.min(1, x));
      const normalizedY = Math.max(0, Math.min(1, y));

      gameSessionBuffer.addCoordinates({
        x: Math.round(normalizedX * 1000) / 1000,
        y: Math.round(normalizedY * 1000) / 1000,
        timestamp: now
      });
    }
  };

  return (
    <div
      className={`fixed inset-0 flex flex-col overflow-hidden z-50 transition-colors duration-300 ${isDarkMode ? "bg-black" : "bg-white"}`}
    >
      {/* Header */}
      <div
        className="shadow-lg p-2 md:p-3 flex items-center justify-between"
        style={{ backgroundColor: PRIMARY_BLUE, color: "white" }}
      >
        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-bold leading-tight">Piano Therapy Game</h1>
          <span className="text-[9px] md:text-[10px] text-white/90 font-bold uppercase tracking-wider hidden sm:block">
            {platform === 'laptop'
              ? `💻 Laptop Mode - ${exerciseType === 'piano_finger' ? 'Finger Dexterity' : 'Wrist Movement (Cursor Only)'}`
              : `📱 Mobile Mode - Wrist Movement (${mobileKeysCount} keys)`
            }
          </span>
        </div>
        <div className="flex gap-1 md:gap-2 items-center">
          <button
            onClick={isPaused ? onResume : onPause}
            className={`p-1.5 md:p-2 rounded-lg transition flex items-center gap-1 text-xs md:text-sm font-semibold ${isPaused ? "bg-green-500 hover:bg-green-600 text-white" : "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
              }`}
          >
            {isPaused ? (
              <><Play className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline">Resume</span></>
            ) : (
              <><Pause className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline">Pause</span></>
            )}
          </button>
          <button
            onClick={onEnd}
            className="p-1.5 md:p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-xs md:text-sm font-semibold flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">End Round</span>
          </button>
          <button
            onClick={onReset}
            className="p-1.5 md:p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            <span className="text-[10px] md:text-xs font-bold">Reset</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-1 md:gap-2 p-1.5 md:p-3 bg-white border-b">
        <div className="text-center border-r">
          <p className="text-[9px] md:text-xs text-gray-600 truncate">Time</p>
          <p className="text-sm md:text-lg font-bold text-blue-600">
            {timeRemaining !== null ? `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, "0")}` : "--:--"}
          </p>
        </div>
        <div className="text-center border-r">
          <p className="text-[9px] md:text-xs text-gray-600 truncate">Attempt</p>
          <p className="text-sm md:text-lg font-bold text-gray-800">{attemptCount}</p>
        </div>
        <div className="text-center border-r">
          <p className="text-[9px] md:text-xs truncate" style={{ color: "green" }}>
            Correct
          </p>
          <p className="text-sm md:text-lg font-bold" style={{ color: "green" }}>
            {correctCount}
          </p>
        </div>
        <div className="text-center border-r">
          <p className="text-[9px] md:text-xs truncate" style={{ color: "red" }}>
            Incorrect
          </p>
          <p className="text-sm md:text-lg font-bold" style={{ color: "red" }}>
            {incorrectCount}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] md:text-xs truncate" style={{ color: "#CCB000" }}>
            Missed
          </p>
          <p className="text-sm md:text-lg font-bold" style={{ color: "#CCB000" }}>
            {notDoneCount}
          </p>
        </div>
      </div>

      {/* Piano Sections */}
      <div className="flex-1 flex flex-col p-4">
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          className="flex-1 relative mb-6 border-4 border-gray-200 rounded-xl bg-gradient-to-br from-white to-gray-50 overflow-hidden"
        >
          <div className="h-full flex flex-col md:flex-row">
            {activeKeys.map((key, index) => {
              const isActive = currentSection === index;
              const isFeedback = index === feedbackSection;
              const resultClass = isFeedback
                ? feedbackType === "correct"
                  ? "ring-4 ring-green-500/50 scale-105"
                  : feedbackType === "incorrect"
                    ? "ring-4 ring-red-500/50 scale-105"
                    : feedbackType === "notdone"
                      ? "ring-4 ring-yellow-500/50"
                      : ""
                : "";
              const bgClass = isActive ? "bg-black" : "bg-white";
              const textClass = isActive ? "text-white" : "text-gray-400";

              const fontSize = activeKeys.length <= 4
                ? "text-6xl md:text-8xl"
                : activeKeys.length <= 6
                  ? "text-5xl md:text-7xl"
                  : "text-4xl md:text-5xl";

              const fingerLabel = getFingerLabel(index, activeKeys.length);
              const isDisabled = disabledKeys && disabledKeys.includes(key);

              return (
                <div
                  key={index}
                  id={`piano-key-${key}`}
                  className={`flex-1 flex flex-col items-center justify-center min-h-[80px] border-b md:border-b-0 md:border-r border-gray-200 transition-all duration-200 ${isActive ? "hover:bg-gray-800" : "hover:bg-gray-100"} hover:bg-gray-300 cursor-pointer ${bgClass} ${resultClass} ${isDisabled ? 'opacity-50 grayscale' : ''}`}
                  onClick={() => !isDisabled && handleSectionClick(index)}
                >
                  <div
                    className={`${fontSize} font-bold ${textClass} transition-colors duration-200 mb-1`}
                  >
                    {key}
                  </div>
                  <span
                    className={`text-sm md:text-base font-mono ${isActive ? "text-white/80" : "text-gray-500"} transition-colors duration-200`}
                  >
                    {noteNames[index]}
                  </span>
                  {fingerLabel && (
                    <span className={`block text-sm md:text-base font-bold mt-2 ${isActive ? 'text-white/95' : 'text-primary-600'}`}>
                      {fingerLabel}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
              <div className="text-3xl md:text-4xl text-yellow-500 font-bold">
                ⏸️ PAUSED
              </div>
            </div>
          )}
        </div>

        {/* Keyboard / Touch Hints */}
        {
          exerciseType === 'piano_finger' &&
          <div className="flex justify-center flex-wrap gap-2">
            {activeKeys.map((key, index) => {
              const fingerLabel = getFingerLabel(index, activeKeys.length);
              const activeFinger = getFingerForKey(key);
              const timeoutVal = (activeFinger && fingerTimeouts[activeFinger])
                ? fingerTimeouts[activeFinger]
                : currentLevelSpan;
              return (
                <div
                  key={key}
                  className="px-4 py-3 rounded-lg shadow-lg border-2 text-center touch-manipulation min-w-[70px]"
                  style={{
                    backgroundColor: LIGHT_BLUE,
                    borderColor: PRIMARY_BLUE,
                  }}
                >
                  <p className="text-xs md:text-sm text-white font-semibold">{fingerLabel || 'Key'}</p>
                  <p className="text-3xl md:text-4xl font-bold text-white">{key}</p>
                  <p className="text-sm text-white/80">{noteNames[index]}</p>
                  {(platform === 'mobile' || (platform === 'laptop' && exerciseType === 'piano_finger')) && (
                    <p className="text-xs md:text-sm text-white/95 font-bold mt-1">({timeoutVal}s)</p>
                  )}
                </div>
              );
            })}
          </div>
        }

      </div>

      <SaveExitButton onBeforeSave={onBeforeSave} onSaveStart={onPause} onSaveCancel={onResume} isMobile={isMobile} />

      {!isPaused && (
        <div
          tabIndex={-1}
          className="invisible fixed inset-0"
          onKeyDown={(e) => {
            if (exerciseType === 'piano_ankle' || exerciseType === 'piano_wrist' || platform === 'mobile') return;
            const userKey = e.key.toLowerCase();
            const activeKeysLower = activeKeys.map(k => k.toLowerCase());
            if (activeKeysLower.includes(userKey)) {
              e.preventDefault();
              handleKeyPress(e.key);
            }
          }}
          ref={(el) => el && el.focus()}
        />
      )}
    </div>
  );
};

// --- Main Game Page Component ---
const PianoReactionGame = () => {
  const { user, isDarkMode } = useAuth();
  const { globalSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const assessmentId = location.state?.assessmentId;
  const gameType = location.state?.gameType;

  // Detect screen size
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const resizeListener = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", resizeListener);
    return () => window.removeEventListener("resize", resizeListener);
  }, []);

  // Platform & Exercise Config
  const [platform, setPlatform] = useState(() => {
    const saved = localStorage.getItem("piano_platform");
    if (saved) return saved;
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isMobileSize = window.innerWidth <= 768;
    return (hasTouch && isMobileSize) ? "mobile" : "laptop";
  });

  const [patientConfig, setPatientConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  useEffect(() => {
    if (user?.id || user?._id) {
      const pId = user.id || user._id;
      console.log(`[PianoReactionGame] Fetching config for Patient ID: ${pId}`);
      patientConfigService.getConfig(pId).then(res => {
        console.log(`[PianoReactionGame] Received Config:`, res.config);
        setPatientConfig(res.config);
        setConfigLoaded(true);
      }).catch(err => {
        console.error(err);
        setConfigLoaded(true);
      });
    } else {
      setConfigLoaded(true);
    }
  }, [user]);

  const [exerciseType, setExerciseType] = useState(() => {
    return localStorage.getItem("piano_exercise_type") || "piano_ankle";
  });

  const [keyboardLayout, setKeyboardLayout] = useState(() => {
    return localStorage.getItem("piano_keyboard_layout") || "both";
  });

  const [mobileKeysCount, setMobileKeysCount] = useState(() => {
    const saved = localStorage.getItem("piano_mobile_keys_count");
    return saved ? parseInt(saved, 10) : 4;
  });

  const [fingerTimeouts, setFingerTimeouts] = useState(() => {
    const saved = localStorage.getItem("piano_finger_timeouts");
    const defaults = {
      thumb: 5, index: 5, middle: 5, ring: 5, pinky: 5,
      leftPinky: 5, leftRing: 5, leftMiddle: 5, leftIndex: 5,
      rightIndex: 5, rightMiddle: 5, rightRing: 5, rightPinky: 5
    };
    if (saved) {
      try { return { ...defaults, ...JSON.parse(saved) }; } catch (e) { }
    }
    return defaults;
  });

  const [disabledKeys, setDisabledKeys] = useState(() => {
    const saved = localStorage.getItem("piano_disabled_keys");
    return saved ? JSON.parse(saved) : [];
  });

  // Base state settings
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [currentLevelSpan, setCurrentLevelSpan] = useState(() => {
    const saved = localStorage.getItem("piano_level_span");
    return saved ? parseInt(saved, 10) : 5;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNumSections, setCurrentNumSections] = useState(() => {
    const saved = localStorage.getItem("piano_num_sections");
    return saved ? parseInt(saved, 10) : 4;
  }); // Default to 4 keys for Laptop Ankle
  const [isPaused, setIsPaused] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [currentSection, setCurrentSection] = useState(null);
  const [playData, setPlayData] = useState([]);
  const [sectionStartTime, setSectionStartTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const overallTimerRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [feedbackSection, setFeedbackSection] = useState(null);
  const [feedbackType, setFeedbackType] = useState(null);
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  const isTesting = globalSettings?.testingMode ?? false;

  const effDisabledKeys = useMemo(() => {
    if (isTesting) return globalSettings?.testingPianoDisabledKeys || [];
    const doctorStr = patientConfig?.games?.piano?.disabledKeys?.value;
    if (typeof doctorStr === 'string' && doctorStr.trim() !== '') {
      return doctorStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
    }
    return disabledKeys;
  }, [patientConfig, isTesting, globalSettings, disabledKeys]);

  const effWristKeysCount = isTesting
    ? globalSettings?.testingPianoWristKeysCount
    : patientConfig?.games?.piano?.wristKeysCount?.value;

  const effKeyTimer = isTesting
    ? globalSettings?.testingPianoKeyTimer
    : patientConfig?.games?.piano?.responseTimer?.value;

  const effWristKeyTimer = isTesting
    ? globalSettings?.testingPianoWristTimer
    : patientConfig?.games?.piano?.wristKeyTimer?.value;

  const keysAll = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
  const noteNamesAll = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
  const frequencies = [
    261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33,
  ];

  const sectionTimerRef = useRef(null);
  const lastPressedKeyRef = useRef(null);
  const lastPlayedKeyRef = useRef(null);
  const audioContextRef = useRef(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("piano_platform", platform);
  }, [platform]);

  useEffect(() => {
    localStorage.setItem("piano_exercise_type", exerciseType);
  }, [exerciseType]);

  useEffect(() => {
    localStorage.setItem("piano_keyboard_layout", keyboardLayout);
  }, [keyboardLayout]);

  useEffect(() => {
    localStorage.setItem("piano_mobile_keys_count", mobileKeysCount.toString());
  }, [mobileKeysCount]);

  useEffect(() => {
    localStorage.setItem("piano_finger_timeouts", JSON.stringify(fingerTimeouts));
  }, [fingerTimeouts]);

  useEffect(() => {
    localStorage.setItem("piano_level_span", currentLevelSpan.toString());
  }, [currentLevelSpan]);

  useEffect(() => {
    localStorage.setItem("piano_num_sections", currentNumSections.toString());
  }, [currentNumSections]);

  // Load backend configurations
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await gameService.getSettings();
        setCurrentLevelSpan(response.currentlevelspan || 5);
        setCurrentNumSections(response.currentnumsections || 4);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();

    return () => {
      if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current);
    };
  }, []);

  // Sync exerciseType with Platform
  useEffect(() => {
    if (platform === "mobile") {
      setExerciseType("piano_finger");
    }
  }, [platform]);

  const saveFingerTimeoutsToStorage = (timeouts) => {
    setFingerTimeouts(timeouts);
  };

  const getFingerKeyLabel = (fingerName) => {
    if (platform === 'mobile') {
      if (mobileKeysCount === 4) {
        if (fingerName === 'pinky') return 'A';
        if (fingerName === 'ring') return 'S';
        if (fingerName === 'middle') return 'D';
        if (fingerName === 'index') return 'F';
      } else {
        if (fingerName === 'thumb') return 'A';
        if (fingerName === 'index') return 'S';
        if (fingerName === 'middle') return 'D';
        if (fingerName === 'ring') return 'F';
        if (fingerName === 'pinky') return 'G';
      }
    } else {
      if (keyboardLayout === 'both') {
        if (fingerName === 'pinky') return 'A / L';
        if (fingerName === 'ring') return 'S / K';
        if (fingerName === 'middle') return 'D / J';
        if (fingerName === 'index') return 'F / H';
      } else if (keyboardLayout === 'left') {
        if (fingerName === 'pinky') return 'A';
        if (fingerName === 'ring') return 'S';
        if (fingerName === 'middle') return 'D';
        if (fingerName === 'index') return 'F';
      } else {
        if (fingerName === 'pinky') return 'L';
        if (fingerName === 'ring') return 'K';
        if (fingerName === 'middle') return 'J';
        if (fingerName === 'index') return 'H';
      }
    }
    return '';
  };

  const getFingerForKey = (key) => {
    if (!key) return "";
    const k = key.toUpperCase();
    if (platform === 'laptop') {
      if (exerciseType === 'piano_finger') {
        if (keyboardLayout === 'both') {
          if (k === 'A') return 'leftPinky';
          if (k === 'S') return 'leftRing';
          if (k === 'D') return 'leftMiddle';
          if (k === 'F') return 'leftIndex';
          if (k === 'H') return 'rightIndex';
          if (k === 'J') return 'rightMiddle';
          if (k === 'K') return 'rightRing';
          if (k === 'L') return 'rightPinky';
        } else if (keyboardLayout === 'left') {
          if (k === 'A') return 'leftPinky';
          if (k === 'S') return 'leftRing';
          if (k === 'D') return 'leftMiddle';
          if (k === 'F') return 'leftIndex';
        } else {
          if (k === 'H') return 'rightIndex';
          if (k === 'J') return 'rightMiddle';
          if (k === 'K') return 'rightRing';
          if (k === 'L') return 'rightPinky';
        }
      }
    } else {
      if (mobileKeysCount === 4) {
        const fingers = ['pinky', 'ring', 'middle', 'index'];
        const idx = activeKeys.indexOf(k);
        return fingers[idx] || null;
      } else if (mobileKeysCount === 5) {
        const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
        const idx = activeKeys.indexOf(k);
        return fingers[idx] || null;
      }
    }
    return null;
  };

  const activeKeys = (() => {
    if (platform === 'mobile') {
      return keysAll.slice(0, mobileKeysCount);
    } else {
      if (exerciseType === 'piano_finger') {
        if (keyboardLayout === 'both') {
          return ['A', 'S', 'D', 'F', 'H', 'J', 'K', 'L'];
        }
        return keyboardLayout === 'left' ? ['A', 'S', 'D', 'F'] : ['H', 'J', 'K', 'L'];
      } else {
        if (effWristKeysCount !== undefined) {
          return keysAll.slice(0, effWristKeysCount);
        }
        return keysAll.slice(0, currentNumSections);
      }
    }
  })();

  const noteNames = (() => {
    if (platform === 'mobile') {
      return noteNamesAll.slice(0, mobileKeysCount);
    } else {
      if (exerciseType === 'piano_finger') {
        if (keyboardLayout === 'both') {
          return ['A', 'S', 'D', 'F', 'H', 'J', 'K', 'L'];
        }
        return keyboardLayout === 'left' ? ['A', 'S', 'D', 'F'] : ['H', 'J', 'K', 'L'];
      } else {
        if (effWristKeysCount !== undefined) {
          return noteNamesAll.slice(0, effWristKeysCount);
        }
        return noteNamesAll.slice(0, currentNumSections);
      }
    }
  })();

  // Audio helpers
  const playPianoSound = (keyIndex) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequencies[keyIndex] || 261.63;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1.5);
  };

  const playFeedbackSound = (type) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    if (type === "correct") {
      if (currentSection !== null) {
        playPianoSound(currentSection);
        return;
      }
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } else if (type === "incorrect") {
      oscillator.frequency.value = 200;
      oscillator.type = "sawtooth";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else if (type === "notdone") {
      oscillator.frequency.value = 400;
      oscillator.type = "triangle";
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }
  };

  const recordLaptopMovement = (userKey) => {
    if (platform !== 'laptop') return;
    const elCurrent = document.getElementById(`piano-key-${userKey}`);
    if (elCurrent) {
      const rectCurrent = elCurrent.getBoundingClientRect();
      const currentX = rectCurrent.left + rectCurrent.width / 2 + window.scrollX;
      const currentY = rectCurrent.top + rectCurrent.height / 2 + window.scrollY;

      if (lastPressedKeyRef.current) {
        const elPrev = document.getElementById(`piano-key-${lastPressedKeyRef.current}`);
        if (elPrev) {
          const rectPrev = elPrev.getBoundingClientRect();
          const prevX = rectPrev.left + rectPrev.width / 2 + window.scrollX;
          const prevY = rectPrev.top + rectPrev.height / 2 + window.scrollY;

          const dx = currentX - prevX;
          const dy = currentY - prevY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          gameSessionBuffer.addLaptopMovement({
            fromKey: lastPressedKeyRef.current,
            toKey: userKey,
            dx: Math.round(dx * 100) / 100,
            dy: Math.round(dy * 100) / 100,
            distance: Math.round(distance * 100) / 100,
            fromX: Math.round(prevX * 100) / 100,
            fromY: Math.round(prevY * 100) / 100,
            toX: Math.round(currentX * 100) / 100,
            toY: Math.round(currentY * 100) / 100
          });
        }
      }
      lastPressedKeyRef.current = userKey;
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setIsPaused(false);
    setPlayData([]);
    setAttemptCount(0);
    setCurrentSection(null);
    setFeedbackSection(null);
    setFeedbackType(null);
    setSectionStartTime(Date.now());
    lastPressedKeyRef.current = null;
    lastPlayedKeyRef.current = null;

    // Overall Timer
    const isTesting = globalSettings?.testingMode ?? false;
    const sessionSeconds = isTesting
      ? (globalSettings?.pianoSessionSeconds || 300)
      : (patientConfig?.games?.piano?.sessionLength?.value || 300);
    setTimeRemaining(sessionSeconds);
    sessionStartTimeRef.current = Date.now();
    if (overallTimerRef.current) clearInterval(overallTimerRef.current);
    overallTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
      const remaining = Math.max(0, sessionSeconds - elapsed);
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(overallTimerRef.current);
        endGame();
      }
    }, 1000);

    const targetGameType = exerciseType;
    const targetGameName = exerciseType === 'piano_finger' ? 'Piano - Finger Dexterity' : 'Piano - Wrist Movement';

    let activeFingerTimeouts = null;
    if (platform === 'mobile' || (platform === 'laptop' && exerciseType === 'piano_finger')) {
      activeFingerTimeouts = {
        leftPinky: -1, leftRing: -1, leftMiddle: -1, leftIndex: -1,
        rightIndex: -1, rightMiddle: -1, rightRing: -1, rightPinky: -1,
        thumb: -1, index: -1, middle: -1, ring: -1, pinky: -1
      };
      activeKeys.forEach(k => {
        const f = getFingerForKey(k);
        if (f) {
          const effTimeout = effKeyTimer ?? (fingerTimeouts[f] || 5);
          activeFingerTimeouts[f] = effDisabledKeys.includes(k) ? 0 : effTimeout;
        }
      });
    }

    gameSessionBuffer.init(targetGameType, targetGameName);
    gameSessionBuffer.update({
      levelspan: currentLevelSpan,
      mode: platform,
      fingerTimeouts: activeFingerTimeouts,
      laptopMovements: [],
      mobileMovements: []
    });
    sequenceIndexRef.current = 0;
    showNextSection();
  };

  const toggleDisableKey = (key) => {
    setDisabledKeys(prev => {
      const newKeys = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem("piano_disabled_keys", JSON.stringify(newKeys));
      return newKeys;
    });
  };

  const sequenceIndexRef = useRef(0);

  const showNextSection = (prevSection = null) => {
    const current = prevSection !== null ? prevSection : currentSection;
    const effectiveDisabledKeys = effDisabledKeys;
    let validSections = activeKeys.map((key, idx) => ({ key, idx })).filter(item => !effectiveDisabledKeys.includes(item.key));

    // Exclude the last played key to ensure p=0 for it (avoid consecutive same keys)
    if (lastPlayedKeyRef.current && validSections.length > 1) {
      const filtered = validSections.filter(item => item.key !== lastPlayedKeyRef.current);
      if (filtered.length > 0) {
        validSections = filtered;
      }
    }

    let nextSectionIdx = current;

    if (globalSettings?.testingMode) {
      let seq;
      if (platform === 'mobile') {
        seq = globalSettings?.testingPianoMobileSequence?.length > 0 ? globalSettings.testingPianoMobileSequence : TESTING_PIANO_MOBILE_SEQUENCE;
      } else if (exerciseType === 'piano_finger') {
        seq = globalSettings?.testingPianoSequence?.length > 0 ? globalSettings.testingPianoSequence : TESTING_PIANO_SEQUENCE;
      } else {
        seq = globalSettings?.testingPianoWristSequence?.length > 0 ? globalSettings.testingPianoWristSequence : TESTING_PIANO_SEQUENCE;
      }
      let sequenceKeyIndex = seq[sequenceIndexRef.current % seq.length];
      let sequenceKey = keysAll[sequenceKeyIndex];
      sequenceIndexRef.current++;
      const foundIdx = activeKeys.indexOf(sequenceKey);
      if (foundIdx !== -1 && !effectiveDisabledKeys.includes(sequenceKey)) {
        nextSectionIdx = foundIdx;
      } else if (validSections.length > 0) {
        nextSectionIdx = validSections[0].idx;
      }
    } else {
      if (validSections.length > 1) {
        do {
          const randomIndex = Math.floor(Math.random() * validSections.length);
          nextSectionIdx = validSections[randomIndex].idx;
        } while (nextSectionIdx === current);
      } else if (validSections.length === 1) {
        nextSectionIdx = validSections[0].idx;
      } else {
        nextSectionIdx = 0;
      }
    }

    setCurrentSection(nextSectionIdx);
    setSectionStartTime(Date.now());
    setAttemptCount((old) => old + 1);
    if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current);

    const targetKey = activeKeys[nextSectionIdx];
    const activeFinger = getFingerForKey(targetKey);
    let timeoutSec = (activeFinger && fingerTimeouts[activeFinger])
      ? fingerTimeouts[activeFinger]
      : currentLevelSpan;
      
    // Use effective timers
    if (platform === 'mobile' || exerciseType === 'piano_finger') {
      if (effKeyTimer !== undefined) timeoutSec = effKeyTimer;
    } else {
      if (effWristKeyTimer !== undefined) timeoutSec = effWristKeyTimer;
    }

    sectionTimerRef.current = setTimeout(() => {
      if (isPlaying && !isPaused) {
        lastPlayedKeyRef.current = activeKeys[nextSectionIdx];
        recordResponse("none", -1, 0, activeKeys[nextSectionIdx]);
        if (platform === 'mobile' || (platform === 'laptop' && exerciseType === 'piano_finger')) {
          gameSessionBuffer.addMobileMovement({
            key: 'none',
            finger: 'none',
            expectedFinger: activeFinger || 'unknown',
            responsetime: -1,
            correct: 0
          });
        }
        setFeedbackSection(nextSectionIdx);
        setFeedbackType("notdone");
        playFeedbackSound("notdone");
        setTimeout(() => {
          setFeedbackSection(null);
          setFeedbackType(null);
          showNextSection(nextSectionIdx);
        }, 300);
      }
    }, timeoutSec * 1000);
  };

  const handleKeyPress = (key) => {
    if (exerciseType === 'piano_ankle' || exerciseType === 'piano_wrist' || platform === 'mobile') return;
    if (feedbackSection !== null) return;
    if (!isPlaying || isPaused || currentSection === null) return;
    const responseTime = (Date.now() - sectionStartTime) / 1000;
    const userKey = key.toUpperCase();
    const expectedKey = activeKeys[currentSection];
    lastPlayedKeyRef.current = expectedKey;
    const userIndex = activeKeys.indexOf(userKey);
    let correct;

    if (userKey === expectedKey) {
      correct = 1;
    } else if (
      activeKeys.map((k) => k.toLowerCase()).includes(key.toLowerCase())
    ) {
      correct = -1;
    } else {
      return;
    }

    if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current);
    const roundedTime = Math.round(responseTime * 10) / 10;
    recordResponse(userKey, roundedTime, correct, expectedKey);

    if (platform === 'laptop') {
      recordLaptopMovement(userKey);
    }
    if (platform === 'mobile' || (platform === 'laptop' && exerciseType === 'piano_finger')) {
      const expectedFinger = getFingerForKey(expectedKey);
      const pressedFinger = getFingerForKey(userKey);
      gameSessionBuffer.addMobileMovement({
        key: userKey,
        finger: pressedFinger || 'unknown',
        expectedFinger: expectedFinger || 'unknown',
        responsetime: roundedTime,
        correct
      });
    }

    playFeedbackSound(correct === 1 ? "correct" : "incorrect");
    setFeedbackSection(userIndex);
    setFeedbackType(correct === 1 ? "correct" : "incorrect");
    setTimeout(() => {
      setFeedbackSection(null);
      setFeedbackType(null);
      showNextSection(currentSection);
    }, 300);
  };

  const handleSectionClick = (clickedIndex) => {
    if (platform === 'laptop' && exerciseType === 'piano_finger') return; // Disable cursor/mouse triggers in keys mode!
    if (feedbackSection !== null) return;
    if (!isPlaying || isPaused || currentSection === null) return;
    const responseTime = (Date.now() - sectionStartTime) / 1000;
    const userKey = activeKeys[clickedIndex];
    const expectedKey = activeKeys[currentSection];
    lastPlayedKeyRef.current = expectedKey;
    let correct;

    if (clickedIndex === currentSection) {
      correct = 1;
    } else if (clickedIndex < activeKeys.length) {
      correct = -1;
    } else {
      return;
    }

    if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current);
    const roundedTime = Math.round(responseTime * 10) / 10;
    recordResponse(userKey, roundedTime, correct, expectedKey);

    if (platform === 'laptop') {
      recordLaptopMovement(userKey);
    }
    if (platform === 'mobile' || (platform === 'laptop' && exerciseType === 'piano_finger')) {
      const expectedFinger = getFingerForKey(expectedKey);
      const pressedFinger = getFingerForKey(userKey);
      gameSessionBuffer.addMobileMovement({
        key: userKey,
        finger: pressedFinger || 'unknown',
        expectedFinger: expectedFinger || 'unknown',
        responsetime: roundedTime,
        correct
      });
    }

    playFeedbackSound(correct === 1 ? "correct" : "incorrect");
    setFeedbackSection(clickedIndex);
    setFeedbackType(correct === 1 ? "correct" : "incorrect");
    setTimeout(() => {
      setFeedbackSection(null);
      setFeedbackType(null);
      showNextSection(currentSection);
    }, 300);
  };

  const recordResponse = (userResponse, responsetime, correct, shownKey) => {
    const entry = { responsetime, correct };
    setPlayData((prev) => [...prev, entry]);
    gameSessionBuffer.addPlayEntry(entry);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (exerciseType === 'piano_ankle') return;
      if (exerciseType === 'piano_wrist' || platform === 'mobile') return; // Disable keyboard triggers in wrist/cursor mode!
      const userKey = e.key.toLowerCase();
      const activeKeysLower = activeKeys.map(k => k.toLowerCase());
      if (activeKeysLower.includes(userKey)) {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };
    if (isPlaying && !isPaused) {
      window.addEventListener("keydown", onKeyDown);
    }
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isPaused, currentSection, exerciseType, activeKeys, currentLevelSpan]);

  const endGame = () => {
    setIsPlaying(false);
    setCurrentSection(null);
    if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current);
    if (playData.length === 0) {
      return;
    }
    const calculatedScore = playData.reduce((acc, p) => {
      if (p.correct === 1) return acc + 10;
      if (p.correct === -1) return acc - 5;
      return acc;
    }, 0);
    const finalScore = Math.max(0, calculatedScore);
    gameSessionBuffer.update({ sessionScore: finalScore });

    const playAgain = window.confirm(
      `Round complete! Score: ${finalScore}\n\nPlay another round?\n(Use the 💾 Save & Exit button when you're done to save all data.)`
    );
    if (playAgain) {
      startGame();
    }
  };

  const handleBeforeSave = () => {
    setIsPlaying(false);
    setIsPaused(true);
    if (sectionTimerRef.current) {
      clearTimeout(sectionTimerRef.current);
      sectionTimerRef.current = null;
    }
    if (overallTimerRef.current) {
      clearInterval(overallTimerRef.current);
      overallTimerRef.current = null;
    }

    const calculatedScore = playData.reduce((acc, p) => {
      if (p.correct === 1) return acc + 10;
      if (p.correct === -1) return acc - 5;
      return acc;
    }, 0);
    const finalScore = Math.max(0, calculatedScore);
    let activeFingerTimeouts = null;
    if (platform === 'mobile' || (platform === 'laptop' && exerciseType === 'piano_finger')) {
      activeFingerTimeouts = {
        leftPinky: -1, leftRing: -1, leftMiddle: -1, leftIndex: -1,
        rightIndex: -1, rightMiddle: -1, rightRing: -1, rightPinky: -1,
        thumb: -1, index: -1, middle: -1, ring: -1, pinky: -1
      };
      activeKeys.forEach(k => {
        const f = getFingerForKey(k);
        if (f) {
          activeFingerTimeouts[f] = disabledKeys.includes(k) ? 0 : (fingerTimeouts[f] || 5);
        }
      });
    }

    gameSessionBuffer.update({
      sessionScore: finalScore,
      mode: platform,
      fingerTimeouts: activeFingerTimeouts
    });
  };

  // ── Exit modal logic ──────────────────────────────────────────────────────
  const openExitModal = () => {
    if (!isPaused) pauseGame();
    setShowExitModal(true);
  };
  const openExitModalRef = React.useRef(openExitModal);
  React.useEffect(() => { openExitModalRef.current = openExitModal; });

  const handleExitSave = async () => {
    setShowExitModal(false);
    handleBeforeSave();
    setIsSavingLocal(true);

    const navigateToDashboard = () => {
      if (assessmentId) {
        navigate(`/assessment/run/${assessmentId}`);
      } else {
        navigate(user?.type === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
      }
    };

    try { 
      const response = await gameSessionBuffer.saveAndExit(); 
      if (assessmentId && response?.session?._id) {
        try {
          await linkGameSession(assessmentId, { gameType: gameType || 'piano', gameSessionId: response.session._id });
        } catch (linkErr) {
          console.error('Failed to link session to assessment:', linkErr);
        }
      }
      navigateToDashboard();
    } catch (err) { 
      console.error('Save failed:', err); 
      const saveOffline = window.confirm(
        'Network is slow or offline.\n\nWould you like to save this session to your offline buffer (OK) or delete the session (Cancel)?'
      );
      if (saveOffline) {
        const payload = gameSessionBuffer.getPayload();
        if (payload) offlineBuffer.addSession(payload);
        gameSessionBuffer.discard();
      } else {
        gameSessionBuffer.discard();
      }
      navigateToDashboard();
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleExitDiscard = () => {
    setShowExitModal(false);
    
    if (sectionTimerRef.current) {
      clearTimeout(sectionTimerRef.current);
      sectionTimerRef.current = null;
    }
    if (overallTimerRef.current) {
      clearInterval(overallTimerRef.current);
      overallTimerRef.current = null;
    }
    
    gameSessionBuffer.discard();
    if (assessmentId) {
      navigate(`/assessment/run/${assessmentId}`);
    } else {
      navigate(user?.type === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
    }
  };

  const handleExitCancel = () => {
    setShowExitModal(false);
    resumeGame();
  };

  const handleQuitOrBack = () => openExitModal();

  const pauseGame = () => {
    setIsPaused(true);
    if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current);
  };

  // Browser back-button intercept (mount-only)
  React.useEffect(() => {
    window.history.pushState({ gameGuard: true }, '');
    const onPop = () => {
      window.history.pushState({ gameGuard: true }, '');
      openExitModalRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumeGame = () => {
    setIsPaused(false);
    setSectionStartTime(Date.now());
    const targetKey = activeKeys[currentSection];
    const activeFinger = getFingerForKey(targetKey);
    const timeoutSec = (activeFinger && fingerTimeouts[activeFinger])
      ? fingerTimeouts[activeFinger]
      : currentLevelSpan;

    sectionTimerRef.current = setTimeout(() => {
      if (isPlaying && !isPaused) {
        lastPlayedKeyRef.current = activeKeys[currentSection];
        recordResponse("none", -1, 0, activeKeys[currentSection]);
        if (platform === 'mobile' || (platform === 'laptop' && exerciseType === 'piano_finger')) {
          gameSessionBuffer.addMobileMovement({
            key: 'none',
            finger: 'none',
            expectedFinger: activeFinger || 'unknown',
            responsetime: -1,
            correct: 0
          });
        }
        setFeedbackSection(currentSection);
        setFeedbackType("notdone");
        playFeedbackSound("notdone");
        setTimeout(() => {
          setFeedbackSection(null);
          setFeedbackType(null);
          showNextSection(currentSection);
        }, 300);
      }
    }, timeoutSec * 1000);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSection(null);
    setPlayData([]);
    setAttemptCount(0);
    if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current);
  };

  const saveSettings = async () => {
    try {
      await gameService.updateSettings(user.id, currentLevelSpan, currentNumSections);
      alert("Backend settings updated successfully!");
    } catch (error) {
      alert("Failed to update settings on backend");
    }
  };

  const correctCount = playData.filter((p) => p.correct === 1).length;
  const incorrectCount = playData.filter((p) => p.correct === -1).length;
  const notDoneCount = playData.filter((p) => p.correct === 0).length;
  const accuracy = correctCount + incorrectCount > 0
    ? Math.round((correctCount / (correctCount + incorrectCount)) * 100)
    : 0;

  if (!configLoaded) {
    return (
      <div className={`min-h-screen ${isDarkMode ? "bg-black text-white" : "bg-white text-gray-900"} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading Game Configuration...</p>
        </div>
      </div>
    );
  }

  if (isOnboarding) {
    return (
      <OnboardingScreen
        onNext={() => setIsOnboarding(false)}
        currentLevelSpan={currentLevelSpan}
        isDarkMode={isDarkMode}
      />
    );
  }

  if (isPlaying) {
    return (
      <PlayingGame
        timeRemaining={timeRemaining}
        currentLevelSpan={currentLevelSpan}
        currentNumSections={activeKeys.length}
        isPaused={isPaused}
        onPause={pauseGame}
        onResume={resumeGame}
        onEnd={endGame}
        onReset={resetGame}
        onBeforeSave={handleBeforeSave}
        currentSection={currentSection}
        feedbackSection={feedbackSection}
        feedbackType={feedbackType}
        attemptCount={attemptCount}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        notDoneCount={notDoneCount}
        accuracy={accuracy}
        activeKeys={activeKeys}
        noteNames={noteNames}
        keys={keysAll}
        handleSectionClick={handleSectionClick}
        handleKeyPress={handleKeyPress}
        isMobile={isMobile}
        isDarkMode={isDarkMode}
        platform={platform}
        exerciseType={exerciseType}
        keyboardLayout={keyboardLayout}
        mobileKeysCount={mobileKeysCount}
        fingerTimeouts={fingerTimeouts}
        disabledKeys={effDisabledKeys}
      />
    );
  }

  const doctorOverrideTimer = patientConfig?.games?.piano?.responseTimer?.value;
  let adminTestingOverride = null;
  if (platform === 'mobile' || exerciseType === 'piano_finger') {
    adminTestingOverride = effKeyTimer;
  } else {
    adminTestingOverride = effWristKeyTimer;
  }
  const isOverridden = adminTestingOverride !== undefined;
  const overrideTimerValue = adminTestingOverride;

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-black" : "bg-white"} text-gray-900 transition-colors duration-300 font-sans`}>
      <FullScreenLoader isSaving={isSavingLocal} />
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header Banner */}
        <div
          className="rounded-2xl shadow-xl p-6 flex flex-col md:flex-row items-center justify-between text-white transition-all hover:scale-[1.01]"
          style={{ background: `linear-gradient(135deg, ${PRIMARY_BLUE}, ${LIGHT_BLUE})` }}
        >
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Piano Therapy Game</h1>
            <p className="text-white/90 mt-1 font-medium">Coordinate, reaction, and fine-motor control rehabilitation.</p>
            <div className="flex gap-4 mt-3 text-xs font-semibold text-white/80 uppercase tracking-wider">
              <span>Platform: {platform === 'laptop' ? '💻 Laptop' : '📱 Mobile'}</span>
              <span>•</span>
              <span>Exercise: {exerciseType === 'piano_finger' ? '🖐️ Finger Dexterity' : '⌚ Wrist Movement'}</span>
              <span>•</span>
              <span>Active Keys: {activeKeys.length}</span>
            </div>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={handleQuitOrBack}
              className="p-3 bg-white/20 hover:bg-white/40 rounded-xl transition text-white backdrop-blur-md shadow-lg"
              title="Go back to Dashboard"
            >
              <Home className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Setup Configuration Panel & Setup Preview Grid */}
        <div className="gap-x-12">



          {/* Setup Preview & Start Button */}
          <div className="lg:col-span-5 space-y-6">

            {/* Piano layout preview */}
            <div className="bg-white mb-4 dark:bg-gray-900 border dark:border-gray-800 rounded-3xl p-6 shadow-xl justify-between h-full min-h-[350px]">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">🎹 Playboard Preview</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {platform === 'laptop' && exerciseType === 'piano_finger'
                    ? `Selected keyboard keys: ${activeKeys.join(', ')}`
                    : `Active interactive keys on play screen: ${activeKeys.join(', ')}`
                  }
                </p>

                {/* Visual piano grid */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden mt-6 h-36 flex bg-gray-50 dark:bg-gray-950">
                  {activeKeys.map((key, idx) => {
                    const isDisabled = disabledKeys.includes(key);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleDisableKey(key)}
                        className={`cursor-pointer border-r border-gray-200 dark:border-gray-800 last:border-0 flex-1 flex flex-col items-center justify-center p-2 transition-all ${isDisabled
                            ? 'bg-gray-200 dark:bg-gray-800 opacity-50 grayscale'
                            : 'bg-white dark:bg-gray-900 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-2xl font-black text-gray-400">{key}</span>
                        <span className="text-[10px] text-gray-400 font-mono mt-1">{noteNames[idx]}</span>
                        {isDisabled && <span className="text-[9px] text-red-500 font-bold mt-1">DISABLED</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <button
                  onClick={startGame}
                  className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl text-white font-black text-xl hover:shadow-2xl hover:shadow-blue-500/20 active:scale-95 transition-all transform animate-pulse hover:animate-none"
                  style={{ background: `linear-gradient(95deg, ${PRIMARY_BLUE}, ${LIGHT_BLUE})` }}
                >
                  <Play className="w-6 h-6 fill-current" />
                  START GAME
                </button>
              </div>
            </div>

          </div>



          {/* Setup controls */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
              <h2 className="text-2xl font-black tracking-tight text-gray-800 dark:text-white border-b pb-4 dark:border-gray-800">
                🔧 Exercise Configuration
              </h2>

              {/* 1. Platform selection */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-gray-400 mb-3">
                  1. Select Device Platform
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setPlatform('laptop');
                    }}
                    className={`flex items-center justify-center gap-3 py-4 rounded-2xl font-extrabold text-lg border-2 transition-all ${platform === 'laptop'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-400 dark:text-blue-400 scale-[1.02] shadow-lg'
                        : 'border-gray-200 text-gray-400 dark:border-gray-800 hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-200'
                      }`}
                  >
                    💻 Laptop / Desktop
                  </button>
                  <button
                    onClick={() => {
                      setPlatform('mobile');
                    }}
                    className={`flex items-center justify-center gap-3 py-4 rounded-2xl font-extrabold text-lg border-2 transition-all ${platform === 'mobile'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-400 dark:text-blue-400 scale-[1.02] shadow-lg'
                        : 'border-gray-200 text-gray-400 dark:border-gray-800 hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-200'
                      }`}
                  >
                    📱 Mobile Phone
                  </button>
                </div>
              </div>

              {/* 2. Exercise Selection */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-gray-400 mb-3">
                  2. Select Therapy Exercise
                </label>
                {platform === 'mobile' ? (
                  <div className="p-4 rounded-2xl bg-yellow-50/50 border border-yellow-200 text-yellow-800 dark:bg-yellow-950/20 dark:border-yellow-900/50 dark:text-yellow-400 text-sm font-semibold">
                    ⌚ <strong>Wrist Movement Mode only:</strong> Mobile screen touch keys are locked to wrist tap coordinates tracking. Keyboard triggers are disabled.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => setExerciseType('piano_finger')}
                      className={`flex flex-col items-center p-4 rounded-2xl font-bold border-2 transition-all text-center ${exerciseType === 'piano_finger'
                          ? 'border-blue-500 bg-blue-50/50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-400 dark:text-blue-400 scale-[1.02] shadow-lg'
                          : 'border-gray-200 text-gray-400 dark:border-gray-800 hover:border-gray-300'
                        }`}
                    >
                      <span className="text-2xl mb-1">🖐️</span>
                      <span className="text-base font-black">Finger Dexterity</span>
                      <span className="text-xs font-normal mt-1 opacity-80">Keyboard Keys Layouts</span>
                    </button>
                    <button
                      onClick={() => setExerciseType('piano_ankle')}
                      className={`flex flex-col items-center p-4 rounded-2xl font-bold border-2 transition-all text-center ${exerciseType === 'piano_ankle'
                          ? 'border-blue-500 bg-blue-50/50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-400 dark:text-blue-400 scale-[1.02] shadow-lg'
                          : 'border-gray-200 text-gray-400 dark:border-gray-800 hover:border-gray-300'
                        }`}
                    >
                      <span className="text-2xl mb-1">⌚</span>
                      <span className="text-base font-black">Wrist Movement</span>
                      <span className="text-xs font-normal mt-1 opacity-80">Cursor Clicks Only (Continuous Wrist / Mouse Tracking)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Keyboard layouts (Only Laptop + Finger Dexterity) */}
              {platform === 'laptop' && exerciseType === 'piano_finger' && (
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-gray-400 mb-3">
                    3. Keyboard Hand Layout
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => setKeyboardLayout('both')}
                      className={`py-3 rounded-xl font-bold border transition-all text-xs md:text-sm ${keyboardLayout === 'both'
                          ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                          : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      Both Hands
                    </button>
                    <button
                      onClick={() => setKeyboardLayout('left')}
                      className={`py-3 rounded-xl font-bold border transition-all text-xs md:text-sm ${keyboardLayout === 'left'
                          ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                          : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      Left Hand (A, S, D, F)
                    </button>
                    <button
                      onClick={() => setKeyboardLayout('right')}
                      className={`py-3 rounded-xl font-bold border transition-all text-xs md:text-sm ${keyboardLayout === 'right'
                          ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                          : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850'
                        }`}
                    >
                      Right Hand (H, J, K, L)
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Keys count (Only Mobile) */}
              {platform === 'mobile' && (
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-gray-400 mb-3">
                    3. Number of Mobile Taps/Keys
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setMobileKeysCount(4)}
                      className={`py-3 rounded-xl font-bold border transition-all ${mobileKeysCount === 4
                          ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                          : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      4 Keys (No Thumb)
                    </button>
                    <button
                      onClick={() => setMobileKeysCount(5)}
                      className={`py-3 rounded-xl font-bold border transition-all ${mobileKeysCount === 5
                          ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                          : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      5 Keys (With Thumb)
                    </button>
                  </div>
                </div>
              )}

              {/* 5. Speed configuration */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-gray-400 mb-3">
                  {platform === 'mobile' || (platform === 'laptop' && exerciseType === 'piano_finger')
                    ? "4. Configure Individual Finger Speeds"
                    : "3. Speed & Key Count Configuration"
                  }
                </label>

                {isOverridden ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 md:p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold mb-1">
                      {doctorOverrideTimer ? "Doctor Configuration Active" : "Testing Mode Active"}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-4">
                      Reaction timers are locked to <span className="font-bold">{overrideTimerValue} seconds</span>. Local speed adjustments are disabled.
                    </p>
                    {/* Still allow key counts in wrist mode if not overridden by testing mode */}
                    {!(platform === 'mobile' || (platform === 'laptop' && exerciseType === 'piano_finger')) && (
                      <div className="pt-4 border-t border-blue-200 dark:border-blue-800/50">
                        <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          <span>Number of Piano Keys:</span>
                          <span className="text-blue-500 font-extrabold">{currentNumSections} keys</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="9"
                          value={currentNumSections}
                          onChange={(e) => setCurrentNumSections(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    )}
                  </div>
                ) : (platform === 'mobile' || (platform === 'laptop' && exerciseType === 'piano_finger')) ? (
                  <div className="space-y-4 bg-gray-50 dark:bg-gray-950 p-4 md:p-6 rounded-2xl border dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">
                      Adjust timeout (seconds) per finger independently. Left keys represent fingers sequentially.
                    </p>

                    {/* Render corresponding active finger sliders */}
                    <div className="space-y-4">
                      {platform === 'mobile' && (
                        <>
                          {mobileKeysCount === 5 && (
                            <div className={`mt-2 transition-all ${disabledKeys.includes('A') ? 'opacity-50 grayscale' : ''}`}>
                              <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 items-center">
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" checked={!disabledKeys.includes('A')} onChange={() => toggleDisableKey('A')} className="w-5 h-5 accent-blue-500 cursor-pointer" />
                                  <span className={disabledKeys.includes('A') ? 'line-through' : ''}>👍 Thumb (Key A)</span>
                                </div>
                                <span className="text-blue-500">{fingerTimeouts.thumb}s</span>
                              </div>
                              <input
                                type="range" min="1" max="10" value={fingerTimeouts.thumb}
                                onChange={(e) => saveFingerTimeoutsToStorage({ ...fingerTimeouts, thumb: parseInt(e.target.value) })}
                                disabled={disabledKeys.includes('A')}
                                className={`w-full h-3 md:h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none ${disabledKeys.includes('A') ? 'cursor-not-allowed' : 'cursor-pointer accent-blue-500'}`}
                              />
                            </div>
                          )}
                          {[
                            { id: 'index', label: '✍️ Index Finger', key: getFingerKeyLabel('index') },
                            { id: 'middle', label: '🖐️ Middle Finger', key: getFingerKeyLabel('middle') },
                            { id: 'ring', label: '💍 Ring Finger', key: getFingerKeyLabel('ring') },
                            { id: 'pinky', label: '🤙 Pinky', key: getFingerKeyLabel('pinky') }
                          ].map(f => (
                            <div key={f.id} className={`mt-2 transition-all ${disabledKeys.includes(f.key) ? 'opacity-50 grayscale' : ''}`}>
                              <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 items-center">
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" checked={!disabledKeys.includes(f.key)} onChange={() => toggleDisableKey(f.key)} className="w-5 h-5 accent-blue-500 cursor-pointer" />
                                  <span className={disabledKeys.includes(f.key) ? 'line-through' : ''}>{f.label} (Key {f.key})</span>
                                </div>
                                <span className="text-blue-500">{fingerTimeouts[f.id]}s</span>
                              </div>
                              <input
                                type="range" min="1" max="10" value={fingerTimeouts[f.id]}
                                onChange={(e) => saveFingerTimeoutsToStorage({ ...fingerTimeouts, [f.id]: parseInt(e.target.value) })}
                                disabled={disabledKeys.includes(f.key)}
                                className={`w-full h-3 md:h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none ${disabledKeys.includes(f.key) ? 'cursor-not-allowed' : 'cursor-pointer accent-blue-500'}`}
                              />
                            </div>
                          ))}
                        </>
                      )}

                      {platform === 'laptop' && (
                        <>
                          {['both', 'left'].includes(keyboardLayout) && (
                            <>
                              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-4 mb-2 border-b pb-1 dark:border-gray-800">Left Hand</h4>
                              {[
                                { id: 'leftPinky', label: '🤙 L Pinky', key: 'A' },
                                { id: 'leftRing', label: '💍 L Ring', key: 'S' },
                                { id: 'leftMiddle', label: '🖐️ L Middle', key: 'D' },
                                { id: 'leftIndex', label: '✍️ L Index', key: 'F' }
                              ].map(f => (
                                <div key={f.id} className={`ml-2 mt-2 transition-all ${disabledKeys.includes(f.key) ? 'opacity-50 grayscale' : ''}`}>
                                  <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 items-center">
                                    <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={!disabledKeys.includes(f.key)} onChange={() => toggleDisableKey(f.key)} className="w-5 h-5 accent-blue-500 cursor-pointer" />
                                      <span className={disabledKeys.includes(f.key) ? 'line-through' : ''}>{f.label} (Key {f.key})</span>
                                    </div>
                                    <span className="text-blue-500">{fingerTimeouts[f.id]}s</span>
                                  </div>
                                  <input
                                    type="range" min="1" max="10" value={fingerTimeouts[f.id]}
                                    onChange={(e) => saveFingerTimeoutsToStorage({ ...fingerTimeouts, [f.id]: parseInt(e.target.value) })}
                                    disabled={disabledKeys.includes(f.key)}
                                    className={`w-full h-3 md:h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none ${disabledKeys.includes(f.key) ? 'cursor-not-allowed' : 'cursor-pointer accent-blue-500'}`}
                                  />
                                </div>
                              ))}
                            </>
                          )}
                          {['both', 'right'].includes(keyboardLayout) && (
                            <>
                              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-6 mb-2 border-b pb-1 dark:border-gray-800">Right Hand</h4>
                              {[
                                { id: 'rightIndex', label: '✍️ R Index', key: 'H' },
                                { id: 'rightMiddle', label: '🖐️ R Middle', key: 'J' },
                                { id: 'rightRing', label: '💍 R Ring', key: 'K' },
                                { id: 'rightPinky', label: '🤙 R Pinky', key: 'L' }
                              ].map(f => (
                                <div key={f.id} className={`ml-2 mt-2 transition-all ${disabledKeys.includes(f.key) ? 'opacity-50 grayscale' : ''}`}>
                                  <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 items-center">
                                    <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={!disabledKeys.includes(f.key)} onChange={() => toggleDisableKey(f.key)} className="w-5 h-5 accent-blue-500 cursor-pointer" />
                                      <span className={disabledKeys.includes(f.key) ? 'line-through' : ''}>{f.label} (Key {f.key})</span>
                                    </div>
                                    <span className="text-blue-500">{fingerTimeouts[f.id]}s</span>
                                  </div>
                                  <input
                                    type="range" min="1" max="10" value={fingerTimeouts[f.id]}
                                    onChange={(e) => saveFingerTimeoutsToStorage({ ...fingerTimeouts, [f.id]: parseInt(e.target.value) })}
                                    disabled={disabledKeys.includes(f.key)}
                                    className={`w-full h-3 md:h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none ${disabledKeys.includes(f.key) ? 'cursor-not-allowed' : 'cursor-pointer accent-blue-500'}`}
                                  />
                                </div>
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 bg-gray-50 dark:bg-gray-950 p-4 md:p-6 rounded-2xl border dark:border-gray-800">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        <span>Overall Level Span:</span>
                        <span className="text-blue-500 font-extrabold">{currentLevelSpan} seconds</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={currentLevelSpan}
                        onChange={(e) => setCurrentLevelSpan(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-semibold">
                        <span>1s (Hardest)</span>
                        <span>10s (Easiest)</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        <span>Number of Piano Keys:</span>
                        <span className="text-blue-500 font-extrabold">{currentNumSections} keys</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="9"
                        value={currentNumSections}
                        onChange={(e) => setCurrentNumSections(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-semibold">
                        <span>2 (Easy)</span>
                        <span>9 (Hardest)</span>
                      </div>
                    </div>

                    <button
                      onClick={saveSettings}
                      className="w-full py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition text-xs font-bold dark:bg-blue-950/40 dark:text-blue-400"
                    >
                      💾 Sync Key/Speed Config with Account Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Current session data preview */}
        {playData.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border dark:border-gray-800">
            <div className="flex items-center justify-between border-b pb-4 mb-4 dark:border-gray-800">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">📊 Current Session Attempts</h3>
              <div className="flex gap-4 text-sm font-semibold">
                <span className="text-green-600">Correct: {correctCount}</span>
                <span className="text-red-600">Incorrect: {incorrectCount}</span>
                <span className="text-yellow-600">Not Done: {notDoneCount}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-400 text-left">
                    <th className="pb-2">Attempt</th>
                    <th className="pb-2">Response Time</th>
                    <th className="pb-2">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {playData.slice(-10).map((entry, idx) => (
                    <tr key={idx} className="border-b last:border-0 dark:border-gray-850">
                      <td className="py-2 font-mono">#{idx + 1}</td>
                      <td className="py-2 font-semibold">
                        {entry.responsetime === -1 ? 'Timed Out' : `${entry.responsetime}s`}
                      </td>
                      <td className="py-2">
                        {entry.correct === 1 ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 rounded text-xs font-bold">✓ CORRECT</span>
                        ) : entry.correct === -1 ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded text-xs font-bold">✗ INCORRECT</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 rounded text-xs font-bold">⊘ NOT DONE</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      <SaveExitButton assessmentId={assessmentId} gameType={gameType} onBeforeSave={handleBeforeSave} onSaveStart={pauseGame} onSaveCancel={resumeGame} />
      <ExitConfirmModal
        isOpen={showExitModal}
        hasPending={gameSessionBuffer.hasPending()}
        onSave={handleExitSave}
        onDiscard={handleExitDiscard}
        onCancel={handleExitCancel}
      />
    </div>
  );
};

export default PianoReactionGame;
