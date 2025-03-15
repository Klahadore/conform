# Conform.ai

A web application for streamlining medical form filling and processing.

## Features

- Smart form filling with AI validation
- Error prevention through real-time validation
- Time-saving dashboard for all patient forms
- User registration system for healthcare professionals
- Form Editor for creating custom medical forms

## Project Structure

- `frontend/`: React-based frontend application with Vite
- `backend/`: Python FastAPI backend with SQLite database

## Pages

- **Home**: Landing page with product information
- **Dashboard**: User dashboard to manage forms and profile
- **Form Editor**: Create and edit custom medical forms

## Setup Instructions

### Quick Setup (Recommended)

1. Set up the backend:
   ```bash
   cd backend
   chmod +x setup.sh
   ./setup.sh
   source venv/bin/activate
   ```

2. Start the backend server:
   ```bash
   python server.py
   ```

3. In a new terminal, set up and start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   The backend server will run on http://localhost:5000 and the frontend server on http://localhost:5173

### Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install uv
   uv pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   python server.py
   ```
   
   The server will run on http://localhost:5000

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   
   The application will be available at http://localhost:5173

### Important Note

Both the frontend and backend servers need to be running simultaneously for the application to work properly. The frontend Vite server is configured to proxy API requests to the backend server.

## Form Editor Functionality

The application includes a Form Editor that allows users to:
- Create custom medical forms
- Add various field types (text, select, checkbox, radio)
- Set required fields
- Preview forms before saving
- Edit existing forms

## Sign-Up Functionality

The application includes a sign-up form that collects:
- Full name
- Email address
- Healthcare title (with custom option)
- Hospital system (with custom option)

This information is stored in an SQLite database on the backend.

## API Documentation

When the backend server is running, you can access the automatically generated API documentation at:
- http://localhost:5000/docs (Swagger UI)
- http://localhost:5000/redoc (ReDoc)

## Technologies Used

- React.js
- Vite
- Python 3.8+
- FastAPI
- SQLite
- UV (Python package installer) 