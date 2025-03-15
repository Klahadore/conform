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
    // Trigger file input click
    fileInputRef.current.click();
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
        originalFilename: data.pdf.originalFilename
      };
      
      // Show patient assignment popup
      setFormToEdit(newForm);
      setShowPatientAssignmentPopup(true);
      
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setUploadError(`Upload failed: ${error.message}`);
      setTimeout(() => setUploadError(''), 5000);
    } finally {
      setIsUploading(false);
      // Clear the file input
      e.target.value = '';
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
  const handleAssignPatient = async () => {
    if (!formToEdit) return;
    
    // Check if we're using an existing patient or adding a new one
    const patientName = newPatient.trim() ? newPatient : selectedPatient;
    
    if (!patientName) {
      setUploadError('Please select or add a patient');
      setTimeout(() => setUploadError(''), 3000);
      return;
    }
    
    try {
      // Add a new patient via API
      let patientId;
      
      if (newPatient.trim()) {
        const response = await fetch('/api/patients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newPatient,
            user_id: user.id
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to add new patient');
        }
        
        const data = await response.json();
        patientId = data.patient.id;
        
        // Update local patients list
        setPatients([...patients, data.patient]);
      } else {
        // Find the selected patient's ID
        const selectedPatientObj = patients.find(p => p.name === selectedPatient);
        patientId = selectedPatientObj ? selectedPatientObj.id : null;
      }
      
      // Assign the patient to the PDF via API
      const assignResponse = await fetch(`/api/pdfs/${formToEdit.id}/patient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patientId
        }),
      });
      
      if (!assignResponse.ok) {
        throw new Error('Failed to assign patient to PDF');
      }
      
      // Update the form with the patient name
      const updatedForm = {
        ...formToEdit,
        patientName: patientName,
        patientId: patientId
      };
      
      // Update forms list
      if (setForms) {
        setForms([updatedForm, ...forms.filter(form => form.id !== updatedForm.id)]);
      }
      
      // Update the userPdfs array to include patient information
      const updatedPdfs = userPdfs.map(pdf => 
        pdf.id === formToEdit.id ? { ...pdf, patientName: patientName, patientId: patientId } : pdf
      );
      
      // Update the userPdfs state with the new data
      setUserPdfs(updatedPdfs);
      
      // If this was the last uploaded PDF, update it with patient info
      if (lastUploadedPdf && lastUploadedPdf.id === formToEdit.id) {
        setLastUploadedPdf({
          ...lastUploadedPdf,
          patientName: patientName,
          patientId: patientId
        });
      }
      
      // After successfully assigning a patient, refresh the PDFs list to get updated patient info
      await fetchUserPdfs();
      
      // Close the patient assignment popup
      setShowPatientAssignmentPopup(false);
      setSelectedPatient('');
      setNewPatient('');
      
      // After successfully assigning a patient, refresh the patient list
      fetchUserPatients();
      
    } catch (error) {
      console.error('Error assigning patient:', error);
      setUploadError(`Failed to assign patient: ${error.message}`);
      setTimeout(() => setUploadError(''), 5000);
    }
  };
  
  // Function to cancel patient assignment
  const handleCancelAssignment = () => {
    // If this was from an upload, we need to handle the canceled assignment
    if (lastUploadedPdf && formToEdit && lastUploadedPdf.id === formToEdit.id) {
      // Show an info message that the form wasn't assigned to a patient
      setUploadSuccess('PDF uploaded without patient assignment');
    }
    
    setShowPatientAssignmentPopup(false);
    setSelectedPatient('');
    setNewPatient('');
  };

  const handleDeletePatient = (patientId) => {
    setPatientToDelete(patientId);
    setShowDeletePatientConfirm(true);
  };

  const confirmDeletePatient = async () => {
    if (!patientToDelete) return;
    
    try {
      console.log(`Deleting patient with ID: ${patientToDelete}`);
      
      const response = await fetch(`/api/patients/${patientToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete patient');
      }
      
      const data = await response.json();
      console.log('Delete patient response:', data);
      
      // Remove the patient from the patients state
      setPatients(patients.filter(patient => patient.id !== patientToDelete));
      
      // Close the delete confirmation and patient info popup
      setShowDeletePatientConfirm(false);
      setExpandedPatient(null);
      
      // Show success message
      setUploadSuccess(data.message || 'Patient deleted successfully');
      setTimeout(() => setUploadSuccess(''), 3000);
      
      // Refresh the PDFs list to update any references to the deleted patient
      fetchUserPdfs();
      
    } catch (error) {
      console.error('Error deleting patient:', error);
      setUploadError(`Failed to delete patient: ${error.message}`);
      setTimeout(() => setUploadError(''), 5000);
    }
  };

  const cancelDeletePatient = () => {
    setShowDeletePatientConfirm(false);
    setPatientToDelete(null);
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    
    if (!newPatientName.trim()) {
      setUploadError('Patient name is required');
      setTimeout(() => setUploadError(''), 3000);
      return;
    }
    
    try {
      // First create the patient
      const patientResponse = await fetch(`/api/user/${user.id}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newPatientName })
      });
      
      if (!patientResponse.ok) {
        const errorData = await patientResponse.json();
        throw new Error(errorData.detail || 'Failed to create patient');
      }
      
      const patientData = await patientResponse.json();
      const newPatientId = patientData.patient.id;
      
      // If files were selected, upload them and associate with the new patient
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('user_id', user.id);
          
          const uploadResponse = await fetch('/api/upload-pdf', {
            method: 'POST',
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload file: ${file.name}`);
          }
          
          const uploadData = await uploadResponse.json();
          const pdfId = uploadData.pdf.id;
          
          // Associate the PDF with the patient
          await fetch(`/api/pdfs/${pdfId}/patient`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ patient_id: newPatientId })
          });
        }
      }
      
      // Refresh the patients list and PDFs
      await fetchUserPatients();
      await fetchUserPdfs();
      
      // Show success message
      setUploadSuccess(`Patient "${newPatientName}" created successfully`);
      setTimeout(() => setUploadSuccess(''), 3000);
      
      // Reset form and close modal
      setNewPatientName('');
      setSelectedFiles([]);
      setShowAddPatientModal(false);
      
    } catch (error) {
      console.error('Error adding patient:', error);
      setUploadError(`Failed to add patient: ${error.message}`);
      setTimeout(() => setUploadError(''), 5000);
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
        <div className="modal-overlay" onClick={handleCancelAssignment}>
          <div className="modal-content patient-assignment-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Form to a Patient</h2>
              <button className="modal-close" onClick={handleCancelAssignment}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="existingPatient">Select Existing Patient:</label>
                <select 
                  id="existingPatient" 
                  className="patient-select"
                  value={selectedPatient}
                  onChange={(e) => {
                    setSelectedPatient(e.target.value);
                    if (e.target.value) {
                      setNewPatient('');
                    }
                  }}
                >
                  <option value="">-- Select a patient --</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.name}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="newPatient">Or Add a New Patient:</label>
                <input 
                  type="text" 
                  id="newPatient" 
                  className="patient-input"
                  value={newPatient}
                  onChange={(e) => {
                    setNewPatient(e.target.value);
                    if (e.target.value) {
                      setSelectedPatient('');
                    }
                  }}
                  placeholder="Enter patient name"
                />
              </div>
              
              <div className="patient-assignment-actions">
                <button 
                  className="dashboard-button secondary"
                  onClick={handleCancelAssignment}
                >
                  Cancel
                </button>
                <button 
                  className="dashboard-button"
                  onClick={handleAssignPatient}
                >
                  Assign & Continue
                </button>
              </div>
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
                            <button 
                              className="form-card-action edit"
                              onClick={() => handleEditForm(form.id)}
                            >
                              ✎
                            </button>
                            <button 
                              className="form-card-action delete"
                              onClick={() => handleDeletePdf(form.id)}
                            >
                              −
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="all-forms-empty">No forms assigned to this patient</div>
                  );
                })()}
              </div>
              
              <div className="patient-info-section">
                <h4>Additional Information</h4>
                <div className="patient-additional-info">
                  <p className="patient-info-placeholder">
                    Additional patient information will be available here in future updates.
                  </p>
                </div>
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
                    placeholder="Enter patient name"
                    required
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