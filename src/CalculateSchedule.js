export const calculateSchedule = (tasks) => {
  if (tasks.length === 0) return [];
  
  const validationErrors = [];
  
  tasks.forEach((task, index) => {
    if (!task.id || task.id.trim() === '') {
      validationErrors.push(`Task at position ${index + 1} has no ID`);
    }
    if (task.duration <= 0) {
      validationErrors.push(`Task "${task.id}" has invalid duration: ${task.duration}. Duration must be at least 1.`);
    }
    if (isNaN(task.duration)) {
      validationErrors.push(`Task "${task.id}" has non-numeric duration: ${task.duration}`);
    }
  });

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('\n'));
  }

  const taskMap = {};
  tasks.forEach(task => {
    taskMap[task.id] = { 
      ...task, 
      ES: 0, 
      EF: 0, 
      LS: 0, 
      LF: 0, 
      MT: 0, 
      ML: 0 
    };
  });

    for (const task of tasks) {
    const currentTask = taskMap[task.id]; 
    
    if (currentTask.predecessors.length === 0) {
      currentTask.ES = 0;
    } else {
      const preds = currentTask.predecessors.map(p => taskMap[p]);
      if (preds.some(p => !p)) throw new Error(`Invalid predecessor in task ${currentTask.id}`);
      currentTask.ES = Math.max(...preds.map(p => p.EF));
    }
    currentTask.EF = currentTask.ES + currentTask.duration; 
  }

  
  const successors = {};
  tasks.forEach(t => {
    t.predecessors.forEach(p => {
      successors[p] = successors[p] || [];
      successors[p].push(t.id);
    });
  });

  const maxEF = Math.max(...tasks.map(t => taskMap[t.id].EF));
  const reversed = [...tasks].reverse();

    for (const task of reversed) {
    const currentTask = taskMap[task.id]; 
    
    if (!successors[currentTask.id]) {
      currentTask.LF = maxEF;
    } else {
      currentTask.LF = Math.min(...successors[currentTask.id].map(s => taskMap[s].LS));
    }
    currentTask.LS = currentTask.LF - currentTask.duration; 
  }

  for (const task of tasks) {
    const currentTask = taskMap[task.id];
    
    currentTask.MT = currentTask.LS - currentTask.ES;
    if (!successors[currentTask.id]) {
      currentTask.ML = 0;
    } else {
      currentTask.ML = Math.min(...successors[currentTask.id].map(s => taskMap[s].ES)) - currentTask.EF;
    }
  }

  return Object.values(taskMap);
};