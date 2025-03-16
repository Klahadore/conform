from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Request, BackgroundTasks, Response
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import sqlite3
import os
from datetime import datetime, timedelta
import re
import PyPDF2
import json
import shutil
from chains.chain1 import chain1
import pathlib
import time
import threading
import traceback
import uuid
import base64
from contextlib import closing

# Create the FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", 
                  "http://localhost:6969", "http://127.0.0.1:6969",
                  "*"],  # Allow all origins temporarily for testing
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
HTML_OUTPUT_DIR = os.path.join(BASE_DIR, "html_outputs")
DB_PATH = os.path.join(BASE_DIR, "conform.db")

# Create directories if they don't exist
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(HTML_OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.join(HTML_OUTPUT_DIR, "filled_pdfs"), exist_ok=True)

# Mount the directories to make files accessible
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.mount("/html_outputs", StaticFiles(directory=HTML_OUTPUT_DIR), name="html_outputs")

# Database setup
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# Initialize database
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        healthcare_title TEXT,
        hospital_system TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create uploaded_pdfs table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS uploaded_pdfs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        is_fillable BOOLEAN,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        patient_id INTEGER,
        patient_name TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
    ''')
    
    # Create patients table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        email TEXT,
        date_of_birth TEXT,
        gender TEXT,
        age TEXT,
        conditions TEXT,
        medications TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Create healthcare_systems table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS healthcare_systems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create universal_pdfs table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS universal_pdfs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_filename TEXT UNIQUE NOT NULL,
        html_content TEXT,
        html_filename TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        healthcare_system_id INTEGER
    )
    ''')
    
    # Drop healthcare_templates table if it exists
    cursor.execute("DROP TABLE IF EXISTS healthcare_templates")
    
    # Populate healthcare_systems table with data from hospitalSystems.js if empty
    cursor.execute("SELECT COUNT(*) FROM healthcare_systems")
    count = cursor.fetchone()[0]
    
    if count == 0:
        # Import the hospital systems from the JavaScript file
        # This is a simplified approach - in production, you'd want to parse the JS file
        hospital_systems = [
            "Kaiser Permanente", "HCA Healthcare", "CommonSpirit", "Advocate Health",
            "Ascension", "Providence", "UPMC", "Trinity Health", "Tenet Healthcare",
            "Mass General Brigham", "University of California Medical Centers", "Mayo Clinic",
            "AdventHealth", "Northwell Health", "Sutter Health", "Intermountain Healthcare",
            "Corewell Health", "Cleveland Clinic", "Universal Health Services",
            "Baylor Scott & White", "Banner Health", "Community Health Systems",
            "Sentara Health", "Bon Secours Mercy Health", "New York and Presbyterian",
            "SSM Health", "Penn Medicine", "Jefferson Health", "Northwestern Medicine",
            "IU Health", "NYU Langone", "RWJ Barnabas Health", "Mercy Health",
            "Christus Health", "Novant Health", "Memorial Hermann", "Johns Hopkins",
            "Beth Israel Lahey", "Stanford Health Care", "Hackensack Meridian Health",
            "Henry Ford Health", "MedStar Health", "Geisinger", "Montefiore Health",
            "UCHealth (Colorado)", "Cedars-Sinai", "Memorial Sloan Kettering",
            "Fairview Health Services", "Piedmont Healthcare", "Sanford Health",
            "Vanderbilt University Medical Ctr", "U-M Health / Sparrow Health",
            "BJC HealthCare", "Ochsner Health", "Yale New Haven", "UT Houston MD Anderson",
            "Orlando Health", "Prisma Health", "UNC Health", "OhioHealth",
            "Texas Health Resources", "Duke University Health", "Inova Health",
            "Presbyterian Healthcare", "Endeavor Health", "BayCare Health System",
            "Emory Healthcare", "Ohio State University Wexner", "Allina Health",
            "University of Maryland Medical System", "Sharp HealthCare", "Allegheny Health",
            "UnityPoint Health", "Scripps Health", "Lehigh Valley Health Network",
            "OSF HealthCare", "UAB Medicine", "Penn State Health", "Atlantic Health System",
            "Froedtert Health", "Norton Healthcare", "Medical University of South Carolina",
            "Mount Sinai", "St. Luke's Health Network", "RUSH University Medical Center",
            "ProMedica", "Dana-Farber Cancer Institute", "HonorHealth", "Marshfield Health Clinic",
            "ChristianaCare", "Cone Health", "Essentia Health", "Parkview Health",
            "Tampa General Hospital", "Tufts Medicine", "OU Health", "Ballad Health",
            "Methodist Health System", "UC Health (Cincinnati)", "Premier Health",
            "Penn Highlands Healthcare", "Main Line Health", "Baptist Health",
            "Miami Public Health Trust", "Aspirus Health", "Tower Health",
            "Keck Medical Center of USC", "Summa Health", "Bellin Gundersen Health",
            "El Camino Health", "ThedaCare", "AtlantiCare", "Adventist Health"
        ]
        
        for system in hospital_systems:
            cursor.execute("INSERT INTO healthcare_systems (name) VALUES (?)", (system,))
    
    # Update the users table to reference healthcare_systems
    cursor.execute("PRAGMA table_info(users)")
    columns = cursor.fetchall()
    column_names = [column[1] for column in columns]
    
    # If hospital_system_id doesn't exist, add it
    if 'hospital_system_id' not in column_names:
        cursor.execute('ALTER TABLE users ADD COLUMN hospital_system_id INTEGER')
        cursor.execute('CREATE INDEX idx_users_hospital_system_id ON users(hospital_system_id)')
        
        # Update existing users to link to their healthcare system
        cursor.execute('''
        UPDATE users SET hospital_system_id = (
            SELECT id FROM healthcare_systems 
            WHERE name = users.hospital_system
        )
        ''')
    
    conn.commit()
    cursor.close()
    print("Connected to the SQLite database")

# Call init_db at startup
init_db()

# Dictionary to track processing status
processing_status: Dict[str, bool] = {}

# Background task to process PDF
def process_pdf_background(pdf_path: str, hospital_system: str):
    """Process a PDF in the background and generate HTML"""
    # Extract the original filename from the path
    original_filename = os.path.basename(pdf_path)
    
    try:
        print(f"Starting background processing for {original_filename}")
        
        # Import the pdf_utils module
        import pdf_utils
        
        # Generate the field mapping string
        print(f"Generating field mapping string for {pdf_path}")
        field_mapping_string = pdf_utils.generate_field_mapping_string(pdf_path)
        print(f"Field mapping string generated:\n{field_mapping_string}")
        
        # Import chain1 function to ensure it's available
        print("Importing chain1 function...")
        try:
            from chains.chain1 import chain1 as process_chain
            print("Successfully imported chain1 function")
        except ImportError as e:
            print(f"ERROR importing chain1: {str(e)}")
            processing_status[original_filename] = True
            return
        
        # Process the PDF with chain1
        print(f"Calling chain1 function with pdf_path={pdf_path}, field_mapping_string={field_mapping_string}, hospital_system={hospital_system}")
        result = process_chain(pdf_path, field_mapping_string, hospital_system)
        # Update processing status
        processing_status[original_filename] = True
        
        print(f"Background processing completed for {original_filename}, result: {result}")
        print(f"===== FINISHED BACKGROUND PROCESSING =====")
    except Exception as e:
        print(f"===== ERROR IN BACKGROUND PROCESSING =====")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        print(f"===== END ERROR REPORT =====")
        # Mark as completed even on error to prevent endless waiting
        processing_status[original_filename] = True

# Function to check if a PDF is fillable
def is_pdf_fillable(file_path):
    try:
        with open(file_path, 'rb') as f:
            pdf = PyPDF2.PdfReader(f)
            # Check if the PDF has form fields
            fields = pdf.get_fields()
            # Return True if fields is not None and not empty
            return fields is not None and len(fields) > 0
    except Exception as e:
        print(f"Error checking if PDF is fillable: {e}")
        return False

# Function to get the next upload number for a user
def get_next_upload_number(db, user_id):
    cursor = db.cursor()
    cursor.execute(
        "SELECT COUNT(*) FROM uploaded_pdfs WHERE user_id = ?",
        (user_id,)
    )
    count = cursor.fetchone()[0]
    return count + 1

# Pydantic models
class UserSignup(BaseModel):
    name: str
    email: str
    healthcareTitle: str
    hospitalSystem: str

class UserLogin(BaseModel):
    email: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    healthcareTitle: str
    hospitalSystem: str

