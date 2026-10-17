const User = require('../models/user.model');
const GameSession = require('../models/gameSession.model');
const BoardDrawingSession = require('../models/boardDrawingSession.model');
const PianoSession = require('../models/pianoSession.model');
const FruitBasketSession = require('../models/fruitBasketSession.model');

const toNumber = (value, fallback = undefined) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeJoint = (joint) => {
  if (!joint || joint.x === undefined || joint.y === undefined) return undefined;
  return {
    x: toNumber(joint.x, 0),
    y: toNumber(joint.y, 0)
  };
};

const normalizePoint = (point) => ({
  x: toNumber(point?.x, 0),
  y: toNumber(point?.y, 0),
  screenX: toNumber(point?.screenX),
  screenY: toNumber(point?.screenY),
  timestamp: toNumber(point?.timestamp, 0),
  zone: point?.zone,
  color: point?.color,
  leftShoulder: normalizeJoint(point?.leftShoulder),
  rightShoulder: normalizeJoint(point?.rightShoulder),
  leftElbow: normalizeJoint(point?.leftElbow),
  rightElbow: normalizeJoint(point?.rightElbow),
  leftWrist: normalizeJoint(point?.leftWrist),
  rightWrist: normalizeJoint(point?.rightWrist),
  palm: normalizeJoint(point?.palm),
  // Per-side angles (Board Drawing)
  elbowAngleLeft: toNumber(point?.elbowAngleLeft),
  elbowAngleRight: toNumber(point?.elbowAngleRight),
  shoulderAngleLeft: toNumber(point?.shoulderAngleLeft),
  shoulderAngleRight: toNumber(point?.shoulderAngleRight),
  verticalAngleLeft: toNumber(point?.verticalAngleLeft),
  verticalAngleRight: toNumber(point?.verticalAngleRight),
  // Single-hand fields (Fruit Basket)
  hand: point?.hand,
  shoulder: normalizeJoint(point?.shoulder),
  elbow: normalizeJoint(point?.elbow),
  elbowAngle: toNumber(point?.elbowAngle),
  shoulderAngle: toNumber(point?.shoulderAngle),
  verticalAngle: toNumber(point?.verticalAngle),
  // Fruit Basket specific
  event: point?.event,
  trialId: toNumber(point?.trialId),
  success: point?.success !== undefined ? Boolean(point?.success) : undefined,
  aratScore: toNumber(point?.aratScore)
});

const normalizePath = (path) => {
  if (!Array.isArray(path)) return [];
  return path
    .filter((point) => point && point.x !== undefined && point.y !== undefined)
    .map(normalizePoint);
};

const normalizeAttempt = (attempt, index) => {
  const drawnPath = normalizePath(attempt?.drawnPath);
  const targetPath = normalizePath(attempt?.targetPath);
  const total = toNumber(attempt?.total, targetPath.length);
  const hits = toNumber(attempt?.hits, 0);
  const completion = toNumber(
    attempt?.completion,
    total > 0 ? hits / total : 0
  );

  return {
    attemptNumber: toNumber(attempt?.attemptNumber, index + 1),
    requestedShape: attempt?.requestedShape || attempt?.shapeType || 'shape',
    shapeType: attempt?.shapeType || attempt?.requestedShape || 'shape',
    hand: attempt?.hand,
    startedAt: toNumber(attempt?.startedAt, 0),
    endedAt: toNumber(attempt?.endedAt, 0),
    canvasWidth: toNumber(attempt?.canvasWidth, 0),
    canvasHeight: toNumber(attempt?.canvasHeight, 0),
    targetPath,
    drawnPath,
    pathMatrix: Array.isArray(attempt?.pathMatrix)
      ? attempt.pathMatrix
          .filter((row) => Array.isArray(row))
          .map((row) => row.map((value) => toNumber(value, 0)))
      : drawnPath.map((point) => [
          point.screenX ?? point.x,
          point.screenY ?? point.y,
          point.timestamp ?? 0
        ]),
    hits,
    total,
    completion,
    success: Boolean(attempt?.success),
    scoreAfter: toNumber(attempt?.scoreAfter, 0),
    traceQuality: toNumber(attempt?.traceQuality),
    pointsEarned: toNumber(attempt?.pointsEarned),
    safeZoneRadius: toNumber(attempt?.safeZoneRadius),
    warningZoneRadius: toNumber(attempt?.warningZoneRadius)
  };
};

