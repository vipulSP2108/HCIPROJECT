import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAssessment, linkGameSession, finaliseAssessment, abandonAssessment } from '../../services/assessmentService';
import AssessmentTopBar from './AssessmentTopBar';
import { CheckCircle2, ArrowRight, Play, AlertCircle, XCircle } from 'lucide-react';

const GAME_ROUTES = {
  piano:         '/piano-reaction',
  fruit_basket:  '/fruit-basket',
  board_drawing: '/board-drawing',
  shape_tracing: '/shape-tracing',
};

const GAME_LABELS = {
  piano:         '🎹 Piano Reaction',
  fruit_basket:  '🧺 Fruit Basket',
  board_drawing: '🎨 Board Drawing',
  shape_tracing: '✏️ Shape Tracing',
};

const CLINICAL_ROUTE = '/assessment/clinical';
const PHASE_BADGE_CLASSES = {
  pre: 'bg-primary-500 text-white',
  ongoing: 'bg-amber-500 text-white',
  post: 'bg-emerald-500 text-white',
};

export default function AssessmentRunPage() {
  const { id: assessmentId }         = useParams();
  const { state: navState }          = useLocation();
  const navigate                     = useNavigate();
  const { user }                     = useAuth();

  const [assessment, setAssessment]  = useState(navState?.assessment || null);
  const [loading, setLoading]        = useState(!navState?.assessment);
  const [error, setError]            = useState('');
  const [finalising, setFinalising]  = useState(false);

  // Fetch assessment if not passed via state
  useEffect(() => {
    if (!assessment) {
      getAssessment(assessmentId)
        .then(data => setAssessment(data.assessment))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [assessmentId, assessment]);

  // Listen for game session save events from child game pages
  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data?.type !== 'ASSESSMENT_GAME_DONE') return;
      const { gameType, gameSessionId } = event.data;
      try {
        await linkGameSession(assessmentId, { gameType, gameSessionId });
        const updated = await getAssessment(assessmentId);
        setAssessment(updated.assessment);
      } catch (err) {
        console.error('[AssessmentRunPage] linkGameSession error:', err);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [assessmentId]);

  const handleFinalise = async () => {
    setFinalising(true);
    try {
      await finaliseAssessment(assessmentId);
      navigate(`/assessment/report/${assessmentId}`);
    } catch (err) {
      setError(err.message);
      setFinalising(false);
    }
  };

  const handleAbandon = async () => {
    if (!window.confirm('Abandon this assessment? Data collected so far will be lost.')) return;
    try {
      await abandonAssessment(assessmentId);
      navigate('/patient/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-bold">Loading assessment session…</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-red-200 dark:border-red-900/40 max-w-md text-center shadow-premium">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Session Error</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error || 'Assessment not found.'}</p>
          <button
            onClick={() => navigate('/patient/dashboard')}
            className="w-full py-3 bg-primary-500 text-white font-bold rounded-xl"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { prescribedGames = [], track } = assessment;
  const needsClinical = ['clinical', 'both'].includes(track);
  const clinicalDone  = Boolean(assessment.clinicalTestSessionId);
  const gamesDone     = prescribedGames.every(g => g.completed);
  const allDone       = (track === 'game' && gamesDone) ||
                        (track === 'clinical' && clinicalDone) ||
                        (track === 'both' && gamesDone && clinicalDone);

  const completedCount = prescribedGames.filter(g => g.completed).length;
  const totalSteps = prescribedGames.length + (needsClinical ? 1 : 0);
  const completedSteps = completedCount + (clinicalDone ? 1 : 0);
  const progressPct = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F4F7FE] dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col items-center">
      {/* Top Bar matching LimbPlay */}
      <AssessmentTopBar
        title="Assessment in Progress"
        subtitle={assessment.label}
        backLabel="Dashboard"
        rightContent={
          <button
            onClick={handleAbandon}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            <XCircle size={14} />
            <span>Abandon</span>
          </button>
        }
      />

      <div className="w-full max-w-4xl px-4 sm:px-6 mb-12">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-premium border border-gray-150 dark:border-gray-800 p-6 sm:p-10">
          {/* Header & Status Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${PHASE_BADGE_CLASSES[assessment.phase] || 'bg-primary-500 text-white'}`}>
                  {assessment.phase}
                </span>
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Track {track?.toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {assessment.label}
              </h2>
            </div>
            <div className="text-right sm:self-end">
              <div className="text-2xl font-black text-primary-500">
                {completedSteps} <span className="text-gray-400 text-sm font-semibold">/ {totalSteps} Steps</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">
              <span>Overall Completion</span>
              <span className="font-bold text-gray-700 dark:text-gray-300">{Math.round(progressPct)}%</span>
            </div>
          </div>

          {/* Step List */}
          <div className="flex flex-col gap-3.5 mb-8">
            {prescribedGames.map((game, idx) => (
              <StepCard
                key={game.gameType}
                number={idx + 1}
                label={GAME_LABELS[game.gameType] || game.gameType}
                completed={game.completed}
                onStart={() => navigate(GAME_ROUTES[game.gameType], {
                  state: { assessmentId, gameType: game.gameType }
                })}
              />
            ))}

            {/* Track B Step */}
            {needsClinical && (
              <StepCard
                number={prescribedGames.length + 1}
                label="🏥 Standardised Clinical Battery (ARAT / BBT / WMFT / FMA)"
                subtitle="5 interactive kinematic tests with real-time pose estimation"
                completed={clinicalDone}
                isClinical
                onStart={() => navigate(`${CLINICAL_ROUTE}/${assessmentId}`)}
              />
            )}
          </div>

          {/* Finalise Button */}
          {allDone && (
            <button
              onClick={handleFinalise}
              disabled={finalising}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {finalising ? (
                <span>Generating clinical metrics report…</span>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  <span>Finalise Session & View Clinical Report →</span>
                </>
              )}
            </button>
          )}

          {error && (
            <p className="mt-4 text-center text-red-500 text-sm font-semibold">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StepCard({ number, label, subtitle, completed, onStart, isClinical }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${
        completed
          ? 'border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-900/20'
          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/90 shadow-xs'
      }`}
    >
      <div className="flex items-center gap-3.5 sm:gap-4 flex-1">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 transition-all ${
            completed
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/50'
          }`}
        >
          {completed ? '✓' : number}
        </div>
        <div>
          <div className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
            {label}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </div>
          )}
          {isClinical && !completed && !subtitle && (
            <div className="text-xs text-primary-600 dark:text-primary-400 font-medium mt-0.5">
              5 clinical tests • ~10 min • ARAT + BBT + WMFT + FMA
            </div>
          )}
          {completed && (
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <span>Completed</span>
            </div>
          )}
        </div>
      </div>

      {!completed && (
        <button
          onClick={onStart}
          className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-primary-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer flex-shrink-0"
        >
          <span>Start</span>
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
