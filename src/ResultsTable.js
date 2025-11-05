const ResultsTable = ({ results }) => {
  return (
    <div className="table-container">
      <table className="results-table">
        <thead>
          <tr>
            <th>Task</th>
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
          {results.map((result, index) => (
            <tr key={index} className={result.MT === 0 ? 'critical-task' : ''}>
              <td>{result.id}</td>
              <td>{result.duration}</td>
              <td>{result.ES}</td>
              <td>{result.EF}</td>
              <td>{result.LS}</td>
              <td>{result.LF}</td>
              <td>{result.MT}</td>
              <td>{result.ML}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;