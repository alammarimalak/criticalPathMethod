const ControlPanel = ({ onAddTask, onCalculate, onReset, onExportPDF, isExporting }) => {
  return (
    <div className="control-panel">
      <button className="btn btn-primary" onClick={onAddTask}>
        + Add Task
      </button>
      <button className="btn btn-success" onClick={onCalculate}>
        Calculate Schedule
      </button>
      <button className="btn btn-warning" onClick={onReset}>
        Reset
      </button>      
      <button 
        className="btn btn-primary" 
        onClick={onExportPDF} 
        disabled={isExporting}
      >
        {isExporting ? 'Generating PDF...' : '📄 Export PDF'}
      </button>
    </div>
  );
};

export default ControlPanel;