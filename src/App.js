import { useState } from 'react';
import TaskTable from './TaskTable';
import ControlPanel from './ControlPanel';
import ResultsTable from './ResultsTable';
import CriticalPath from './CriticalPath';
import Formulas from './Formulas';
import { calculateSchedule } from './CalculateSchedule';
import Footer from './Footer'
import './App.css';

const initialTasks = [
   { id: "A", duration: 3, predecessors: [] },
   { id: "B", duration: 2, predecessors: ["A"] },
];

function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [results, setResults] = useState([]);
  const [criticalPath, setCriticalPath] = useState([]);
  const [error, setError] = useState('');

  const handleCalculate = () => {
    try{
      setError('');

      if (tasks.length === 0){
        setError("Add at least one task !")
        return;
      }
      
      const results = calculateSchedule(tasks);
      setResults(results);

      const criticalPath = results
            .filter(task => task.MT === 0)
            .map(task => task.id);
      setCriticalPath(criticalPath)
    } catch (err){
      setError(err.message);
      setResults([]);
      setCriticalPath([]);
    }
  };

  const handleAddTask = () => {
    const newId = String.fromCharCode(65 + tasks.length); 
    setTasks(prev => [...prev, { id: newId, duration: 0, predecessors: [] }]);
  };

  const handleDeleteTask = (index) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateTask = (index, field, value) => {
    const updatedTasks = [...tasks];
    
    if (field === 'predecessors') {
        const predecessorsArray = value
        .split(',')
        .map(p => p.trim())
        .filter(p => p !== ''); 
      
      updatedTasks[index] = {
        ...updatedTasks[index],
        predecessors: predecessorsArray
      };
    } else if (field === 'duration') {
      updatedTasks[index] = {
        ...updatedTasks[index],
        [field]: parseInt(value) || 0
      };
    } else {
      updatedTasks[index] = {
        ...updatedTasks[index],
        [field]: value
      };
    }
    
    setTasks(updatedTasks);
  };  

  const handleReset = () =>{
    setTasks(initialTasks);
    setResults([]);
    setCriticalPath([]);
  }

  return (
  <div className="app">
    <header className="app-header">
      <h1>CPM Task Scheduler</h1>
      <p>Enter tasks, durations, and predecessors, then calculate ES/EF/LS/LF/MT/ML.</p>
    </header>

    <main className="app-main">
      <TaskTable
        tasks={tasks}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />
      
      <ControlPanel
        onAddTask={handleAddTask}
        onCalculate={handleCalculate}
        onReset={handleReset}
      />

      {error && (
        <div className="error-message">
          <strong>Calculation Error:</strong>
          <div className="error-content">
            {error.split('\n').map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
          <button onClick={() => setError('')} className="btn btn-error">
            Dismiss
          </button>
        </div>
      )}

      {results.length > 0 && (
        <>
          <ResultsTable results={results} />
          <CriticalPath path={criticalPath} tasks={tasks} />
        </>
      )}

      <Formulas />
      <Footer/>
    </main>
  </div>
);
}

export default App;