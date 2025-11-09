import './PertDiagram.css';

const PertDiagram = ({ results, tasks }) => {
  if (!results || results.length === 0) return null;

  const NODE_RADIUS = 60;
  const LEVEL_SPACING = 280;
  const VERTICAL_SPACING = 200;
  const START_X = 150;
  const START_Y = 300;

  const taskMap = new Map(results.map(t => [t.id, t]));

  const maxEF = Math.max(...results.map(t => t.EF));

  const danglingTasks = results.filter(task => {
    const hasSuccessors = results.some(succ => succ.predecessors.includes(task.id));
    return !hasSuccessors && task.LF !== maxEF;
  });

  if (danglingTasks.length > 0) {
    return (
      <div className="pert-diagram-container" style={{ padding: '20px', border: '1px solid #C70039', color: '#C70039', backgroundColor: '#FFF5F5' }}>
        <h3>Erreur de Données PERT</h3>
        <p>
          Le diagramme ne peut pas être affiché car les tâches suivantes ne
          mènent pas correctement à la fin du projet (tâches en suspens) :
          <strong> {danglingTasks.map(t => t.id).join(', ')}</strong>
        </p>
      </div>
    );
  }

  const calculateNodePositions = () => {
    const positions = {};
    const levels = {};

    levels[0] = ['START'];
    const mergedLevels = [];
    let chain = [];

    for (let i = 0; i < results.length; i++) {
      const task = results[i];
      const nextTask = results[i + 1];

      chain.push(task.id);

      const successors = results.filter(t => t.predecessors.includes(task.id));
      const nextHasMultiplePreds = nextTask && nextTask.predecessors.length > 1;

      if (successors.length > 1 || nextHasMultiplePreds || !nextTask) {
        mergedLevels.push([...chain]);
        chain = [];
      }
    }

    mergedLevels.forEach((chain, i) => {
      levels[i + 1] = chain;
    });

    levels[Object.keys(levels).length] = ['FINISH'];

    Object.keys(levels)
      .sort((a, b) => a - b)
      .forEach((level, levelIndex) => {
        const tasksInLevel = levels[level];
        tasksInLevel.forEach((taskId, index) => {
          const y =
            START_Y +
            index * VERTICAL_SPACING -
            ((tasksInLevel.length - 1) * VERTICAL_SPACING) / 2;
          positions[taskId] = {
            x: START_X + levelIndex * LEVEL_SPACING,
            y,
          };
        });
      });

    return positions;
  };

  const nodePositions = calculateNodePositions();

  const getConnections = () => {
    const connections = [];
    const sortedTasks = results.sort((a, b) => a.EF - b.EF);
    const startTasks = results.filter(t => t.predecessors.length === 0);

    startTasks.forEach(task => {
      if (nodePositions.START && nodePositions[task.id]) {
        connections.push({
          from: 'START',
          to: task.id,
          duration: task.duration,
          fromPos: nodePositions.START,
          toPos: nodePositions[task.id],
          label: task.id,
        });
      }
    });

    sortedTasks.forEach(task => {
      const successors = results.filter(t => t.predecessors.includes(task.id));
      if (successors.length > 0) {
        successors.forEach(succ => {
          const succHasNext = results.some(t => t.predecessors.includes(succ.id));
          if (nodePositions[task.id] && nodePositions[succ.id] && succHasNext) {
            connections.push({
              from: task.id,
              to: succ.id,
              duration: succ.duration,
              fromPos: nodePositions[task.id],
              toPos: nodePositions[succ.id],
              label: succ.id,
            });
          }
        });
      }
    });

    // --- START: Fixed logic for final tasks ---
    const finalTasks = sortedTasks.filter(task =>
      results.every(t => !t.predecessors.includes(task.id))
    );

    const predecessorGroups = new Map();
    finalTasks.forEach(task => {
      const predId = task.predecessors.length > 0 ? task.predecessors[0] : 'START';
      if (!predecessorGroups.has(predId)) {
        predecessorGroups.set(predId, []);
      }
      predecessorGroups.get(predId).push(task);
    });

    predecessorGroups.forEach((tasksInGroup, predId) => {
      const fromPos = nodePositions[predId];
      const toPos = nodePositions.FINISH;
      if (!fromPos || !toPos) return;

      const totalTasks = tasksInGroup.length;
      const ARROW_OFFSET = 35; // Vertical offset for each arrow

      tasksInGroup.forEach((task, index) => {
        let verticalOffset = 0;
        if (totalTasks > 1) {
          verticalOffset = (index - (totalTasks - 1) / 2) * ARROW_OFFSET;
        }

        const offsetFromPos = { x: fromPos.x, y: fromPos.y + verticalOffset };
        const offsetToPos = { x: toPos.x, y: toPos.y + verticalOffset };

        // Don't offset the 'from' position if it's the START node
        const finalFromPos = predId === 'START' ? fromPos : offsetFromPos;

        connections.push({
          from: predId,
          to: 'FINISH',
          duration: task.duration,
          fromPos: finalFromPos,
          toPos: offsetToPos,
          label: task.id,
        });
      });
    });
    // --- END: Fixed logic for final tasks ---

    return connections;
  };

  const connections = getConnections();

  const getTaskData = id => {
    if (id === 'START')
      return { id: 'START', ES: 0, EF: 0, LS: 0, LF: 0, MT: 0, duration: 0 };
    if (id === 'FINISH') {
      return {
        id: 'FINISH',
        ES: maxEF,
        EF: maxEF,
        LS: maxEF,
        LF: maxEF,
        MT: 0,
        duration: 0,
      };
    }
    return taskMap.get(id);
  };

  const visualNodeIds = ['START', ...results
    .filter(t => {
      const hasSuccessors = results.some(s => s.predecessors.includes(t.id));
      return hasSuccessors || t.predecessors.length === 0;
    })
    .map(t => t.id), 'FINISH']
    .filter(id => nodePositions[id])
    .filter(id => {
      if (id === 'FINISH' || id === 'START') return true;
      const task = taskMap.get(id);
      if (!task) return true;
      const hasSuccessors = results.some(t => t.predecessors.includes(task.id));
      return hasSuccessors;
    });
  
  const allYCoords = Object.values(nodePositions).map(p => p.y);
  const connectionYCoords = connections.flatMap(c => [c.fromPos.y, c.toPos.y]);
  
  const maxX = Math.max(...Object.values(nodePositions).map(p => p.x)) + 200;
  const maxY = Math.max(...allYCoords, ...connectionYCoords) + NODE_RADIUS + 50;
  const minY = Math.min(...allYCoords, ...connectionYCoords) - NODE_RADIUS - 50;
  
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
            const dx = conn.toPos.x - conn.fromPos.x;
            const dy = conn.toPos.y - conn.fromPos.y;
            const angle = Math.atan2(dy, dx);

            const startOffset = (conn.from === 'START' || conn.to === 'FINISH') ? NODE_RADIUS : NODE_RADIUS;

            const fromX = conn.fromPos.x + startOffset * Math.cos(angle);
            const fromY = conn.fromPos.y + startOffset * Math.sin(angle);
            const toX = conn.toPos.x - NODE_RADIUS * Math.cos(angle);
            const toY = conn.toPos.y - NODE_RADIUS * Math.sin(angle);
            const arrowX = toX - 15 * Math.cos(angle);
            const arrowY = toY - 15 * Math.sin(angle);
            
            // Adjust midX and midY for label placement
            const textPathLength = Math.hypot(toX - fromX, toY - fromY);
            const midX = fromX + (textPathLength / 2) * Math.cos(angle);
            const midY = fromY + (textPathLength / 2) * Math.sin(angle);
            
            const labelOffsetY = dy === 0 ? -15 : (dy > 0 ? -15 : 25);
            
            return (
              <g key={`conn-${i}`} className="connection-group">
                <line
                  x1={fromX}
                  y1={fromY}
                  x2={arrowX}
                  y2={arrowY}
                  className="connection-line critical-path"
                />
                <polygon
                  points={`
                    ${toX},${toY}
                    ${arrowX - 8 * Math.sin(angle)},${arrowY + 8 * Math.cos(angle)}
                    ${arrowX + 8 * Math.sin(angle)},${arrowY - 8 * Math.cos(angle)}
                  `}
                  className="arrow-head critical-path"
                />
                <text
                  x={midX}
                  y={midY + labelOffsetY}
                  className="connection-label"
                  textAnchor="middle"
                >
                  {conn.label} ({conn.duration})
                </text>
              </g>
            );
          })}

          {visualNodeIds.map((id,index)=> {
            const task = getTaskData(id);
            const pos = nodePositions[id];
            if (!pos || !task) return null;

            const isStart = id === 'START';
            const isFinish = id === 'FINISH'; 

            return (
              <g key={`node-${id}`} className="node-group">
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
                  {task.EF}
                </text>
                <text
                  x={pos.x + NODE_RADIUS / 2}
                  y={pos.y - NODE_RADIUS / 4}
                  className="node-date"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {task.LF}
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