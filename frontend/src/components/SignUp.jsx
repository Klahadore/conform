import React, { useState } from 'react';
import './SignUp.css';
import hospitalSystems from '../data/hospitalSystems';

const SignUp = ({ onClose }) => {
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
    name: '',
    email: '',
    healthcareTitle: '',
    hospitalSystem: '',
    customHealthcareTitle: '',
    customHospitalSystem: ''
  });
  
  const [showCustomHealthcareTitle, setShowCustomHealthcareTitle] = useState(false);
  const [showCustomHospitalSystem, setShowCustomHospitalSystem] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
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
    
    // Get final values based on custom fields
    const finalData = {
      name: formData.name,
      email: formData.email,
      healthcareTitle: formData.healthcareTitle === 'Other' ? formData.customHealthcareTitle : formData.healthcareTitle,
      hospitalSystem: formData.hospitalSystem === 'Other' ? formData.customHospitalSystem : formData.hospitalSystem
    };
    
    try {
      const response = await fetch('http://localhost:6969/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(finalData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }
      
      setIsSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Sign Up for Conform</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {!isSuccess ? (
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
                <option value="" disabled>Select your healthcare title</option>
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
            
            <div className="form-actions centered single-button">
              <button 
                type="submit" 
                className="action-button submit-button"
                disabled={isLoading}
              >
                {isLoading ? 'Signing Up...' : 'Sign Up'}
              </button>
            </div>
          </form>
        ) : (
          <div className="success-message">
            <h3>Registration Successful!</h3>
            <p>Your account has been created. You can now log in.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignUp; 