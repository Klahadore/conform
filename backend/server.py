from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import os
from datetime import datetime
import re
import PyPDF2
import json
import shutil

# Create the FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount the uploads directory to make files accessible
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Database setup
DB_PATH = os.path.join(os.path.dirname(__file__), "conform.db")

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
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        healthcare_title TEXT NOT NULL,
        hospital_system TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create table for uploaded PDFs
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS uploaded_pdfs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        is_fillable BOOLEAN NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Create patients table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        email TEXT,
        date_of_birth TEXT,
        gender TEXT,
        age INTEGER,
        conditions TEXT,
        medications TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Check if the new columns exist in the patients table, add them if they don't
    cursor.execute("PRAGMA table_info(patients)")
    columns = cursor.fetchall()
    column_names = [column[1] for column in columns]
    
    # Add new columns to patients table if they don't exist
    if 'email' not in column_names:
        cursor.execute('ALTER TABLE patients ADD COLUMN email TEXT')
    
    if 'date_of_birth' not in column_names:
        cursor.execute('ALTER TABLE patients ADD COLUMN date_of_birth TEXT')
    
    if 'gender' not in column_names:
        cursor.execute('ALTER TABLE patients ADD COLUMN gender TEXT')
    
    if 'age' not in column_names:
        cursor.execute('ALTER TABLE patients ADD COLUMN age INTEGER')
    
    if 'conditions' not in column_names:
        cursor.execute('ALTER TABLE patients ADD COLUMN conditions TEXT')
    
    if 'medications' not in column_names:
        cursor.execute('ALTER TABLE patients ADD COLUMN medications TEXT')
    
    if 'created_at' not in column_names:
        cursor.execute('ALTER TABLE patients ADD COLUMN created_at TIMESTAMP')
        # Update existing rows to set created_at to current time
        cursor.execute('UPDATE patients SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL')
    
    # Add patient_id column to pdfs table if it doesn't exist
    cursor.execute("PRAGMA table_info(uploaded_pdfs)")
    columns = cursor.fetchall()
    column_names = [column[1] for column in columns]
    
    if 'patient_id' not in column_names:
        cursor.execute('''
        ALTER TABLE uploaded_pdfs ADD COLUMN patient_id INTEGER
        ''')
    
    # Add patient_name column to pdfs table if it doesn't exist
    if 'patient_name' not in column_names:
        cursor.execute('''
        ALTER TABLE uploaded_pdfs ADD COLUMN patient_name TEXT
        ''')
    
    # Create healthcare_systems table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS healthcare_systems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create table for JSX templates associated with healthcare systems
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS healthcare_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        healthcare_system_id INTEGER NOT NULL,
        template_name TEXT NOT NULL,
        template_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (healthcare_system_id) REFERENCES healthcare_systems (id),
        UNIQUE (healthcare_system_id, template_name)
    )
    ''')
    
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
    file: UploadFile = File(...),
    user_id: int = Form(...),
    patient_id: Optional[int] = Form(None),
):
    try:
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Verify the user exists and get full name
        cursor.execute("SELECT name FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's full name and replace spaces with underscores
        doctor_name = user['name'].replace(' ', '_')
        
        # Get patient name if patient_id is provided
        patient_name = "unassigned"
        if patient_id:
            cursor.execute("SELECT name FROM patients WHERE id = ?", (patient_id,))
            patient = cursor.fetchone()
            if patient:
                patient_name = patient['name'].replace(' ', '_')
                print(f"Using patient name: {patient_name}")
            else:
                print(f"Patient with ID {patient_id} not found")
                patient_id = None  # Reset patient_id if patient not found
        else:
            print("No patient_id provided")
        
        # Check if the file is a PDF
        if not file.filename.lower().endswith('.pdf'):
            conn.close()
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Create the new filename with the required format: [original filename]_[doctor fullname]_[patient fullname]
        original_filename = file.filename
        filename_base, file_extension = os.path.splitext(original_filename)
        new_filename = f"{filename_base}_{doctor_name}_{patient_name}{file_extension}"
        
        # Make sure the filename is secure
        new_filename = re.sub(r'[^\w\s.-]', '', new_filename)
        new_filename = re.sub(r'\s+', '_', new_filename)
        
        file_path = os.path.join(UPLOAD_DIR, new_filename)
        
        # Save the file to disk
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Check if the PDF is fillable
        is_fillable = is_pdf_fillable(file_path)
        print(f"PDF is fillable: {is_fillable}")
        
        # Save the PDF information to the database with patient information
        cursor.execute(
            """
            INSERT INTO uploaded_pdfs (user_id, filename, original_filename, is_fillable, patient_id, patient_name)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, new_filename, original_filename, is_fillable, patient_id, patient_name if patient_id else None)
        )
        conn.commit()
        
        # Get the ID of the newly inserted PDF
        pdf_id = cursor.lastrowid
        
        # Get the PDF information
        cursor.execute(
            """
            SELECT id, filename, original_filename, upload_date, patient_id, patient_name, is_fillable
            FROM uploaded_pdfs
            WHERE id = ?
            """,
            (pdf_id,)
        )
        
        pdf = cursor.fetchone()
        
        conn.close()
        
        return {
            "message": "PDF uploaded successfully",
            "pdf": {
                "id": pdf['id'],
                "filename": pdf['filename'],
                "originalFilename": pdf['original_filename'],
                "uploadDate": pdf['upload_date'],
                "url": f"/uploads/{pdf['filename']}",
                "isFillable": is_fillable,
                "patientId": pdf['patient_id'],
                "patientName": pdf['patient_name']
            }
        }
    except Exception as e:
        if 'conn' in locals():
            conn.close()
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
        file_path = os.path.join(UPLOAD_DIR, pdf_info['filename'])
        
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
        old_path = os.path.join(UPLOAD_DIR, current_filename)
        new_path = os.path.join(UPLOAD_DIR, new_filename)
        
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
        cursor = conn.cursor()
        
        # First, check if the patient exists
        cursor.execute(
            "SELECT name, user_id FROM patients WHERE id = ?",
            (patient_id,)
        )
        patient_info = cursor.fetchone()
        
        if not patient_info:
            conn.close()
            raise HTTPException(status_code=404, detail="Patient not found")
        
        patient_name, user_id = patient_info
        print(f"Deleting patient: {patient_name} (ID: {patient_id}) for user {user_id}")
        
        # Check if patient_name column exists in uploaded_pdfs table
        cursor.execute("PRAGMA table_info(uploaded_pdfs)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        # Update PDFs that reference this patient
        if 'patient_id' in column_names:
            cursor.execute(
                "UPDATE uploaded_pdfs SET patient_id = NULL WHERE patient_id = ?",
                (patient_id,)
            )
            print(f"Updated PDFs to remove patient_id references to patient {patient_id}")
        
        # If patient_name column exists, update it too
        if 'patient_name' in column_names:
            cursor.execute(
                "UPDATE uploaded_pdfs SET patient_name = NULL WHERE patient_name = ? AND user_id = ?",
                (patient_name, user_id)
            )
            print(f"Updated PDFs to remove patient_name references to patient {patient_name}")
        
        # Delete the patient record
        cursor.execute(
            "DELETE FROM patients WHERE id = ?",
            (patient_id,)
        )
        
        affected_rows = cursor.rowcount
        print(f"Deleted patient {patient_id}, affected rows: {affected_rows}")
        
        # Commit the changes and close the connection
        conn.commit()
        conn.close()
        
        return {"success": True, "message": f"Patient '{patient_name}' deleted successfully"}
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
        
        # Validate required fields
        if 'name' not in data:
            raise HTTPException(status_code=400, detail="Missing required field: name")
        
        patient_name = data['name']
        
        # Get optional fields with default values
        patient_email = data.get('email', None)
        patient_dob = data.get('date_of_birth', None)
        patient_gender = data.get('gender', None)
        patient_age = data.get('age', None)
        patient_conditions = data.get('conditions', None)
        patient_medications = data.get('medications', None)
        
        # Create a new database connection for this request
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Create a new patient with all fields
        cursor.execute(
            """
            INSERT INTO patients (
                name, user_id, email, date_of_birth, gender, 
                age, conditions, medications, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                patient_name, user_id, patient_email, patient_dob, 
                patient_gender, patient_age, patient_conditions, patient_medications
            )
        )
        conn.commit()
        
        # Get the newly created patient
        patient_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT id, name, user_id, email, date_of_birth, gender, 
                   age, conditions, medications, created_at 
            FROM patients WHERE id = ?
            """, 
            (patient_id,)
        )
        patient = cursor.fetchone()
        
        # Close the connection
        conn.close()
        
        if not patient:
            raise HTTPException(status_code=500, detail="Failed to create patient")
        
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

# Run the server with uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=5000, reload=True) 