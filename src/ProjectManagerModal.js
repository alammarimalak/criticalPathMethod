import { useState } from 'react';
import './ProjectManagerModal.css';

const ProjectManagerModal = ({ isOpen, onClose, onConfirm, existingTeamMembers = [] }) => {
  const [projectManager, setProjectManager] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!projectManager.trim()) {
      setError('Please enter the project manager name');
      return;
    }
    
    onConfirm({
      projectManager: projectManager.trim(),
      projectTitle: projectTitle.trim() || 'Untitled Project',
      teammates: existingTeamMembers.filter(member => 
        member.trim() !== '' && 
        member !== projectManager.trim()
      )
    });
    
    // Reset form
    setProjectManager('');
    setProjectTitle('');
    setError('');
  };

  const handleProjectManagerChange = (value) => {
    setProjectManager(value);
    if (error) setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>PDF Export Settings</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">
            Configure your PDF report settings. Team members are already assigned from the team list.
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
              value={projectManager}
              onChange={(e) => handleProjectManagerChange(e.target.value)}
              placeholder="Enter project manager's full name"
              className="modal-input"
              autoFocus
            />
            {error && <div className="modal-error">{error}</div>}
          </div>
          
          <div className="form-group">
            <label>Team Members (from your list)</label>
            <div className="team-summary-box">
              <div className="team-preview">
                {existingTeamMembers.length > 0 ? (
                  <ul className="team-preview-list">
                    {existingTeamMembers.map((member, index) => (
                      <li key={index} className="team-preview-item">
                        {member}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="no-team-members">
                    No team members added yet. Add team members above.
                  </div>
                )}
              </div>
              <div className="team-summary">
                <small>
                  Total team members: {existingTeamMembers.length}
                </small>
              </div>
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