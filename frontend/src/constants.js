// Toggle this to false when pushing to production/Vercel
export const IS_LOCAL = true;

// ─── Lighting Detection Configuration ────────────────────────────────────────
// Toggle poor lighting detection on/off globally
export const ENABLE_LIGHTING_DETECTION = true;
// Threshold for poor lighting (0 = black, 255 = white). Lowered to 15 to allow very dim rooms.
export const LIGHTING_DETECTION_THRESHOLD = 15;
// If true, detection stops permanently once good lighting is confirmed (saves CPU).
export const LIGHTING_DETECTION_ONLY_ON_START = false;
// When ONLY_ON_START is false, how many MediaPipe frames to skip between checks.
// At ~30fps: 150 = ~5 sec, 90 = ~3 sec, 300 = ~10 sec. Higher = less CPU overhead.
export const LIGHTING_DETECTION_FRAMES_BETWEEN_CHECKS = 150;

// ─── Universal Pre-Game Calibration Configuration ──────────────────────────────
// Master toggle: if false, the interactive calibration modal is completely disabled
export const ENABLE_CALIBRATION_MODAL = true;

// Individual calibration step toggles:
// 1. Patient distance & posture framing check (shoulders & head centered in green zone)
export const CALIBRATION_ENABLE_POSITIONING = true;
// 2. Interactive 4-corner + center reachability test (Range of Motion mapping)
export const CALIBRATION_ENABLE_REACHABILITY_TEST = true;
// 3. Hand grasp / open-close gesture assessment (determines assistive mode)
export const CALIBRATION_ENABLE_HAND_GESTURE_TEST = true;
// 4. Ambient lighting quality check
export const CALIBRATION_ENABLE_LIGHTING_CHECK = true;

// Reachability assessment parameters:
export const CALIBRATION_REACH_TARGET_RADIUS = 0.08; // Normalized radius of target bubbles
export const CALIBRATION_REACH_DWELL_MS = 600;        // Dwell duration (ms) to confirm reaching target
export const CALIBRATION_MIN_SHOULDER_WIDTH = 0.12;  // Minimum normalized shoulder width
export const CALIBRATION_ALLOW_SKIP = true;          // Allow patient to skip calibration
export const CALIBRATION_AUTO_LAUNCH = false;        // Auto-launch modal when game page loads
export const CALIBRATION_AUTO_ADVANCE = true;        // Progression mode: auto-advance vs manual next button

export const API_BASE_URL = IS_LOCAL
  ? "http://localhost:5001/api"
  : "https://hci-proj.vercel.app/api";

// ─── Game Session Constants ───────────────────────────────────────────────────
// How often (in milliseconds) to log a coordinate sample during gameplay.
// Lower = more detail but larger payload. Recommended: 150–500ms.
export const COORD_SAMPLE_INTERVAL_MS = 1000; // 1 sample per second (legacy fallback)

// Per-game trajectory coordinate sampling intervals (ms).
// Lower = more detail, larger payload. Configurable from Admin Dashboard.
export const FRUIT_BASKET_COORD_SAMPLE_MS = 150;    // session-level trajectory
export const BOARD_DRAWING_COORD_SAMPLE_MS = 150;   // session-level trajectory

// Maximum number of coordinates to store per session (prevents huge payloads).
export const MAX_COORDS_PER_SESSION = 300;

// Default session duration for gameplay in seconds (e.g., 300 seconds = 5 minutes).
export const DEFAULT_SESSION_SECONDS = 300;

// ─── Game 1: Board Drawing Game Constants ──────────────────────────────────────
export const BOARD_DRAWING_CALIBRATION_SECONDS = 7;
export const BOARD_DRAWING_NUM_SHAPE_POINTS = 20;
export const BOARD_DRAWING_PICK_DISTANCE = 0.08;
export const BOARD_DRAWING_TRACE_TOLERANCE = 0.05;
export const BOARD_DRAWING_SCORE_PER_SHAPE = 10;
export const BOARD_DRAWING_MIN_COMPLETION = 0.8; // 80% points hit for success
export const BOARD_DRAWING_SMOOTH_ALPHA = 0.7;
export const BOARD_DRAWING_STABLE_FRAMES = 2;
export const BOARD_DRAWING_DRAW_FPS = 30;

