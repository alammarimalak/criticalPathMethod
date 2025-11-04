const TaskTable = ({ tasks, onUpdateTask, onDeleteTask }) => {
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
                  value={task.id}
                  onChange={(e) => onUpdateTask(index, 'id', e.target.value)}
                  className="input-field"
                />
              </td>
              <td>
                <input                  
                  value={task.duration}
                  onChange={(e) => onUpdateTask(index, 'duration', e.target.value)}
                  className="input-field"
                />
              </td>
              <td>
                <input
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable;