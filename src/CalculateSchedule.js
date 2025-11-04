export const calculateSchedule = (tasks) => {
  if (tasks.length === 0) return [];

  const taskMap = {};
  tasks.forEach(task => {
    taskMap[task.id] = { ...task, ES: 0, EF: 0, LS: 0, LF: 0, MT: 0, ML: 0 };
  });

  for (const task of tasks) {
    if (task.predecessors.length === 0) {
      taskMap[task.id].ES = 0;
    } else {
      const preds = task.predecessors.map(p => taskMap[p]);
      if (preds.some(p => !p)) throw new Error(`Invalid predecessor in task ${task.id}`);
      taskMap[task.id].ES = Math.max(...preds.map(p => p.EF));
    }
    taskMap[task.id].EF = taskMap[task.id].ES + task.duration;
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
    if (!successors[task.id]) {
      taskMap[task.id].LF = maxEF;
    } else {
      taskMap[task.id].LF = Math.min(...successors[task.id].map(s => taskMap[s].LS));
    }
    taskMap[task.id].LS = taskMap[task.id].LF - task.duration;
  }

  for (const task of tasks) {
    taskMap[task.id].MT = taskMap[task.id].LS - taskMap[task.id].ES;
    if (!successors[task.id]) {
      taskMap[task.id].ML = 0;
    } else {
      taskMap[task.id].ML =
        Math.min(...successors[task.id].map(s => taskMap[s].ES)) -
        taskMap[task.id].EF;
    }
  }

  return Object.values(taskMap);
};