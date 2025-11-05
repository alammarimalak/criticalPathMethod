import {useState} from 'react';

const TaskTable = ({ tasks, onUpdateTask, onDeleteTask }) => {
  const [tempValues, setTempValues] = useState({});

  const handlePredecessorsChange = (index, value) => {
    setTempValues(prev => ({ ...prev, [index]: value }));
  };

  const handlePredecessorsBlur = (index) => {
    if (tempValues[index] !== undefined) {
      onUpdateTask(index, 'predecessors', tempValues[index]);
    }
  };

  return (
    <div className="table-container">
      <table className="task-table">
        <thead>
          <tr>
            <th>Task ID</th>
            <th>Duration</th>
            <th>Predecessors (comma-separated)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            <tr key={index} className="task-row">
              <td>
                <input
                  type="text"
                  value={task.id}
                  onChange={(e) => onUpdateTask(index, 'id', e.target.value)}
                  className="input-field"
                />
              </td>
              <td>
                <input
                  type="text"                  
                  value={task.duration}
                  onChange={(e) => onUpdateTask(index, 'duration', parseInt(e.target.value) || 0)}
                  className="input-field"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={tempValues[index] !== undefined ? tempValues[index] : task.predecessors.join(', ')}
                  onChange={(e) => handlePredecessorsChange(index, e.target.value)}
                  onBlur={() => handlePredecessorsBlur(index)}
                  className="input-field"
                  placeholder="A, B, C"
                />
              </td>
              <td>
                <button
                  onClick={() => onDeleteTask(index)}
                  className="delete-btn"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable;