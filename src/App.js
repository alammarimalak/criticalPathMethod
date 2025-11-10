import  {useState}  from 'react';
import TaskTable from './TaskTable';
import ControlPanel from './ControlPanel';
import ResultsTable from './ResultsTable';
import CriticalPath from './CriticalPath';
import Formulas from './Formulas';
import  {calculateSchedule}  from './CalculateSchedule';
import PertDiagram from './PertDiagram';
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
      
      if (tasks.length > 1) {
        const tasksWithSuccessors = new Set();
        tasks.forEach(task => {
          task.predecessors.forEach(predId => {
            tasksWithSuccessors.add(predId);
          });
        });

        const orphanedTasks = tasks.filter(task => 
          task.predecessors.length === 0 && !tasksWithSuccessors.has(task.id)
        );

        if (orphanedTasks.length > 0) {
          const orphanedTaskIds = orphanedTasks.map(t => t.id).join(', ');
          setError(
            `The following tasks are isolated (without predecessors or successors) : ${orphanedTaskIds}`
          );
          setResults([]);
          setCriticalPath([]);
          return; 
        }
      }
            
      const results = calculateSchedule(tasks);
      
      const finalTaskIds = new Set(results.map(t => t.id));
      results.forEach(task => {
        task.predecessors.forEach(predId => {
          finalTaskIds.delete(predId);
        });
      });

      if (finalTaskIds.size > 1) {
        const finalTaskIdsList = Array.from(finalTaskIds).join(', ');
        setError(
          `Logic error: The project must converge to a single final task. The following tasks do not have successors: ${finalTaskIdsList}`
        );
        setResults([]);
        setCriticalPath([]);
        return; 
      }

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
    setTasks(prev => [...prev, { id: newId, duration: null, predecessors: [] }]);
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
      
      const duration = parseInt(value) || null;
      updatedTasks[index] = {
        ...updatedTasks[index],
        [field]:  duration 
      };
    } else if (field === 'id') {
      const newId = value.trim();
            
      const isDuplicate = updatedTasks.some((task, taskIndex) => 
        taskIndex !== index && task.id.trim().toLowerCase() === newId.toLowerCase()
      );
      
      if (isDuplicate && newId !== '') {
        setError(`Task ID "${newId}" is already used. Task IDs must be unique.`);
      } else if (newId === '') {
        setError(`Task ID cannot be empty.`);
      } else {
        setError('');
      }
      
      updatedTasks[index] = {
        ...updatedTasks[index],
        [field]: newId
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
    setError('');
  }

  return (
  <div className="app">
     
    <a href="https://ko-fi.com/malakalammari" target="_blank" rel="noopener noreferrer" className="btn kofi-btn" >
      Buy me a Ko-fi ☕
    </a>
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
          <PertDiagram results={results} tasks={tasks} />
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