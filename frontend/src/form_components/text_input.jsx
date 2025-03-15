import React, { useState } from 'react';
import './FormComponents.css';

const TextInput = ({ onApply, fieldName }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [textValue, setTextValue] = useState('');
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };
  
  const handleApply = () => {
    if (textValue) {
      onApply(textValue, fieldName);
      setIsExpanded(false);
    }
  };
  
  return (
    <div className="form-component-card">
      <div className="form-component-header" onClick={toggleExpand}>
        <h3>Text Input</h3>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
          {isExpanded ? '−' : '+'}
        </span>
      </div>
      
      {isExpanded && (
        <div className="form-component-content">
          <p className="form-component-description">
            Enter text for this field or select from suggestions below.
          </p>
          
          <div className="form-component-input">
            <input
              type="text"
              className="text-input-field"
              placeholder="Type text here..."
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
            />
          </div>
          
          <div className="form-component-options">
            {/* This section will be populated by LLM-generated content */}
            <div className="option-item-placeholder">
              <span className="option-label">Suggestions will appear here</span>
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
              disabled={!textValue}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextInput; 