// Update level span (editable by doctor and caretaker)
exports.updateLevelSpan = async (req, res) => {
  try {
    const { userId } = req.params;
    const { levelspan } = req.body;
    const requesterId = req.user.id;

    if (!levelspan || levelspan < 1 || levelspan > 10) {
      return res.status(400).json({
        success: false,
        message: 'Level span must be between 1 and 10 seconds'
      });
    }

    const requester = await User.findById(requesterId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only doctor or caretaker can update
    if (requester.type !== 'doctor' && requester.type !== 'caretaker') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors and caretakers can update level span'
      });
    }

    targetUser.currentlevelspan = levelspan;
    await targetUser.save();

    res.json({
      success: true,
      message: 'Level span updated successfully',
      currentlevelspan: targetUser.currentlevelspan
    });
  } catch (error) {
    console.error('Update level span error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating level span',
      error: error.message
    });
  }
};

// Get level span
exports.getLevelSpan = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const user = await User.findById(userId).select('currentlevelspan');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      currentlevelspan: user.currentlevelspan
    });
  } catch (error) {
    console.error('Get level span error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching level span',
      error: error.message
    });
  }
};

// Save game session
exports.saveGameSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      gameType,
      gameName,
      levelspan, 
      playData,
      systemMetrics,
      coordinates,
      boardDrawingAttempts,
      sessionScore: clientSessionScore,
      mode,
      sessionMeta,
      trials,
      fingerTimeouts,
      laptopMovements,
      mobileMovements
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const type = gameType || 'type1';
    const name = gameName || 'Reaction Game';

    // Calculate score: correct = +10, incorrect = -5 (For legacy Piano game)
    let sessionScore = clientSessionScore || 0;
    if (clientSessionScore === undefined && playData && type === 'type1') {
      playData.forEach(entry => {
        if (entry.correct === 1) sessionScore += 10;
        else if (entry.correct === -1) sessionScore -= 5;
      });
      if (sessionScore < 0) sessionScore = 0;
    }

    let attempts = undefined;
    let coords = coordinates || undefined;

    if (type === 'board_drawing') {
      attempts = Array.isArray(boardDrawingAttempts)
        ? boardDrawingAttempts
            .map(normalizeAttempt)
            .filter((attempt) => attempt.drawnPath.length > 1)
        : [];
      coords = normalizePath(coordinates);
    }

    let newSession;
    
    if (type === 'type1' || type.startsWith('piano_')) {
      newSession = new PianoSession({
        user: userId,
        gameType: type,
        gameName: name,
        time: new Date(),
        levelspan: levelspan,
        sessionScore: sessionScore,
        systemMetrics: systemMetrics || undefined,
        coordinates: coordinates || undefined,
        play: playData || [],
        mode: mode || 'laptop',
        fingerTimeouts: fingerTimeouts || undefined,
        laptopMovements: laptopMovements || undefined,
        mobileMovements: mobileMovements || undefined
      });
    } else if (type === 'fruit_basket') {
      // Normalize trial trajectory points
      const normalizedTrials = Array.isArray(trials)
        ? trials.map(trial => ({
            trialId: toNumber(trial?.trialId),
            fruitId: trial?.fruitId,
            sourceIdx: toNumber(trial?.sourceIdx),
            basketIdx: toNumber(trial?.basketIdx),
            hand: trial?.hand,
            startTimestamp: toNumber(trial?.startTimestamp),
            endTimestamp: toNumber(trial?.endTimestamp),
            outcome: trial?.outcome,
            trajectory: Array.isArray(trial?.trajectory)
              ? trial.trajectory.map(pt => ({
                  timestamp: toNumber(pt?.timestamp),
                  x: toNumber(pt?.x),
                  y: toNumber(pt?.y),
                  hand: pt?.hand,
                  shoulder: normalizeJoint(pt?.shoulder),
                  elbow: normalizeJoint(pt?.elbow),
                  elbowAngle: toNumber(pt?.elbowAngle),
                  shoulderAngle: toNumber(pt?.shoulderAngle),
                  verticalAngle: toNumber(pt?.verticalAngle),
                }))
              : []
          }))
        : [];
      newSession = new FruitBasketSession({
        user: userId,
        gameType: type,
        gameName: name,
        time: new Date(),
        sessionScore: sessionScore,
        sessionMeta: sessionMeta || undefined,
        systemMetrics: systemMetrics || undefined,
        coordinates: coordinates || undefined,
        trials: normalizedTrials,
        play: playData || [],
        mode: mode || 'laptop'
      });
    } else {
      newSession = new GameSession({
        user: userId,
        gameType: type,
        gameName: name,
        time: new Date(),
        levelspan: levelspan,
        sessionScore: sessionScore,
        systemMetrics: systemMetrics || undefined,
        coordinates: type === 'board_drawing' ? coords : (coordinates || undefined),
        boardDrawingAttempts: type === 'board_drawing' ? attempts : (boardDrawingAttempts || undefined),
        play: playData || []
      });
    }

    await newSession.save();

    user.totalScore += sessionScore;
    user.level = user.calculateLevel();

    await user.save();

    res.json({
      success: true,
      message: 'Game session saved successfully',
      sessionScore,
      totalScore: user.totalScore,
      level: user.level,
      session: newSession
    });
  } catch (error) {
    console.error('Save session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving game session',
      error: error.message
    });
  }
};

