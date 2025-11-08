import './PertDiagram.css';

const PertDiagram = ({ results, tasks }) => {
  if (!results || results.length === 0) return null;

  const NODE_RADIUS = 60;
  const LEVEL_SPACING = 280;
  const VERTICAL_SPACING = 200;
  const START_X = 150;
  const START_Y = 300;

  const taskMap = new Map(results.map(t => [t.id, t]));

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

    sortedTasks.forEach(task => {
      const successors = results.filter(t => t.predecessors.includes(task.id));
      if (successors.length === 0 && nodePositions[task.id] && nodePositions.FINISH) {
        const predId = task.predecessors[0];

        if (predId && nodePositions[predId]) {
          connections.push({
            from: predId,
            to: 'FINISH',
            duration: task.duration,
            fromPos: nodePositions[predId],
            toPos: nodePositions.FINISH,
            label: task.id,
          });
        } else if (task.predecessors.length === 0) {
          connections.push({
            from: 'START',
            to: 'FINISH',
            duration: task.duration,
            fromPos: nodePositions.START,
            toPos: nodePositions.FINISH,
            label: task.id,
          });
        }
      }
    });

    return connections;
  };

  const connections = getConnections();

  const getTaskData = id => {
    if (id === 'START')
      return { id: 'START', ES: 0, EF: 0, LS: 0, LF: 0, MT: 0, duration: 0 };
    if (id === 'FINISH') {
      const maxEF = Math.max(...results.map(t => t.EF));
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

  const maxX = Math.max(...Object.values(nodePositions).map(p => p.x)) + 200;
  const maxY = Math.max(...Object.values(nodePositions).map(p => p.y)) + NODE_RADIUS + 50;
  const minY = Math.min(...Object.values(nodePositions).map(p => p.y)) - NODE_RADIUS - 50;
  const svgHeight = maxY - minY;

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

            const startOffset = NODE_RADIUS;

            const fromX = conn.fromPos.x + startOffset * Math.cos(angle);
            const fromY = conn.fromPos.y + startOffset * Math.sin(angle);
            const toX = conn.toPos.x - NODE_RADIUS * Math.cos(angle);
            const toY = conn.toPos.y - NODE_RADIUS * Math.sin(angle);
            const arrowX = toX - 15 * Math.cos(angle);
            const arrowY = toY - 15 * Math.sin(angle);
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2;
            const labelOffsetY = dy > 0 ? -15 : 25;

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

          {visualNodeIds.map(id => {
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
                  {isStart ? 'Start' : isFinish ? 'Finish' : task.id}
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