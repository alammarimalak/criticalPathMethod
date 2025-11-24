import './PertDiagram.css';

const PertDiagram = ({ results, tasks }) => {
  if (!results || results.length === 0) return null;

  const NODE_RADIUS = 60;
  const LEVEL_SPACING = 280;
  const VERTICAL_SPACING = 150;
  const START_X = 150;
  const START_Y = 300;

  const taskMap = new Map(results.map(t => [t.id, t]));
  const maxEF = Math.max(...results.map(t => t.EF));

  const buildEventGraph = () => {
    let eventIdCounter = 0;
    const events = new Map();
    const connections = [];
    
    const getOrCreateEvent = (predIds) => {
      const key = predIds.sort().join(',');
      if (events.has(key)) {
        return events.get(key);
      }
      const eventId = `E${eventIdCounter++}`;
      events.set(key, { id: eventId, predIds, ES: 0, LF: 0 });
      return events.get(key);
    };
    
    const startEvent = getOrCreateEvent([]);
    const oldStartId = startEvent.id;
    startEvent.id = 'START';
    
    const taskToStartEvent = new Map();
    const taskToEndEvent = new Map();
    
    results.forEach(task => {
      const startEventData = getOrCreateEvent(task.predecessors);
      const endEventData = getOrCreateEvent([task.id]);
      
      const fromId = startEventData.id === oldStartId ? 'START' : startEventData.id;
      
      taskToStartEvent.set(task.id, fromId);
      taskToEndEvent.set(task.id, endEventData.id);
      
      connections.push({
        from: fromId,
        to: endEventData.id,
        taskId: task.id,
        duration: task.duration,
        isDummy: false
      });
    });
    
    const endTasks = results.filter(task => 
      !results.some(t => t.predecessors.includes(task.id))
    );
    
    const finishPredIds = endTasks.map(t => t.id).sort();
    const finishEvent = getOrCreateEvent(finishPredIds);
    const oldFinishId = finishEvent.id;
    finishEvent.id = 'FINISH';
    
    connections.forEach(conn => {
      if (conn.to === oldFinishId) conn.to = 'FINISH';
      if (conn.from === oldFinishId) conn.from = 'FINISH';
    });
    
    endTasks.forEach(task => {
      const taskEndEvent = taskToEndEvent.get(task.id);
      if (taskEndEvent !== 'FINISH' && taskEndEvent !== oldFinishId) {
        connections.push({
          from: taskEndEvent,
          to: 'FINISH',
          taskId: null,
          duration: 0,
          isDummy: true
        });
      }
    });
    
    const intermediateEvents = Array.from(events.values()).filter(
      e => e.predIds.length > 0 && e.id !== 'FINISH' && 
           !results.some(t => e.predIds.length === 1 && e.predIds[0] === t.id)
    );
    
    intermediateEvents.forEach(event => {
      event.predIds.forEach(predId => {
        const predEndEvent = taskToEndEvent.get(predId);
        if (predEndEvent && predEndEvent !== event.id) {
          const existingDummy = connections.find(
            c => c.from === predEndEvent && c.to === event.id && c.isDummy
          );
          if (!existingDummy) {
            connections.push({
              from: predEndEvent,
              to: event.id,
              taskId: null,
              duration: 0,
              isDummy: true
            });
          }
        }
      });
    });
    
    return { events: Array.from(events.values()), connections };
  };

  const { events, connections } = buildEventGraph();
  
  const calculateEventPositions = () => {
    const positions = {};
    const levels = new Map();
    const eventLevels = new Map();
    
    eventLevels.set('START', 0);
    
    const visited = new Set();
    const calculateLevel = (eventId) => {
      if (eventLevels.has(eventId)) return eventLevels.get(eventId);
      if (visited.has(eventId)) return 0;
      
      visited.add(eventId);
      const incomingConnections = connections.filter(c => c.to === eventId);
      
      if (incomingConnections.length === 0) {
        eventLevels.set(eventId, 0);
        return 0;
      }
      
      const maxPredLevel = Math.max(...incomingConnections.map(c => calculateLevel(c.from)));
      const level = maxPredLevel + 1;
      eventLevels.set(eventId, level);
      return level;
    };
    
    events.forEach(event => calculateLevel(event.id));
    
    const maxLevel = Math.max(...Array.from(eventLevels.values()));
    eventLevels.set('FINISH', maxLevel);
    
    for (let level = 0; level <= maxLevel; level++) {
      levels.set(level, []);
    }
    
    eventLevels.forEach((level, eventId) => {
      levels.get(level).push(eventId);
    });
    
    levels.forEach((eventsInLevel, level) => {
      eventsInLevel.sort((a, b) => {
        const aEvent = events.find(e => e.id === a) || { predIds: [] };
        const bEvent = events.find(e => e.id === b) || { predIds: [] };
        
        const aES = a === 'START' ? 0 : (a === 'FINISH' ? maxEF : 
          (taskMap.get(aEvent.predIds[0])?.ES || 0));
        const bES = b === 'START' ? 0 : (b === 'FINISH' ? maxEF : 
          (taskMap.get(bEvent.predIds[0])?.ES || 0));
        
        return aES - bES;
      });
      
      const count = eventsInLevel.length;
      eventsInLevel.forEach((eventId, index) => {
        const y = START_Y + index * VERTICAL_SPACING - ((count - 1) * VERTICAL_SPACING) / 2;
        positions[eventId] = {
          x: START_X + level * LEVEL_SPACING,
          y
        };
      });
    });
    
    return positions;
  };
  
  const eventPositions = calculateEventPositions();

  const calculateEventTimings = () => {
    const eventTimings = new Map();
    
    eventTimings.set('START', { ES: 0, LF: 0 });
    
    const topologicalOrder = [];
    const visited = new Set();
    
    const visit = (eventId) => {
      if (visited.has(eventId)) return;
      visited.add(eventId);
      
      const incomingConns = connections.filter(c => c.to === eventId);
      incomingConns.forEach(conn => {
        if (!visited.has(conn.from)) {
          visit(conn.from);
        }
      });
      
      topologicalOrder.push(eventId);
    };
    
    events.forEach(event => visit(event.id));
    visit('FINISH');
    
    topologicalOrder.forEach(eventId => {
      if (eventId === 'START') {
        eventTimings.set('START', { ES: 0, LF: 0 });
        return;
      }
      
      const incomingConnections = connections.filter(c => c.to === eventId);
      
      let ES = 0;
      if (incomingConnections.length > 0) {
        ES = Math.max(...incomingConnections.map(conn => {
          if (conn.isDummy) {
            const predEventTiming = eventTimings.get(conn.from);
            return predEventTiming ? predEventTiming.ES : 0;
          } else {
            const task = taskMap.get(conn.taskId);
            return task ? task.EF : 0;
          }
        }));
      }
      
      eventTimings.set(eventId, { ES, LF: maxEF });
    });
    
    eventTimings.set('FINISH', { ES: maxEF, LF: maxEF });
    
    const reverseOrder = [...topologicalOrder].reverse();
    reverseOrder.forEach(eventId => {
      if (eventId === 'FINISH') return;
      
      const outgoingConnections = connections.filter(c => c.from === eventId);
      
      let LF = maxEF;
      if (outgoingConnections.length > 0) {
        LF = Math.min(...outgoingConnections.map(conn => {
          if (conn.isDummy) {
            const succEventTiming = eventTimings.get(conn.to);
            return succEventTiming ? succEventTiming.LF : maxEF;
          } else {
            const task = taskMap.get(conn.taskId);
            return task ? task.LS : maxEF;
          }
        }));
      }
      
      const current = eventTimings.get(eventId);
      eventTimings.set(eventId, { ES: current.ES, LF });
    });
    
    return eventTimings;
  };
  
  const eventTimings = calculateEventTimings();
  
  const getEventData = (eventId) => {
    const timing = eventTimings.get(eventId);
    if (!timing) return { id: eventId, ES: 0, EF: 0, LS: 0, LF: 0 };
    return { id: eventId, ES: timing.ES, EF: timing.ES, LS: timing.LF, LF: timing.LF };
  };
  
  const allYCoords = Object.values(eventPositions).map(p => p.y);
  const maxX = Math.max(...Object.values(eventPositions).map(p => p.x)) + 200;
  const maxY = Math.max(...allYCoords) + NODE_RADIUS + 50;
  const minY = Math.min(...allYCoords) - NODE_RADIUS - 50;
  const svgHeight = Math.max(maxY - minY, 500);

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
            
            const lineClass = conn.isDummy ? 'connection-line dummy-line' : 'connection-line';
            const arrowClass = conn.isDummy ? 'arrow-head dummy-arrow' : 'arrow-head';
            
            return (
              <g key={`conn-${i}`} className="connection-group">
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
                {!conn.isDummy && (
                  <text
                    x={midX}
                    y={midY + labelOffsetY}
                    className="connection-label"
                    textAnchor="middle"
                  >
                    {conn.taskId} ({conn.duration})
                  </text>
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

            return (
              <g key={`node-${event.id}`} className="node-group">
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_RADIUS}
                  className={`node-circle ${
                    isStart || isFinish ? 'milestone-node' : 'normal-node'
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