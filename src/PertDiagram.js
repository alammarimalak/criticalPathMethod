import './PertDiagram.css';

const PertDiagram = ({ results, tasks }) => {
  if (!results || results.length === 0) return null;

  const NODE_RADIUS = 60;
  //const NODE_DIAMETER = NODE_RADIUS * 2;
  const LEVEL_SPACING = 280;
  const VERTICAL_SPACING = 200;
  const START_X = 150;
  const START_Y = 300;

  const taskMap = new Map(results.map(t => [t.id, t]));

  const calculateNodePositions = () => {
    const positions = {};
    const levels = {};
    
    levels[0] = ['START'];
    
    results.forEach(task => {
      if (!levels[task.EF]) {
        levels[task.EF] = [];
      }
      levels[task.EF].push(task.id);
    });

    const maxEF = Math.max(...results.map(task => task.EF));
    levels[maxEF] = ['FINISH'];

    Object.keys(levels).sort((a, b) => a - b).forEach((level, levelIndex) => {
      const tasksInLevel = levels[level];
      
      tasksInLevel.forEach((taskId, index) => {
        const y = START_Y + (index * VERTICAL_SPACING) - ((tasksInLevel.length - 1) * VERTICAL_SPACING / 2);
        positions[taskId] = {
          x: START_X + (levelIndex * LEVEL_SPACING),
          y: y,
          level: parseInt(level),
          index: index
        };
      });
    });

    return positions;
  };

  const nodePositions = calculateNodePositions();

  const getConnections = () => {
    const connections = [];
    
    const startTasks = results.filter(task => task.predecessors.length === 0);
    startTasks.forEach(task => {
      if (nodePositions.START && nodePositions[task.id]) {
        connections.push({
          from: 'START',
          to: task.id,
          taskId: task.id,
          duration: taskMap.get(task.id)?.duration || 0,
          fromPos: nodePositions.START,
          toPos: nodePositions[task.id]
        });
      }
    });

    tasks.forEach(task => {
      task.predecessors.forEach(predId => {
        if (nodePositions[predId] && nodePositions[task.id]) {
          connections.push({
            from: predId,
            to: task.id,
            taskId: task.id,
            duration: task.duration,            
            fromPos: nodePositions[predId],
            toPos: nodePositions[task.id]
          });
        }
      });
    });

  const tasksWithSuccessors = new Set();
  results.forEach(task => {
    task.predecessors.forEach(predId => tasksWithSuccessors.add(predId));
  });

  const endTasks = results.filter(task => !tasksWithSuccessors.has(task.id));

  endTasks.forEach(task => {
    if (nodePositions[task.id] && nodePositions.FINISH) {
      connections.push({
        from: task.id,
        to: 'FINISH',
        taskId: 'FINISH',
        duration: 0,
        fromPos: nodePositions[task.id],
        toPos: nodePositions.FINISH,
        isFinish: true
      });
    }
  });
    return connections;
  };

  const connections = getConnections();

  const getTaskData = (taskId) => {
    if (taskId === 'START') {
      return { id: 'START', ES: 0, LS: 0, EF: 0, LF: 0, MT: 0, duration: 0 };
    }
    if (taskId === 'FINISH') {
      const maxEF = Math.max(...results.map(task => task.EF));
      return { id: 'FINISH', ES: maxEF, LS: maxEF, EF: maxEF, LF: maxEF, MT: 0, duration: 0 };
    }
    return taskMap.get(taskId);
  };

  const allNodeIds = ['START', ...results.map(task => task.id), 'FINISH'].filter(id => nodePositions[id]);

  const maxX = Math.max(...Object.values(nodePositions).map(p => p.x)) + 200;
  const maxY = Math.max(...Object.values(nodePositions).map(p => p.y)) + NODE_RADIUS + 50;
  const minY = Math.min(...Object.values(nodePositions).map(p => p.y)) - NODE_RADIUS - 50;
  const svgHeight = maxY - minY;

  return (
    <div className="pert-diagram-container">
      <h3>Diagramme PERT</h3>
      <div className="pert-diagram-wrapper">
        <svg width={maxX} height={svgHeight} viewBox={`0 ${minY} ${maxX} ${svgHeight}`} className="pert-svg">
          {connections.map((conn, index) => {
            const dx = conn.toPos.x - conn.fromPos.x;
            const dy = conn.toPos.y - conn.fromPos.y;
            const angle = Math.atan2(dy, dx);
            
            const fromX = conn.fromPos.x + NODE_RADIUS * Math.cos(angle);
            const fromY = conn.fromPos.y + NODE_RADIUS * Math.sin(angle);
            
            const toX = conn.toPos.x - NODE_RADIUS * Math.cos(angle);
            const toY = conn.toPos.y - NODE_RADIUS * Math.sin(angle);
            
            const arrowX = toX - 15 * Math.cos(angle);
            const arrowY = toY - 15 * Math.sin(angle);
            
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2;
            const labelOffsetY = dy > 0 ? -15 : 25;
            
            return (
              <g key={`conn-${index}`} className="connection-group">
                <line
                  x1={fromX}
                  y1={fromY}
                  x2={arrowX}
                  y2={arrowY}
                  className={`connection-line ${
                    conn.to === 'FINISH' 
                      ? taskMap.get(conn.from)?.MT === 0 
                      : taskMap.get(conn.to)?.MT === 0 
                    ? 'critical-path' : ''}`}
                />
                
                <polygon
                  points={`
                    ${toX},${toY}
                    ${arrowX - 8 * Math.sin(angle)},${arrowY + 8 * Math.cos(angle)}
                    ${arrowX + 8 * Math.sin(angle)},${arrowY - 8 * Math.cos(angle)}
                  `}
                  className={`arrow-head ${
                    conn.to === 'FINISH'
                      ? taskMap.get(conn.from)?.MT === 0
                      : taskMap.get(conn.to)?.MT === 0
                    ? 'critical-path' : ''}`}
                />
                
                {!conn.isFinish && (
                  <text
                    x={midX}
                    y={midY + labelOffsetY}
                    className="connection-label"
                    textAnchor="middle"
                  >
                    {conn.label}
                  </text>
                )}
                {
                  <text
                    x={midX}
                    y={midY + labelOffsetY + 15}
                    className="connection-duration"
                    textAnchor="middle"
                  >
                  {conn.to === 'FINISH' ? '' : `${conn.to} (${taskMap.get(conn.to)?.duration || 0})`}  </text>
                }
              </g>
            );
          })}
          
          {allNodeIds.map((taskId) => {
            const task = getTaskData(taskId);
            const position = nodePositions[taskId];
            if (!position || !task) return null;

            const isStart = taskId === 'START';
            const isFinish = taskId === 'FINISH';
            const isCritical = task.MT === 0;

            return (
              <g key={`node-${taskId}`} className="node-group">
                {/* Outer circle */}
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={NODE_RADIUS}
                  className={`node-circle ${
                    isStart || isFinish ? 'milestone-node' : 
                    isCritical ? 'critical-node' : 'normal-node'
                  }`}
                />
                
                <line
                  x1={position.x}
                  y1={position.y - NODE_RADIUS}
                  x2={position.x}
                  y2={position.y + 1}
                  className="node-divider"
                />
                
                <line
                  x1={position.x - NODE_RADIUS}
                  y1={position.y}
                  x2={position.x + NODE_RADIUS}
                  y2={position.y}
                  className="node-divider"
                />
                
                <text
                  x={position.x - NODE_RADIUS / 2}
                  y={position.y - NODE_RADIUS / 4}
                  className="node-date node-es"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {task.EF}
                </text>
                
                <text
                  x={position.x + NODE_RADIUS / 2}
                  y={position.y - NODE_RADIUS / 4}
                  className="node-date node-ls"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {task.LF}
                </text>
                
                <text
                  x={position.x}
                  y={position.y + 25}
                  className="node-task-id"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {isStart ? 'Start' : isFinish ? 'Finish' : allNodeIds.filter(id => id !== 'START' && id !== 'FINISH').indexOf(taskId) + 1}                </text>              
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default PertDiagram;