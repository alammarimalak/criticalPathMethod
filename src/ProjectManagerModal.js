import { useState } from 'react';
import './ProjectManagerModal.css';

const ProjectManagerModal = ({ isOpen, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [teammates, setTeammates] = useState(['', '']); // Start with 2 empty slots
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Please enter the project manager name');
      return;
    }
    
    // Filter out empty teammate names
    const validTeammates = teammates.filter(teammate => teammate.trim() !== '');    
    
    onConfirm({
      projectManager: name,
      projectTitle: projectTitle.trim() || 'Untitled Project',
      teammates: validTeammates
    });
    
    // Reset form
    setName('');
    setProjectTitle('');
    setTeammates(['', '']);
    setError('');
  };

  const handleTeammateChange = (index, value) => {
    const newTeammates = [...teammates];
    newTeammates[index] = value;
    setTeammates(newTeammates);
  };

  const addTeammate = () => {
    setTeammates([...teammates, '']);
  };

  const removeTeammate = (index) => {
    if (teammates.length > 1) {
      const newTeammates = teammates.filter((_, i) => i !== index);
      setTeammates(newTeammates);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>Team Information</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">
            Enter team details to include in the PDF report.
          </p>
          
          <div className="form-group">
            <label htmlFor="projectTitle">Project Title (Optional)</label>
            <input
              type="text"
              id="projectTitle"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="e.g., Website Redesign Project"
              className="modal-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="projectManager" className="required">
              Project Manager Name
            </label>
            <input
              type="text"
              id="projectManager"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Enter project manager's full name"
              className="modal-input"
              autoFocus
            />
            {error && <div className="modal-error">{error}</div>}
          </div>
          
          <div className="form-group">
            <div className="teammates-header">
              <label>Team Members (Optional)</label>
              <button 
                type="button" 
                onClick={addTeammate}
                className="add-teammate-btn"
                title="Add another team member"
              >
                + Add Member
              </button>
            </div>
            
            <div className="teammates-list">
              {teammates.map((teammate, index) => (
                <div key={index} className="teammate-input-group">
                  <input
                    type="text"
                    value={teammate}
                    onChange={(e) => handleTeammateChange(index, e.target.value)}
                    placeholder={`Team member ${index + 1}`}
                    className="modal-input teammate-input"
                  />
                  {teammates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTeammate(index)}
                      className="remove-teammate-btn"
                      title="Remove team member"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="team-summary">
              <small>
                Total team members: {1 + teammates.filter(t => t.trim() !== '').length} 
                (Project Manager + {teammates.filter(t => t.trim() !== '').length} team members)
              </small>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn confirm" onClick={handleSubmit}>
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectManagerModal;