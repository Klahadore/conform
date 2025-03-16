import React, { useState } from 'react';
import './EditProfile.css';
import hospitalSystems from '../data/hospitalSystems';

const EditProfile = ({ user, onClose, onUpdateSuccess }) => {
  const healthcareTitles = [
    'Physician',
    'Nurse',
    'Nurse Practitioner',
    'Physician Assistant',
    'Medical Assistant',
    'Medical Technician',
    'Healthcare Administrator',
    'Medical Records Specialist',
    'Other'
  ];

  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    healthcareTitle: user.healthcareTitle,
    hospitalSystem: user.hospitalSystem,
    customHealthcareTitle: '',
    customHospitalSystem: ''
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if the user's values are in the predefined lists
  const [showCustomHealthcareTitle, setShowCustomHealthcareTitle] = useState(
    !healthcareTitles.includes(user.healthcareTitle)
  );
  const [showCustomHospitalSystem, setShowCustomHospitalSystem] = useState(
    !hospitalSystems.includes(user.hospitalSystem)
  );
  
  // Initialize custom fields if needed
  useState(() => {
    if (showCustomHealthcareTitle) {
      setFormData(prev => ({ ...prev, customHealthcareTitle: user.healthcareTitle, healthcareTitle: 'Other' }));
    }
    if (showCustomHospitalSystem) {
      setFormData(prev => ({ ...prev, customHospitalSystem: user.hospitalSystem, hospitalSystem: 'Other' }));
    }
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'healthcareTitle') {
      setShowCustomHealthcareTitle(value === 'Other');
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (name === 'hospitalSystem') {
      setShowCustomHospitalSystem(value === 'Other');
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Prepare data for submission
    const submissionData = {
      name: formData.name,
      email: formData.email,
      healthcareTitle: formData.healthcareTitle === 'Other' ? formData.customHealthcareTitle : formData.healthcareTitle,
      hospitalSystem: formData.hospitalSystem === 'Other' ? formData.customHospitalSystem : formData.hospitalSystem
    };
    
    try {
      const response = await fetch(`http://localhost:6969/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to update profile');
      }
      
      onUpdateSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a handler for clicking outside the modal
  const handleOverlayClick = (e) => {
    // Only close if the overlay itself was clicked (not its children)
    if (e.target.className === 'modal-overlay') {
      onClose();
    }
  };
  
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="healthcareTitle">Healthcare Title</label>
            <select
              id="healthcareTitle"
              name="healthcareTitle"
              value={formData.healthcareTitle}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Select a healthcare title</option>
              {healthcareTitles.map(title => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
            
            {showCustomHealthcareTitle && (
              <div className="form-group custom-input">
                <label htmlFor="customHealthcareTitle">Specify Healthcare Title</label>
                <input
                  type="text"
                  id="customHealthcareTitle"
                  name="customHealthcareTitle"
                  value={formData.customHealthcareTitle}
                  onChange={handleChange}
                  required={formData.healthcareTitle === 'Other'}
                  placeholder="Enter your healthcare title"
                />
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="hospitalSystem">Hospital System</label>
            <select
              id="hospitalSystem"
              name="hospitalSystem"
              value={formData.hospitalSystem}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Select a hospital system</option>
              {hospitalSystems.map(system => (
                <option key={system} value={system}>{system}</option>
              ))}
              <option value="Other">Other</option>
            </select>
            
            {showCustomHospitalSystem && (
              <div className="form-group custom-input">
                <label htmlFor="customHospitalSystem">Specify Hospital System</label>
                <input
                  type="text"
                  id="customHospitalSystem"
                  name="customHospitalSystem"
                  value={formData.customHospitalSystem}
                  onChange={handleChange}
                  required={formData.hospitalSystem === 'Other'}
                  placeholder="Enter your hospital system"
                />
              </div>
            )}
          </div>
          
          <div className="form-actions centered">
            <button 
              type="button" 
              className="action-button cancel-button" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="action-button submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile; 