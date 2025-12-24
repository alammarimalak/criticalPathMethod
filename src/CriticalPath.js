import { useState } from 'react';

const CriticalPath = ({ path, tasks = [] }) => {
  const [expanded, setExpanded] = useState(false);

  const isContinuous = (path, tasks) => {
    if (path.length <= 1) return true;
    
    const map = {};
    tasks.forEach(t => {
      t.predecessors.forEach(p => {
        map[p] = map[p] || [];
        map[p].push(t.id);
      });
    });
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!map[path[i]] || !map[path[i]].includes(path[i + 1])) return false;
    }
    return true;
  };

  const taskMap = tasks.reduce((map, task) => {
    map[task.id] = task;
    return map;
  }, {});

  if (path.length === 0) {
    return (
      <div className="critical-path warning">
        No critical path found. There might be an issue with durations or predecessors!
      </div>
    );
  }

  if (!isContinuous(path, tasks)) {
    return (
      <div className="critical-path warning">
        Multiple or disconnected critical paths detected. Check task links or durations!
      </div>
    );
  }

  const pathDetails = path.map(taskId => ({
    id: taskId,
    title: taskMap[taskId]?.title || '',
    duration: taskMap[taskId]?.duration || 0,
    description: taskMap[taskId]?.description || '',
    subtasks: taskMap[taskId]?.subtasks || []
  }));

  const totalDuration = pathDetails.reduce((sum, task) => sum + (task.duration || 0), 0);

  return (
    <div className="critical-path-container">
      <div 
        className={`critical-path success ${expanded ? 'expanded' : ''}`}
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className="critical-path-header">
          <span>
            <strong>Critical Path:</strong> {path.join(" → ")}
          </span>
          <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
        </div>
        <div className="critical-path-summary">
          Total Duration: <strong>{totalDuration}</strong> units • {path.length} tasks
        </div>
      </div>

      {expanded && (
        <div className="critical-path-details">
          <h4>Critical Path Details</h4>
          <div className="critical-path-tasks">
            {pathDetails.map((task, index) => (
              <div key={task.id} className="critical-path-task">
                <div className="task-header">
                  <span className="task-sequence">
                    {index + 1}. 
                    <span className="arrow"> → </span>
                  </span>
                  <div className="task-main">
                    <div className="task-id-title">
                      <span className="task-id">{task.id}</span>
                      {task.title && (
                        <span className="task-title">: {task.title}</span>
                      )}
                    </div>
                    {task.description && (
                      <div className="task-description">
                        {task.description}
                      </div>
                    )}
                    <div className="task-meta">
                      <span className="duration">Duration: {task.duration}</span>
                      {task.subtasks.length > 0 && (
                        <span className="subtasks-count">
                          • {task.subtasks.length} subtasks
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {task.subtasks.length > 0 && (
                  <div className="task-subtasks">
                    <div className="subtasks-label">Subtasks:</div>
                    <ul className="subtasks-list">
                      {task.subtasks.map((subtask, subIndex) => (
                        <li key={subIndex} className="subtask-item">
                          <span className="subtask-number">{subIndex + 1}.</span>
                          <span className="subtask-content">{subtask}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="critical-path-total">
            <strong>Total Project Duration:</strong> {totalDuration} units
          </div>
        </div>
      )}
    </div>
  );
};

export default CriticalPath;