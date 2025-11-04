const CriticalPath = ({ path, tasks }) => {
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

  return (
    <div className="critical-path success">
      Critical Path: <strong>{path.join(" → ")}</strong>
    </div>
  );
};

export default CriticalPath;