# Routes
@app.post("/api/signup")
def signup(user: UserSignup, db: sqlite3.Connection = Depends(get_db)):
    if not all([user.name, user.email, user.healthcareTitle, user.hospitalSystem]):
        raise HTTPException(status_code=400, detail="All fields are required")
    
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (name, email, healthcare_title, hospital_system) VALUES (?, ?, ?, ?)",
            (user.name, user.email, user.healthcareTitle, user.hospitalSystem)
        )
        db.commit()
        user_id = cursor.lastrowid
        return {"message": "User registered successfully", "userId": user_id}
    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=409, detail="Email already registered")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/login")
def login(user: UserLogin, db: sqlite3.Connection = Depends(get_db)):
    if not user.email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, name, email, healthcare_title, hospital_system FROM users WHERE email = ?",
        (user.email,)
    )
    
    db_user = cursor.fetchone()
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return {
        "message": "Login successful",
        "user": {
            "id": db_user[0],
            "name": db_user[1],
            "email": db_user[2],
            "healthcareTitle": db_user[3],
            "hospitalSystem": db_user[4]
        }
    }

@app.put("/api/users/{user_id}")
def update_user(
    user_id: int, 
    user_data: UserSignup, 
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()
    
    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        cursor.execute(
            """
            UPDATE users 
            SET name = ?, email = ?, healthcare_title = ?, hospital_system = ? 
            WHERE id = ?
            """,
            (
                user_data.name, 
                user_data.email, 
                user_data.healthcareTitle, 
                user_data.hospitalSystem, 
                user_id
            )
        )
        db.commit()
        
        # Get updated user data
        cursor.execute(
            "SELECT id, name, email, healthcare_title, hospital_system FROM users WHERE id = ?",
            (user_id,)
        )
        updated_user = cursor.fetchone()
        
        return {
            "message": "User updated successfully",
            "user": {
                "id": updated_user[0],
                "name": updated_user[1],
                "email": updated_user[2],
                "healthcareTitle": updated_user[3],
                "hospitalSystem": updated_user[4]
            }
        }
    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=409, detail="Email already registered")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to upload a PDF
@app.post("/api/upload-pdf")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: int = Form(...),
):
    try:
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Verify the user exists and get full name and hospital system
        cursor.execute("SELECT name, hospital_system FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        hospital_system = user['hospital_system']
        
        # Get patient name if patient_id is provided
        patient_name = None
        
        # Use the original filename without modification
        original_filename = file.filename
        
        # Create the uploads directory if it doesn't exist
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        
        # Write the file to disk with the original filename
        file_path = os.path.join(UPLOADS_DIR, original_filename)
        
        # If the file already exists, remove it first
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Removed existing file: {file_path}")
        
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Check if this PDF already exists in the universal_pdfs table
        cursor.execute(
            "SELECT id, html_filename, hospital_system FROM universal_pdfs WHERE original_filename = ?",
            (original_filename,)
        )
        existing_pdf = cursor.fetchone()
        
        # If the template already exists, delete the old HTML file and database record
        if existing_pdf:
            # Delete the old HTML file if it exists
            if existing_pdf['html_filename']:
                # Try to delete from the hospital system directory first
                if existing_pdf['hospital_system']:
                    safe_hospital_system = re.sub(r'[^\w\s-]', '', existing_pdf['hospital_system']).strip().replace(' ', '_')
                    hospital_html_path = os.path.join(HTML_OUTPUT_DIR, safe_hospital_system, existing_pdf['html_filename'])
                    if os.path.exists(hospital_html_path):
                        os.remove(hospital_html_path)
                        print(f"Deleted old HTML file from hospital system directory: {hospital_html_path}")
                
                # Also check the root directory
                root_html_path = os.path.join(HTML_OUTPUT_DIR, existing_pdf['html_filename'])
                if os.path.exists(root_html_path):
                    os.remove(root_html_path)
                    print(f"Deleted old HTML file from root directory: {root_html_path}")
            
            # Delete the old record from the universal_pdfs table
            cursor.execute("DELETE FROM universal_pdfs WHERE id = ?", (existing_pdf['id'],))
            print(f"Deleted old template record for: {original_filename}")
        
        has_html = False
        
        # Insert the PDF into the database with the original filename as both original_filename and filename
        cursor.execute(
            """
            INSERT INTO pdfs (user_id, original_filename, filename, upload_date)
            VALUES (?, ?, ?, datetime('now'))
            """,
            (user_id, original_filename, original_filename)
        )
        
        pdf_id = cursor.lastrowid
        conn.commit()
        
        # Start processing in the background
        processing_started = False
        html_generated = False
        
        try:
            # Get the full path to the uploaded PDF
            pdf_path = os.path.join(UPLOADS_DIR, original_filename)
            
            # Make sure the file exists
            if not os.path.exists(pdf_path):
                raise Exception(f"PDF file not found at {pdf_path}")
            
            # Initialize processing status
            processing_status[original_filename] = False
            
            # Start processing in the background
            background_tasks.add_task(process_pdf_background, pdf_path, hospital_system)
            
            processing_started = True
            print(f"Started background processing for {original_filename}")
        except Exception as e:
            print(f"Error starting background processing: {str(e)}")
            # Even if there's an error, we'll still return success for the upload
        
        # Return success response
        return {
            "success": True,
            "pdf": {
                "id": pdf_id,
                "userId": user_id,
                "originalFilename": original_filename,
                "filename": original_filename,
                "uploadDate": datetime.now().isoformat(),
                "patientName": patient_name,
                "processingStarted": processing_started,
                "htmlGenerated": html_generated,
                "hasHtmlContent": False,  # Set to False since we're creating a new template
                "hasHtmlFilename": False  # Set to False since we're creating a new template
            }
        }
    except Exception as e:
        print(f"Error uploading PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")

# Endpoint to get all uploaded PDFs for a user with patient information
@app.get("/api/user/{user_id}/pdfs")
def get_user_pdfs(user_id: int):
    try:
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Modified query to include patient information using LEFT JOIN
        cursor.execute(
            """
            SELECT p.id, p.filename, p.original_filename, p.upload_date, 
                   pat.id as patient_id, pat.name as patient_name
            FROM uploaded_pdfs p
            LEFT JOIN patients pat ON p.patient_id = pat.id
            WHERE p.user_id = ?
            ORDER BY p.upload_date DESC
            """,
            (user_id,)
        )
        
        pdfs = []
        for row in cursor.fetchall():
            pdf_data = {
                "id": row[0],
                "filename": row[1],
                "originalFilename": row[2],
                "uploadDate": row[3],
                "url": f"/uploads/{row[1]}"
            }
            
            # Add patient information if available
            if row[4]:  # If patient_id is not None
                pdf_data["patientId"] = row[4]
                pdf_data["patientName"] = row[5]
            
            pdfs.append(pdf_data)
        
        conn.close()
        return {"pdfs": pdfs}
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error fetching user PDFs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch PDFs: {str(e)}")

# Endpoint to delete a PDF
@app.delete("/api/pdfs/{pdf_id}")
def delete_pdf(pdf_id: int):
    try:
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get the PDF information before deleting
        cursor.execute(
            """
            SELECT filename, user_id
            FROM uploaded_pdfs
            WHERE id = ?
            """,
            (pdf_id,)
        )
        
        pdf_info = cursor.fetchone()
        if not pdf_info:
            conn.close()
            raise HTTPException(status_code=404, detail="PDF not found")
        
        # Get the file path
        file_path = os.path.join(UPLOADS_DIR, pdf_info['filename'])
        
        # Delete the file if it exists
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Deleted file: {file_path}")
        
        # Delete the database record
        cursor.execute(
            """
            DELETE FROM uploaded_pdfs
            WHERE id = ?
            """,
            (pdf_id,)
        )
        conn.commit()
        
        conn.close()
        return {"message": "PDF deleted successfully"}
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error deleting PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete PDF: {str(e)}")

# Get patients for a user
@app.get("/api/user/{user_id}/patients")
def get_user_patients(user_id: int):
    try:
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(
            """
            SELECT id, name, email, date_of_birth, gender, age, 
                   conditions, medications, created_at 
            FROM patients WHERE user_id = ?
            """, 
            (user_id,)
        )
        
        patients = []
        for row in cursor.fetchall():
            patients.append({
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "dateOfBirth": row[3],
                "gender": row[4],
                "age": row[5],
                "conditions": row[6],
                "medications": row[7],
                "createdAt": row[8]
            })
        
        conn.close()
        return {"patients": patients}
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error fetching patients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch patients: {str(e)}")

# Add a new patient
@app.post("/api/patients")
async def add_patient(request: Request):
    try:
        # Get request body
        data = await request.json()
        user_id = data.get('user_id')
        name = data.get('name')
        
        if not user_id or not name:
            raise HTTPException(status_code=400, detail="User ID and name are required")
        
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO patients (name, user_id) VALUES (?, ?)",
            (name, user_id)
        )
        conn.commit()
        
        patient_id = cursor.lastrowid
        
        conn.close()
        
        return {
            "patient": {
                "id": patient_id,
                "name": name
            }
        }
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error adding patient: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add patient: {str(e)}")

