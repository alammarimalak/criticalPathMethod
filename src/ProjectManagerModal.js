import { useState } from 'react';
import './ProjectManagerModal.css';

const ProjectManagerModal = ({ isOpen, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    onConfirm(name);
    setName('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>Enter Project Manager Details</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">
            Your name will be included in the PDF as the project manager.
          </p>
          
          <div className="form-group">
            <label htmlFor="projectManager">Full Name *</label>
            <input
              type="text"
              id="projectManager"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Enter your full name"
              className="modal-input"
              autoFocus
            />
            {error && <div className="modal-error">{error}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="projectTitle">Project Title (Optional)</label>
            <input
              type="text"
              id="projectTitle"
              placeholder="Enter project title"
              className="modal-input"
            />
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