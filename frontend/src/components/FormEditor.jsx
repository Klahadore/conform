import React, { useState, useEffect } from 'react';
import './FormEditor.css';
import conformLogo from '../assets/conform_logo.png';
import h2aiLogo from '../assets/h2ai_logo.png';
import { scrollToTop } from '../utils/scrollUtils';

const FormEditor = ({ user, onLogout, onToggleSidebar, onSaveForm, onCancel, form, navigateToDashboard }) => {
  const [formElements, setFormElements] = useState([]);
  const [currentElement, setCurrentElement] = useState({
    type: 'text',
    label: '',
    placeholder: '',
    required: false,
    options: []
  });
  const [showElementForm, setShowElementForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [newOption, setNewOption] = useState('');
  const [formTitle, setFormTitle] = useState(form ? form.title : 'New Form');
  const [pdfUrl, setPdfUrl] = useState(form ? form.pdfUrl : '');

  useEffect(() => {
    // Update state when form prop changes
    if (form) {
      setFormTitle(form.title);
      setPdfUrl(form.pdfUrl);
    }
  }, [form]);

  const handleHomeClick = (e) => {
    e.preventDefault();
    // Navigate to home but maintain login state
    window.history.pushState({}, '', '/');
    // This will trigger the App component to update its UI without logging out
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleAddElement = () => {
    setCurrentElement({
      type: 'text',
      label: '',
      placeholder: '',
      required: false,
      options: []
    });
    setShowElementForm(true);
    setEditingIndex(-1);
  };

  const handleEditElement = (index) => {
    setCurrentElement({ ...formElements[index] });
    setShowElementForm(true);
    setEditingIndex(index);
  };

  const handleDeleteElement = (index) => {
    const updatedElements = [...formElements];
    updatedElements.splice(index, 1);
    setFormElements(updatedElements);
  };

  const handleSaveElement = () => {
    if (!currentElement.label) return;

    const updatedElements = [...formElements];
    
    if (editingIndex >= 0) {
      updatedElements[editingIndex] = currentElement;
    } else {
      updatedElements.push(currentElement);
    }
    
    setFormElements(updatedElements);
    setShowElementForm(false);
  };

  const handleAddOption = () => {
    if (!newOption) return;
    
    setCurrentElement({
      ...currentElement,
      options: [...currentElement.options, newOption]
    });
    
    setNewOption('');
  };

  const handleRemoveOption = (index) => {
    const updatedOptions = [...currentElement.options];
    updatedOptions.splice(index, 1);
    
    setCurrentElement({
      ...currentElement,
      options: updatedOptions
    });
  };

  const handleSave = () => {
    const newForm = {
      id: form ? form.id : Date.now(),
      title: formTitle,
      createdAt: form ? form.createdAt : new Date().toISOString(),
      pdfUrl: pdfUrl,
      elements: formElements
    };
    
    onSaveForm(newForm);
  };

  const handleDashboardClick = (e) => {
    e.preventDefault();
    if (navigateToDashboard) {
      navigateToDashboard();
    } else {
      onCancel();
    }
  };

  return (
    <div className="app">
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="decorative-circle decorative-circle-1"></div>
      <div className="decorative-circle decorative-circle-2"></div>

      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="hamburger-menu" onClick={onToggleSidebar}>
              <div className="hamburger-line"></div>
              <div className="hamburger-line"></div>
              <div className="hamburger-line"></div>
            </div>
            <div 
              className="logo-container" 
              onClick={handleHomeClick}
              style={{ cursor: 'pointer' }}
            >
              <img src={conformLogo} alt="Conform.ai logo" className="logo-image" />
              <span className="logo-text">Conform</span>
            </div>
          </div>
          <div className="h2ai-logo-container">
            <img src={h2aiLogo} alt="H2.ai logo" className="h2ai-logo" />
          </div>
          <div className="header-right">
            {user && (
              <div className="user-menu">
                <span>Welcome, {user.name}</span>
                <button onClick={onLogout} className="login-button">Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="form-editor-main">
        <div className="form-editor-container">
          <div className="form-editor-header">
            <h1>Form Editor</h1>
            <div className="form-editor-actions header-actions">
              <button 
                className="form-editor-button secondary"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button 
                className="form-editor-button"
                onClick={handleSave}
              >
                Save Form
              </button>
            </div>
          </div>

          <div className="form-editor-content">
            <div className="form-elements-panel">
              <h2>Form Elements</h2>
              
              {formElements.length === 0 ? (
                <div className="empty-elements">
                  <p>No elements added yet. Click the button below to add your first element.</p>
                </div>
              ) : (
                <div className="form-elements-list">
                  {formElements.map((element, index) => (
                    <div key={index} className="form-element-item">
                      <div className="element-info">
                        <span className="element-type">{element.type}</span>
                        <span className="element-label">{element.label}</span>
                        {element.required && <span className="element-required">Required</span>}
                      </div>
                      <div className="element-actions">
                        <button 
                          className="element-action-button"
                          onClick={() => handleEditElement(index)}
                        >
                          Edit
                        </button>
                        <button 
                          className="element-action-button"
                          onClick={() => handleDeleteElement(index)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                className="add-element-button"
                onClick={handleAddElement}
              >
                Add Element
              </button>
            </div>
            
            <div className="form-preview-panel">
              <h2>Form Preview</h2>
              
              {formElements.length === 0 ? (
                <div className="empty-preview">
                  <p>Add elements to see a preview of your form here.</p>
                </div>
              ) : (
                <div className="form-preview">
                  {formElements.map((element, index) => (
                    <div key={index} className="preview-element">
                      <label className="preview-label">
                        {element.label}
                        {element.required && <span className="preview-required">*</span>}
                      </label>
                      
                      {element.type === 'text' && (
                        <input 
                          type="text" 
                          className="preview-input"
                          placeholder={element.placeholder}
                          disabled
                        />
                      )}
                      
                      {element.type === 'textarea' && (
                        <textarea 
                          className="preview-textarea"
                          placeholder={element.placeholder}
                          disabled
                        ></textarea>
                      )}
                      
                      {element.type === 'select' && (
                        <select className="preview-select" disabled>
                          <option value="">Select an option</option>
                          {element.options.map((option, i) => (
                            <option key={i} value={option}>{option}</option>
                          ))}
                        </select>
                      )}
                      
                      {element.type === 'checkbox' && (
                        <div className="preview-checkbox-group">
                          {element.options.map((option, i) => (
                            <div key={i} className="preview-checkbox-item">
                              <input type="checkbox" disabled />
                              <label>{option}</label>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {element.type === 'radio' && (
                        <div className="preview-radio-group">
                          {element.options.map((option, i) => (
                            <div key={i} className="preview-radio-item">
                              <input type="radio" name={`radio-${index}`} disabled />
                              <label>{option}</label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <button className="preview-submit-button" disabled>
                    Submit Form
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {showElementForm && (
            <div className="element-form-overlay">
              <div className="element-form">
                <h3>{editingIndex >= 0 ? 'Edit Element' : 'Add New Element'}</h3>
                
                <div className="element-form-field">
                  <label>Element Type</label>
                  <select 
                    value={currentElement.type}
                    onChange={(e) => setCurrentElement({...currentElement, type: e.target.value})}
                  >
                    <option value="text">Text Input</option>
                    <option value="textarea">Text Area</option>
                    <option value="select">Dropdown</option>
                    <option value="checkbox">Checkbox Group</option>
                    <option value="radio">Radio Group</option>
                  </select>
                </div>
                
                <div className="element-form-field">
                  <label>Label</label>
                  <input 
                    type="text"
                    value={currentElement.label}
                    onChange={(e) => setCurrentElement({...currentElement, label: e.target.value})}
                    placeholder="Enter field label"
                  />
                </div>
                
                {(currentElement.type === 'text' || currentElement.type === 'textarea') && (
                  <div className="element-form-field">
                    <label>Placeholder</label>
                    <input 
                      type="text"
                      value={currentElement.placeholder}
                      onChange={(e) => setCurrentElement({...currentElement, placeholder: e.target.value})}
                      placeholder="Enter placeholder text"
                    />
                  </div>
                )}
                
                {(currentElement.type === 'select' || currentElement.type === 'checkbox' || currentElement.type === 'radio') && (
                  <div className="element-form-field">
                    <label>Options</label>
                    <div className="options-container">
                      {currentElement.options.map((option, index) => (
                        <div key={index} className="option-item">
                          <span>{option}</span>
                          <button 
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="add-option-container">
                      <input 
                        type="text"
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        placeholder="Enter option text"
                      />
                      <button 
                        type="button"
                        onClick={handleAddOption}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="element-form-field checkbox-field">
                  <label>
                    <input 
                      type="checkbox"
                      checked={currentElement.required}
                      onChange={(e) => setCurrentElement({...currentElement, required: e.target.checked})}
                    />
                    Required Field
                  </label>
                </div>
                
                <div className="element-form-actions">
                  <button 
                    type="button" 
                    className="cancel-button"
                    onClick={() => setShowElementForm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="save-button"
                    onClick={handleSaveElement}
                  >
                    Save Element
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="form-editor-actions">
            <button 
              className="form-editor-button secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button 
              className="form-editor-button"
              onClick={handleSave}
            >
              Save Form
            </button>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="logo-container">
              <img src={conformLogo} alt="Conform.ai logo" className="logo-image" />
              <span className="logo-text">Conform</span>
            </div>
            <p className="footer-description">Making medical form filling accurate and efficient.</p>
          </div>
          <div className="footer-section">
            <h4>Pages</h4>
            <ul>
              <li><span className="footer-text">Home</span></li>
              <li><span className="footer-text">Dashboard</span></li>
              <li><span className="footer-text" style={{ fontWeight: 'bold', color: '#4FFFB0' }}>Form Editor</span></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li><span className="footer-text">Features</span></li>
              <li><span className="footer-text">Use Cases</span></li>
              <li><span className="footer-text">Documentation</span></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <ul>
              <li><span className="footer-text">About Us</span></li>
              <li><span className="footer-text">Contact</span></li>
              <li><span className="footer-text">Future Work</span></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Connect</h4>
            <div className="social-links">
              <a href="#" className="social-link">GitHub</a>
              <a href="#" className="social-link">Devpost</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="sponsored-by">
            <span>A project made at</span>
            <img src={h2aiLogo} alt="H2.ai logo" className="h2ai-logo" />
          </div>
          <p>&copy; 2025 Conform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default FormEditor; 