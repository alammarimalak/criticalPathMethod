import { useState } from 'react';

const ResultsTable = ({ results, tasks = [] }) => {
  const [expandedTasks, setExpandedTasks] = useState({});

  const taskDataMap = tasks.reduce((map, task) => {
    map[task.id] = task;
    return map;
  }, {});

  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  return (
    <div className="table-container">
      <table className="results-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Title</th>
            <th>Description</th>
            <th>Subtasks</th>
            <th>Duration</th>
            <th>ES</th>
            <th>EF</th>
            <th>LS</th>
            <th>LF</th>
            <th>MT (Float Totale)</th>
            <th>ML (Float Libre)</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => {
            const taskData = taskDataMap[result.id] || {};
            const subtasks = taskData.subtasks || [];
            const isExpanded = expandedTasks[result.id];
            const hasSubtasks = subtasks.length > 0;
            
            return (
              <>
                <tr key={`result-${index}`} className={result.MT === 0 ? 'critical-task' : ''}>
                  <td>
                    <strong>{result.id}</strong>
                  </td>
                  <td>
                    {taskData.title || '-'}
                  </td>
                  <td>
                    <div className="description-cell">
                      {taskData.description ? (
                        <div className="truncated-description">
                          {taskData.description.length > 50 
                            ? `${taskData.description.substring(0, 50)}...` 
                            : taskData.description}
                        </div>
                      ) : '-'}
                    </div>
                  </td>
                  <td>
                    <div className="subtasks-indicator">
                      {hasSubtasks ? (
                        <button
                          type="button"
                          onClick={() => toggleTaskExpansion(result.id)}
                          className="expand-btn"
                        >
                          {isExpanded ? '▼' : '▶'} {subtasks.length} subtasks
                        </button>
                      ) : (
                        '-'
                      )}
                    </div>
                  </td>
                  <td>{result.duration}</td>
                  <td>{result.ES}</td>
                  <td>{result.EF}</td>
                  <td>{result.LS}</td>
                  <td>{result.LF}</td>
                  <td>{result.MT}</td>
                  <td>{result.ML}</td>
                </tr>
                
                {/* Expanded subtasks row */}
                {isExpanded && hasSubtasks && (
                  <tr key={`subtasks-${result.id}`} className="subtasks-details-row">
                    <td colSpan="11">
                      <div className="subtasks-details">
                        <h4>Subtasks for {result.id}: {taskData.title || 'Untitled'}</h4>
                        <ul className="subtasks-list">
                          {subtasks.map((subtask, subIndex) => (
                            <li key={subIndex} className="subtask-item">
                              <span className="subtask-number">{subIndex + 1}.</span>
                              <span className="subtask-content">{subtask}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;