// Get detailed analytics (for doctors only)
exports.getDetailedAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;

    const requester = await User.findById(requesterId);

    if (requester.type !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can view detailed analytics'
      });
    }

    const user = await User.findById(userId).select('-password -resetOTP -resetOTPExpiry');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const gameSessions = await GameSession.find({ user: userId }).lean();
    const boardSessions = await BoardDrawingSession.find({ user: userId }).lean();
    const pianoSessions = await PianoSession.find({ user: userId }).lean();
    const fruitSessions = await FruitBasketSession.find({ user: userId }).lean();
    const sessions = [...gameSessions, ...boardSessions, ...pianoSessions, ...fruitSessions].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // Group by game type
    const grouped = sessions.reduce((acc, session) => {
      let gType = session.gameType;
      let gName = session.gameName;
      if (gType === 'type1' || gType.startsWith('piano_')) {
        gType = 'type1';
        gName = 'Piano Reaction Game';
      }
      if (!acc[gType]) {
        acc[gType] = { type: gType, name: gName, eachGameStats: [] };
      }
      acc[gType].eachGameStats.push(session);
      return acc;
    }, {});
    
    const games = Object.values(grouped);

    // Get game stats for all games
    const gamesData = games.map(gameObj => {
      const sessions = gameObj.eachGameStats || [];
      let totalCorrect = 0;
      let totalIncorrect = 0;
      let totalNotDone = 0;
      let totalResponseTime = 0;
      let validResponseCount = 0;
      let totalScore = 0;

      sessions.forEach(session => {
        totalScore += session.sessionScore || 0;
        if (session.gameType === 'board_drawing') {
          const attempts = session.boardDrawingAttempts || [];
          attempts.forEach(attempt => {
            if (attempt.success) {
              totalCorrect++;
            } else {
              totalIncorrect++;
            }
            const duration = (attempt.endedAt || 0) - (attempt.startedAt || 0);
            if (duration >= 0) {
              totalResponseTime += duration;
              validResponseCount++;
            }
          });
        } else {
          session.play.forEach(entry => {
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
        }
      });

      const avgResponseTime = validResponseCount > 0 
        ? (totalResponseTime / validResponseCount).toFixed(2)
        : 0;

      const accuracy = (totalCorrect + totalIncorrect + totalNotDone) > 0
        ? ((totalCorrect / (totalCorrect + totalIncorrect + totalNotDone)) * 100).toFixed(2)
        : 0;

      return {
        type: gameObj.type,
        name: gameObj.name,
        overallStats: {
          totalSessions: sessions.length,
          totalScore,
          totalCorrect,
          totalIncorrect,
          totalNotDone,
          avgResponseTime: parseFloat(avgResponseTime),
          accuracy: parseFloat(accuracy)
        },
        sessions: sessions.slice(-10) // Last 10 sessions
      };
    });

    res.json({
      success: true,
      analytics: {
        user: {
          email: user.email,
          type: user.type,
          totalScore: user.totalScore,
          level: user.level,
          currentlevelspan: user.currentlevelspan
        },
        games: gamesData
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

// Get basic stats (for patients and caretakers)
exports.getBasicStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;

    const user = await User.findById(userId).select('email type totalScore level currentlevelspan game');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const gameSessions = await GameSession.find({ user: userId }).lean();
    const boardSessions = await BoardDrawingSession.find({ user: userId }).lean();
    const pianoSessions = await PianoSession.find({ user: userId }).lean();
    const fruitSessions = await FruitBasketSession.find({ user: userId }).lean();
    const sessions = [...gameSessions, ...boardSessions, ...pianoSessions, ...fruitSessions].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // Group by game type
    const grouped = sessions.reduce((acc, session) => {
      let gType = session.gameType;
      let gName = session.gameName;
      if (gType === 'type1' || gType.startsWith('piano_')) {
        gType = 'type1';
        gName = 'Piano Reaction Game';
      }
      if (!acc[gType]) {
        acc[gType] = { type: gType, name: gName, eachGameStats: [] };
      }
      acc[gType].eachGameStats.push(session);
      return acc;
    }, {});
    
    const games = Object.values(grouped);

    const gamesData = games.map(gameObj => {
      const sessions = gameObj.eachGameStats ? gameObj.eachGameStats.slice(-30) : [];
      const basicSessions = sessions.map(session => {
        let correct = 0;
        let incorrect = 0;
        let notDone = 0;
        let responsetime = 0;
        let total = 0;

        if (session.gameType === 'board_drawing') {
          const attempts = session.boardDrawingAttempts || [];
          total = attempts.length;
          attempts.forEach(attempt => {
            if (attempt.success) {
              correct++;
            } else {
              incorrect++;
            }
            const duration = (attempt.endedAt || 0) - (attempt.startedAt || 0);
            responsetime += Math.max(0, duration);
          });
        } else {
          correct = session.play.filter(p => p.correct === 1).length;
          incorrect = session.play.filter(p => p.correct === -1).length;
          notDone = session.play.filter(p => p.correct === 0).length;
          responsetime = session.play.reduce((sum, p) => sum + (p.responsetime || 0), 0);
          total = session.play.length;
        }

        return {
          session: session,
          time: session.time,
          correct,
          incorrect,
          responsetime,
          notDone,
          total,
          sessionScore: session.sessionScore,
          systemMetrics: session.systemMetrics
        };
      });

      return {
        type: gameObj.type,
        name: gameObj.name,
        recentSessions: basicSessions
      };
    });

    res.json({
      success: true,
      stats: {
        email: user.email,
        type: user.type,
        totalScore: user.totalScore,
        level: user.level,
        currentlevelspan: user.currentlevelspan,
        games: gamesData,
        // Legacy support mapping type1 to root recentSessions just in case
        recentSessions: gamesData.find(g => g.type === 'type1')?.recentSessions || []
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};