// Safe zone defaults for Board Drawing Game
export const BOARD_DRAWING_DEFAULT_SAFE_ZONE_RADIUS = 0.025;     // 2.5%
export const BOARD_DRAWING_DEFAULT_WARNING_ZONE_RADIUS = 0.05;    // 5.0%

// ─── Game 2: Fruit Basket Game Constants ───────────────────────────────────────
export const FRUIT_BASKET_CALIBRATION_SECONDS = 20;
export const FRUIT_BASKET_HAND_TEST_DURATION_MS = 5000;
export const FRUIT_BASKET_GRID_ROWS = 3;
export const FRUIT_BASKET_GRID_COLS = 3;
export const FRUIT_BASKET_PICK_DISTANCE = 0.05;
export const FRUIT_BASKET_DROP_DISTANCE = 0.06;
export const FRUIT_BASKET_SCORE_PER_DROP = 10;
export const FRUIT_BASKET_SMOOTH_ALPHA = 0.7;
export const FRUIT_BASKET_STABLE_FRAMES = 2;
export const FRUIT_BASKET_DRAW_FPS = 30;
export const FRUIT_BASKET_PICK_DWELL_MS = 250;
export const FRUIT_BASKET_DROP_DWELL_MS = 250;
export const FRUIT_BASKET_TRIAL_TIMEOUT_MS = 10000;
export const FRUIT_BASKET_COOLDOWN_SECONDS = 3;
export const FRUIT_BASKET_MAX_ATTEMPTS = 3;
export const FRUIT_BASKET_ATTEMPT_TIMEOUT_SECONDS = 10;
export const FRUIT_BASKET_MIN_SHOULDER_VISIBILITY = 0.5;
export const FRUIT_BASKET_IDEAL_SHOULDER_Y_RANGE = [0.15, 0.6];
export const FRUIT_BASKET_MIN_SHOULDER_WIDTH = 0.12;

// ─── Game 3: Shape Tracing Game Constants ──────────────────────────────────────
export const SHAPE_TRACING_CALIBRATION_SECONDS = 7;
export const SHAPE_TRACING_NUM_SHAPE_POINTS = 20;
export const SHAPE_TRACING_PICK_DISTANCE = 0.08;
export const SHAPE_TRACING_TRACE_TOLERANCE = 0.03;
export const SHAPE_TRACING_SCORE_PER_SHAPE = 10;
export const SHAPE_TRACING_MIN_COMPLETION = 0.8;
export const SHAPE_TRACING_SMOOTH_ALPHA = 0.5;
export const SHAPE_TRACING_STABLE_FRAMES = 5;
export const SHAPE_TRACING_DRAW_FPS = 30;

// ─── Testing Mode Sequences ───────────────────────────────────────────────────
// These deterministic sequences are used when GlobalSettings.testingMode is true
// to ensure exact repeatability across sessions.

// Sequence of shape names to draw/trace (loops if exhausted)
// export const TESTING_SHAPE_SEQUENCE = [
//   'circle', 'triangle', 'square', 'spiral', 'infinity', 'zigzag', 'star', 'hexagon'
// ];

export const TESTING_SHAPE_SEQUENCE = [
  'circle', 'triangle', 'square', 'spiral', 'star'
];

// Sequence of key indices for Piano game (loops if exhausted)
export const TESTING_PIANO_SEQUENCE = Array.from({ length: 400 }, (_, i) => Math.floor(Math.abs(Math.sin(i * 12.9898 + 78.233)) * 9));
export const TESTING_PIANO_MOBILE_SEQUENCE = Array.from({ length: 400 }, (_, i) => Math.floor(Math.abs(Math.sin(i * 12.9898 + 78.233)) * 4));

