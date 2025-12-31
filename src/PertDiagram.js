import './PertDiagram.css';
import { forwardRef, useImperativeHandle, useRef } from 'react'

const PertDiagram = forwardRef(({ results = [], tasks }, ref) => {
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getElement: () => containerRef.current
  }));

  if (!results || results.length === 0) return null;

  const NODE_RADIUS = 60;
  const LEVEL_SPACING = 280;
  const VERTICAL_SPACING = 150;
  const START_X = 150;
  const START_Y = 300;

  const taskMap = new Map(results.map(t => [t.id, t]));
  const maxEF = Math.max(...results.map(t => t.EF || 0), 0);

  const normalizePreds = (preds) =>
    (preds || [])
      .map(p => (typeof p === 'string' ? p.trim() : p))
      .filter(p => p && p !== '-' && p !== '0');

  // -------------------------
  // buildEventGraph
  // -------------------------
  const buildEventGraph = () => {
    let eventCounter = 0;
    const eventsByKey = new Map(); // key -> { id, predIds }
    const connections = [];

    const makeKey = (arr = []) => (arr.length === 0 ? '' : [...arr].sort().join(','));

    const getOrCreateEventForPreds = (predIds = []) => {
      const key = makeKey(predIds);
      if (eventsByKey.has(key)) return eventsByKey.get(key);
      const id = `EV${eventCounter++}`;
      const ev = { id, predIds: Array.isArray(predIds) ? [...predIds] : [], key };
      eventsByKey.set(key, ev);
      return ev;
    };
    
    const startEvent = getOrCreateEventForPreds([]);
    startEvent.id = 'START';
    startEvent.key = '';

    // local copy map for assignment logic
    const allTasks = new Map(results.map(t => [t.id, t]));
    const assigned = new Set();

    const maxIterations = results.length * 5;
    let iter = 0;

    while (assigned.size < results.length && iter++ < maxIterations) {
      let progress = false;

      for (const task of results) {
        if (assigned.has(task.id)) continue;

        const preds = normalizePreds(task.predecessors);
        
        const predsReady = preds.every(pid => {
          if (!allTasks.has(pid)) return true;
          return !!allTasks.get(pid)._toEventId;
        });

        if (!predsReady) continue;

        let fromEventId = 'START';

        if (preds.length === 1) {
          const predTask = allTasks.get(preds[0]);
          fromEventId = predTask ? predTask._toEventId : 'START';
        } else if (preds.length >= 2) {
          let primary = preds[0];
          let primaryEF = allTasks.get(primary)?.EF || 0;
          for (const p of preds) {
            const ef = allTasks.get(p)?.EF || 0;
            if (ef > primaryEF) {
              primaryEF = ef;
              primary = p;
            }
          }

          const primaryTask = allTasks.get(primary);
          fromEventId = primaryTask ? primaryTask._toEventId : 'START';

          const predEndEvents = preds
            .map(p => allTasks.get(p)?._toEventId || null)
            .filter(Boolean);
          const uniqueEnds = [...new Set(predEndEvents)];

          // Only create dummy arcs when:
          // - there are 2+ predecessors
          // - all predecessor tasks exist in allTasks
          // - predecessor end events differ
          if (
            preds.length >= 5 &&
            preds.every(p => allTasks.has(p)) &&
            uniqueEnds.length > 1
          ) {
            for (const p of preds) {
              if (p === primary) continue;
              const predTask = allTasks.get(p);
              const predEnd = predTask?._toEventId;
              if (!predEnd) continue;
              if (predEnd === fromEventId) continue; 

              const exists = connections.some(c => c.isDummy && c.from === predEnd && c.to === fromEventId && c.sourceTaskId === p);
              if (!exists) {
                connections.push({ from: predEnd, to: fromEventId, taskId: null, duration: 0, isDummy: true, sourceTaskId: p });
              }
            }
          }
        }

        const endEvent = getOrCreateEventForPreds([task.id]);
        const toId = endEvent.id;

        task._fromEventId = fromEventId;
        task._toEventId = toId;

        connections.push({ from: fromEventId, to: toId, taskId: task.id, duration: task.duration, isDummy: false, task });

        assigned.add(task.id);
        progress = true;
      }

      if (!progress) break;
    }

    const noSucc = results.filter(t => !results.some(u => normalizePreds(u.predecessors).includes(t.id)));
    const finishPredIds = noSucc.map(t => t.id).sort();
    const finishEvent = getOrCreateEventForPreds(finishPredIds);
    const oldFinishId = finishEvent.id;
    finishEvent.id = 'FINISH';

    connections.forEach(c => {
      if (c.to === oldFinishId) c.to = 'FINISH';
      if (c.from === oldFinishId) c.from = 'FINISH';
    });

    noSucc.forEach(t => {
      const endEv = t._toEventId;
      if (!t._toEventId || t._toEventId === "FINISH") return;
      if (t._toEventId === oldFinishId) return;
      const exists = connections.some(
        (c) => c.from === t._toEventId && c.to === "FINISH"
      );

      if (!exists) {
        connections.push({
          from: endEv,
          to: "FINISH",
          taskId: null,
          duration: 0,
          isDummy: true
        });
      }

    });

    const events = Array.from(eventsByKey.values()).map(ev => ({ id: ev.id, predIds: ev.predIds }));
    if (!events.some(e => e.id === 'START')) events.unshift({ id: 'START', predIds: [] });
    if (!events.some(e => e.id === 'FINISH')) events.push({ id: 'FINISH', predIds: [] });

    return { events, connections };
  };

  const { events, connections } = buildEventGraph();

  // -------------------------
  // calculateEventPositions
  // -------------------------
  const calculateEventPositions = () => {
    const positions = {};
    const eventLevels = new Map();
    eventLevels.set('START', 0);

    const visited = new Set();
    const calculateLevel = (eventId) => {
      if (eventLevels.has(eventId)) return eventLevels.get(eventId);
      if (visited.has(eventId)) return 0;
      visited.add(eventId);
      const incoming = connections.filter(c => c.to === eventId);
      if (incoming.length === 0) {
        eventLevels.set(eventId, 0);
        return 0;
      }
      const maxPredLevel = Math.max(...incoming.map(c => calculateLevel(c.from)));
      const level = maxPredLevel + 1;
      eventLevels.set(eventId, level);
      return level;
    };

    events.forEach(e => calculateLevel(e.id));
    const maxLevelSoFar = Math.max(...Array.from(eventLevels.values()));
    eventLevels.set('FINISH', maxLevelSoFar);

    const levels = new Map();
    const maxLevel = Math.max(...Array.from(eventLevels.values()));
    for (let i = 0; i <= maxLevel; i++) levels.set(i, []);
    eventLevels.forEach((lvl, id) => {
      if (!levels.has(lvl)) levels.set(lvl, []);
      levels.get(lvl).push(id);
    });

    levels.forEach((ids, level) => {
      ids.sort((a, b) => {
        const aEvent = events.find(e => e.id === a) || { predIds: [] };
        const bEvent = events.find(e => e.id === b) || { predIds: [] };
        const getES = (id, ev) => {
          if (id === 'START') return 0;
          if (id === 'FINISH') return maxEF;
          const pred = ev.predIds && ev.predIds[0];
          if (!pred) return 0;
          return taskMap.get(pred)?.ES || 0;
        };
        return getES(a, aEvent) - getES(b, bEvent);
      });

      const count = ids.length;
      ids.forEach((eventId, index) => {
        const y = START_Y + index * VERTICAL_SPACING - ((count - 1) * VERTICAL_SPACING) / 2;
        positions[eventId] = { x: START_X + level * LEVEL_SPACING, y };
      });
    });

    return positions;
  };

  const eventPositions = calculateEventPositions();

  // -------------------------
  // calculateEventTimings
  // -------------------------
  const calculateEventTimings = () => {
    const eventTimings = new Map();
    eventTimings.set('START', { ES: 0, LF: 0 });

    const topologicalOrder = [];
    const visited = new Set();
    const visit = (eid) => {
      if (visited.has(eid)) return;
      visited.add(eid);
      const incoming = connections.filter(c => c.to === eid);
      incoming.forEach(c => { if (!visited.has(c.from)) visit(c.from); });
      topologicalOrder.push(eid);
    };

    events.forEach(e => visit(e.id));
    if (!visited.has('FINISH')) visit('FINISH');

    topologicalOrder.forEach(eventId => {
      if (eventId === 'START') {
        eventTimings.set('START', { ES: 0, LF: 0 });
        return;
      }
      const incoming = connections.filter(c => c.to === eventId);
      let ES = 0;
      if (incoming.length > 0) {
        ES = Math.max(...incoming.map(conn => {
          if (conn.isDummy) {
            const pred = eventTimings.get(conn.from);
            return pred ? pred.ES : 0;
          } else {
            const task = taskMap.get(conn.taskId);
            return task ? task.EF : 0;
          }
        }));
      }
      eventTimings.set(eventId, { ES, LF: maxEF });
    });

    eventTimings.set('FINISH', { ES: maxEF, LF: maxEF });

    const reverse = [...topologicalOrder].reverse();
    reverse.forEach(eventId => {
      if (eventId === 'FINISH') return;
      const outgoing = connections.filter(c => c.from === eventId);
      let LF = maxEF;
      if (outgoing.length > 0) {
        LF = Math.min(...outgoing.map(conn => {
          if (conn.isDummy) {
            const succ = eventTimings.get(conn.to);
            return succ ? succ.LF : maxEF;
          } else {
            const task = taskMap.get(conn.taskId);
            return task ? task.LS : maxEF;
          }
        }));
      }
      const current = eventTimings.get(eventId) || { ES: 0 };
      eventTimings.set(eventId, { ES: current.ES, LF });
    });

    return eventTimings;
  };

  const eventTimings = calculateEventTimings();

  const getEventData = (eventId) => {
    const t = eventTimings.get(eventId);
    if (!t) return { id: eventId, ES: 0, EF: 0, LS: 0, LF: 0 };
    return { id: eventId, ES: t.ES, EF: t.ES, LS: t.LF, LF: t.LF };
  };

  const isCriticalConnection = (conn) => {
    if (conn.isDummy) return false;
    if (conn.task && conn.task.isCritical) return true;
    if (conn.task && (conn.task.float === 0 || conn.task.slack === 0)) return true;
    if (conn.task && conn.task.ES === conn.task.LS && conn.task.EF === conn.task.LF) return true;
    return false;
  };

  const isCriticalNode = (eventId) => {
    if (eventId === 'START' || eventId === 'FINISH') return true;
    const incomingCritical = connections.some(conn => conn.to === eventId && isCriticalConnection(conn));
    const outgoingCritical = connections.some(conn => conn.from === eventId && isCriticalConnection(conn));
    return incomingCritical || outgoingCritical;
  };

  const allPositions = Object.values(eventPositions);
  const allYCoords = allPositions.map(p => p.y);
  const maxX = Math.max(...allPositions.map(p => p.x)) + 200;
  const maxY = Math.max(...allYCoords) + NODE_RADIUS + 50;
  const minY = Math.min(...allYCoords) - NODE_RADIUS - 50;
  const svgHeight = Math.max(maxY - minY, 500);

   const makeDummyPathObj = (fromX, fromY, toX, toY, index = 0) => {
    const dx = Math.abs(toX - fromX);
    const dy = toY - fromY;
    const baseDepth = Math.max(40, Math.min(140, dx / 4 + Math.abs(dy) / 4));
    const jitter = (index % 3) * 8;
    const curveDepth = baseDepth + jitter;
    const controlX = (fromX + toX) / 2;
    const controlY = (fromY + toY) / 2 - (dy > 0 ? curveDepth : -curveDepth);
    const d = `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;
    return { d, cx: controlX, cy: controlY };
  };

  const dummyIndexMap = {};
  const getDummyIndex = (from, to) => {
    const key = `${from}-->${to}`;
    dummyIndexMap[key] = (dummyIndexMap[key] || 0) + 1;
    return dummyIndexMap[key] - 1;
  };

  return (
    <div className="pert-diagram-container">
      <h3>PERT Diagram</h3>
      <div className="pert-diagram-wrapper">
        <svg
          ref={containerRef}
          width={maxX}
          height={svgHeight}
          viewBox={`0 ${minY} ${maxX} ${svgHeight}`}
          className="pert-svg"
        >
          {connections.map((conn, i) => {
            const fromPos = eventPositions[conn.from];
            const toPos = eventPositions[conn.to];

            if (!fromPos || !toPos) return null;

            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            const angle = Math.atan2(dy, dx);

            const fromX = fromPos.x + NODE_RADIUS * Math.cos(angle);
            const fromY = fromPos.y + NODE_RADIUS * Math.sin(angle);
            const toX = toPos.x - NODE_RADIUS * Math.cos(angle);
            const toY = toPos.y - NODE_RADIUS * Math.sin(angle);

            const arrowX = toX - 15 * Math.cos(angle);
            const arrowY = toY - 15 * Math.sin(angle);

            const midX = fromX + (toX - fromX) / 2;
            const midY = fromY + (toY - fromY) / 2;
            const labelOffsetY = dy === 0 ? -15 : (dy > 0 ? -15 : 25);

            const isCritical = isCriticalConnection(conn);
            const lineClass = conn.isDummy
              ? 'connection-line dummy-line'
              : isCritical
                ? 'connection-line critical-path'
                : 'connection-line';

            const arrowClass = conn.isDummy
              ? 'arrow-head dummy-arrow'
              : isCritical
                ? 'arrow-head critical-path'
                : 'arrow-head';

            return (
              <g key={`conn-${i}`} className="connection-group">
                {!conn.isDummy && (
                  <>
                    <line
                      x1={fromX}
                      y1={fromY}
                      x2={arrowX}
                      y2={arrowY}
                      className={lineClass}
                    />
                    <polygon
                      points={`
                        ${toX},${toY}
                        ${arrowX - 8 * Math.sin(angle)},${arrowY + 8 * Math.cos(angle)}
                        ${arrowX + 8 * Math.sin(angle)},${arrowY - 8 * Math.cos(angle)}
                      `}
                      className={arrowClass}
                    />
                    <text
                      x={midX}
                      y={midY + labelOffsetY}
                      className="connection-label"
                      textAnchor="middle"
                    >
                      {conn.taskId} ({conn.duration})
                    </text>
                  </>
                )}

                {/* dummy: curved spaghetti + filled light-grey triangle + label A'(0) */}
                {conn.isDummy && (
                  <>
                    {(() => {
                      const idx = getDummyIndex(conn.from, conn.to);
                      const { d, cx, cy } = makeDummyPathObj(fromX, fromY, toX, toY, idx);
                      return (
                        <>
                          <path d={d} className={lineClass} fill="none" />
                          <polygon
                            points={`
                              ${toX},${toY}
                              ${arrowX - 8 * Math.sin(angle)},${arrowY + 8 * Math.cos(angle)}
                              ${arrowX + 8 * Math.sin(angle)},${arrowY - 8 * Math.cos(angle)}
                            `}
                            style={{ fill: '#d0d0d0', stroke: 'none' }}
                          />
                          {conn.sourceTaskId && (
                            <text
                              x={cx}
                              y={cy - 8}
                              className="connection-label dummy-label"
                              textAnchor="middle"
                            >
                              {`${conn.sourceTaskId}'(0)`}
                            </text>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </g>
            );
          })}

          {events.map((event, index) => {
            const eventData = getEventData(event.id);
            const pos = eventPositions[event.id];
            if (!pos) return null;
            const isStart = event.id === 'START';
            const isFinish = event.id === 'FINISH';
            const isCritical = isCriticalNode(event.id);

            return (
              <g key={`node-${event.id}`} className="node-group">
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_RADIUS}
                  className={`node-circle ${
                    isStart || isFinish ? 'milestone-node' :
                      isCritical ? 'critical-node' : 'normal-node'
                  }`}
                />
                <line
                  x1={pos.x}
                  y1={pos.y - NODE_RADIUS}
                  x2={pos.x}
                  y2={pos.y + 1}
                  className="node-divider"
                />
                <line
                  x1={pos.x - NODE_RADIUS}
                  y1={pos.y}
                  x2={pos.x + NODE_RADIUS}
                  y2={pos.y}
                  className="node-divider"
                />
                <text
                  x={pos.x - NODE_RADIUS / 2}
                  y={pos.y - NODE_RADIUS / 4}
                  className="node-date"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {eventData.ES}
                </text>
                <text
                  x={pos.x + NODE_RADIUS / 2}
                  y={pos.y - NODE_RADIUS / 4}
                  className="node-date"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {eventData.LF}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 25}
                  className="node-task-id"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {isStart ? 'Start' : isFinish ? 'End' : index}
                  {console.log("RESULTING TASKS:", results)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
});

export default PertDiagram;