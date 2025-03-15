import React, { useState } from 'react';
import './FormComponents.css';

const RadialInput = ({ onApply, fieldName }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };
  
  const handleApply = () => {
    if (selectedOption) {
      onApply(selectedOption, fieldName);
      setIsExpanded(false);
    }
  };
  
  return (
    <div className="form-component-card">
      <div className="form-component-header" onClick={toggleExpand}>
        <h3>Radio Selection</h3>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
          {isExpanded ? '−' : '+'}
        </span>
      </div>
      
      {isExpanded && (
        <div className="form-component-content">
          <p className="form-component-description">
            Select one option from the choices below.
          </p>
          
          <div className="form-component-options radio-options">
            {/* This section will be populated by LLM-generated radio options */}
            <div className="radio-option-placeholder">
              <span className="option-label">Radio options will appear here</span>
            </div>
          </div>
          
          <div className="form-component-actions">
            <button 
              className="action-button cancel-button"
              onClick={() => setIsExpanded(false)}
            >
              Cancel
            </button>
            <button 
              className="action-button apply-button"
              onClick={handleApply}
              disabled={!selectedOption}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadialInput; 