# Assign a patient to a PDF
@app.post("/api/pdfs/{pdf_id}/patient")
async def assign_patient_to_pdf(pdf_id: int, request: Request):
    try:
        # Get request body
        data = await request.json()
        patient_id = data.get('patient_id')
        
        if not patient_id:
            raise HTTPException(status_code=400, detail="Patient ID is required")
        
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get the patient name
        cursor.execute(
            "SELECT name FROM patients WHERE id = ?",
            (patient_id,)
        )
        patient = cursor.fetchone()
        
        if not patient:
            conn.close()
            raise HTTPException(status_code=404, detail="Patient not found")
        
        patient_name = patient[0].replace(' ', '_')
        
        # Get the current PDF filename
        cursor.execute(
            "SELECT filename, user_id FROM uploaded_pdfs WHERE id = ?",
            (pdf_id,)
        )
        pdf_info = cursor.fetchone()
        
        if not pdf_info:
            conn.close()
            raise HTTPException(status_code=404, detail="PDF not found")
        
        current_filename = pdf_info[0]
        user_id = pdf_info[1]
        
        # Get the doctor's name
        cursor.execute(
            "SELECT name FROM users WHERE id = ?",
            (user_id,)
        )
        doctor = cursor.fetchone()
        doctor_name = doctor[0].replace(' ', '_')
        
        # Extract the upload number from the current filename
        match = re.search(r'custom_upload(\d+)_', current_filename)
        if not match:
            # If the filename doesn't match the expected pattern, just update the patient ID
            cursor.execute(
                "UPDATE uploaded_pdfs SET patient_id = ? WHERE id = ?",
                (patient_id, pdf_id)
            )
            conn.commit()
            conn.close()
            return {"success": True}
        
        upload_number = match.group(1)
        
        # Create the new filename with patient name
        new_filename = f"custom_upload{upload_number}_{doctor_name}_{patient_name}.pdf"
        
        # Rename the file
        old_path = os.path.join(UPLOADS_DIR, current_filename)
        new_path = os.path.join(UPLOADS_DIR, new_filename)
        
        if os.path.exists(old_path):
            os.rename(old_path, new_path)
            print(f"Renamed file from {old_path} to {new_path}")
        
        # Update the database with the new filename and patient ID
        cursor.execute(
            "UPDATE uploaded_pdfs SET filename = ?, patient_id = ? WHERE id = ?",
            (new_filename, patient_id, pdf_id)
        )
        conn.commit()
        
        conn.close()
        
        return {"success": True, "newFilename": new_filename}
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error assigning patient to PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to assign patient: {str(e)}")

# Delete a patient
@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: int):
    try:
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # First, get the patient name for the response message
        cursor.execute("SELECT name FROM patients WHERE id = ?", (patient_id,))
        patient = cursor.fetchone()
        
        if not patient:
            conn.close()
            raise HTTPException(status_code=404, detail="Patient not found")
        
        patient_name = patient['name']
        
        # Get all PDFs associated with this patient
        cursor.execute("SELECT id, filename FROM uploaded_pdfs WHERE patient_id = ?", (patient_id,))
        associated_pdfs = cursor.fetchall()
        
        # Delete the patient's PDFs from the filesystem
        for pdf in associated_pdfs:
            pdf_path = os.path.join(UPLOADS_DIR, pdf['filename'])
            try:
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
                    print(f"Deleted PDF file: {pdf_path}")
            except Exception as e:
                print(f"Error deleting PDF file {pdf_path}: {str(e)}")
        
        # Delete the patient's PDFs from the database
        cursor.execute("DELETE FROM uploaded_pdfs WHERE patient_id = ?", (patient_id,))
        deleted_pdfs_count = cursor.rowcount
        print(f"Deleted {deleted_pdfs_count} PDFs associated with patient {patient_id}")
        
        # Now delete the patient
        cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        
        affected_rows = cursor.rowcount
        print(f"Deleted patient {patient_id}, affected rows: {affected_rows}")
        
        # Commit the changes and close the connection
        conn.commit()
        conn.close()
        
        return {
            "success": True, 
            "message": f"Patient '{patient_name}' deleted successfully",
            "deletedPdfsCount": deleted_pdfs_count
        }
    except Exception as e:
        # Detailed error logging
        import traceback
        error_details = traceback.format_exc()
        print(f"Error deleting patient: {str(e)}")
        print(f"Error details: {error_details}")
        
        if 'conn' in locals():
            conn.close()
        
        raise HTTPException(status_code=500, detail=f"Failed to delete patient: {str(e)}")

