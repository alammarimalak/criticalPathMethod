const Formulas = () => {
  return (
    <div className="formulas-container">
      <h3>CPM Formulas Explained:</h3>
      <ul>
        <li><strong>ES (Early Start):</strong> <code>ES = max(EF of all predecessors)</code></li>
        <li><strong>EF (Early Finish):</strong> <code>EF = ES + Duration</code></li>
        <li><strong>LF (Late Finish):</strong> <code>LF = min(LS of all successors)</code> or <code>LF = Max(EF)</code> if none</li>
        <li><strong>LS (Late Start):</strong> <code>LS = LF - Duration</code></li>
        <li><strong>MT (Total Float):</strong> <code>MT = LS - ES</code></li>
        <li><strong>ML (Free Float):</strong> <code>ML = min(ES of successors) - EF</code></li>
        <li>Critical Path → Tasks where <code>MT = 0</code></li>
      </ul>
    </div>
  );
};

export default Formulas;