// Sequence of {sourceIdx, basketIdx} for Fruit Basket game (loops if exhausted)
// Assuming a 3x3 grid (0-8 indices)
export const TESTING_FRUIT_BASKET_SEQUENCE = [
  { sourceIdx: 0, basketIdx: 8 },
  { sourceIdx: 2, basketIdx: 6 },
  { sourceIdx: 4, basketIdx: 0 },
  { sourceIdx: 8, basketIdx: 2 },
  { sourceIdx: 6, basketIdx: 4 },
  { sourceIdx: 1, basketIdx: 7 },
  { sourceIdx: 3, basketIdx: 5 },
  { sourceIdx: 5, basketIdx: 3 },
  { sourceIdx: 7, basketIdx: 1 },
  { sourceIdx: 0, basketIdx: 5 },
  { sourceIdx: 8, basketIdx: 3 },
  { sourceIdx: 2, basketIdx: 7 },
  { sourceIdx: 6, basketIdx: 1 },
  { sourceIdx: 4, basketIdx: 8 },
  { sourceIdx: 1, basketIdx: 6 },
  { sourceIdx: 7, basketIdx: 2 },
  { sourceIdx: 3, basketIdx: 8 },
  { sourceIdx: 5, basketIdx: 0 },
  { sourceIdx: 0, basketIdx: 7 },
  { sourceIdx: 8, basketIdx: 1 },
  { sourceIdx: 2, basketIdx: 5 },
  { sourceIdx: 6, basketIdx: 3 },
  { sourceIdx: 4, basketIdx: 6 },
  { sourceIdx: 1, basketIdx: 8 },
  { sourceIdx: 7, basketIdx: 0 },
  { sourceIdx: 3, basketIdx: 6 },
  { sourceIdx: 5, basketIdx: 2 },
  { sourceIdx: 0, basketIdx: 6 },
  { sourceIdx: 8, basketIdx: 0 },
  { sourceIdx: 2, basketIdx: 8 },
  { sourceIdx: 6, basketIdx: 2 },
  { sourceIdx: 4, basketIdx: 7 },
  { sourceIdx: 1, basketIdx: 5 },
  { sourceIdx: 7, basketIdx: 3 },
  { sourceIdx: 3, basketIdx: 7 },
  { sourceIdx: 5, basketIdx: 1 },
  { sourceIdx: 0, basketIdx: 3 },
  { sourceIdx: 8, basketIdx: 5 },
  { sourceIdx: 2, basketIdx: 4 },
  { sourceIdx: 6, basketIdx: 8 },
];

// ─── Assessment Module Constants ──────────────────────────────────────────────
// Phase labels for assessments
export const ASSESSMENT_PHASES = ['pre', 'ongoing', 'post'];
export const ASSESSMENT_TRACKS = ['game', 'clinical', 'both'];

// Default game battery prescribed for a Track A assessment
export const ASSESSMENT_DEFAULT_GAMES = ['piano', 'fruit_basket', 'board_drawing', 'shape_tracing'];

// Track A — composite score weights (must sum to 1.0)
export const ASSESSMENT_WEIGHT_MOTOR        = 0.35;
export const ASSESSMENT_WEIGHT_REACTION     = 0.35;
export const ASSESSMENT_WEIGHT_COORDINATION = 0.30;

// Track A — normalisation ceilings for composite score computation
export const ASSESSMENT_MAX_ARAT_SCORE = 57;   // ARAT full scale max
export const ASSESSMENT_MAX_RT_MS      = 1500; // RT above this → score 0
export const ASSESSMENT_MIN_RT_MS      = 150;  // RT below this → score 100

// Track B — Test 1 (Gross Arm Reach) thresholds
export const CLINICAL_REACH_TARGET_RADIUS   = 0.065; // normalised canvas radius for anatomical target (tightened from 0.10)
export const CLINICAL_REACH_FAST_THRESHOLD  = 3000;  // ms → ARAT score 3
export const CLINICAL_REACH_SLOW_THRESHOLD  = 6000;  // ms → ARAT score 2
export const CLINICAL_REACH_PARTIAL_RATIO   = 0.50;  // 50% of target radius = partial (score 1)
export const CLINICAL_REACH_COMP_THRESHOLD  = 15;    // trunk lean degrees → compensation detected
export const CLINICAL_REACH_ZONES = ['mouth', 'top_head', 'behind_head'];

