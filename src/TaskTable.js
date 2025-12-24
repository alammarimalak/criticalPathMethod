import { useEffect, useState } from 'react';

const TaskTable = ({ tasks, onUpdateTask, onDeleteTask }) => {
  const [predecessorInputs, setPredecessorInputs] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});

  useEffect(() => {
    const firstTask = tasks[0];
    if (firstTask && firstTask.predecessors.length > 0) {      
      onUpdateTask(0, 'predecessors', '');      
      setPredecessorInputs(prev => ({ ...prev, 0: '-' }));
    }
  }, [tasks, onUpdateTask]);

  const handleDurationChange = (index, value) => {
    const duration = parseInt(value);
    if (duration > 0) {
      onUpdateTask(index, 'duration', duration);
    } else {
      onUpdateTask(index, 'duration'); 
    }
  };

  const handleIdChange = (index, value) => {
    onUpdateTask(index, 'id', value);
  };

  const handlePredecessorChange = (index, value) => {
    setPredecessorInputs(prev => ({ ...prev, [index]: value }));
    onUpdateTask(index, 'predecessors', value);
  };

  const handleTitleChange = (index, value) => {
    onUpdateTask(index, 'title', value);
  };

  const handleDescriptionChange = (index, value) => {
    onUpdateTask(index, 'description', value);
  };

  const handleSubtaskChange = (taskIndex, subtaskIndex, value) => {
    const updatedSubtasks = [...(tasks[taskIndex].subtasks || [])];
    updatedSubtasks[subtaskIndex] = value;
    onUpdateTask(taskIndex, 'subtasks', updatedSubtasks);
  };

  const addSubtask = (taskIndex) => {
    const currentSubtasks = tasks[taskIndex].subtasks || [];
    onUpdateTask(taskIndex, 'subtasks', [...currentSubtasks, '']);
  };

  const deleteSubtask = (taskIndex, subtaskIndex) => {
    const updatedSubtasks = tasks[taskIndex].subtasks.filter((_, i) => i !== subtaskIndex);
    onUpdateTask(taskIndex, 'subtasks', updatedSubtasks);
  };

  const toggleTaskExpansion = (taskIndex) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskIndex]: !prev[taskIndex]
    }));
  };

  const getPredecessorValue = (index, task) => {    
    if (index === 0) {
      return '';
    }
    if (predecessorInputs.hasOwnProperty(index)) {
      return predecessorInputs[index];
    }
    return task.predecessors.length > 0 ? task.predecessors.join(', ') : '';
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
            <th>Task Title</th>
            <th>Description</th>
            <th>Subtasks</th>
            <th>Duration</th>
            <th>Predecessors</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => {
            const hasDuplicateId = isDuplicateId(index, task.id);
            const isEmptyId = !task.id || task.id.trim() === '';
            const isExpanded = expandedTasks[index];
            const subtasks = task.subtasks || [];
            
            return (
              <>
                <tr key={`task-${index}`} className="task-row">
                  <td>
                    <input
                      type="text"
                      value={task.id}
                      onChange={(e) => handleIdChange(index, e.target.value)}
                      className={`input-field ${hasDuplicateId || isEmptyId ? 'input-error' : ''}`}
                      placeholder="Unique ID"
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
                      value={task.title || ''}
                      onChange={(e) => handleTitleChange(index, e.target.value)}
                      className="input-field"
                      placeholder="Task title"
                    />
                  </td>
                  <td>
                    <textarea
                      value={task.description || ''}
                      onChange={(e) => handleDescriptionChange(index, e.target.value)}
                      className="input-field description-field"
                      placeholder="Task description"
                      rows="2"
                    />
                  </td>
                  <td>
                    <div className="subtasks-controls">
                      <button
                        type="button"
                        onClick={() => toggleTaskExpansion(index)}
                        className="expand-btn"
                      >
                        {isExpanded ? '▼' : '▶'} Subtasks ({subtasks.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => addSubtask(index)}
                        className="add-subtask-btn"
                        title="Add subtask"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"                    
                      value={task.duration || ''} 
                      onChange={(e) => handleDurationChange(index, e.target.value)}
                      className="input-field"
                      placeholder="Duration"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={getPredecessorValue(index, task)}
                      onChange={(e) => handlePredecessorChange(index, e.target.value)}
                      className="input-field"
                      placeholder={index === 0 ? "-" : "A, B, C"}
                      disabled={index === 0}
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => onDeleteTask(index)}
                      className="delete-btn"
                      title="Delete task"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                
                {isExpanded && (
                  <tr key={`subtasks-${index}`} className="subtasks-row">
                    <td colSpan="7">
                      <div className="subtasks-container">
                        {subtasks.length === 0 ? (
                          <div className="no-subtasks">No subtasks added yet</div>
                        ) : (
                          subtasks.map((subtask, subtaskIndex) => (
                            <div key={subtaskIndex} className="subtask-item">
                              <input
                                type="text"
                                value={subtask}
                                onChange={(e) => handleSubtaskChange(index, subtaskIndex, e.target.value)}
                                className="input-field subtask-input"
                                placeholder={`Subtask ${subtaskIndex + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => deleteSubtask(index, subtaskIndex)}
                                className="delete-subtask-btn"
                                title="Delete subtask"
                              >
                                ×
                              </button>
                            </div>
                          ))
                        )}                        
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

export default TaskTable;