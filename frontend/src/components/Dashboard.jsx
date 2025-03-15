import React, { useState, useRef, useEffect } from 'react';
import conformLogo from '../assets/conform_logo.png';
import h2aiLogo from '../assets/h2ai_logo.png';
import './Dashboard.css';
import EditProfile from './EditProfile';
import FormEditor from './FormEditor';
import { scrollToTop } from '../utils/scrollUtils';

const Dashboard = ({ 
  user, 
  onLogout, 
  onToggleSidebar, 
  onUpdateUser, 
  forms, 
  setForms, 
  onCreateForm 
}) => {
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFormEditor, setShowFormEditor] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [userPdfs, setUserPdfs] = useState([]);
  const [lastUploadedPdf, setLastUploadedPdf] = useState(null);
  const [showAllForms, setShowAllForms] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState(null);
  const [currentFormId, setCurrentFormId] = useState(null);
  const [showPatientAssignmentPopup, setShowPatientAssignmentPopup] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [newPatient, setNewPatient] = useState('');
  const [patients, setPatients] = useState([]);
  const [formToEdit, setFormToEdit] = useState(null);
  const fileInputRef = useRef(null);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [showDeletePatientConfirm, setShowDeletePatientConfirm] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const patientFileInputRef = useRef(null);
  const [patientEmail, setPatientEmail] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientConditions, setPatientConditions] = useState('');
  const [patientMedications, setPatientMedications] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Fetch user's PDFs on component mount
  useEffect(() => {
    if (user) {
      fetchUserPdfs();
    }
  }, [user]);
  
  const fetchUserPdfs = async () => {
    try {
      const response = await fetch(`/api/user/${user.id}/pdfs`);
      if (response.ok) {
        const data = await response.json();
        setUserPdfs(data.pdfs);
      }
    } catch (error) {
      console.error('Error fetching user PDFs:', error);
    }
  };
  
  // Fetch patients for the logged-in user
  useEffect(() => {
    if (user) {
      fetchUserPatients();
    }
  }, [user]);
  
  const fetchUserPatients = async () => {
    try {
      const response = await fetch(`/api/user/${user.id}/patients`);
      
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients);
      } else {
        console.error('Error fetching patients:', response.statusText);
        // Use mock data as fallback
        if (patients.length === 0) {
          setPatients([
            { id: 1, name: 'John Doe', userId: user.id },
            { id: 2, name: 'Jane Smith', userId: user.id },
            { id: 3, name: 'Robert Johnson', userId: user.id }
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching user patients:', error);
      // Use mock data as fallback
      if (patients.length === 0) {
        setPatients([
          { id: 1, name: 'John Doe', userId: user.id },
          { id: 2, name: 'Jane Smith', userId: user.id },
          { id: 3, name: 'Robert Johnson', userId: user.id }
        ]);
      }
    }
  };
  
  const handleHomeClick = (e) => {
    e.preventDefault();
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    scrollToTop();
  };
  
  const handleCreateForm = () => {
    // Reset the last uploaded PDF when clicking to upload a new one
    setLastUploadedPdf(null);
    // Instead of opening the file picker directly, show the patient assignment popup first
    setShowPatientAssignmentPopup(true);
    scrollToTop();
  };
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check if file is a PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files are allowed');
      setTimeout(() => setUploadError(''), 3000);
      return;
    }
    
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');
    
    try {
      console.log(`Uploading file: ${file.name}, size: ${file.size} bytes`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', user.id);
      
      // If a patient is selected, add the patient_id to the form data
      if (selectedPatient) {
        formData.append('patient_id', selectedPatient);
      }
      
      console.log('Sending upload request...');
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      
      console.log(`Upload response status: ${response.status}`);
      
      let responseText;
      try {
        responseText = await response.text();
        console.log('Response text:', responseText);
      } catch (textError) {
        console.error('Error reading response text:', textError);
      }
      
      if (!response.ok) {
        throw new Error(responseText || `Server error: ${response.status}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error('Invalid response from server');
      }
      
      console.log('Upload successful:', data);
      
      // Save the uploaded PDF
      setLastUploadedPdf(data.pdf);
      
      // Create a form object from the uploaded PDF
      const newForm = {
        id: data.pdf.id,
        title: data.pdf.originalFilename.replace('.pdf', ''),
        createdAt: data.pdf.uploadDate,
        pdfUrl: data.pdf.url,
        filename: data.pdf.filename,
        originalFilename: data.pdf.originalFilename,
        patientId: data.pdf.patientId,
        patientName: data.pdf.patientName
      };
      
      // Update the forms list
      if (setForms) {
        setForms([newForm, ...forms]);
      }
      
      // Show success message with patient name if assigned
      setUploadSuccess(`PDF uploaded successfully${data.pdf.patientName ? ` and assigned to ${data.pdf.patientName}` : ''}`);
      setTimeout(() => setUploadSuccess(''), 3000);
      
      // Refresh the PDFs list to update UI
      fetchUserPdfs();
      
      // Reset the patient selection after successful upload
      setSelectedPatient('');
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setUploadError(`Upload failed: ${error.message}`);
      setTimeout(() => setUploadError(''), 5000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleEditForm = (formId) => {
    // Find the PDF information from userPdfs
    const pdfToEdit = userPdfs.find(pdf => pdf.id === formId);
    
    if (pdfToEdit) {
      // Create a form object with the PDF information
      const formData = {
        id: pdfToEdit.id,
        title: pdfToEdit.originalFilename.replace('.pdf', ''),
        createdAt: pdfToEdit.uploadDate,
        pdfUrl: pdfToEdit.url,
        filename: pdfToEdit.filename,
        originalFilename: pdfToEdit.originalFilename
      };
      
      // Set the form to be edited
      setFormToEdit(formData);
      
      // Show the Form Editor
      setShowFormEditor(true);
      
      // Close any open modals
      setShowAllForms(false);
      setExpandedPatient(null);
      
      // Scroll to top for better user experience
      scrollToTop();
    } else {
      console.error(`Form with ID ${formId} not found`);
      setUploadError('Form not found');
      setTimeout(() => setUploadError(''), 3000);
    }
  };
  
  const handleDeleteForm = (formId) => {
    if (setForms) {
      setForms(forms.filter(form => form.id !== formId));
    }
  };
  
  const handleUpdateSuccess = (updatedUser) => {
    // Pass the updated user data to the parent component
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }
  };

  const handleSaveForm = (newForm) => {
    setForms([...forms, newForm]);
    setShowFormEditor(false);
  };

  const handleViewAllForms = async () => {
    setIsLoadingForms(true);
    
    // Fetch the latest PDFs with patient information
    await fetchPdfsWithPatientInfo();
    
    // Show the modal and hide loading
    setShowAllForms(true);
    setIsLoadingForms(false);
  };

  const fetchPdfsWithPatientInfo = async () => {
    try {
      console.log("Fetching PDFs with patient info...");
      
      // Fetch PDFs from API
      const response = await fetch(`/api/user/${user.id}/pdfs`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Log the raw data from the API
        console.log("API Response:", data);
        console.log("PDFs from API:", data.pdfs);
        
        // Check if any PDFs have patient information
        const hasPatientsInfo = data.pdfs.some(pdf => pdf.patientName);
        console.log("Any PDFs have patient info?", hasPatientsInfo);
        
        if (!hasPatientsInfo) {
          console.log("No patient info found in API response. Property names:", 
            Object.keys(data.pdfs[0] || {}));
        }
        
        // Update the userPdfs state with the data directly from the API
        setUserPdfs(data.pdfs);
      }
    } catch (error) {
      console.error('Error fetching PDFs with patient information:', error);
    }
  };

  const handleCloseAllForms = () => {
    setShowAllForms(false);
  };

  // ... existing code ...

const handleDeletePdf = (pdfId) => {
  setPdfToDelete(pdfId);
  setShowDeleteConfirm(true);
};

const confirmDelete = async () => {
  if (!pdfToDelete) return;
  
  try {
    const response = await fetch(`/api/pdfs/${pdfToDelete}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete form');
    }
    
    // Remove the PDF from the userPdfs state
    setUserPdfs(userPdfs.filter(pdf => pdf.id !== pdfToDelete));
    
    // If this was the last uploaded PDF, clear it
    if (lastUploadedPdf && lastUploadedPdf.id === pdfToDelete) {
      setLastUploadedPdf(null);
    }
    
    // Show success message
    setUploadSuccess('Form deleted successfully');
    setTimeout(() => setUploadSuccess(''), 3000);
    
  } catch (error) {
    console.error('Error deleting PDF:', error);
    setUploadError('Failed to delete form');
    setTimeout(() => setUploadError(''), 5000);
  } finally {
    // Close the confirmation modal
    setShowDeleteConfirm(false);
    setPdfToDelete(null);
  }
};

const cancelDelete = () => {
  setShowDeleteConfirm(false);
  setPdfToDelete(null);
};

// ... rest of your component ...

  // Add a useEffect to handle the automatic clearing of success messages
  useEffect(() => {
    // If there's a success message, set a timeout to clear it
    if (uploadSuccess) {
      const timeoutId = setTimeout(() => {
        setUploadSuccess('');
      }, 5000);
      
      // Return a cleanup function to clear the timeout if the component unmounts
      // or if uploadSuccess changes before the timeout completes
      return () => clearTimeout(timeoutId);
    }
  }, [uploadSuccess]);

  // Function to handle patient assignment
  const handleAssignPatient = async (e) => {
    e.preventDefault();
    
    try {
      // Validate that a patient is selected
      if (!selectedPatient) {
        setUploadError('Please select a patient');
        setTimeout(() => setUploadError(''), 3000);
        return;
      }
      
      // Close the patient assignment popup
      setShowPatientAssignmentPopup(false);
      
      // Now that we have a patient selected, open the file picker
      fileInputRef.current.click();
      
    } catch (error) {
      console.error('Error assigning patient:', error);
      setUploadError('Failed to assign patient');
      setTimeout(() => setUploadError(''), 3000);
    }
  };
  
  // Function to handle opening the Add New Patient modal from the Assign Patient modal
  const handleOpenAddPatientModal = () => {
    // Close the patient assignment popup
    setShowPatientAssignmentPopup(false);
    
    // Open the Add New Patient modal
    setShowAddPatientModal(true);
  };

  // Function to handle adding a new patient
  const handleAddPatient = async (e) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (!newPatientName.trim()) {
        setUploadError('Patient name is required');
        setTimeout(() => setUploadError(''), 3000);
        return;
      }
      
      // Create the patient data object
      const patientData = {
        name: newPatientName,
        user_id: user.id,
        email: patientEmail || null,
        date_of_birth: patientDob || null,
        gender: patientGender || null,
        age: patientAge || null,
        conditions: patientConditions || null,
        medications: patientMedications || null
      };
      
      // Send the request to create a new patient
      const response = await fetch(`/api/user/${user.id}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patientData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to add patient');
      }
      
      const data = await response.json();
      
      // Add the new patient to the patients list
      setPatients([...patients, data.patient]);
      
      // Reset the form fields
      setNewPatientName('');
      setPatientEmail('');
      setPatientDob('');
      setPatientGender('');
      setPatientAge('');
      setPatientConditions('');
      setPatientMedications('');
      setSelectedFiles([]);
      
      // Close the Add Patient modal
      setShowAddPatientModal(false);
      
      // Reopen the Assign Patient modal with the newly created patient selected
      setSelectedPatient(data.patient.id);
      setShowPatientAssignmentPopup(true);
      
      // Show success message
      setUploadSuccess('Patient added successfully');
      setTimeout(() => setUploadSuccess(''), 3000);
      
      // Refresh the patients list
      fetchUserPatients();
      
    } catch (error) {
      console.error('Error adding patient:', error);
      setUploadError('Failed to add patient');
      setTimeout(() => setUploadError(''), 3000);
    }
  };

  const handlePatientFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files (ensure they're PDFs)
    const validFiles = files.filter(file => file.name.toLowerCase().endsWith('.pdf'));
    
    if (validFiles.length !== files.length) {
      setUploadError('Only PDF files are allowed');
      setTimeout(() => setUploadError(''), 3000);
    }
    
    setSelectedFiles(validFiles);
  };

  const handleAddNewPatientClick = () => {
    setShowAddPatientModal(true);
  };

  // Function to handle deleting a patient
  const handleDeletePatient = (patientId) => {
    setPatientToDelete(patientId);
    setShowDeletePatientConfirm(true);
  };
  
  // Function to cancel patient deletion
  const cancelDeletePatient = () => {
    setPatientToDelete(null);
    setShowDeletePatientConfirm(false);
  };
  
  // Function to confirm patient deletion
  // ... existing code ...
const confirmDeletePatient = async () => {
  try {
    // Call the API to delete the patient
    const response = await fetch(`/api/patients/${patientToDelete}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete patient');
    }
    
    // Remove the patient from the state
    setPatients(patients.filter(patient => patient.id !== patientToDelete));
    
    // Close the confirmation modal
    setShowDeletePatientConfirm(false);
    
    // Close the patient info modal if it's open
    setExpandedPatient(null);
    
    // Show success message
    setUploadSuccess('Patient deleted successfully');
    setTimeout(() => setUploadSuccess(''), 3000);
    
    // Refresh the PDFs list to update UI
    fetchUserPdfs();
  } catch (error) {
    console.error('Error deleting patient:', error);
    setUploadError('Failed to delete patient');
    setTimeout(() => setUploadError(''), 3000);
  }
};
// ... existing code ...

  if (showFormEditor) {
    // Find the form to edit
    const formToEdit = currentFormId ? forms.find(form => form.id === currentFormId) : null;
    
    return (
      <FormEditor 
        user={user}
        onLogout={onLogout}
        onToggleSidebar={onToggleSidebar}
        onSaveForm={handleSaveForm}
        onCancel={() => {
          setShowFormEditor(false);
          setCurrentFormId(null);
        }}
        form={formToEdit} // Pass the form to edit
      />
    );
  }

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
            <div className="user-menu">
              <span>Welcome, {user?.name}</span>
              <button onClick={onLogout} className="login-button">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <h1>{user?.name.split(' ')[0]}'s Dashboard</h1>
          <p>Manage your patient's medical forms and submissions</p>
        </div>

        {/* Hidden file input for PDF upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".pdf" 
          onChange={handleFileChange}
        />
        
        {/* Upload error/success messages */}
        {uploadError && (
          <div className="upload-error-message">
            {uploadError}
          </div>
        )}
        
        {uploadSuccess && (
          <div className="upload-success-message">
            {uploadSuccess}
          </div>
        )}

        <div className="dashboard-section">
          <h2 style={{ color: 'white' }}>Upload Fillable Form</h2>
          <div className="forms-grid">
            <div 
              className="create-form-card" 
              onClick={handleCreateForm}
              style={{
                background: "linear-gradient(135deg, rgba(79, 255, 176, 0.2) 0%, rgba(79, 255, 176, 0.1) 100%)",
                border: "2px dashed rgba(79, 255, 176, 0.5)",
                borderRadius: "2rem",
                padding: "1.5rem",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.3s ease",
                marginBottom: "2rem",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100px"
              }}
            >
              <div className="upload-icon">+</div>
            </div>
            
            {isUploading && (
              <div className="upload-status">
                <div className="upload-spinner"></div>
                <span>Uploading...</span>
              </div>
            )}
            
            {lastUploadedPdf && (
              <div className="last-upload-info">
                <div className="last-upload-title">Last Uploaded:</div>
                <div className="last-upload-name">{lastUploadedPdf.originalFilename}</div>
                {lastUploadedPdf.patientName && (
                  <div className="last-upload-patient">Patient: {lastUploadedPdf.patientName}</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>Recent Forms</h2>
            {userPdfs.length > 0 ? (
              <div className="recent-forms-list">
                {userPdfs.slice(0, 3).map(pdf => (
                  <div className="recent-form-item" key={pdf.id}>
                    <div className="recent-form-info">
                      <span className="recent-form-name">{pdf.originalFilename}</span>
                      {pdf.patientName && (
                        <span className="recent-form-patient">Patient: {pdf.patientName}</span>
                      )}
                    </div>
                    <div className="recent-form-actions">
                      <span className="recent-form-date">
                        {new Date(pdf.uploadDate).toLocaleDateString()}
                      </span>
                      <button 
                        className="form-card-action delete"
                        onClick={() => handleDeletePdf(pdf.id)}
                      >
                        −
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="recent-forms-empty">No forms submitted yet</p>
            )}
            <button 
              className="dashboard-button view-all-button"
              onClick={handleViewAllForms}
            >
              View All Forms
            </button>
          </div>

          <div className="dashboard-card">
            <h2>Saved Templates</h2>
            <div className="empty-state">No templates displayed</div>
            <div className="template-create-button" onClick={() => console.log('Create template')}>
              <div className="template-create-icon">+</div>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Profile Information</h2>
            <div className="profile-info">
              <p><strong>Name:</strong> {user?.name}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Healthcare Title:</strong> {user?.healthcareTitle}</p>
              <p><strong>Hospital System:</strong> {user?.hospitalSystem}</p>
            </div>
            <button 
              className="dashboard-button edit-profile-button"
              onClick={() => setShowEditProfile(true)}
            >
              Edit Profile
            </button>
          </div>

          <div className="dashboard-card patient-manager-card">
            <h2>Patient Manager</h2>
            
            {patients.length > 0 ? (
              <div className="patient-list">
                {patients.map(patient => {
                  // Count forms for this patient
                  const patientForms = userPdfs.filter(pdf => 
                    pdf.patientId === patient.id || 
                    (pdf.patientName && pdf.patientName === patient.name)
                  );
                  
                  return (
                    <div className="patient-item" key={patient.id}>
                      <button 
                        className="patient-expand-button"
                        onClick={() => setExpandedPatient(patient)}
                      >
                        Expand
                      </button>
                      <div className="patient-name">{patient.name}</div>
                      <div className="patient-form-count">{patientForms.length} forms</div>
                      <div className="patient-forms-dropdown">
                        <button className="dropdown-toggle">
                          View Forms
                          <span className="dropdown-arrow">▼</span>
                        </button>
                        
                        <div className="dropdown-content">
                          {patientForms.length > 0 ? (
                            patientForms.map(form => (
                              <div className="dropdown-form-item" key={form.id}>
                                <span className="dropdown-form-name">{form.originalFilename}</span>
                                <span className="dropdown-form-date">
                                  {new Date(form.uploadDate).toLocaleDateString()}
                                </span>
                                <div className="dropdown-form-actions">
                                  <button 
                                    className="dropdown-form-action edit"
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent dropdown from closing
                                      handleEditForm(form.id);
                                    }}
                                  >
                                    ✎
                                  </button>
                                  <button 
                                    className="dropdown-form-action delete"
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent dropdown from closing
                                      handleDeletePdf(form.id);
                                    }}
                                  >
                                    −
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="dropdown-empty">No forms assigned</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">No patients added yet</div>
            )}
            
            <button 
              className="dashboard-button"
              onClick={handleAddNewPatientClick}
            >
              Add New Patient
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
              <li><span className="footer-text" style={{ fontWeight: 'bold', color: '#4FFFB0' }}>Dashboard</span></li>
              <li><span className="footer-text">Form Editor</span></li>
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

      {showEditProfile && (
        <EditProfile 
          user={user} 
          onClose={() => setShowEditProfile(false)} 
          onUpdateSuccess={handleUpdateSuccess}
        />
      )}

      {/* View All Forms Popup */}
      {showAllForms && (
        <div className="modal-overlay" onClick={handleCloseAllForms}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>All Uploaded Forms</h2>
              <button className="modal-close" onClick={handleCloseAllForms}>×</button>
            </div>
            <div className="modal-body">
              {isLoadingForms ? (
                <div className="loading-indicator">Loading forms...</div>
              ) : userPdfs.length > 0 ? (
                <div className="all-forms-list">
                  {userPdfs.map(pdf => {
                    // Debug log to check each PDF
                    console.log('Rendering PDF in View All Forms:', pdf);
                    
                    // Check for patient name in either property
                    const patientName = pdf.patientName || (pdf.patient_name);
                    
                    return (
                      <div className="all-forms-item" key={pdf.id}>
                        <div className="all-forms-item-left">
                          <div className="all-forms-name-container">
                            <span className="all-forms-name">{pdf.originalFilename}</span>
                            {patientName && (
                              <span className="all-forms-patient">Patient: {patientName}</span>
                            )}
                          </div>
                          <span className="all-forms-date">
                            {new Date(pdf.uploadDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="all-forms-actions">
                          <button 
                            className="form-card-action edit"
                            onClick={() => handleEditForm(pdf.id)}
                          >
                            ✎
                          </button>
                          <button 
                            className="form-card-action delete"
                            onClick={() => handleDeletePdf(pdf.id)}
                          >
                            −
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="all-forms-empty">No forms uploaded yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="modal-close" onClick={cancelDelete}>×</button>
            </div>
            <div className="modal-body">
              <p className="delete-confirm-message">
                Are you sure you want to delete this form? This action cannot be undone.
              </p>
              <div className="delete-confirm-actions">
                <button 
                  className="dashboard-button secondary"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
                <button 
                  className="dashboard-button delete-button"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Assignment Popup */}
      {showPatientAssignmentPopup && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-content">
              <h2>Assign Form to Patient</h2>
              <p>Select an existing patient or add a new one:</p>
              
              <form onSubmit={handleAssignPatient}>
                <div className="form-group">
                  <label htmlFor="existingPatient">Existing Patient</label>
                  <select
                    id="existingPatient"
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="patient-select"
                  >
                    <option value="">Select a patient</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group add-new-patient-button-container">
                  <button
                    type="button"
                    className="add-new-patient-button"
                    onClick={handleOpenAddPatientModal}
                  >
                    + Add New Patient
                  </button>
                </div>
                
                <div className="assign-patient-actions">
                  <button
                    type="button"
                    className="action-button cancel-button"
                    onClick={() => setShowPatientAssignmentPopup(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="action-button submit-button"
                    disabled={!selectedPatient}
                  >
                    Upload
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Patient Information Popup */}
      {expandedPatient && (
        <div className="modal-overlay" onClick={() => setExpandedPatient(null)}>
          <div className="modal-content patient-info-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{expandedPatient.name}</h2>
              <button className="modal-close" onClick={() => setExpandedPatient(null)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Patient Details Section */}
              <div className="patient-info-section">
                <h4>Patient Details</h4>
                <div className="patient-details-grid">
                  <div className="patient-info-item">
                    <div className="patient-info-label">Email</div>
                    <div className={`patient-info-value ${!expandedPatient.email ? 'empty' : ''}`}>
                      {expandedPatient.email || 'Not provided'}
                    </div>
                  </div>
                  
                  <div className="patient-info-item">
                    <div className="patient-info-label">Date of Birth</div>
                    <div className={`patient-info-value ${!expandedPatient.dateOfBirth ? 'empty' : ''}`}>
                      {expandedPatient.dateOfBirth || 'Not provided'}
                    </div>
                  </div>
                  
                  <div className="patient-info-item">
                    <div className="patient-info-label">Gender</div>
                    <div className={`patient-info-value ${!expandedPatient.gender ? 'empty' : ''}`}>
                      {expandedPatient.gender || 'Not provided'}
                    </div>
                  </div>
                  
                  <div className="patient-info-item">
                    <div className="patient-info-label">Age</div>
                    <div className={`patient-info-value ${!expandedPatient.age ? 'empty' : ''}`}>
                      {expandedPatient.age || 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Medical Information Section */}
              <div className="patient-info-section">
                <h4>Medical Information</h4>
                <div className="patient-medical-info">
                  <div className="patient-info-item full-width">
                    <div className="patient-info-label">Current Medical Conditions</div>
                    <div className={`patient-info-value ${!expandedPatient.conditions ? 'empty' : ''}`}>
                      {expandedPatient.conditions || 'No conditions listed'}
                    </div>
                  </div>
                  
                  <div className="patient-info-item full-width">
                    <div className="patient-info-label">Current Medications</div>
                    <div className={`patient-info-value ${!expandedPatient.medications ? 'empty' : ''}`}>
                      {expandedPatient.medications || 'No medications listed'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Patient Forms Section */}
              <div className="patient-info-section">
                <h4>Patient Forms</h4>
                
                {/* Get forms for this patient */}
                {(() => {
                  const patientForms = userPdfs.filter(pdf => 
                    pdf.patientId === expandedPatient.id || 
                    (pdf.patientName && pdf.patientName === expandedPatient.name)
                  );
                  
                  return patientForms.length > 0 ? (
                    <div className="all-forms-list">
                      {patientForms.map(form => (
                        <div className="all-forms-item" key={form.id}>
                          <div className="all-forms-item-left">
                            <div className="all-forms-name-container">
                              <span className="all-forms-name">{form.originalFilename}</span>
                            </div>
                            <span className="all-forms-date">
                              {new Date(form.uploadDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="all-forms-actions">
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="all-forms-empty">No forms assigned to this patient</div>
                  );
                })()}
              </div>
            </div>
            
            <div className="patient-info-actions">
              <button 
                className="dashboard-button secondary"
                onClick={() => setExpandedPatient(null)}
              >
                Close
              </button>
              <button 
                className="dashboard-button delete-button"
                onClick={() => handleDeletePatient(expandedPatient.id)}
              >
                Delete Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Patient Confirmation Modal */}
      {showDeletePatientConfirm && (
        <div className="modal-overlay" onClick={cancelDeletePatient}>
          <div className="modal-content delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete Patient</h2>
              <button className="modal-close" onClick={cancelDeletePatient}>×</button>
            </div>
            <div className="modal-body">
              <p className="delete-confirm-message">
                Are you sure you want to delete this patient? This will remove the patient from all forms.
                This action cannot be undone.
              </p>
              <div className="delete-confirm-actions">
                <button 
                  className="dashboard-button secondary"
                  onClick={cancelDeletePatient}
                >
                  Cancel
                </button>
                <button 
                  className="dashboard-button delete-button"
                  onClick={confirmDeletePatient}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Patient Modal */}
      {showAddPatientModal && (
        <div className="modal-overlay" onClick={() => setShowAddPatientModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Patient</h2>
              <button className="modal-close" onClick={() => setShowAddPatientModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddPatient}>
                <div className="form-group">
                  <label htmlFor="patientName">Patient Name</label>
                  <input
                    type="text"
                    id="patientName"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    className="patient-input"
                    placeholder="Enter patient name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="patientEmail">Email Address</label>
                  <input
                    type="email"
                    id="patientEmail"
                    value={patientEmail || ''}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="patient-input"
                    placeholder="Enter patient's email (optional)"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="patientDob">Date of Birth</label>
                  <input
                    type="date"
                    id="patientDob"
                    value={patientDob || ''}
                    onChange={(e) => setPatientDob(e.target.value)}
                    className="patient-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="patientGender">Gender</label>
                  <select
                    id="patientGender"
                    value={patientGender || ''}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="patient-select"
                  >
                    <option value="">Select gender (optional)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="patientAge">Age</label>
                  <input
                    type="number"
                    id="patientAge"
                    value={patientAge || ''}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="patient-input"
                    placeholder="Enter patient's age (optional)"
                    min="0"
                    max="120"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="patientConditions">Current Medical Conditions</label>
                  <textarea
                    id="patientConditions"
                    value={patientConditions || ''}
                    onChange={(e) => setPatientConditions(e.target.value)}
                    className="patient-input"
                    placeholder="List any current medical conditions (optional)"
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="patientMedications">Current Medications</label>
                  <textarea
                    id="patientMedications"
                    value={patientMedications || ''}
                    onChange={(e) => setPatientMedications(e.target.value)}
                    className="patient-input"
                    placeholder="List any current medications (optional)"
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label>Upload Patient Forms (Optional)</label>
                  <div className="file-upload-container">
                    <button
                      type="button"
                      className="file-select-button"
                      onClick={() => patientFileInputRef.current.click()}
                    >
                      Select PDF Files
                    </button>
                    <input
                      type="file"
                      ref={patientFileInputRef}
                      onChange={handlePatientFileSelect}
                      multiple
                      accept=".pdf"
                      style={{ display: 'none' }}
                    />
                    {selectedFiles.length > 0 && (
                      <div className="selected-files">
                        <p>{selectedFiles.length} file(s) selected</p>
                        <ul className="file-list">
                          {selectedFiles.map((file, index) => (
                            <li key={index} className="file-item">
                              {file.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="form-actions centered">
                  <button
                    type="button"
                    className="action-button cancel-button"
                    onClick={() => setShowAddPatientModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="action-button submit-button"
                  >
                    Add Patient
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 