// Track B — Test 2 (Object Transfer) thresholds
export const CLINICAL_TRANSFER_DURATION_SEC = 60;    // BBT standard 60-second window
export const CLINICAL_TRANSFER_ARAT_DIVISOR = 5;     // blocks per ARAT proxy point (0–3)
export const CLINICAL_TRANSFER_PICK_RADIUS  = 0.065; // normalised pickup precision radius (tightened from 0.14)
export const CLINICAL_TRANSFER_DWELL_PICK_MS = 280;  // dwell to pick a block
export const CLINICAL_TRANSFER_DWELL_DROP_MS = 280;  // dwell to drop a block
export const CLINICAL_TRANSFER_WALL_CLEAR_Y = 0.40;  // normalised Y barrier clearance threshold

// Track B — Test 3 (Finger Spread & Pinch) thresholds
export const CLINICAL_PINCH_DWELL_MS         = 600;  // required hold duration
export const CLINICAL_PINCH_CLEAN_THRESHOLD  = 0.04; // normalised tip distance → score 3
export const CLINICAL_PINCH_PARTIAL_THRESHOLD= 0.08; // normalised tip distance → score 2
export const CLINICAL_PINCH_ATTEMPT_THRESHOLD= 0.15; // normalised tip distance → score 1
export const CLINICAL_HAND_SPREAD_MIN        = 0.20; // min spread to count as full open
export const CLINICAL_PINCH_FINGERS         = ['open', 'index', 'middle', 'ring', 'pinky']; // 5 poses total, max 15pts
export const CLINICAL_PINCH_MAX_SCORE        = 15;   // 5 poses × 3 pts each

// Track B — Test 4 (Timed Reaction Strike) thresholds
export const CLINICAL_REACTION_TRIALS        = 10;   // number of reaction targets
export const CLINICAL_REACTION_TARGET_RADIUS = 0.052; // normalised canvas target size (tightened from 0.08)
export const CLINICAL_REACTION_BEST_RT_MS    = 200;  // → normalised score 10
export const CLINICAL_REACTION_WORST_RT_MS   = 1200; // → normalised score 0

// Track B — Test 5 (ROM Sweep) thresholds (degrees)
export const CLINICAL_ROM_SHOULDER_FULL      = 120;  // deg → score 3
export const CLINICAL_ROM_SHOULDER_HALF      = 75;   // deg → score 2
export const CLINICAL_ROM_SHOULDER_LOW       = 30;   // deg → score 1
export const CLINICAL_ROM_ELBOW_FULL         = 140;  // deg → score 3
export const CLINICAL_ROM_ELBOW_HALF         = 90;   // deg → score 2
export const CLINICAL_ROM_ELBOW_LOW          = 45;   // deg → score 1
export const CLINICAL_ROM_VERTICAL_FULL      = 65;   // deg → score 3
export const CLINICAL_ROM_VERTICAL_HALF      = 40;   // deg → score 2
export const CLINICAL_ROM_VERTICAL_LOW       = 15;   // deg → score 1

// Track B — composite score weights (must sum to 1.0)
export const CLINICAL_WEIGHT_GROSS           = 0.25;
export const CLINICAL_WEIGHT_GRASP           = 0.20;
export const CLINICAL_WEIGHT_PINCH           = 0.25;
export const CLINICAL_WEIGHT_REACTION        = 0.15;
export const CLINICAL_WEIGHT_ROM             = 0.15;

// Combined Track A + Track B overall score weights
export const ASSESSMENT_COMBINED_GAME_WEIGHT     = 0.50;
export const ASSESSMENT_COMBINED_CLINICAL_WEIGHT = 0.50;

// ─── MCID (Minimal Clinically Important Difference) for frontend badges ───────
// Source: Beebe & Lang (2009), van der Lee et al., Chen et al. for FMA
export const CLINICAL_MCID_GROSS_SCORE         = 1;    // ARAT Gross: 1 pt
export const CLINICAL_MCID_BLOCKS_TRANSFERRED  = 5.5;  // BBT: 5.5 blocks (Lang et al.)
export const CLINICAL_MCID_PINCH_SCORE         = 1;    // ARAT Pinch: 1 pt
export const CLINICAL_MCID_REACTION_SCORE      = 0.5;  // WMFT Proxy: 0.5 pts
export const CLINICAL_MCID_ROM_SCORE           = 1;    // FMA Proximal: ~1 pt tier (~4°)
export const CLINICAL_MCID_OVERALL_SCORE       = 5;    // Overall composite: 5 pts
