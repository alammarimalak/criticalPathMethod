export const calculateSchedule = (tasks) => {
  if (tasks.length === 0) return [];
  
  const validationErrors = [];
  const taskIds = new Set();
  
  // Phase 1: Basic validation (ID uniqueness, duration validity)
  tasks.forEach((task, index) => {
    if (!task.id || task.id.trim() === '') {
      validationErrors.push(`Task at position ${index + 1} has no ID`);
      return;
    }
    
    const taskId = task.id.trim();
    
    if (taskIds.has(taskId)) {
      validationErrors.push(`Duplicate task ID: "${taskId}". Task IDs must be unique.`);
    } else {
      taskIds.add(taskId);
    }
    
    if (isNaN(task.duration)) {
      validationErrors.push(`Task "${taskId}" has non-numeric duration: ${task.duration}`);
    } else if (task.duration <= 0) {
      validationErrors.push(`Task "${taskId}" has invalid duration: ${task.duration}. Duration must be at least 1.`);
    }
  });

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('\n'));
  }

  // Phase 2: Build task map and validate predecessors exist
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

  // Validate all predecessors exist and check for self-predecessors
  tasks.forEach(task => {
    const invalidPreds = task.predecessors.filter(p => !taskMap[p]);
    if (invalidPreds.length > 0) {
      validationErrors.push(`Task "${task.id}" has invalid predecessors: ${invalidPreds.join(', ')}. Valid task IDs are: ${tasks.map(t => t.id).join(', ')}`);
    }
    
    // Check for self-predecessor
    if (task.predecessors.includes(task.id)) {
      validationErrors.push(`Task "${task.id}" cannot be its own predecessor`);
    }
  });

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('\n'));
  }

  // Phase 3: Check for start and end tasks
  const startTasks = tasks.filter(t => t.predecessors.length === 0);
  if (startTasks.length === 0) {
    validationErrors.push('No start task found. At least one task must have no predecessors.');
  }

  const successorMap = {};
  tasks.forEach(t => {
    successorMap[t.id] = [];
    t.predecessors.forEach(p => {
      if (!successorMap[p]) successorMap[p] = [];
      successorMap[p].push(t.id);
    });
  });

  const endTasks = tasks.filter(t => !successorMap[t.id] || successorMap[t.id].length === 0);
  if (endTasks.length === 0) {
    validationErrors.push('No end task found. At least one task must not be a predecessor of any other task.');
  }

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('\n'));
  }

  // Phase 4: Check for circular dependencies using DFS
  const detectCycle = () => {
    const visited = new Set();
    const recursionStack = new Set();
    const path = [];

    const hasCycle = (taskId) => {
      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);

      const currentTask = taskMap[taskId];
      if (currentTask.predecessors) {
        for (const predId of currentTask.predecessors) {
          if (!visited.has(predId)) {
            if (hasCycle(predId)) {
              return true;
            }
          } else if (recursionStack.has(predId)) {
            // Found a cycle - build the cycle path
            const cycleStart = path.indexOf(predId);
            const cyclePath = [...path.slice(cycleStart), predId];
            validationErrors.push(`Circular dependency detected: ${cyclePath.join(' → ')}`);
            return true;
          }
        }
      }

      path.pop();
      recursionStack.delete(taskId);
      return false;
    };

    for (const taskId of Object.keys(taskMap)) {
      if (!visited.has(taskId)) {
        if (hasCycle(taskId)) {
          return true;
        }
      }
    }
    return false;
  };

  if (detectCycle()) {
    throw new Error(validationErrors.join('\n'));
  }

  // Phase 5: Topological sort to process tasks in correct order
  const topologicalSort = () => {
    const inDegree = {};
    const adjList = {};
    
    // Initialize
    tasks.forEach(task => {
      inDegree[task.id] = task.predecessors.length;
      adjList[task.id] = [];
    });

    // Build adjacency list (forward direction)
    tasks.forEach(task => {
      task.predecessors.forEach(predId => {
        adjList[predId].push(task.id);
      });
    });

    const queue = [];
    const sorted = [];

    // Find all tasks with no predecessors
    Object.keys(inDegree).forEach(taskId => {
      if (inDegree[taskId] === 0) {
        queue.push(taskId);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift();
      sorted.push(current);

      adjList[current].forEach(successor => {
        inDegree[successor]--;
        if (inDegree[successor] === 0) {
          queue.push(successor);
        }
      });
    }

    if (sorted.length !== tasks.length) {
      throw new Error('Unable to determine task order. There may be circular dependencies.');
    }

    return sorted;
  };

  const sortedTaskIds = topologicalSort();

  // Phase 6: Forward pass (ES, EF) in topological order
  sortedTaskIds.forEach(taskId => {
    const currentTask = taskMap[taskId];
    
    if (currentTask.predecessors.length === 0) {
      currentTask.ES = 0;
    } else {
      currentTask.ES = Math.max(...currentTask.predecessors.map(p => taskMap[p].EF));
    }
    currentTask.EF = currentTask.ES + currentTask.duration;
  });

  // Phase 7: Backward pass (LF, LS) in reverse topological order
  const maxEF = Math.max(...sortedTaskIds.map(id => taskMap[id].EF));
  
  [...sortedTaskIds].reverse().forEach(taskId => {
    const currentTask = taskMap[taskId];
    
    if (!successorMap[taskId] || successorMap[taskId].length === 0) {
      currentTask.LF = maxEF;
    } else {
      currentTask.LF = Math.min(...successorMap[taskId].map(s => taskMap[s].LS));
    }
    currentTask.LS = currentTask.LF - currentTask.duration;
  });

  // Phase 8: Calculate float/slack
  sortedTaskIds.forEach(taskId => {
    const currentTask = taskMap[taskId];
    
    // Total Float
    currentTask.MT = currentTask.LS - currentTask.ES;
    
    // Free Float
    if (!successorMap[taskId] || successorMap[taskId].length === 0) {
      currentTask.ML = 0;
    } else {
      currentTask.ML = Math.min(...successorMap[taskId].map(s => taskMap[s].ES)) - currentTask.EF;
    }
  });

  return sortedTaskIds.map(id => taskMap[id]);
};