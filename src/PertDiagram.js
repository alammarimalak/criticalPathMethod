import React from 'react';
import './PertDiagram.css';

const PertDiagram = ({ results = [], tasks }) => {
  if (!results || results.length === 0) return null;

  // Layout constants
  const NODE_RADIUS = 60;
  const LEVEL_SPACING = 280;
  const VERTICAL_SPACING = 150;
  const START_X = 150;
  const START_Y = 300;

  // quick map of tasks by id
  const taskMap = new Map(results.map(t => [t.id, t]));
  const maxEF = Math.max(...results.map(t => t.EF || 0), 0);

  // Build events and connections using Option B + minimal dummies heuristic:
  // - For tasks with multiple predecessors we try to reuse the latest predecessor's end event
  //   (the predecessor with the largest EF) as the merge/start event for the task.
  // - All other predecessor end events get a dummy curved connection to that chosen start event.
  // - This avoids creating unnecessary merge nodes between predecessors (no redundant nodes between C and D).
  const buildEventGraph = () => {
    let eventCounter = 0;
    const eventsByKey = new Map(); // key => event {id, predIds}
    const connections = [];

    const makeKey = (arr) => {
      if (!arr || arr.length === 0) return '';
      return [...arr].sort().join(',');
    };

    // Create or return an event for a predecessor set (keyed by sorted pred IDs)
    const getOrCreateEventForPreds = (predIds = []) => {
      const key = makeKey(predIds);
      if (eventsByKey.has(key)) return eventsByKey.get(key);
      const id = `EV${eventCounter++}`;
      const ev = { id, predIds: Array.isArray(predIds) ? [...predIds] : [], key };
      eventsByKey.set(key, ev);
      return ev;
    };

    // START event
    const startEvent = getOrCreateEventForPreds([]);
    startEvent.id = 'START';
    startEvent.key = '';

    // We'll assign each task:
    //  - _fromEventId: id of the event it starts from
    //  - _toEventId: id of the event it finishes at (unique keyed by [task.id])
    // We'll process tasks iteratively in topological-like order: pick tasks whose predecessors' end events exist
    const assignedTasks = new Set();
    const pending = new Map(results.map(t => [t.id, t]));
    const maxIterations = results.length * 5;
    let iter = 0;

    while (assignedTasks.size < results.length && iter++ < maxIterations) {
      for (const task of results) {
        if (assignedTasks.has(task.id)) continue;

        const preds = (task.predecessors || []).filter(p => p && p !== '-');
        // If task has predecessors that haven't been assigned yet, skip
        const predsNotAssigned = preds.some(p => !assignedTasks.has(p) && !pending.has(p) && !taskMap.has(p));
        // Actually only require that the predecessor's end event has been created (we use _toEventId)
        const predsHaveEndEvents = preds.every(p => {
          // if predecessor isn't a known task (shouldn't happen normally) treat as existing
          if (!taskMap.has(p)) return true;
          const predTask = taskMap.get(p);
          return !!predTask._toEventId;
        });

        if (!predsHaveEndEvents) continue;

        // Determine start event:
        let fromEventId = 'START';
        if (preds.length === 0) {
          fromEventId = 'START';
        } else if (preds.length === 1) {
          // single predecessor — start at its end event
          const pred = preds[0];
          const predTask = taskMap.get(pred);
          fromEventId = predTask._toEventId;
        } else {
          // multiple predecessors — choose the 'primary' predecessor end event to reuse:
          // heuristic: choose predecessor with max EF (latest finishing predecessor).
          let primaryPred = preds[0];
          let primaryEF = taskMap.get(primaryPred)?.EF || 0;
          for (const p of preds) {
            const ef = taskMap.get(p)?.EF || 0;
            if (ef > primaryEF) {
              primaryEF = ef;
              primaryPred = p;
            }
          }
          const primaryPredTask = taskMap.get(primaryPred);
          const primaryEndEvent = primaryPredTask ? primaryPredTask._toEventId : 'START';
          fromEventId = primaryEndEvent;

          // create dummy connections from all other predecessor end events to the chosen start event
          preds.forEach(p => {
            if (p === primaryPred) return;
            const predTask = taskMap.get(p);
            const predEndEvent = predTask ? predTask._toEventId : null;
            if (!predEndEvent) return;
            // don't create dummy if it would be a self loop
            if (predEndEvent === fromEventId) return;
            const exists = connections.some(c => c.from === predEndEvent && c.to === fromEventId);
            if (!exists) {
              connections.push({
                from: predEndEvent,
                to: fromEventId,
                taskId: null,
                duration: 0,
                isDummy: true
              });
            }
          });
        }

        // Create a unique end event for this task keyed by [task.id]
        const endEvent = getOrCreateEventForPreds([task.id]);
        // ensure we use the kept id (don't override if previously created)
        const toId = endEvent.id;

        // record mapping on the task for later usage
        task._fromEventId = fromEventId;
        task._toEventId = toId;

        // push real connection
        connections.push({
          from: fromEventId,
          to: toId,
          taskId: task.id,
          duration: task.duration,
          isDummy: false,
          task
        });

        assignedTasks.add(task.id);
        pending.delete(task.id);
      }
    }

    // Create FINISH event (collect tasks that no other tasks depend on)
    const endTasks = results.filter(t => !results.some(q => (q.predecessors || []).includes(t.id)));
    const finishPredIds = endTasks.map(t => t.id).sort();
    const finishEvent = getOrCreateEventForPreds(finishPredIds);
    const oldFinishId = finishEvent.id;
    finishEvent.id = 'FINISH';

    // Update connections that pointed to the old finish event (if any)
    connections.forEach(conn => {
      if (conn.to === oldFinishId) conn.to = 'FINISH';
      if (conn.from === oldFinishId) conn.from = 'FINISH';
    });

    // Connect each end task's end event to FINISH if not already connected
    endTasks.forEach(task => {
      const taskEndEvent = task._toEventId;
      if (taskEndEvent && taskEndEvent !== 'FINISH') {
        const exists = connections.some(c => c.from === taskEndEvent && c.to === 'FINISH');
        if (!exists) {
          connections.push({
            from: taskEndEvent,
            to: 'FINISH',
            taskId: null,
            duration: 0,
            isDummy: true
          });
        }
      }
    });

    // Convert eventsByKey values to event list. Keep order stable: START first, FINISH last.
    const events = Array.from(eventsByKey.values()).map(ev => ({ id: ev.id, predIds: ev.predIds }));
    if (!events.some(e => e.id === 'START')) events.unshift({ id: 'START', predIds: [] });
    if (!events.some(e => e.id === 'FINISH')) events.push({ id: 'FINISH', predIds: [] });

    return { events, connections };
  };

  const { events, connections } = buildEventGraph();

  // Compute simple level positions for events
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

    // group by level
    const levels = new Map();
    const maxLevel = Math.max(...Array.from(eventLevels.values()));
    for (let i = 0; i <= maxLevel; i++) levels.set(i, []);
    eventLevels.forEach((lvl, id) => {
      if (!levels.has(lvl)) levels.set(lvl, []);
      levels.get(lvl).push(id);
    });

    // order in each level by earliest ES of related tasks (approx)
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

  // Compute event timings (forward/backward) similar to original code
  const calculateEventTimings = () => {
    const eventTimings = new Map();
    eventTimings.set('START', { ES: 0, LF: 0 });

    const topologicalOrder = [];
    const visited = new Set();
    const visit = (eid) => {
      if (visited.has(eid)) return;
      visited.add(eid);
      const incoming = connections.filter(c => c.to === eid);
      incoming.forEach(c => {
        if (!visited.has(c.from)) visit(c.from);
      });
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

  // svg bounds
  const allPositions = Object.values(eventPositions);
  const allYCoords = allPositions.map(p => p.y);
  const maxX = Math.max(...allPositions.map(p => p.x)) + 200;
  const maxY = Math.max(...allYCoords) + NODE_RADIUS + 50;
  const minY = Math.min(...allYCoords) - NODE_RADIUS - 50;
  const svgHeight = Math.max(maxY - minY, 500);

  // create curved path for dummy spaghetti
  const makeDummyPath = (fromX, fromY, toX, toY, index = 0) => {
    const dx = Math.abs(toX - fromX);
    const dy = toY - fromY;
    const baseDepth = Math.max(40, Math.min(140, dx / 4 + Math.abs(dy) / 4));
    // add small index-based offset to help avoid stacked curves overlapping exactly
    const jitter = (index % 3) * 8;
    const curveDepth = baseDepth + jitter;
    const controlX = (fromX + toX) / 2;
    const controlY = (fromY + toY) / 2 - (dy > 0 ? curveDepth : -curveDepth);
    return `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;
  };

  // group dummy connections by (from,to) to compute small jitter indexes
  const dummyGroups = {};
  connections.forEach(c => {
    if (!c.isDummy) return;
    const key = `${c.from}-->${c.to}`;
    dummyGroups[key] = (dummyGroups[key] || 0) + 1;
  });
  // we will reuse a per-connection incremental index to jitter overlapping dummies
  const dummyIndexMap = {};
  const getDummyIndex = (from, to) => {
    const key = `${from}-->${to}`;
    dummyIndexMap[key] = (dummyIndexMap[key] || 0) + 1;
    return dummyIndexMap[key] - 1;
  };

  return (
    <div className="pert-diagram-container">
      <h3>Diagramme PERT</h3>
      <div className="pert-diagram-wrapper">
        <svg
          width={maxX}
          height={svgHeight}
          viewBox={`0 ${minY} ${maxX} ${svgHeight}`}
          className="pert-svg"
        >
          {/* connections */}
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

                {conn.isDummy && (
                  <>
                    <path
                      d={makeDummyPath(fromX, fromY, toX, toY, getDummyIndex(conn.from, conn.to))}
                      className={lineClass}
                      fill="none"
                    />
                    <polygon
                      points={`
                        ${toX},${toY}
                        ${arrowX - 8 * Math.sin(angle)},${arrowY + 8 * Math.cos(angle)}
                        ${arrowX + 8 * Math.sin(angle)},${arrowY - 8 * Math.cos(angle)}
                      `}
                      className={arrowClass}
                    />
                  </>
                )}
              </g>
            );
          })}

          {/* event nodes */}
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
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default PertDiagram;