# Update the create_patient endpoint to handle the new fields
@app.post("/api/user/{user_id}/patients")
async def create_patient(user_id: int, request: Request):
    try:
        # Get request body
        data = await request.json()
        
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Verify the user exists
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        # Insert the new patient
        cursor.execute(
            """
            INSERT INTO patients (name, user_id, email, date_of_birth, gender, age, conditions, medications)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.get('name', ''),
                user_id,
                data.get('email', ''),
                data.get('date_of_birth', ''),
                data.get('gender', ''),
                data.get('age', ''),
                data.get('conditions', ''),
                data.get('medications', '')
            )
        )
        conn.commit()
        
        # Get the ID of the newly inserted patient
        patient_id = cursor.lastrowid
        
        # Get the patient information
        cursor.execute(
            """
            SELECT id, name, user_id, email, date_of_birth, gender, age, conditions, medications, created_at
            FROM patients
            WHERE id = ?
            """,
            (patient_id,)
        )
        
        patient = cursor.fetchone()
        conn.close()
        
        # Return the patient data
        return {
            "success": True,
            "patient": {
                "id": patient[0],
                "name": patient[1],
                "userId": patient[2],
                "email": patient[3],
                "dateOfBirth": patient[4],
                "gender": patient[5],
                "age": patient[6],
                "conditions": patient[7],
                "medications": patient[8],
                "createdAt": patient[9]
            }
        }
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error creating patient: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create patient: {str(e)}")

# Fix the associate_pdf_with_patient endpoint to handle SQLite thread issues
@app.post("/api/pdfs/{pdf_id}/patient")
async def associate_pdf_with_patient(pdf_id: int, request: Request):
    try:
        # Get request body
        data = await request.json()
        
        # Validate required fields
        if 'patient_id' not in data:
            raise HTTPException(status_code=400, detail="Missing required field: patient_id")
        
        patient_id = data['patient_id']
        
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Update the PDF to associate it with the patient
        cursor.execute(
            "UPDATE uploaded_pdfs SET patient_id = ? WHERE id = ?",
            (patient_id, pdf_id)
        )
        conn.commit()
        
        # Check if the update was successful
        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="PDF not found")
        
        conn.close()
        return {"success": True}
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error associating PDF with patient: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to associate PDF with patient: {str(e)}")

# Get all healthcare systems
@app.get("/api/healthcare-systems")
def get_healthcare_systems():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT id, name FROM healthcare_systems ORDER BY name
        ''')
        
        systems = []
        for row in cursor.fetchall():
            # Get count of users in this system
            cursor.execute('''
            SELECT COUNT(*) as user_count FROM users WHERE hospital_system_id = ?
            ''', (row['id'],))
            user_count = cursor.fetchone()['user_count']
            
            # Get count of templates for this system
            cursor.execute('''
            SELECT COUNT(*) as template_count FROM healthcare_templates WHERE healthcare_system_id = ?
            ''', (row['id'],))
            template_count = cursor.fetchone()['template_count']
            
            systems.append({
                "id": row['id'],
                "name": row['name'],
                "userCount": user_count,
                "templateCount": template_count
            })
        
        conn.close()
        return {"healthcareSystems": systems}
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error fetching healthcare systems: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch healthcare systems: {str(e)}")

# Get users for a specific healthcare system
@app.get("/api/healthcare-systems/{system_id}/users")
def get_healthcare_system_users(system_id: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT id, name, email, healthcare_title, created_at 
        FROM users 
        WHERE hospital_system_id = ?
        ORDER BY name
        ''', (system_id,))
        
        users = []
        for row in cursor.fetchall():
            users.append({
                "id": row['id'],
                "name": row['name'],
                "email": row['email'],
                "healthcareTitle": row['healthcare_title'],
                "createdAt": row['created_at']
            })
        
        conn.close()
        return {"users": users}
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error fetching healthcare system users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch healthcare system users: {str(e)}")

# Get templates for a specific healthcare system
@app.get("/api/healthcare-systems/{system_id}/templates")
def get_healthcare_system_templates(system_id: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT id, template_name, created_at, updated_at 
        FROM healthcare_templates 
        WHERE healthcare_system_id = ?
        ORDER BY template_name
        ''', (system_id,))
        
        templates = []
        for row in cursor.fetchall():
            templates.append({
                "id": row['id'],
                "name": row['template_name'],
                "createdAt": row['created_at'],
                "updatedAt": row['updated_at']
            })
        
        conn.close()
        return {"templates": templates}
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error fetching healthcare system templates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch healthcare system templates: {str(e)}")

# Get a specific template
@app.get("/api/healthcare-templates/{template_id}")
def get_healthcare_template(template_id: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT id, healthcare_system_id, template_name, template_content, created_at, updated_at 
        FROM healthcare_templates 
        WHERE id = ?
        ''', (template_id,))
        
        template = cursor.fetchone()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Get the healthcare system name
        cursor.execute('''
        SELECT name FROM healthcare_systems WHERE id = ?
        ''', (template['healthcare_system_id'],))
        
        system = cursor.fetchone()
        
        conn.close()
        
        return {
            "template": {
                "id": template['id'],
                "name": template['template_name'],
                "content": template['template_content'],
                "healthcareSystemId": template['healthcare_system_id'],
                "healthcareSystemName": system['name'],
                "createdAt": template['created_at'],
                "updatedAt": template['updated_at']
            }
        }
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error fetching healthcare template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch healthcare template: {str(e)}")

# Create a new template
@app.post("/api/healthcare-systems/{system_id}/templates")
async def create_healthcare_template(system_id: int, request: Request):
    try:
        data = await request.json()
        
        if 'name' not in data or 'content' not in data:
            raise HTTPException(status_code=400, detail="Missing required fields: name and content")
        
        template_name = data['name']
        template_content = data['content']
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if the healthcare system exists
        cursor.execute("SELECT id FROM healthcare_systems WHERE id = ?", (system_id,))
        system = cursor.fetchone()
        
        if not system:
            conn.close()
            raise HTTPException(status_code=404, detail="Healthcare system not found")
        
        # Check if a template with this name already exists for this system
        cursor.execute(
            "SELECT id FROM healthcare_templates WHERE healthcare_system_id = ? AND template_name = ?", 
            (system_id, template_name)
        )
        existing = cursor.fetchone()
        
        if existing:
            conn.close()
            raise HTTPException(status_code=400, detail="A template with this name already exists for this healthcare system")
        
        # Create the new template
        cursor.execute(
            '''
            INSERT INTO healthcare_templates 
            (healthcare_system_id, template_name, template_content) 
            VALUES (?, ?, ?)
            ''',
            (system_id, template_name, template_content)
        )
        
        conn.commit()
        
        # Get the newly created template
        template_id = cursor.lastrowid
        cursor.execute(
            "SELECT id, template_name, created_at, updated_at FROM healthcare_templates WHERE id = ?", 
            (template_id,)
        )
        
        template = cursor.fetchone()
        conn.close()
        
        return {
            "success": True,
            "template": {
                "id": template['id'],
                "name": template['template_name'],
                "createdAt": template['created_at'],
                "updatedAt": template['updated_at']
            }
        }
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error creating healthcare template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create healthcare template: {str(e)}")

# Get files for a specific patient
@app.get("/api/patient/{patient_id}/files")
def get_patient_files(patient_id: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # First check if the patient exists
        cursor.execute("SELECT name FROM patients WHERE id = ?", (patient_id,))
        patient = cursor.fetchone()
        
        if not patient:
            conn.close()
            raise HTTPException(status_code=404, detail="Patient not found")
        
        patient_name = patient['name']
        
        # Get all PDFs associated with this patient
        cursor.execute("""
            SELECT id, filename, original_filename 
            FROM uploaded_pdfs 
            WHERE patient_id = ?
        """, (patient_id,))
        
        files = []
        for row in cursor.fetchall():
            files.append({
                "id": row['id'],
                "name": row['original_filename'],
                "filename": row['filename'],
                "url": f"/uploads/{row['filename']}"
            })
        
        # If no files found with patient_id, try to find by filename pattern
        if not files:
            cursor.execute("SELECT id, filename, original_filename FROM uploaded_pdfs")
            all_pdfs = cursor.fetchall()
            
            # Extract first and last name for matching
            name_parts = patient_name.split()
            if len(name_parts) > 0:
                for row in all_pdfs:
                    # Check if filename contains patient name
                    if any(part.lower() in row['filename'].lower() for part in name_parts):
                        files.append({
                            "id": row['id'],
                            "name": row['original_filename'],
                            "filename": row['filename'],
                            "url": f"/uploads/{row['filename']}"
                        })
        
        conn.close()
        return {"files": files}
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error fetching patient files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch patient files: {str(e)}")

# Add or update HTML content for a universal PDF
@app.post("/api/universal-pdfs")
async def add_universal_pdf(request: Request):
    try:
        data = await request.json()
        
        if 'original_filename' not in data or 'html_content' not in data:
            raise HTTPException(status_code=400, detail="Missing required fields: original_filename and html_content")
        
        original_filename = data['original_filename']
        html_content = data['html_content']
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if this PDF already exists in the universal_pdfs table
        cursor.execute(
            "SELECT id FROM universal_pdfs WHERE original_filename = ?", 
            (original_filename,)
        )
        existing = cursor.fetchone()
        
        if existing:
            # Update existing record
            cursor.execute(
                '''
                UPDATE universal_pdfs 
                SET html_content = ?, updated_at = CURRENT_TIMESTAMP
                WHERE original_filename = ?
                ''',
                (html_content, original_filename)
            )
            pdf_id = existing['id']
        else:
            # Insert new record
            cursor.execute(
                '''
                INSERT INTO universal_pdfs 
                (original_filename, html_content) 
                VALUES (?, ?)
                ''',
                (original_filename, html_content)
            )
            pdf_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "message": "Universal PDF saved successfully",
            "id": pdf_id
        }
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error saving universal PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save universal PDF: {str(e)}")

# Get HTML content for a universal PDF by original filename
@app.get("/api/universal-pdfs/{original_filename}")
def get_universal_pdf(original_filename: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id, original_filename, html_content, created_at, updated_at FROM universal_pdfs WHERE original_filename = ?",
            (original_filename,)
        )
        
        pdf = cursor.fetchone()
        conn.close()
        
        if not pdf:
            raise HTTPException(status_code=404, detail="Universal PDF not found")
        
        return {
            "id": pdf['id'],
            "original_filename": pdf['original_filename'],
            "html_content": pdf['html_content'],
            "created_at": pdf['created_at'],
            "updated_at": pdf['updated_at']
        }
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error fetching universal PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch universal PDF: {str(e)}")

# Get all universal PDFs
@app.get("/api/universal-pdfs")
def get_all_universal_pdfs():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id, original_filename, created_at, updated_at FROM universal_pdfs ORDER BY created_at DESC"
        )
        
        pdfs = []
        for row in cursor.fetchall():
            pdfs.append({
                "id": row['id'],
                "original_filename": row['original_filename'],
                "created_at": row['created_at'],
                "updated_at": row['updated_at']
            })
        
        conn.close()
        return {"pdfs": pdfs}
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"Error fetching universal PDFs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch universal PDFs: {str(e)}")

# Endpoint to check if HTML has been generated for a PDF
@app.get("/api/check-html/{original_filename}")
def check_html_readiness(original_filename: str, user_id: int):
    try:
        # Check if the file is still being processed
        if original_filename in processing_status:
            # If processing is complete
            if processing_status[original_filename]:
                # Remove from tracking dict to free memory
                del processing_status[original_filename]
                
                # Check if HTML was actually generated
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute(
                    "SELECT html_filename FROM universal_pdfs WHERE original_filename = ?",
                    (original_filename,)
                )
                
                result = cursor.fetchone()
                conn.close()
                
                if result and result['html_filename']:
                    return {"htmlGenerated": True, "htmlFilename": result['html_filename']}
                else:
                    return {"htmlGenerated": False, "error": "HTML generation failed"}
            else:
                # Still processing
                return {"htmlGenerated": False, "processing": True}
        else:
            # Check if it's already in the database
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT html_filename FROM universal_pdfs WHERE original_filename = ?",
                (original_filename,)
            )
            
            result = cursor.fetchone()
            conn.close()
            
            if result and result['html_filename']:
                return {"htmlGenerated": True, "htmlFilename": result['html_filename']}
            else:
                return {"htmlGenerated": False, "error": "Not found or processing not started"}
    except Exception as e:
        print(f"Error checking HTML readiness: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check HTML readiness: {str(e)}")

# Add this function to server.py
def ensure_db_schema():
    """Ensure the database schema is up to date with all required columns"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create users table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        healthcare_title TEXT,
        hospital_system TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create pdfs table if it doesn't exist
    # Note: We're keeping patient_id for backward compatibility, but it will be NULL for new uploads
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS pdfs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        patient_id INTEGER,
        original_filename TEXT NOT NULL,
        filename TEXT NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (patient_id) REFERENCES patients (id)
    )
    ''')
    
    # Create patients table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        email TEXT,
        date_of_birth TEXT,
        gender TEXT,
        age TEXT,
        conditions TEXT,
        medications TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Create universal_pdfs table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS universal_pdfs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_filename TEXT UNIQUE NOT NULL,
        html_content TEXT,
        html_filename TEXT,
        hospital_system TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create filled_forms table to track completed forms assigned to patients
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS filled_forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        pdf_id INTEGER NOT NULL,
        filled_data TEXT,
        filled_filename TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (pdf_id) REFERENCES pdfs (id)
    )
    ''')
    
    conn.commit()
    conn.close()

