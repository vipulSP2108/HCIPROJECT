import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createAssessment } from '../../services/assessmentService';
import AssessmentTopBar from './AssessmentTopBar';
import {
  ASSESSMENT_PHASES,
  ASSESSMENT_TRACKS,
  ASSESSMENT_DEFAULT_GAMES,
} from '../../constants';
import { Check, Sparkles, ArrowRight, ShieldCheck, Activity } from 'lucide-react';

const GAME_LABELS = {
  piano:         '🎹 Piano Reaction',
  fruit_basket:  '🧺 Fruit Basket',
  board_drawing: '🎨 Board Drawing',
  shape_tracing: '✏️ Shape Tracing',
};

const PHASE_INFO = {
  pre:     { label: 'Pre-Therapy',  color: '#0e88eb', desc: 'Baseline snapshot before therapy begins' },
  ongoing: { label: 'Ongoing',      color: '#f59e0b', desc: 'Periodic check-in during therapy' },
  post:    { label: 'Post-Therapy', color: '#10b981', desc: 'End-of-programme evaluation' },
};

const TRACK_INFO = {
  game:     { label: 'Track A — Game Sessions',        desc: 'Compute metrics from your existing game sessions' },
  clinical: { label: 'Track B — Clinical Tests Only',  desc: 'Run the 5 standardised clinical tests (ARAT / BBT / WMFT / FMA)' },
  both:     { label: 'Both Tracks (Recommended)',       desc: 'Full assessment: games + clinical tests combined' },
};

export default function AssessmentStartPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [phase,           setPhase]           = useState('pre');
  const [track,           setTrack]           = useState('both');
  const [label,           setLabel]           = useState('');
  const [selectedGames,   setSelectedGames]   = useState([...ASSESSMENT_DEFAULT_GAMES]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');

  const toggleGame = (gameType) => {
    setSelectedGames(prev =>
      prev.includes(gameType) ? prev.filter(g => g !== gameType) : [...prev, gameType]
    );
  };

  const handleStart = async () => {
    setError('');
    if (track !== 'clinical' && selectedGames.length === 0) {
      setError('Select at least one game for Track A.');
      return;
    }
    setLoading(true);
    try {
      const { assessment } = await createAssessment({
        phase,
        track,
        label: label.trim() || `${PHASE_INFO[phase].label} — ${new Date().toLocaleDateString()}`,
        prescribedGames: track === 'clinical' ? [] : selectedGames,
      });
      navigate(`/assessment/run/${assessment._id}`, { state: { assessment } });
    } catch (err) {
      setError(err.message || 'Failed to create assessment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col items-center">
      {/* LimbPlay Consistent Header */}
      <AssessmentTopBar
        title="Assessment Setup"
        subtitle="Configure your standardized rehabilitation session"
        backLabel="Back to Dashboard"
      />

      <div className="w-full max-w-4xl px-4 sm:px-6 mb-12">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-premium border border-gray-100/70 dark:border-gray-800 p-6 sm:p-10 transition-all">
          {/* Header Title Section */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/50 flex items-center justify-center text-primary-500 dark:text-primary-400 flex-shrink-0 shadow-sm">
              <Activity size={28} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                New Motor Assessment
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select your therapy phase and assessment track to begin collecting objective kinematic data.
              </p>
            </div>
          </div>

          {/* 1. Phase Selection */}
          <section className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              1. Assessment Phase
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ASSESSMENT_PHASES.map((p) => {
                const isSelected = phase === p;
                const info = PHASE_INFO[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPhase(p)}
                    className={`flex items-start gap-3 p-4 rounded-2xl text-left transition-all ${
                      isSelected
                        ? 'border-2 border-primary-500 bg-primary-50/80 dark:bg-primary-900/30 shadow-sm ring-2 ring-primary-500/20'
                        : 'border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100/70 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full mt-1 flex-shrink-0"
                      style={{ background: info.color }}
                    />
                    <div>
                      <div className="font-bold text-sm text-gray-900 dark:text-white">
                        {info.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                        {info.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Track Selection */}
          <section className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              2. Assessment Protocol Track
            </label>
            <div className="flex flex-col gap-3">
              {ASSESSMENT_TRACKS.map((t) => {
                const isSelected = track === t;
                const info = TRACK_INFO[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrack(t)}
                    className={`relative p-4 sm:p-5 rounded-2xl text-left transition-all ${
                      isSelected
                        ? 'border-2 border-primary-500 bg-primary-50/80 dark:bg-primary-900/25 shadow-sm ring-2 ring-primary-500/20'
                        : 'border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100/70 dark:hover:bg-gray-800'
                    }`}
                  >
                    {t === 'both' && (
                      <span className="absolute top-3 right-4 bg-primary-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                        Recommended
                      </span>
                    )}
                    <div className="font-bold text-sm text-gray-900 dark:text-white mb-0.5">
                      {info.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {info.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Game Selection (Shown for Track A or Both) */}
          {track !== 'clinical' && (
            <section className="mb-8">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                3. Therapy Games to Include (Track A)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(GAME_LABELS).map(([gameType, gameLabel]) => {
                  const isSelected = selectedGames.includes(gameType);
                  return (
                    <button
                      key={gameType}
                      type="button"
                      onClick={() => toggleGame(gameType)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm font-semibold transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100 shadow-xs'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black transition-colors ${
                          isSelected
                            ? 'bg-primary-500 text-white'
                            : 'border border-gray-300 dark:border-gray-600 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span>{gameLabel}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. Optional Label */}
          <section className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              4. Session Label (Optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`e.g. "Week 3 Baseline Check-in"`}
              maxLength={80}
              className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </section>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-black text-base rounded-2xl shadow-lg shadow-primary-500/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span>Preparing session…</span>
            ) : (
              <>
                <span>Begin Assessment Flow</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
