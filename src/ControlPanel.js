import React from 'react';

const ControlPanel = ({ 
  onAddTask, 
  onCalculate, 
  onReset,
  onExportPDF,
  isExporting = false
}) => {
  return (
    <div className="control-panel">
      <button onClick={onAddTask} className="btn btn-primary">
        + Add Task
      </button>
      <button onClick={onCalculate} className="btn btn-success">
        Calculate Schedule
      </button>
      <button onClick={onReset} className="btn btn-warning">
        Reset All
      </button>
      <button 
        onClick={onExportPDF} 
        className="btn btn-primary"
        disabled={isExporting}
      >
        {isExporting ? 'On My Way !' : 'Export PDF'}
      </button>
    </div>
  );
};

export default ControlPanel;