# Call this function during server startup
ensure_db_schema()

# Run the server with uvicorn


@app.get("/api/debug/html-content/{original_filename}")
def debug_html_content(original_filename: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT html_content, html_filename FROM universal_pdfs WHERE original_filename = ?",
            (original_filename,)
        )
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return {"error": "No record found", "filename": original_filename}
        
        html_content = result['html_content']
        html_filename = result['html_filename']
        
        # Check if the HTML file exists
        html_path = os.path.join(HTML_OUTPUT_DIR, html_filename)
        file_exists = os.path.exists(html_path)
        
        return {
            "filename": original_filename,
            "html_filename": html_filename,
            "has_html_content": html_content is not None,
            "html_content_length": len(html_content) if html_content else 0,
            "file_exists": file_exists,
            "file_path": html_path
        }
    except Exception as e:
        return {"error": str(e), "filename": original_filename}

# Add a CORS middleware specifically for the HTML outputs
@app.middleware("http")
async def add_cors_headers_for_html(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/html_outputs"):
        response.headers["Access-Control-Allow-Origin"] = "*"
    return response

@app.get("/api/html-content/{original_filename}")
def get_html_content(original_filename: str, user_id: int):
    try:
        # Get the user's hospital system
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT hospital_system FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        hospital_system = user['hospital_system']
        
        # Get the HTML filename from the database
        cursor.execute(
            "SELECT html_filename, hospital_system FROM universal_pdfs WHERE original_filename = ?",
            (original_filename,)
        )
        
        pdf = cursor.fetchone()
        conn.close()
        
        if not pdf:
            raise HTTPException(status_code=404, detail=f"HTML record not found for: {original_filename}")
        
        # Check if the hospital system matches
        if pdf['hospital_system'] != hospital_system:
            raise HTTPException(status_code=403, detail="You don't have permission to access this template")
        
        # Construct the full path to the HTML file
        html_path = os.path.join(HTML_OUTPUT_DIR, pdf['html_filename'])
        
        # Check if the HTML file exists
        if not os.path.exists(html_path):
            raise HTTPException(status_code=404, detail=f"HTML file not found: {pdf['html_filename']}")
        
        # Read the HTML file
        with open(html_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        
        # Return the HTML content with the correct content type
        return Response(content=html_content, media_type="text/html")
    except Exception as e:
        print(f"Error fetching HTML content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch HTML content: {str(e)}")

# Add this function to create all hospital system directories
def create_hospital_system_directories():
    """Create directories for all hospital systems at startup"""
    try:
        # Path to the hospitalSystems.js file
        js_file_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "data", "hospitalSystems.js")
        
        # If the file doesn't exist, use a hardcoded list
        if not os.path.exists(js_file_path):
            print(f"Hospital systems file not found at {js_file_path}, using hardcoded list")
            hospital_systems = [
                "Kaiser Permanente", "HCA Healthcare", "CommonSpirit", "Advocate Health",
                "Ascension", "Providence", "UPMC", "Trinity Health", "Tenet Healthcare",
                "Mass General Brigham", "University of California Medical Centers", "Mayo Clinic",
                # Add more from the list as needed
            ]
        else:
            # Read the JavaScript file
            with open(js_file_path, 'r') as f:
                js_content = f.read()
            
            # Extract the array content using a simple regex
            import re
            match = re.search(r'\[\s*"([^"]*)"(?:\s*,\s*"([^"]*)")*\s*\]', js_content, re.DOTALL)
            if match:
                # Extract all the hospital systems from the regex match
                hospital_systems_text = match.group(0)
                # Remove brackets, split by commas, and clean up quotes and whitespace
                hospital_systems = [
                    hs.strip().strip('"').strip("'") 
                    for hs in hospital_systems_text.strip('[]').split(',')
                ]
            else:
                print("Could not parse hospital systems from JS file, using hardcoded list")
                hospital_systems = ["Default Hospital System"]
        
        # Create a directory for each hospital system
        for hospital_system in hospital_systems:
            if hospital_system:  # Skip empty strings
                # Sanitize the hospital system name to be safe for filesystem
                safe_hospital_system = re.sub(r'[^\w\s-]', '', hospital_system).strip().replace(' ', '_')
                hospital_dir = os.path.join(HTML_OUTPUT_DIR, safe_hospital_system)
                os.makedirs(hospital_dir, exist_ok=True)
                print(f"Created directory for hospital system: {hospital_system}")
        
        print(f"Created directories for {len(hospital_systems)} hospital systems")
        return True
    except Exception as e:
        print(f"Error creating hospital system directories: {str(e)}")
        return False

# Call this function during server startup
create_hospital_system_directories()

@app.get("/api/user/{user_id}/templates")
def get_user_templates(user_id: int):
    try:
        print(f"Fetching templates for user ID: {user_id}")
        
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if the user exists
        cursor.execute("SELECT id, name, email, hospital_system FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            print(f"User with ID {user_id} not found")
            conn.close()
            # Return empty templates instead of raising an error
            return {
                "hospitalSystem": "Unknown",
                "templates": [],
                "error": "User not found"
            }
        
        hospital_system = user['hospital_system']
        print(f"User's hospital system: {hospital_system}")
        
        if not hospital_system:
            print(f"User with ID {user_id} has no hospital system")
            conn.close()
            return {
                "hospitalSystem": "None",
                "templates": [],
                "error": "User has no hospital system"
            }
        
        # Sanitize the hospital system name for use as a directory name
        safe_hospital_system = re.sub(r'[^\w\s-]', '', hospital_system).strip().replace(' ', '_')
        print(f"Sanitized hospital system: {safe_hospital_system}")
        
        # Use a dictionary to track templates by normalized filename to avoid duplicates
        templates_dict = {}
        
        # First, get templates that match the user's hospital system
        cursor.execute(
            """
            SELECT id, original_filename, html_filename, created_at, updated_at, hospital_system
            FROM universal_pdfs
            WHERE hospital_system = ? AND html_filename IS NOT NULL
            ORDER BY updated_at DESC
            """,
            (hospital_system,)
        )
        
        hospital_templates = cursor.fetchall()
        print(f"Found {len(hospital_templates)} templates for hospital system: {hospital_system}")
        
        # Process hospital-specific templates first (these take priority)
        for template in hospital_templates:
            original_filename = template['original_filename']
            
            # Normalize the filename to handle versioned files (e.g., file_1.pdf, file_2.pdf)
            # This will treat them as the same base template
            normalized_filename = re.sub(r'_\d+\.pdf$', '.pdf', original_filename.lower())
            
            # Ensure the original filename has a .pdf extension
            if not normalized_filename.lower().endswith('.pdf'):
                normalized_filename = f"{normalized_filename}.pdf"
            
            # Only add if not already in the dictionary
            if normalized_filename not in templates_dict:
                print(f"Adding hospital template: {original_filename}")
                templates_dict[normalized_filename] = {
                    "id": template['id'],
                    "originalFilename": original_filename,
                    "htmlFilename": template['html_filename'],
                    "createdAt": template['created_at'],
                    "updatedAt": template['updated_at'],
                    "hospitalSystem": template['hospital_system']
                }
        
        # Convert dictionary to list
        template_files = list(templates_dict.values())
        
        # Sort templates by updated_at (most recent first)
        template_files.sort(key=lambda x: x["updatedAt"], reverse=True)
        
        print(f"Total templates found: {len(template_files)}")
        return {
            "hospitalSystem": hospital_system,
            "templates": template_files
        }
    except Exception as e:
        print(f"Error fetching templates: {str(e)}")
        # Return empty templates instead of raising an error
        return {
            "hospitalSystem": "Error",
            "templates": [],
            "error": str(e)
        }

@app.get("/api/user/{user_id}/filled-forms")
def get_user_filled_forms(user_id: int):
    try:
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Verify the user exists
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all filled forms for this user
        cursor.execute(
            """
            SELECT f.id, f.user_id, f.patient_id, f.pdf_id, f.filled_data, 
                   f.filled_filename, f.created_at, p.name as patient_name,
                   u.original_filename
            FROM filled_forms f
            LEFT JOIN patients p ON f.patient_id = p.id
            LEFT JOIN uploaded_pdfs u ON f.pdf_id = u.id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
            """,
            (user_id,)
        )
        
        forms = cursor.fetchall()
        conn.close()
        
        # Convert to a list of dictionaries
        filled_forms = [
            {
                "id": form['id'],
                "userId": form['user_id'],
                "patientId": form['patient_id'],
                "pdfId": form['pdf_id'],
                "filledData": form['filled_data'],
                "filledFilename": form['filled_filename'],
                "createdAt": form['created_at'],
                "patientName": form['patient_name'],
                "originalFilename": form['original_filename']
            }
            for form in forms
        ]
        
        return {
            "filledForms": filled_forms
        }
    except Exception as e:
        print(f"Error fetching filled forms: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch filled forms: {str(e)}")

@app.delete("/api/templates/{template_filename}")
def delete_template(template_filename: str, user_id: int):
    try:
        print(f"Deleting template: {template_filename} for user ID: {user_id}")
        
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get the user's hospital system
        cursor.execute("SELECT hospital_system FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        hospital_system = user['hospital_system']
        print(f"User's hospital system: {hospital_system}")
        
        # Get the template to verify it belongs to the user's hospital system
        cursor.execute(
            "SELECT id, html_filename, hospital_system FROM universal_pdfs WHERE original_filename = ?",
            (template_filename,)
        )
        
        template = cursor.fetchone()
        
        if not template:
            print(f"Template not found: {template_filename}")
            conn.close()
            raise HTTPException(status_code=404, detail="Template not found")
        
        print(f"Found template: ID={template['id']}, hospital_system={template['hospital_system']}")
        
        # Verify the template belongs to the user's hospital system or has no hospital system
        if template['hospital_system'] and template['hospital_system'] != hospital_system:
            print(f"Permission denied: Template belongs to {template['hospital_system']}, user is from {hospital_system}")
            conn.close()
            raise HTTPException(status_code=403, detail="You don't have permission to delete this template")
        
        # Delete the HTML file if it exists
        if template['html_filename']:
            # Sanitize the hospital system name for the directory path
            safe_hospital_system = re.sub(r'[^\w\s-]', '', hospital_system).strip().replace(' ', '_')
            
            # Check if the file is in the hospital system subdirectory
            hospital_html_path = os.path.join(HTML_OUTPUT_DIR, safe_hospital_system, template['html_filename'])
            
            # Also check the root HTML directory as a fallback
            root_html_path = os.path.join(HTML_OUTPUT_DIR, template['html_filename'])
            
            # Try to delete from the hospital system directory first
            if os.path.exists(hospital_html_path):
                os.remove(hospital_html_path)
                print(f"Deleted HTML file from hospital system directory: {hospital_html_path}")
            # If not found there, try the root directory
            elif os.path.exists(root_html_path):
                os.remove(root_html_path)
                print(f"Deleted HTML file from root directory: {root_html_path}")
            else:
                print(f"HTML file not found at either location: {hospital_html_path} or {root_html_path}")
        
        # Delete the template from the database
        cursor.execute(
            "DELETE FROM universal_pdfs WHERE id = ?",
            (template['id'],)
        )
        
        print(f"Deleted template from database: ID={template['id']}, original_filename={template_filename}")
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": f"Template '{template_filename}' deleted successfully"}
    except Exception as e:
        print(f"Error deleting template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")
    
@app.get("/api/debug/directory-contents")
def debug_directory_contents():
    """Debug endpoint to list all directories and files in HTML_OUTPUT_DIR"""
    try:
        # Check if HTML_OUTPUT_DIR exists
        if not os.path.exists(HTML_OUTPUT_DIR):
            return {
                "error": f"HTML_OUTPUT_DIR does not exist: {HTML_OUTPUT_DIR}",
                "current_directory": os.getcwd()
            }
        
        # List all directories in HTML_OUTPUT_DIR
        directories = []
        for item in os.listdir(HTML_OUTPUT_DIR):
            item_path = os.path.join(HTML_OUTPUT_DIR, item)
            if os.path.isdir(item_path):
                # List files in this directory
                files = [f for f in os.listdir(item_path) if f.endswith('.html')]
                directories.append({
                    "directory": item,
                    "path": item_path,
                    "files": files,
                    "file_count": len(files)
                })
        
        # Also list files in the root HTML_OUTPUT_DIR
        root_files = [f for f in os.listdir(HTML_OUTPUT_DIR) if os.path.isfile(os.path.join(HTML_OUTPUT_DIR, f)) and f.endswith('.html')]
        
        return {
            "html_output_dir": HTML_OUTPUT_DIR,
            "directories": directories,
            "root_files": root_files,
            "directory_count": len(directories),
            "root_file_count": len(root_files)
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/debug/user-hospital-system/{user_id}")
def debug_user_hospital_system(user_id: int):
    """Debug endpoint to check a user's hospital system"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get the user's hospital system
        cursor.execute("SELECT id, name, email, hospital_system FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return {"error": "User not found", "user_id": user_id}
        
        hospital_system = user['hospital_system']
        
        # Sanitize the hospital system name
        safe_hospital_system = re.sub(r'[^\w\s-]', '', hospital_system).strip().replace(' ', '_')
        
        # Path to the hospital system's HTML directory
        hospital_dir = os.path.join(HTML_OUTPUT_DIR, safe_hospital_system)
        
        # Check if the directory exists
        dir_exists = os.path.exists(hospital_dir)
        
        # List files in the directory if it exists
        files = []
        if dir_exists:
            files = [f for f in os.listdir(hospital_dir) if f.endswith('.html')]
        
        conn.close()
        
        return {
            "user_id": user['id'],
            "user_name": user['name'],
            "user_email": user['email'],
            "hospital_system": hospital_system,
            "safe_hospital_system": safe_hospital_system,
            "hospital_dir": hospital_dir,
            "dir_exists": dir_exists,
            "html_files": files,
            "file_count": len(files)
        }
    except Exception as e:
        return {"error": str(e), "user_id": user_id}

@app.get("/api/test")
def test_endpoint():
    """Simple test endpoint to verify the server is working"""
    return {"status": "ok", "message": "API is working"}

@app.get("/api/debug/database")
def debug_database():
    """Debug endpoint to check the database and tables"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if the users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        users_table_exists = cursor.fetchone() is not None
        
        # Get all users if the table exists
        users = []
        if users_table_exists:
            cursor.execute("SELECT id, name, email, hospital_system FROM users")
            users = [dict(user) for user in cursor.fetchall()]
        
        # Check if the universal_pdfs table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='universal_pdfs'")
        universal_pdfs_table_exists = cursor.fetchone() is not None
        
        # Get all tables in the database
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [table['name'] for table in cursor.fetchall()]
        
        conn.close()
        
        return {
            "database_path": DB_PATH,
            "database_exists": os.path.exists(DB_PATH),
            "tables": tables,
            "users_table_exists": users_table_exists,
            "universal_pdfs_table_exists": universal_pdfs_table_exists,
            "users": users,
            "user_count": len(users)
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/user/{user_id}/templates-test")
def get_user_templates_test(user_id: int):
    """Simple test endpoint to verify the templates API is working"""
    return {
        "status": "ok",
        "message": f"Templates API test for user {user_id} is working",
        "user_id": user_id
    }

@app.get("/")
def root():
    """Root endpoint to verify the server is running"""
    return {
        "status": "ok",
        "message": "Server is running",
        "endpoints": [
            "/api/test",
            "/api/debug/database",
            "/api/debug/directory-contents",
            "/api/user/{user_id}/templates",
            "/api/user/{user_id}/filled-forms"
        ]
    }

# Add this after the other global variables
# Lock for the fill-template endpoint to prevent concurrent calls
fill_template_locks = {}

# Endpoint to fill a form template with patient and doctor data
@app.post("/api/fill-template")
async def fill_template(request: Request):
    try:
        # Parse the request body
        data = await request.json()
        template_filename = data.get("template_filename")
        patient_id = data.get("patient_id")
        user_id = data.get("user_id")
        
        print(f"fill_template - Request data: template_filename={template_filename}, patient_id={patient_id}, user_id={user_id}")
        
        if not template_filename or not patient_id or not user_id:
            raise HTTPException(status_code=400, detail="Missing required fields: template_filename, patient_id, or user_id")
        
        # Create a unique lock key for this template and patient
        lock_key = f"{template_filename}_{patient_id}_{user_id}"
        
        # Check if there's already a lock for this template and patient
        if lock_key in fill_template_locks:
            print(f"fill_template - Another request is already processing this template for this patient. Lock key: {lock_key}")
            raise HTTPException(status_code=409, detail="Another request is already processing this template for this patient. Please wait and try again.")
        
        # Create a lock for this template and patient
        fill_template_locks[lock_key] = threading.Lock()
        
        try:
            # Acquire the lock
            fill_template_locks[lock_key].acquire()
            
            # Connect to the database
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get patient data
            cursor.execute(
                """
                SELECT * FROM patients WHERE id = ?
                """,
                (patient_id,)
            )
            patient_data = cursor.fetchone()
            
            if not patient_data:
                conn.close()
                raise HTTPException(status_code=404, detail=f"Patient with ID {patient_id} not found")
            
            print(f"fill_template - Found patient: {patient_data['name']}")
            
            # Get user (doctor) data
            cursor.execute(
                """
                SELECT * FROM users WHERE id = ?
                """,
                (user_id,)
            )
            user_data = cursor.fetchone()
            
            if not user_data:
                conn.close()
                raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")
            
            print(f"fill_template - Found user: {user_data['name']}")
            
            # Debug: Print the exact query we're about to run
            query = f"""
            SELECT * FROM universal_pdfs WHERE html_filename = '{template_filename}' OR html_filename LIKE '%/{template_filename}'
            """
            print(f"fill_template - Running query: {query}")
            
            # Get template information
            cursor.execute(
                """
                SELECT * FROM universal_pdfs WHERE html_filename = ? OR html_filename LIKE ?
                """,
                (template_filename, f"%/{template_filename}")
            )
            template_data = cursor.fetchone()
            
            # Debug: Check if template was found
            if template_data:
                print(f"fill_template - Found template: {template_data['original_filename']}")
                print(f"fill_template - Template data: {dict(template_data)}")
            else:
                print(f"fill_template - Template not found for filename: {template_filename}")
                
                # Debug: Check if the template exists in the database at all
                cursor.execute("SELECT html_filename FROM universal_pdfs")
                all_templates = cursor.fetchall()
                print(f"fill_template - Available templates in database: {[t['html_filename'] for t in all_templates]}")
                
                conn.close()
                raise HTTPException(status_code=404, detail=f"Template {template_filename} not found")
            
            # Construct the full template path
            hospital_system = user_data["hospital_system"]
            safe_hospital_system = re.sub(r'[^\w\s-]', '', hospital_system).strip().replace(' ', '_')
            
            # Check if the template is in the hospital system directory or root directory
            template_path = os.path.join(HTML_OUTPUT_DIR, safe_hospital_system, template_filename)
            print(f"fill_template - Checking template path: {template_path}")
            
            if not os.path.exists(template_path):
                template_path = os.path.join(HTML_OUTPUT_DIR, template_filename)
                print(f"fill_template - Checking alternative template path: {template_path}")
                
                if not os.path.exists(template_path):
                    # Debug: List files in the directory to see what's available
                    hospital_dir = os.path.join(HTML_OUTPUT_DIR, safe_hospital_system)
                    if os.path.exists(hospital_dir):
                        print(f"fill_template - Files in hospital directory: {os.listdir(hospital_dir)}")
                    print(f"fill_template - Files in HTML_OUTPUT_DIR: {os.listdir(HTML_OUTPUT_DIR)}")
                    
                    conn.close()
                    raise HTTPException(status_code=404, detail=f"Template file not found at {template_path}")
            
            print(f"fill_template - Using template path: {template_path}")
            
            # Prepare context data for chain2
            context_data = {
                "patient": {
                    "name": patient_data["name"],
                    "dob": patient_data["date_of_birth"] if patient_data["date_of_birth"] else "",
                    "address": "",  # Add address field to patients table if needed
                    "ethnicity": "",  # Add ethnicity field to patients table if needed
                    "race": "",  # Add race field to patients table if needed
                    "preferred_language": "",  # Add language field to patients table if needed
                    "email": patient_data["email"] if patient_data["email"] else "",
                    "gender": patient_data["gender"] if patient_data["gender"] else "",
                    "age": patient_data["age"] if patient_data["age"] else "",
                    "conditions": patient_data["conditions"] if patient_data["conditions"] else "",
                    "medications": patient_data["medications"] if patient_data["medications"] else ""
                },
                "doctor": {
                    "name": user_data["name"],
                    "specialty": user_data["healthcare_title"],
                    "license": "",  # Add license field to users table if needed
                    "facility": user_data["hospital_system"]
                },
                "practice": {
                    "name": user_data["hospital_system"],
                    "address": "",  # Add address field to hospital systems if needed
                    "phone": ""  # Add phone field to hospital systems if needed
                },
                "procedure": {
                    "type": "",  # This would come from the form or template
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "codes": []
                }
            }
            
            # Import chain2 function
            try:
                from chains.chain2 import chain2
                print(f"fill_template - Successfully imported chain2 function")
            except ImportError as e:
                print(f"fill_template - Error importing chain2: {str(e)}")
                conn.close()
                raise HTTPException(status_code=500, detail=f"Error importing chain2: {str(e)}")
            
            # Process the template with chain2
            print(f"fill_template - Calling chain2 with template_path: {template_path}")
            success, result = chain2(template_path, context_data)
            
            if not success:
                print(f"fill_template - chain2 processing failed: {result}")
                conn.close()
                raise HTTPException(status_code=500, detail=f"Error processing template: {result}")
            
            print(f"fill_template - chain2 processing succeeded: {result}")
            
            # Close the database connection
            conn.close()
            
            # Return the result
            return result
            
        finally:
            # Release the lock and remove it from the dictionary
            if lock_key in fill_template_locks:
                fill_template_locks[lock_key].release()
                del fill_template_locks[lock_key]
                print(f"fill_template - Released lock for {lock_key}")
            
    except Exception as e:
        print(f"Error filling template: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        
        # Clean up the lock if an exception occurred
        lock_key = f"{data.get('template_filename')}_{data.get('patient_id')}_{data.get('user_id')}" if 'data' in locals() else None
        if lock_key and lock_key in fill_template_locks:
            try:
                fill_template_locks[lock_key].release()
            except:
                pass
            del fill_template_locks[lock_key]
            print(f"fill_template - Released lock for {lock_key} after exception")
            
        raise HTTPException(status_code=500, detail=f"Failed to fill template: {str(e)}")

@app.get("/api/filled-form/{filename}")
def get_filled_form(filename: str, user_id: int):
    """Get the content of a filled HTML form"""
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get user data to determine hospital system
        cursor.execute("SELECT hospital_system FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        hospital_system = user['hospital_system']
        safe_hospital_system = re.sub(r'[^\w\s-]', '', hospital_system).strip().replace(' ', '_')
        
        # Try to find the file in the hospital system directory
        file_path = os.path.join(HTML_OUTPUT_DIR, safe_hospital_system, filename)
        if not os.path.exists(file_path):
            # If not found, try the root directory
            file_path = os.path.join(HTML_OUTPUT_DIR, filename)
            if not os.path.exists(file_path):
                conn.close()
                raise HTTPException(status_code=404, detail=f"Filled form not found: {filename}")
        
        # Read the HTML content
        with open(file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        conn.close()
        
        # Return the HTML content
        return HTMLResponse(content=html_content, status_code=200)
    except Exception as e:
        print(f"Error getting filled form: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get filled form: {str(e)}")

@app.post("/send_form")
async def send_form(request: Request):
    """
    Handle form submissions and generate filled PDFs.
    Only processes the integer key → value mapping from form fields.
    """
    try:
        # Parse the request body - this is the direct mapping of field IDs to values
        form_data = await request.json()
        print(f"Received form submission: {form_data}")
        
        # Use default values for required database fields
        user_id = 1  # Default user
        patient_id = 1  # Default patient
        pdf_id = 1  # Default PDF ID
        
        # Convert form data to JSON string
        form_data_json = json.dumps(form_data)
        
        # Generate a unique filename for the filled form
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filled_filename = f"filled_form_{timestamp}.json"
        
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Insert into filled_forms table with default values for required fields
        cursor.execute(
            """
            INSERT INTO filled_forms (user_id, patient_id, pdf_id, filled_data, filled_filename)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, patient_id, pdf_id, form_data_json, filled_filename)
        )
        
        conn.commit()
        submission_id = cursor.lastrowid
        
        # Generate filled PDF using pdf_utils.py
        try:
            from pdf_utils import fill_pdf
            
            # Use the default sterilization form template
            test_files_dir = os.path.join(BASE_DIR, "test_files")
            pdf_path = os.path.join(test_files_dir, "sterilization_form.pdf")
            
            if os.path.exists(pdf_path):
                # Generate output PDF path
                pdf_output_dir = os.path.join(HTML_OUTPUT_DIR, "filled_pdfs")
                os.makedirs(pdf_output_dir, exist_ok=True)
                
                # Use a predictable filename pattern based on the submission ID
                pdf_filename = f"filled_form_{submission_id}.pdf"
                output_pdf_path = os.path.join(pdf_output_dir, pdf_filename)
                
                # Fill the PDF with the form data - direct integer key to value mapping
                fill_pdf(pdf_path, output_pdf_path, form_data)
                
                # Update the database with the PDF filename
                cursor.execute(
                    "UPDATE filled_forms SET filled_pdf_filename = ? WHERE id = ?",
                    (pdf_filename, submission_id)
                )
                conn.commit()
                print(f"Generated filled PDF: {output_pdf_path}")
                
                # Return the PDF URL in the response
                pdf_url = f"/html_outputs/filled_pdfs/{pdf_filename}"
            else:
                print(f"PDF template not found: {pdf_path}")
                pdf_url = None
        except Exception as e:
            print(f"Error generating filled PDF: {str(e)}")
            traceback.print_exc()
            pdf_url = None
        
        conn.close()
        
        # Return success response with the submission_id and PDF URL
        return {
            "success": True,
            "message": "Form submitted successfully",
            "submission_id": submission_id,
            "pdf_url": pdf_url
        }
        
    except Exception as e:
        print(f"Error processing form submission: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process form submission: {str(e)}")

@app.get("/api/user/{user_id}/filled-forms-json")
def get_user_filled_forms_json(user_id: int):
    """Get all filled forms for a user with JSON data"""
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all filled forms for the user
        cursor.execute(
            """
            SELECT ff.*, p.name as patient_name
            FROM filled_forms ff
            LEFT JOIN patients p ON ff.patient_id = p.id
            WHERE ff.user_id = ?
            ORDER BY ff.created_at DESC
            """,
            (user_id,)
        )
        
        filled_forms = []
        for row in cursor.fetchall():
            # Parse the filled_data JSON
            filled_data = json.loads(row['filled_data']) if row['filled_data'] else {}
            
            # Create a filled form object
            filled_form = {
                "id": row['id'],
                "user_id": row['user_id'],
                "patient_id": row['patient_id'],
                "patient_name": row['patient_name'],
                "pdf_id": row['pdf_id'],
                "filled_data": filled_data,
                "filled_filename": row['filled_filename'],
                "created_at": row['created_at']
            }
            
            # Add the HTML content if available
            if row['filled_filename'] and row['filled_filename'].endswith('.html'):
                try:
                    html_path = os.path.join(HTML_OUTPUT_DIR, "filled_forms", row['filled_filename'])
                    if os.path.exists(html_path):
                        with open(html_path, 'r', encoding='utf-8') as f:
                            filled_form['html_content'] = f.read()
                except Exception as e:
                    print(f"Error reading HTML file: {str(e)}")
            
            filled_forms.append(filled_form)
        
        conn.close()
        
        return {"filled_forms": filled_forms}
    except Exception as e:
        print(f"Error getting filled forms: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get filled forms: {str(e)}")

@app.get("/api/filled-form-json/{form_id}")
def get_filled_form_json(form_id: int):
    """Get a specific filled form with JSON data"""
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get the filled form
        cursor.execute(
            """
            SELECT ff.*, p.name as patient_name
            FROM filled_forms ff
            LEFT JOIN patients p ON ff.patient_id = p.id
            WHERE ff.id = ?
            """,
            (form_id,)
        )
        
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail=f"Filled form with ID {form_id} not found")
        
        # Parse the filled_data JSON
        filled_data = json.loads(row['filled_data']) if row['filled_data'] else {}
        
        # Create a filled form object
        filled_form = {
            "id": row['id'],
            "user_id": row['user_id'],
            "patient_id": row['patient_id'],
            "patient_name": row['patient_name'],
            "pdf_id": row['pdf_id'],
            "filled_data": filled_data,
            "filled_filename": row['filled_filename'],
            "created_at": row['created_at']
        }
        
        # Add the HTML content if available
        if row['filled_filename'] and row['filled_filename'].endswith('.html'):
            try:
                html_path = os.path.join(HTML_OUTPUT_DIR, "filled_forms", row['filled_filename'])
                if os.path.exists(html_path):
                    with open(html_path, 'r', encoding='utf-8') as f:
                        filled_form['html_content'] = f.read()
            except Exception as e:
                print(f"Error reading HTML file: {str(e)}")
        
        conn.close()
        
        return filled_form
    except Exception as e:
        print(f"Error getting filled form: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get filled form: {str(e)}")

# Add a CORS middleware specifically for the /send_form endpoint
@app.middleware("http")
async def add_cors_headers_for_send_form(request, call_next):
    # Handle OPTIONS preflight requests for /send_form
    if request.method == "OPTIONS" and request.url.path == "/send_form":
        response = Response(
            status_code=200,
            content="",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "86400",  # 24 hours
            },
        )
        return response
        
    # For all other requests, proceed normally
    response = await call_next(request)
    
    # Add CORS headers to /send_form responses
    if request.url.path == "/send_form":
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    
    return response

@app.get("/api/filled-pdf/{form_id}")
async def get_filled_pdf(form_id: int, request: Request):
    """Get the filled PDF file for a form"""
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # First, check if the filled_pdf_filename column exists
        cursor.execute("PRAGMA table_info(filled_forms)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        # If filled_pdf_filename doesn't exist, add it
        if 'filled_pdf_filename' not in column_names:
            cursor.execute('ALTER TABLE filled_forms ADD COLUMN filled_pdf_filename TEXT')
            conn.commit()
            print("Added filled_pdf_filename column to filled_forms table")
        
        # Get the filled form record
        cursor.execute(
            """
            SELECT filled_pdf_filename
            FROM filled_forms
            WHERE id = ?
            """,
            (form_id,)
        )
        
        form = cursor.fetchone()
        conn.close()
        
        if not form or not form['filled_pdf_filename']:
            raise HTTPException(status_code=404, detail=f"Filled PDF not found for form ID {form_id}")
        
        # Construct the path to the PDF file
        pdf_path = os.path.join(HTML_OUTPUT_DIR, "filled_pdfs", form['filled_pdf_filename'])
        
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail=f"PDF file not found: {form['filled_pdf_filename']}")
        
        # For HEAD requests, just return a 200 OK response
        if request.method == "HEAD":
            return Response(status_code=200)
        
        # For GET requests, return the file
        return Response(
            content=open(pdf_path, "rb").read(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={form['filled_pdf_filename']}"
            }
        )
    except Exception as e:
        print(f"Error getting filled PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get filled PDF: {str(e)}")

@app.get("/api/pdf-preview")
async def get_pdf_preview(path: str):
    """Serve a PDF file from an absolute path"""
    try:
        # Check if the file exists
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail=f"PDF file not found: {path}")
        
        # Read the file
        with open(path, "rb") as f:
            content = f.read()
        
        # Return the file as a response
        return Response(
            content=content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={os.path.basename(path)}"
            }
        )
    except Exception as e:
        print(f"Error serving PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to serve PDF: {str(e)}")

# Add this endpoint right after the get_filled_pdf endpoint

if __name__ == "__main__":
    # Create hospital system directories at startup
    create_hospital_system_directories()
    
    # Initialize the database
    init_db()
    
    # Run the FastAPI app with uvicorn on port 6969
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=6969)