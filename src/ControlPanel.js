const ControlPanel = ({ onAddTask, onCalculate, onReset }) => {
  return (
    <div className="control-panel">
      <button onClick={onAddTask} className="btn btn-primary">
        Add Task
      </button>
      <button onClick={onCalculate} className="btn btn-success">
        Calculate Schedule
      </button>
      <button onClick={onReset} className="btn btn-warning">
        Reset
      </button>
    </div>
  );
};

export default ControlPanel;