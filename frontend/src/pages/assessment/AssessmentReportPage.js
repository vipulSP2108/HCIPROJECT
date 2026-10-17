import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAssessment, compareAssessments, listAssessments } from '../../services/assessmentService';
import AssessmentTopBar from './AssessmentTopBar';
import { Award, TrendingUp, Activity, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const PHASE_COLORS  = { pre: '#0e88eb', ongoing: '#f59e0b', post: '#10b981' };
const PHASE_LABELS  = { pre: 'Pre-Therapy', ongoing: 'Ongoing', post: 'Post-Therapy' };

function MetricBar({ label, value, max = 100, unit = '', color = '#0e88eb', tooltip, deltaValue, invertDelta = false }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  
  let deltaUI = null;
  if (deltaValue != null && deltaValue !== 0) {
    const isPositive = deltaValue > 0;
    const isGood = invertDelta ? !isPositive : isPositive;
    const dColor = isGood ? 'text-emerald-500' : 'text-red-500';
    const sign = isPositive ? '+' : '';
    deltaUI = (
      <div className={`text-[10px] font-bold ${dColor} -mt-0.5`}>
        {sign}{typeof deltaValue === 'number' && !Number.isInteger(deltaValue) ? deltaValue.toFixed(1) : deltaValue}{unit}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-1.5" title={tooltip}>
      <div className="w-40 sm:w-48 text-xs font-semibold text-gray-600 dark:text-gray-400 truncate flex-shrink-0">
        {label}
      </div>
      <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full rounded-full transition-all duration-500 shadow-xs"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="w-20 sm:w-24 text-right flex flex-col items-end justify-center h-full">
        <div className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
          {value != null ? `${typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}${unit}` : '—'}
        </div>
        {deltaUI}
      </div>
    </div>
  );
}

function RawMetric({ label, value, unit = '', deltaValue, invertDelta = false }) {
  if (value == null) return null;
  
  let deltaUI = null;
  if (deltaValue != null && deltaValue !== 0) {
    const isPositive = deltaValue > 0;
    const isGood = invertDelta ? !isPositive : isPositive;
    const color = isGood ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10';
    const sign = isPositive ? '+' : '';
    deltaUI = (
      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>
        {sign}{deltaValue}{unit}
      </span>
    );
  }

  return (
    <div className="flex flex-col p-3 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-150 dark:border-gray-700 shadow-sm">
      <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase">{label}</div>
      <div className="flex items-center mt-1">
        <span className="text-sm font-black text-gray-900 dark:text-white">
          {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}{unit}
        </span>
        {deltaUI}
      </div>
    </div>
  );
}

function ScoreBadge({ score, size = 'md', label, color = '#0e88eb' }) {
  const isLg = size === 'lg';
  return (
    <div
      className={`rounded-3xl flex flex-col items-center justify-center transition-all ${
        isLg ? 'w-28 h-28 p-3 shadow-md' : 'w-20 h-20 p-2 shadow-xs'
      }`}
      style={{
        border: `3px solid ${color}`,
        background: `${color}12`,
      }}
    >
      <div
        className={`font-black tracking-tight leading-none ${isLg ? 'text-3xl' : 'text-xl'}`}
        style={{ color }}
      >
        {score != null ? score : '—'}
      </div>
      {label && (
        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">
          {label}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children, accentColor = '#0e88eb' }) {
  return (
    <div className="bg-gray-50/70 dark:bg-gray-800/40 rounded-2xl border border-gray-150 dark:border-gray-800 p-5 sm:p-6 mb-6 transition-all">
      <div className="flex items-center gap-2.5 font-bold text-base text-gray-900 dark:text-white mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="tracking-tight" style={{ color: accentColor }}>{title}</h3>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export default function AssessmentReportPage() {
  const { id: assessmentId } = useParams();
  const navigate             = useNavigate();

  const [assessment, setAssessment]   = useState(null);
  const [otherAssess, setOtherAssess] = useState([]);
  const [compareId, setCompareId]     = useState('');
  const [delta, setDelta]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [{ assessment: a }, { assessments: all }] = await Promise.all([
          getAssessment(assessmentId),
          listAssessments(),
        ]);
        setAssessment(a);
        setOtherAssess(all.filter(x => x._id !== assessmentId && x.status === 'completed'));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [assessmentId]);

  const handleCompare = async () => {
    if (!compareId) return;
    try {
      const result = await compareAssessments(compareId, assessmentId);
      setDelta(result);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-bold">Loading clinical report…</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-red-200 dark:border-red-900/40 max-w-md text-center shadow-premium">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Report Error</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error || 'Report not found.'}</p>
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

  const gm = assessment.gameMetrics     || {};
  const cm = assessment.clinicalMetrics || {};
  const hasGame     = assessment.track !== 'clinical';
  const hasClinical = assessment.track !== 'game';

  return (
    <div className="min-h-screen bg-[#F4F7FE] dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col items-center">
      {/* LimbPlay Top Bar */}
      <AssessmentTopBar
        title="Assessment Report"
        subtitle={assessment.label || 'Standardised Motor Progress Summary'}
        backLabel="Dashboard"
      />

      <div className="w-full max-w-4xl px-4 sm:px-6 mb-12">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-premium border border-gray-150 dark:border-gray-800 p-6 sm:p-10">
          {/* Header Metadata Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full text-white"
                  style={{ background: PHASE_COLORS[assessment.phase] || '#0e88eb' }}
                >
                  {PHASE_LABELS[assessment.phase] || assessment.phase}
                </span>
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Track {assessment.track?.toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {assessment.label || 'Assessment Report'}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1.5">
                <Clock size={13} />
                <span>{new Date(assessment.completedAt || assessment.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
              </p>
            </div>
          </div>

          {/* Overview Score Badges */}
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start mb-8 p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800">
            <ScoreBadge score={assessment.overallScore} size="lg" label="Overall" color="#0e88eb" />
            {assessment.overallUncappedScore != null && (
              <ScoreBadge score={assessment.overallUncappedScore} size="lg" label="Kinematic pts" color="#f59e0b" />
            )}
            {hasGame && (
              <>
                <ScoreBadge score={gm.summary_motorFunction} label="Motor" color="#10b981" />
                <ScoreBadge score={gm.summary_reaction}      label="Reaction" color="#f59e0b" />
                <ScoreBadge score={gm.summary_coordination}  label="Coord." color="#d946ef" />
              </>
            )}
            {hasClinical && (
              <ScoreBadge score={cm.clinical_overallScore} label="Clinical" color="#2B91D4" />
            )}
          </div>

          {/* Longitudinal Compare Panel */}
          {otherAssess.length > 0 && (
            <div className="bg-primary-50/60 dark:bg-gray-800/70 border border-primary-200 dark:border-gray-700 rounded-2xl p-4 sm:p-5 mb-8">
              <p className="text-xs font-bold text-primary-800 dark:text-primary-300 uppercase tracking-wider mb-2">
                Longitudinal Assessment Comparison:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={compareId}
                  onChange={(e) => setCompareId(e.target.value)}
                  className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select past session to compare…</option>
                  {otherAssess.map((a) => (
                    <option key={a._id} value={a._id}>
                      {PHASE_LABELS[a.phase]} — {a.label || new Date(a.completedAt || a.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCompare}
                  disabled={!compareId}
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  Compare Delta →
                </button>
              </div>
              {delta && delta.overallScore_delta != null && (
                <div className={`mt-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 ${delta.overallScore_delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  <TrendingUp size={16} />
                  <span>Overall score changed by {delta.overallScore_delta >= 0 ? '+' : ''}{delta.overallScore_delta} points</span>
                </div>
              )}
            </div>
          )}

          {/* Track B: Clinical Battery Results */}
          {hasClinical && (
            <Section title="Standardised Clinical Battery (Track B)" icon="🏥" accentColor="#0e88eb">
              <MetricBar label="Gross Arm Reach" value={cm.gross_totalScore}              max={9}  color="#0e88eb" tooltip="ARAT Gross Movement proxy (max 9)" />
              <MetricBar label="Object Transfer"  value={cm.transfer_blocksTransferred}   max={30} color="#f59e0b" unit=" blocks" tooltip="Box-and-Block Test (60s)" />
              <MetricBar label="Finger Pinch"     value={cm.pinch_totalScore}             max={15} color="#10b981" tooltip="ARAT Pinch proxy (max 15: Open spread + 4 finger pinches)" />
              <MetricBar label="Reaction Strike"  value={cm.reaction_reactionScore}       max={10} color="#ef4444" tooltip="WMFT timed task proxy (0–10)" />
              <MetricBar label="ROM Sweep"         value={cm.rom_totalScore}               max={9}  color="#8b5cf6" tooltip="FMA proximal ROM proxy (max 9)" />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 mt-3 border-t border-gray-200 dark:border-gray-700/60">
                <RawMetric label="Shoulder ROM" value={cm.rom_maxShoulderAbduction} unit="°" deltaValue={delta?.clinical_rom_maxShoulderAbduction_delta} />
                <RawMetric label="Elbow ROM" value={cm.rom_maxElbowExtension} unit="°" deltaValue={delta?.clinical_rom_maxElbowExtension_delta} />
                <RawMetric label="Vertical Reach" value={cm.rom_maxVerticalAngle} unit="°" deltaValue={delta?.clinical_rom_maxVerticalAngle_delta} />
                
                <RawMetric label="Average RT" value={cm.reaction_avgRT_ms} unit=" ms" deltaValue={delta?.clinical_reaction_avgRT_ms_delta} invertDelta />
                <RawMetric label="Median RT" value={cm.reaction_medianRT_ms} unit=" ms" deltaValue={delta?.clinical_reaction_medianRT_ms_delta} invertDelta />
                <RawMetric label="Trajectory Jerk" value={cm.reaction_movementJerk} deltaValue={delta?.clinical_reaction_movementJerk_delta} invertDelta />
                
                <RawMetric label="Avg Pick Time" value={cm.transfer_avgPickTime_ms} unit=" ms" deltaValue={delta?.clinical_transfer_avgPickTime_ms_delta} invertDelta />
                <RawMetric label="Avg Drop Time" value={cm.transfer_avgDropTime_ms} unit=" ms" deltaValue={delta?.clinical_transfer_avgDropTime_ms_delta} invertDelta />
                <RawMetric label="Transfer Misses" value={cm.transfer_missCount} deltaValue={delta?.clinical_transfer_missCount_delta} invertDelta />
              </div>
            </Section>
          )}

          {/* Track A: Reaction & Timing */}
          {hasGame && (
            <Section title="Reaction & Timing (Piano Therapy)" icon="🎹" accentColor="#f59e0b">
              <MetricBar label="Avg Response Time" value={gm.piano_avgRT != null ? gm.piano_avgRT.toFixed(0) : null} max={1200} unit=" ms" color="#f59e0b" tooltip="Lower is better" deltaValue={delta?.game_piano_avgRT_delta} invertDelta />
              <MetricBar label="Accuracy"           value={gm.piano_accurcy != null ? +(gm.piano_accurcy * 100).toFixed(1) : null} max={100} unit="%" color="#fbbf24" deltaValue={delta?.game_piano_accurcy_delta != null ? +(delta.game_piano_accurcy_delta * 100).toFixed(1) : null} />
              <MetricBar label="Bilateral Score"    value={gm.piano_bilateralScore != null ? +(gm.piano_bilateralScore * 100).toFixed(1) : null} max={100} unit="%" color="#fcd34d" deltaValue={delta?.game_piano_bilateralScore_delta != null ? +(delta.game_piano_bilateralScore_delta * 100).toFixed(1) : null} />
            </Section>
          )}

          {/* Track A: Reach & Range of Motion */}
          {hasGame && (
            <Section title="Reach & Workspace Area (Fruit Basket)" icon="💪" accentColor="#10b981">
              <MetricBar label="Success Rate"       value={gm.reach_successRate != null ? +(gm.reach_successRate * 100).toFixed(1) : null} max={100} unit="%" color="#10b981" deltaValue={delta?.game_reach_successRate_delta != null ? +(delta.game_reach_successRate_delta * 100).toFixed(1) : null} />
              <MetricBar label="ARAT Proxy Score"   value={gm.reach_aratScore} max={57} color="#059669" tooltip="0–57 ARAT scale" deltaValue={delta?.game_reach_aratScore_delta} />
              <MetricBar label="Workspace Area"     value={gm.reach_workspaceArea != null ? +(gm.reach_workspaceArea * 100).toFixed(1) : null} max={100} unit="%" color="#34d399" deltaValue={delta?.game_reach_workspaceArea_delta != null ? +(delta.game_reach_workspaceArea_delta * 100).toFixed(1) : null} />
              <MetricBar label="Mean Elbow Angle"   value={gm.reach_avgElbowAngle != null ? gm.reach_avgElbowAngle.toFixed(1) : null} max={180} unit="°" color="#6ee7b7" deltaValue={delta?.game_reach_avgElbowAngle_delta} />
              <MetricBar label="Mean Shoulder Angle"value={gm.reach_avgShoulderAngle != null ? gm.reach_avgShoulderAngle.toFixed(1) : null} max={180} unit="°" color="#a7f3d0" deltaValue={delta?.game_reach_avgShoulderAngle_delta} />
            </Section>
          )}

          {/* Track A: Precision & Tracing */}
          {hasGame && (
            <Section title="Precision & Smoothness (Board & Shape Tracing)" icon="✏️" accentColor="#d946ef">
              <MetricBar label="Board Completion"   value={gm.trace_boardCompletion != null ? +(gm.trace_boardCompletion * 100).toFixed(1) : null} max={100} unit="%" color="#d946ef" deltaValue={delta?.game_trace_boardCompletion_delta != null ? +(delta.game_trace_boardCompletion_delta * 100).toFixed(1) : null} />
              <MetricBar label="Trace Quality"      value={gm.trace_boardTraceQuality != null ? +(gm.trace_boardTraceQuality * 100).toFixed(1) : null} max={100} unit="%" color="#c026d3" deltaValue={delta?.game_trace_boardTraceQuality_delta != null ? +(delta.game_trace_boardTraceQuality_delta * 100).toFixed(1) : null} />
              <MetricBar label="Shape Accuracy"     value={gm.trace_shapeAccuracy != null ? +(gm.trace_shapeAccuracy * 100).toFixed(1) : null} max={100} unit="%" color="#e879f9" deltaValue={delta?.game_trace_shapeAccuracy_delta != null ? +(delta.game_trace_shapeAccuracy_delta * 100).toFixed(1) : null} />
              <MetricBar label="Combined Precision" value={gm.trace_combinedPrecision != null ? +(gm.trace_combinedPrecision * 100).toFixed(1) : null} max={100} unit="%" color="#f0abfc" deltaValue={delta?.game_trace_combinedPrecision_delta != null ? +(delta.game_trace_combinedPrecision_delta * 100).toFixed(1) : null} />
            </Section>
          )}

          {/* Session Engagement */}
          {hasGame && (
            <Section title="Session Engagement" icon="📊" accentColor="#64748b">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <EngageCard label="Duration"  value={gm.engage_totalDuration_min != null ? `${gm.engage_totalDuration_min.toFixed(1)} min` : '—'} />
                <EngageCard label="Games Done" value={gm.engage_gamesCompleted   != null ? `${gm.engage_gamesCompleted}` : '—'} />
                <EngageCard label="Total Score" value={gm.engage_totalScore       != null ? gm.engage_totalScore          : '—'} />
                <EngageCard label="Avg FPS"    value={gm.engage_avgFps            != null ? `${gm.engage_avgFps.toFixed(0)} fps` : '—'} />
              </div>
            </Section>
          )}

          {/* Action to return */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button
              onClick={() => navigate('/patient/dashboard')}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl shadow-md shadow-primary-500/20 transition-all active:scale-95"
            >
              Return to Patient Dashboard →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EngageCard({ label, value }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3.5 text-center shadow-xs">
      <div className="text-lg font-black text-gray-900 dark:text-white">{value}</div>
      <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}
