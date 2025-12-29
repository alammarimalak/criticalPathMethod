import { useState, useRef } from 'react';
import TaskTable from './TaskTable';
import ControlPanel from './ControlPanel';
import ResultsTable from './ResultsTable';
import CriticalPath from './CriticalPath';
import Formulas from './Formulas';
import { calculateSchedule } from './CalculateSchedule';
import PertDiagram from './PertDiagram';
import Footer from './Footer';
import './App.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ProjectManagerModal from './ProjectManagerModal';

const initialTasks = [
  { 
    id: 'A', 
    title: 'Task A',
    description: 'Initial task description',
    subtasks: ['Subtask 1', 'Subtask 2'],
    duration: 3, 
    predecessors: [],
    isDummy: false,
    responsible: ''
  },
  { 
    id: 'B', 
    title: 'Task B',
    description: 'Second task description',
    subtasks: [],
    duration: 2, 
    predecessors: ['A'],
    isDummy: false,
    responsible: ''
  },
];

function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [results, setResults] = useState([]);
  const [criticalPath, setCriticalPath] = useState([]);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState(['John Doe', 'Jane Smith', 'Bob Johnson']);
  const [newTeamMember, setNewTeamMember] = useState('');
  const [projectManager, setProjectManager] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  
  const pertDiagramRef = useRef(null);

  // Function to add team member
  const handleAddTeamMember = () => {
    if (newTeamMember.trim() && !teamMembers.includes(newTeamMember.trim())) {
      setTeamMembers([...teamMembers, newTeamMember.trim()]);
      setNewTeamMember('');
    }
  };

  // Function to remove team member
  const handleRemoveTeamMember = (member) => {
    setTeamMembers(teamMembers.filter(m => m !== member));
  };

  const handleExportClick = () => {
    setShowModal(true);
  };

  const handleGeneratePDF = async (projectData) => {
    setShowModal(false);
    setIsExporting(true);

    // Update project title and manager from modal
    if (projectData.projectManager) {
      setProjectManager(projectData.projectManager);
    }
    if (projectData.projectTitle) {
      setProjectTitle(projectData.projectTitle);
    }
    
    try {
      const currentProjectManager = projectData.projectManager || projectManager || 'Project Manager';
      const currentProjectTitle = projectData.projectTitle || projectTitle || 'Untitled Project';
      const validTeammates = teamMembers.filter(member => 
        member.trim() !== '' && 
        member !== currentProjectManager
      );
      const totalTeamMembers = 1 + validTeammates.length;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // ========== MODERN COVER PAGE ==========
      // Background gradient (simulated with rectangles)
      pdf.setFillColor(15, 23, 42); 
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Decorative elements
      pdf.setFillColor(37, 99, 235); // Primary blue
      pdf.circle(pageWidth - 40, 40, 60, 'F');
      pdf.setFillColor(139, 92, 246); // Purple
      pdf.circle(40, pageHeight - 40, 40, 'F');
      
      // Main title with gradient effect (simulated)
      pdf.setFontSize(32);
      pdf.setTextColor(96, 165, 250); // Light blue
      pdf.text('CPM', pageWidth / 2, 70, { align: 'center' });
      
      // Use projectTitle if provided
      if (currentProjectTitle && currentProjectTitle !== 'Untitled Project') {
        pdf.setFontSize(20);
        pdf.setTextColor(255, 255, 255);
        pdf.text(currentProjectTitle.toUpperCase(), pageWidth / 2, 85, { align: 'center' });
        pdf.setFontSize(14);
        pdf.text('PROJECT SCHEDULE', pageWidth / 2, 95, { align: 'center' });
      } else {
        pdf.setFontSize(24);
        pdf.setTextColor(255, 255, 255);
        pdf.text('PROJECT SCHEDULE', pageWidth / 2, 85, { align: 'center' });
      }
      
      // Subtitle
      pdf.setFontSize(14);
      pdf.setTextColor(203, 213, 225); // Text secondary color
      pdf.text('Critical Path Method Analysis', pageWidth / 2, currentProjectTitle && currentProjectTitle !== 'Untitled Project' ? 105 : 100, { align: 'center' });
      
      // Generated info
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const formattedTime = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      pdf.setFontSize(11);
      const infoY = currentProjectTitle && currentProjectTitle !== 'Untitled Project' ? 120 : 115;
      pdf.text(`Generated on ${formattedDate} at ${formattedTime}`, pageWidth / 2, infoY, { align: 'center' });
      
      // Modern info card
      const projectDuration = results.length > 0 
        ? Math.max(...results.map(r => r.EF))
        : 0;
      
      const cardY = infoY + 20;
      const cardHeight = 100; // Increased height to accommodate all information
      
      // Card background with subtle border
      pdf.setDrawColor(51, 65, 85); // Border color
      pdf.setFillColor(30, 41, 59, 0.8); // Surface color with transparency
      pdf.roundedRect(20, cardY, pageWidth - 40, cardHeight, 8, 8, 'FD');
      
      // Card title
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.text('PROJECT OVERVIEW', pageWidth / 2, cardY + 15, { align: 'center' });
      
      // Card content - using a grid layout
      const gridY = cardY + 30;
      
      // Left column
      pdf.setFontSize(11);
      pdf.setTextColor(203, 213, 225);
      
      // Task statistics
      const totalTasks = tasks.length;
      const tasksWithSubtasks = tasks.filter(t => t.subtasks?.length > 0).length;
      const criticalTasks = criticalPath.length;
      
      pdf.text(`Total Tasks: ${totalTasks}`, 35, gridY);
      pdf.text(`With Subtasks: ${tasksWithSubtasks}`, 35, gridY + 8);
      pdf.text(`Critical Tasks: ${criticalTasks}`, 35, gridY + 16);
      
      // Right column - Team information
      pdf.text(`Project Duration: ${projectDuration} units`, pageWidth - 35, gridY, { align: 'right' });
      pdf.text(`Team Size: ${totalTeamMembers} ${totalTeamMembers === 1 ? 'person' : 'people'}`, pageWidth - 35, gridY + 8, { align: 'right' });
      
      if (validTeammates.length > 0) {
        pdf.text(`(PM + ${validTeammates.length} members)`, pageWidth - 35, gridY + 16, { align: 'right' });
      }
      
      // Project Manager and Team Members - BOTTOM MIDDLE SECTION
      const teamSectionY = gridY + 30;
      
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Project Manager: ${currentProjectManager}`, pageWidth / 2, teamSectionY, { align: 'center' });
      
      // Display teammates if available
      if (validTeammates.length > 0) {
        pdf.setTextColor(203, 213, 225);
        pdf.text(`Team Members: ${validTeammates.join(', ')}`, pageWidth / 2, teamSectionY + 8, { align: 'center' });
      }
      
      // Critical Path - BOTTOM MIDDLE INSIDE PROJECT OVERVIEW
      if (criticalPath.length > 0) {
        const criticalPathY = teamSectionY + (validTeammates.length > 0 ? 18 : 10);
        pdf.setFontSize(11);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`Critical Path:`, pageWidth / 2, criticalPathY, { align: 'center' });
        
        // Handle long critical path by splitting
        const cpString = criticalPath.join(' - ');
        if (cpString.length > 40) {
          // Split into multiple lines if too long
          const maxLength = 40;
          const parts = [];
          for (let i = 0; i < cpString.length; i += maxLength) {
            parts.push(cpString.substring(i, i + maxLength));
          }
          
          parts.forEach((part, index) => {
            pdf.setTextColor(203, 213, 225);
            pdf.text(part, pageWidth / 2, criticalPathY + 8 + (index * 6), { align: 'center' });
          });
        } else {
          pdf.setTextColor(203, 213, 225);
          pdf.text(cpString, pageWidth / 2, criticalPathY + 8, { align: 'center' });
        }
      }
      
      // Decorative separator line
      pdf.setDrawColor(96, 165, 250);
      pdf.setLineWidth(0.5);
      pdf.line(30, cardY + cardHeight + 10, pageWidth - 30, cardY + cardHeight + 10);
      
      // Technology credits (at the bottom of the page)
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      
      const techY = pageHeight - 30;
      pdf.text('Generated with jsPDF & html2canvas', pageWidth / 2, techY, { align: 'center' });
      pdf.text('Powered by React CPM Scheduler - Made with Passion for Project Management', pageWidth / 2, techY + 6, { align: 'center' });
      
      // ========== PAGE 1: TASK TABLE ==========
      pdf.addPage();
      
      // Create task table HTML
      const taskTableHTML = `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
          <h2 style="text-align: center; margin-bottom: 20px; color: #2c3e50;">Task Details</h2>
          <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background-color: #34495e; color: white;">
                <th style="padding: 8px; text-align: left;">Task ID</th>
                <th style="padding: 8px; text-align: left;">Title</th>
                <th style="padding: 8px; text-align: left;">Description</th>
                <th style="padding: 8px; text-align: center;">Duration</th>
                <th style="padding: 8px; text-align: left;">Predecessors</th>
                <th style="padding: 8px; text-align: left;">Responsible</th>
                <th style="padding: 8px; text-align: left;">Subtasks</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map((task, index) => {
                const subtasksList = task.subtasks && task.subtasks.length > 0 
                  ? task.subtasks.map((subtask, i) => 
                      `<div style="margin: 2px 0; font-size: 9px;">${i + 1}. ${subtask}</div>`
                    ).join('')
                  : '<div style="color: #999; font-style: italic;">None</div>';
                
                const description = task.description || '';
                const shortDescription = description.length > 80 
                  ? description.substring(0, 80) + '...' 
                  : description;
                
                const durationText = task.isDummy ? '0 (Dummy)' : (task.duration || '0');
                
                return `
                  <tr style="${index % 2 === 0 ? 'background-color: #f8f9fa;' : ''}">
                    <td style="padding: 8px; font-weight: bold; color: #2980b9; border: 1px solid #ddd;">${task.id}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${task.title || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; max-width: 150px;">${shortDescription}</td>
                    <td style="padding: 8px; text-align: center; border: 1px solid #ddd; ${task.isDummy ? 'color: #7f8c8d;' : ''}">${durationText}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${task.predecessors.length > 0 ? task.predecessors.join(', ') : 'Start'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${task.responsible || 'Unassigned'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; max-width: 120px;">${subtasksList}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div style="margin-top: 15px; font-size: 10px; color: #666;">
            <strong>Legend:</strong> Duration in days • Dummy tasks have 0 duration
          </div>
        </div>
      `;
      
      const taskTableContainer = document.createElement('div');
      taskTableContainer.style.position = 'absolute';
      taskTableContainer.style.left = '-9999px';
      taskTableContainer.style.top = '-9999px';
      taskTableContainer.style.width = '800px';
      taskTableContainer.style.backgroundColor = 'white';
      taskTableContainer.style.color = 'black';
      taskTableContainer.style.fontFamily = 'Arial, Helvetica, sans-serif';
      taskTableContainer.style.padding = '20px';
      taskTableContainer.innerHTML = taskTableHTML;
      document.body.appendChild(taskTableContainer);
      
      const taskCanvas = await html2canvas(taskTableContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const taskImgData = taskCanvas.toDataURL('image/png');
      const taskImgWidth = pageWidth - 40;
      const taskImgHeight = (taskCanvas.height * taskImgWidth) / taskCanvas.width;
      
      pdf.setFontSize(18);
      pdf.text('TASK DETAILS TABLE', pageWidth / 2, 20, { align: 'center' });
      
      pdf.addImage(taskImgData, 'PNG', 20, 30, taskImgWidth, taskImgHeight);
      
      document.body.removeChild(taskTableContainer);
      
      // ========== PAGE 2: PERT DIAGRAM ==========
if (pertDiagramRef.current) {
  // Create a new landscape page
  const landscapeWidth = 297; // A4 landscape width in mm
  const landscapeHeight = 210; // A4 landscape height in mm
  
  // Add landscape page
  pdf.addPage([landscapeWidth, landscapeHeight], 'l'); // 'l' for landscape
  
  // Now update the page dimensions
  const currentWidth = pdf.internal.pageSize.getWidth();
  const currentHeight = pdf.internal.pageSize.getHeight();
  
  // Prepare PERT diagram for PDF - use getElement() method
  const pertElement = pertDiagramRef.current.getElement();
  if (pertElement) {
    const pertContainer = document.createElement('div');
    pertContainer.style.position = 'absolute';
    pertContainer.style.left = '-9999px';
    pertContainer.style.top = '-9999px';
    pertContainer.style.width = '1200px'; // Wider for landscape
    pertContainer.style.backgroundColor = '#ffffff';
    pertContainer.style.padding = '20px';
    
    // Clone the actual DOM element
    const pertClone = pertElement.cloneNode(true);
    prepareElementForPDF(pertClone);
    
    // Make the SVG wider for landscape
    const svg = pertClone.querySelector('svg');
    if (svg) {
      const originalWidth = parseInt(svg.getAttribute('width') || '0');
      const originalHeight = parseInt(svg.getAttribute('height') || '0');
      
      // Scale up the SVG for better quality in PDF
      const scaleFactor = 1.5;
      svg.setAttribute('width', originalWidth * scaleFactor);
      svg.setAttribute('height', originalHeight * scaleFactor);
      
      // Update viewBox to maintain aspect ratio
      const viewBox = svg.getAttribute('viewBox');
      if (viewBox) {
        const [x, y, width, height] = viewBox.split(' ').map(Number);
        svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
      }
    }
    
    pertContainer.appendChild(pertClone);
    document.body.appendChild(pertContainer);
    
    const pertCanvas = await html2canvas(pertContainer, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1200
    });
    
    const pertImgData = pertCanvas.toDataURL('image/png');
    
    // Calculate dimensions to fit the landscape page
    const imgWidth = currentWidth - 40; // 40mm margins
    const imgHeight = (pertCanvas.height * imgWidth) / pertCanvas.width;
    
    let finalWidth = imgWidth;
    let finalHeight = imgHeight;
    
    // Adjust if too tall
    if (imgHeight > currentHeight - 50) {
      finalHeight = currentHeight - 50;
      finalWidth = (pertCanvas.width * finalHeight) / pertCanvas.height;
    }
    
    // Center horizontally, position vertically with space for title
    const xPos = (currentWidth - finalWidth) / 2;
    const yPos = 35; // Space for title
    
    pdf.setFontSize(18);
    pdf.text('PERT NETWORK DIAGRAM', currentWidth / 2, 20, { align: 'center' });
    
    pdf.addImage(pertImgData, 'PNG', xPos, yPos, finalWidth, finalHeight);
    
    pdf.setFontSize(10);
    pdf.text('Note: Critical path tasks are highlighted in red', currentWidth / 2, currentHeight - 10, { align: 'center' });
    
    document.body.removeChild(pertContainer);
  }
}
      // ========== PAGE 3: CALCULATION RESULTS ==========
if (results.length > 0) {
  // Add a new page in PORTRAIT orientation
  pdf.addPage('a4', 'p'); // 'p' for portrait
  
  // Get current page dimensions (now in portrait)
  const pageWidth = pdf.internal.pageSize.getWidth(); // Should be 210mm for A4 portrait
  //const pageHeight = pdf.internal.pageSize.getHeight(); 
  
  pdf.setFontSize(18);
  pdf.text('CALCULATION RESULTS', pageWidth / 2, 20, { align: 'center' });
  
  // Create results table HTML
  const resultsTableHTML = `
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
      <h2 style="text-align: center; margin-bottom: 15px; color: #2c3e50;">Schedule Calculation Results</h2>
      <div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #e74c3c;">
        <strong>Critical Path:</strong> ${criticalPath.join(' - ')}<br>
        <strong>Total Project Duration:</strong> ${Math.max(...results.map(r => r.EF))} units
      </div>
      <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background-color: #2c3e50; color: white;">
            <th style="padding: 8px; text-align: center;">Task</th>
            <th style="padding: 8px; text-align: center;">Duration</th>
            <th style="padding: 8px; text-align: center;">Responsible</th>
            <th style="padding: 8px; text-align: center;">ES</th>
            <th style="padding: 8px; text-align: center;">EF</th>
            <th style="padding: 8px; text-align: center;">LS</th>
            <th style="padding: 8px; text-align: center;">LF</th>
            <th style="padding: 8px; text-align: center;">MT (Total Float)</th>
            <th style="padding: 8px; text-align: center;">ML (Free Float)</th>
          </tr>
        </thead>
        <tbody>
          ${results.map((result, index) => {
            const taskData = tasks.find(t => t.id === result.id) || {};
            const isCritical = result.MT === 0;
            return `
              <tr style="${isCritical ? 'background-color: #ffeaea;' : index % 2 === 0 ? 'background-color: #f8f9fa;' : ''}">
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd; ${isCritical ? 'font-weight: bold; color: #c0392b;' : ''}">${result.id}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${result.duration}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${taskData.responsible || 'Unassigned'}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${result.ES}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${result.EF}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${result.LS}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${result.LF}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd; ${isCritical ? 'color: #c0392b;' : ''}">${result.MT}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${result.ML}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div style="margin-top: 15px; font-size: 10px; color: #666;">
        <strong>Legend:</strong> ES=Earliest Start, EF=Earliest Finish, LS=Latest Start, LF=Latest Finish, MT=Total Float, ML=Free Float
      </div>
    </div>
  `;
  
  const resultsContainer = document.createElement('div');
  resultsContainer.style.position = 'absolute';
  resultsContainer.style.left = '-9999px';
  resultsContainer.style.top = '-9999px';
  resultsContainer.style.width = '800px';
  resultsContainer.style.backgroundColor = 'white';
  resultsContainer.style.color = 'black';
  resultsContainer.style.fontFamily = 'Arial, Helvetica, sans-serif';
  resultsContainer.style.padding = '20px';
  resultsContainer.innerHTML = resultsTableHTML;
  document.body.appendChild(resultsContainer);
  
  const resultsCanvas = await html2canvas(resultsContainer, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  });
  
  const resultsImgData = resultsCanvas.toDataURL('image/png');
  const resultsImgWidth = pageWidth - 40;
  const resultsImgHeight = (resultsCanvas.height * resultsImgWidth) / resultsCanvas.width;
  
  pdf.addImage(resultsImgData, 'PNG', 20, 30, resultsImgWidth, resultsImgHeight);
  
  document.body.removeChild(resultsContainer);
}
      
      // ========== SAVE PDF ==========
      // Use projectTitle in filename
      const safeProjectTitle = (currentProjectTitle && currentProjectTitle !== 'Untitled Project') 
        ? currentProjectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        : 'project';
      const safeProjectManager = currentProjectManager.replace(/\s+/g, '_');
      const fileName = `CPM_${safeProjectTitle}_${safeProjectManager}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('PDF Export Error:', error);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCalculate = () => {
    try {
      setError('');

      if (tasks.length === 0) {
        setError('Add at least one task!');
        return;
      }

      const normalizedTasks = tasks.map(t => ({
        ...t,
        duration: t.isDummy ? 0 : t.duration,
      }));

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

      const resultsCalc = calculateSchedule(normalizedTasks);

      const successors = new Map();
      resultsCalc.forEach(task => successors.set(task.id, []));

      resultsCalc.forEach(task => {
        task.predecessors.forEach(predId => {
          successors.get(predId).push(task.id);
        });
      });

      let endTasks = [...successors.entries()]
        .filter(([_, s]) => s.length === 0)
        .map(([taskId]) => taskId);

      if (endTasks.length > 1) {
        const tasksByEF = resultsCalc
          .filter(t => endTasks.includes(t.id))
          .sort((a, b) => b.EF - a.EF);

        const trueFinal = tasksByEF[0].id;
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

      setResults(resultsCalc);
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

  const handleAddTask = () => {
    const baseCharCode = 65 + tasks.filter(t => !t.isDummy).length;
    const newId = String.fromCharCode(baseCharCode);

    setTasks(prev => [
      ...prev,
      {
        id: newId,
        title: '',
        description: '',
        subtasks: [],
        duration: null,
        predecessors: [],
        isDummy: false,
        responsible: ''
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
      updated[index] = {
        ...current,
        subtasks: Array.isArray(value) ? value : [],
      };
    } else if (field === 'responsible') {
      updated[index] = {
        ...current,
        responsible: value,
      };
    } else {
      updated[index] = { ...current, [field]: value };
    }

    setTasks(updated);
  };

  const handleReset = () => {
    setTasks(initialTasks);
    setResults([]);
    setCriticalPath([]);
    setError('');
    setTeamMembers(['John Doe', 'Jane Smith', 'Bob Johnson']);
    setProjectManager('');
    setProjectTitle('');
  };

  // Helper function to prepare element for PDF capture
  const prepareElementForPDF = (element) => {
    // Remove interactive elements
    element.querySelectorAll('button, .expand-btn, .delete-btn, .kofi-btn, .input-field').forEach(el => el.remove());
    
    // Set all text to black
    element.querySelectorAll('*').forEach(el => {
      el.style.color = 'black';
      el.style.backgroundColor = el.classList.contains('critical-task') ? '#ffeaea' : 'transparent';
      el.style.borderColor = '#333';
      el.style.boxShadow = 'none';
    });
    
    // Ensure good contrast for SVG elements
    const svgs = element.querySelectorAll('svg');
    svgs.forEach(svg => {
      svg.style.backgroundColor = 'white';
      svg.querySelectorAll('text').forEach(text => {
        text.setAttribute('fill', 'black');
      });
      svg.querySelectorAll('rect, circle').forEach(shape => {
        shape.setAttribute('stroke', '#333');
      });
    });
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
        <h1>Scrum Dealer</h1>
        <p>Smart Project Planning with Scrum and PERT</p>
      </header>

      <main className="app-main">        
        <div className="table-container">
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Team Members
          </h3>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                value={newTeamMember}
                onChange={(e) => setNewTeamMember(e.target.value)}
                placeholder="Enter team member name"
                className="input-field"
                style={{ flex: 1 }}
              />
              <button 
                className="btn btn-primary"
                onClick={handleAddTeamMember}
                style={{ whiteSpace: 'nowrap' }}
              >
                Add Member
              </button>
            </div>
            
            <div className="team-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {teamMembers.map((member, index) => (
                <div 
                  key={index} 
                  className="team-member-tag"
                  style={{
                    background: 'var(--primary-color)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {member}
                  <button
                    onClick={() => handleRemoveTeamMember(member)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      padding: '0',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            
            {teamMembers.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '1rem' }}>
                No team members added. Add team members to assign tasks to people.
              </p>
            )}
          </div>
        </div>

        <TaskTable
          tasks={tasks}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          teamMembers={teamMembers}
        />

        <ControlPanel
          onAddTask={handleAddTask}
          onCalculate={handleCalculate}
          onReset={handleReset}
          onExportPDF={handleExportClick}
          isExporting={isExporting}
        />

        <ProjectManagerModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleGeneratePDF}
          existingTeamMembers={teamMembers}
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
            <PertDiagram 
              ref={pertDiagramRef}
              results={results} 
              tasks={tasks} 
            />
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