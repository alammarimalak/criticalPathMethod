import { useState } from 'react';
import TaskTable from './TaskTable';
import ControlPanel from './ControlPanel';
import ResultsTable from './ResultsTable';
import CriticalPath from './CriticalPath';
import Formulas from './Formulas';
import { calculateSchedule } from './CalculateSchedule';
import PertDiagram from './PertDiagram';
import Footer from './Footer';
import './App.css';

const initialTasks = [
  { 
    id: 'A', 
    title: 'Task A',
    description: 'Initial task description',
    subtasks: ['Subtask 1', 'Subtask 2'],
    duration: 3, 
    predecessors: [],
    isDummy: false 
  },
  { 
    id: 'B', 
    title: 'Task B',
    description: 'Second task description',
    subtasks: [],
    duration: 2, 
    predecessors: ['A'],
    isDummy: false 
  },
];

function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [results, setResults] = useState([]);
  const [criticalPath, setCriticalPath] = useState([]);
  const [error, setError] = useState('');

  const handleCalculate = () => {
    try {
      setError('');

      if (tasks.length === 0) {
        setError('Add at least one task!');
        return;
      }

      // Normalize dummy durations
      const normalizedTasks = tasks.map(t => ({
        ...t,
        duration: t.isDummy ? 0 : t.duration,
      }));

      // Validate durations
      const invalidDurations = normalizedTasks.filter(
        t => !t.isDummy && (!Number.isInteger(t.duration) || t.duration < 0)
      );
      if (invalidDurations.length > 0) {
        setError(
          `Invalid durations for: ${invalidDurations.map(t => t.id).join(', ')}`
        );
        setResults([]);
        setCriticalPath([]);
        return;
      }

      // Detect isolated tasks (excluding dummies)
      if (normalizedTasks.length > 1) {
        const tasksWithSuccessors = new Set();
        normalizedTasks.forEach(task => {
          task.predecessors.forEach(pred => tasksWithSuccessors.add(pred));
        });

        const orphaned = normalizedTasks.filter(
          task =>
            !task.isDummy &&
            task.predecessors.length === 0 &&
            !tasksWithSuccessors.has(task.id)
        );

        if (orphaned.length > 0) {
          setError(
            `The following tasks are isolated (no predecessors or successors): ${orphaned
              .map(t => t.id)
              .join(', ')}`
          );
          setResults([]);
          setCriticalPath([]);
          return;
        }
      }

      // Calculate full schedule
      const resultsCalc = calculateSchedule(normalizedTasks);

      // -------------------------------
      //  FIX: MULTIPLE FINAL TASKS CHECK
      // -------------------------------

      // Build successor map
      const successors = new Map();
      resultsCalc.forEach(task => successors.set(task.id, []));

      resultsCalc.forEach(task => {
        task.predecessors.forEach(predId => {
          successors.get(predId).push(task.id);
        });
      });

      // All tasks with no successors
      let endTasks = [...successors.entries()]
        .filter(([_, s]) => s.length === 0)
        .map(([taskId]) => taskId);

      if (endTasks.length > 1) {
        // Determine true final task using highest EF
        const tasksByEF = resultsCalc
          .filter(t => endTasks.includes(t.id))
          .sort((a, b) => b.EF - a.EF);

        const trueFinal = tasksByEF[0].id;

        // Remove final task from error list
        const problematicEnds = endTasks.filter(t => t !== trueFinal);

        if (problematicEnds.length > 0) {
          setError(
            `Logic error: These tasks end early without converging to the final task (${trueFinal}): ${problematicEnds.join(
              ', '
            )}. The project must converge to a single final node.`
          );
          setResults([]);
          setCriticalPath([]);
          return;
        }
      }

      // --------------------------------
      // Dummy detected on critical path
      // --------------------------------
      const dummiesOnCP = resultsCalc.filter(
        t => t.isDummy && t.MT === 0
      );

      if (dummiesOnCP.length > 0) {
        setError(
          `Logic error: Dummy tasks cannot appear on the critical path. Found: ${dummiesOnCP
            .map(t => t.id)
            .join(', ')}`
        );
        setResults([]);
        setCriticalPath([]);
        return;
      }

      // --------------------------------
      // Save results
      // --------------------------------
      setResults(resultsCalc);

      // Extract CP (exclude dummies)
      const cp = resultsCalc
        .filter(t => t.MT === 0 && !t.isDummy)
        .map(t => t.id);

      setCriticalPath(cp);
    } catch (err) {
      setError(err.message || 'Unexpected error during calculation.');
      setResults([]);
      setCriticalPath([]);
    }
  };

  // Add task
  const handleAddTask = (isDummy = false) => {
    const baseCharCode = 65 + tasks.filter(t => !t.isDummy).length;
    const newId = isDummy
      ? `DUMMY_${tasks.filter(t => t.isDummy).length + 1}`
      : String.fromCharCode(baseCharCode);

    setTasks(prev => [
      ...prev,
      {
        id: newId,
        title: '',
        description: '',
        subtasks: [],
        duration: isDummy ? 0 : null,
        predecessors: [],
        isDummy,
      },
    ]);
  };

  const handleDeleteTask = index => {
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateTask = (index, field, value) => {
    const updated = [...tasks];
    const current = updated[index];

    if (field === 'predecessors') {
      updated[index] = {
        ...current,
        predecessors: value
          .split(',')
          .map(x => x.trim())
          .filter(x => x)
      };
    } else if (field === 'duration') {
      updated[index] = {
        ...current,
        duration: current.isDummy ? 0 : parseInt(value) || null,
      };
    } else if (field === 'id') {
      const newId = value.trim();

      const duplicate = updated.some(
        (task, i) =>
          i !== index && task.id.trim().toLowerCase() === newId.toLowerCase()
      );

      if (duplicate && newId !== '') {
        setError(`Task ID "${newId}" is already used.`);
      } else if (newId === '') {
        setError('Task ID cannot be empty.');
      } else {
        setError('');
      }

      updated[index] = { ...current, id: newId };
    } else if (field === 'isDummy') {
      updated[index] = {
        ...current,
        isDummy: !!value,
        duration: !!value ? 0 : current.duration,
      };
    } else if (field === 'subtasks') {
      // Handle subtasks array updates
      updated[index] = {
        ...current,
        subtasks: Array.isArray(value) ? value : [],
      };
    } else {
      // Handle title, description, and other string fields
      updated[index] = { ...current, [field]: value };
    }

    setTasks(updated);
  };

  const handleReset = () => {
    setTasks(initialTasks);
    setResults([]);
    setCriticalPath([]);
    setError('');
  };

  return (
    <div className="app">
      <a
        href="https://ko-fi.com/malakalammari"
        target="_blank"
        rel="noopener noreferrer"
        className="btn kofi-btn"
      >
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
          onAddTask={() => handleAddTask(false)}
          onAddDummy={() => handleAddTask(true)}
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

        {results.length > 0 && !error && (
          <>
            <PertDiagram results={results} tasks={tasks} />
            <ResultsTable results={results} tasks={tasks} />
            <CriticalPath path={criticalPath} tasks={tasks} />
          </>
        )}

        <Formulas />
        <Footer />
      </main>
    </div>
  );
}

export default App;