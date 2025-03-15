import React, { useState } from 'react';
import './FormFieldNavigator.css';

const FormFieldNavigator = ({ formHtml, onSubmit }) => {
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  // Placeholder for total fields - this would be determined by the actual form data
  const totalFields = 5; 
  
  // Navigation handlers
  const goToNextField = () => {
    if (currentFieldIndex < totalFields - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
    }
  };

  const goToPreviousField = () => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(currentFieldIndex - 1);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    // This would compile all form data and submit
    onSubmit({});
  };

  return (
    <div className="form-navigator">
      <div className="form-content-area">
        {/* This area will be filled by the LLM-generated content */}
      </div>
      
      <div className="form-navigation-divider"></div>
      
      <div className="form-navigation">
        <button 
          className={`nav-button prev-button ${currentFieldIndex === 0 ? 'disabled' : ''}`}
          onClick={goToPreviousField}
          disabled={currentFieldIndex === 0}
        >
          Previous
        </button>
        
        {currentFieldIndex < totalFields - 1 ? (
          <button 
            className="nav-button next-button"
            onClick={goToNextField}
          >
            Next
          </button>
        ) : (
          <button 
            className="nav-button submit-button"
            onClick={handleSubmit}
          >
            Submit
          </button>
        )}
      </div>
      
      <div className="form-progress">
        Field {currentFieldIndex + 1} of {totalFields}
      </div>
    </div>
  );
};

export default FormFieldNavigator; 