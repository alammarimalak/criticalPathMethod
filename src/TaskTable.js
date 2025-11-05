const TaskTable = ({ tasks, onUpdateTask, onDeleteTask }) => {
  const handleDurationChange = (index, value) => {
    const duration = parseInt(value);
    if (duration > 0) {
      onUpdateTask(index, 'duration', duration);
    } else {
      onUpdateTask(index, 'duration', 1);
    }
  };

  const handleIdChange = (index, value) => {
    onUpdateTask(index, 'id', value);
  };

  const isDuplicateId = (taskIndex, taskId) => {
    return tasks.some((task, index) => 
      index !== taskIndex && task.id.trim().toLowerCase() === taskId.trim().toLowerCase()
    );
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
          {tasks.map((task, index) => {
            const hasDuplicateId = isDuplicateId(index, task.id);
            const isEmptyId = !task.id || task.id.trim() === '';
            
            return (
              <tr key={index} className="task-row">
                <td>
                  <input
                    type="text"
                    value={task.id}
                    onChange={(e) => handleIdChange(index, e.target.value)}
                    className={`input-field ${hasDuplicateId || isEmptyId ? 'input-error' : ''}`}
                    placeholder="Unique task ID"
                  />
                  {hasDuplicateId && (
                    <div className="field-warning">ID must be unique</div>
                  )}
                  {isEmptyId && (
                    <div className="field-warning">ID cannot be empty</div>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    min="1"
                    value={task.duration}
                    onChange={(e) => handleDurationChange(index, e.target.value)}
                    className="input-field"
                    placeholder="Duration (≥1)"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={task.predecessors.join(', ')}
                    onChange={(e) => onUpdateTask(index, 'predecessors', e.target.value)}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable;