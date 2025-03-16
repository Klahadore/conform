# Direct Anthropic API implementation
import os
from dotenv import load_dotenv
import anthropic
import pathlib
import re
import base64
import sqlite3

load_dotenv()

# Initialize Anthropic client
client = anthropic.Anthropic(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
)

def get_pdf_base64(pdf_path):
    """Read PDF file and encode as base64"""
    with open(pdf_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def extract_html(text):
    """Extract HTML content from the response"""
    # Try to extract code block if present
    html_blocks = re.findall(r"```html\n(.*?)\n```", text, re.DOTALL)
    if html_blocks:
        return html_blocks[0]

    # Try to extract generic code block if html-specific not found
    code_blocks = re.findall(r"```\n(.*?)\n```", text, re.DOTALL)
    if code_blocks:
        return code_blocks[0]

    # If no code blocks, try to extract content between HTML tags
    html_content = re.findall(r"<html.*?>(.*?)</html>", text, re.DOTALL)
    if html_content:
        return f"<html>{html_content[0]}</html>"

    # If none of the above worked, return the entire text (might still be HTML)
    return text

def stream_response(messages):
    """Stream response and collect the full text"""
    full_text = ""
    with client.messages.stream(
        model="claude-3-7-sonnet-20250219",
        max_tokens=30000,
        thinking={
                "type": "enabled",
                "budget_tokens": 16000
            },
        temperature=1,
        messages=messages
    ) as stream:
        for text in stream.text_stream:
            full_text += text
            # Optional: print progress
            print(".", end="", flush=True)
    print()  # Newline after streaming completes
    return full_text

def generate_form(pdf_form: pathlib.Path, keys_and_coordinates: str):
    pdf_base64 = get_pdf_base64(pdf_form)

    print("Generating form HTML...")
    response_text = stream_response([
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": pdf_base64
                    }
                },
                {
                    "type": "text",
                    "text": f"""I have given you a PDF of a medical form. Generate an HTML version of this form that follows the reading order of the form.
                    The PDF will have fillable elements that need to be mapped to each of the inputs on the HTML form.
                    To do this, I will give you a key for each fillable element, it will be a number. And I will give you the coordinates of each element.
                    Use the coordinates and your knowledge of the reading order to assign each fillable element in the generated form an
                    ID of the integer key I have given you.

                    Only include HTML in your response.
                    Use Tailwind CSS with these styles. Import tailwind yourself.

                    IMPORTANT: These are x,y coordinates. The number indicates it from top to bottom. So in general, the smallest magnitude coordinates will be the bottom left. The coordinates are for the top left of the box.
                    Keys and Coordinates:
                    {keys_and_coordinates}"""
                }
            ]
        }
    ])

    # Extract HTML from the response
    html_content = extract_html(response_text)
    return html_content

def validate_form(pdf_form: pathlib.Path, parsed_code: str):
    pdf_base64 = get_pdf_base64(pdf_form)

    print("Validating and improving the form...")
    response_text = stream_response([
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": pdf_base64
                    }
                },
                {
                    "type": "text",
                    "text": f"""I have given you a skeleton of an HTML form that is supposed to match the PDF I have also given you.
                    First, simplify the HTML form for the user. The goal is for the form to be as understandable and as clear
                    to the user as possible to minimize possible errors. This can include things like reducing medical jargon,
                    adding <p> blocks and headers to help summarize to the user how things should be filled in, and
                    removing unnecessary things from the HTML to help simplify it.

                    Afterwards, add a script tag or use builtin form features to the HTML that will enforce input rules on the form. Think about the intended
                    filling order of the form. Think about what can go in each element.

                    Continue using Tailwind. If text comes from the form itself, leave the background as white. If you want to add
                    clarification as to who fills in the field (either patient or doctor), what date it is (current date, birthdate, etc),
                    and any other clarifications about what should be filled in. If it requres todays date, fill in the date don't let the user change it. It should
                    still be a date element though.

                    Using a blue background, give any legal or biological context to what is expected of that field. For example, if you
                    think that the user will not understand the purpose of giving certain information to the consent form, explain to the user why that
                    information is required.

                    IMPORTANT:
                    Every element has an ID that corresponds to the fillable element in the PDF. It is important that this
                    mapping is retained after you do your simplification.

                    Only include HTML in your response.

                    HTML Form:
                    {parsed_code}"""
                }
            ]
        }
    ])

    # Extract HTML from the response
    html_content = extract_html(response_text)
    return html_content

def convert_to_typeform(html_content):
    """Convert the validated form to a Typeform-style interface"""
    print("Converting to Typeform style...")
    response_text = stream_response([
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f"""Convert the following HTML form into a Typeform-style multi-step form where:

                    1. Each form field or logical group of related fields appears as a separate step/view
                    2. Only one question is shown at a time
                    3. Each step has Next/Previous navigation buttons
                    4. The final step has a Submit button
                    5. All form data is submitted together when the user completes the form

                    Include all necessary HTML, CSS, and JavaScript to make this work as a standalone page.

                    IMPORTANT:
                    - Maintain all input IDs exactly as they are in the original form
                    - Ensure form validation still works for each field
                    - Make the interface clean, minimal, and focused on one question at a time
                    - Add a progress indicator showing how far along the user is in the form
                    - Group related questions together in a single view when it makes logical sense (e.g., demographic info)
                    - Use smooth transitions between questions
                    - Make it mobile-friendly

                    Original HTML Form:
                    {html_content}"""
                }
            ]
        }
    ])

    # Extract HTML from the response
    typeform_html = extract_html(response_text)
    return typeform_html

def chain1(pdf_path, coordinates, hospital_system=None):
    """Process a PDF and generate HTML"""
    try:
        print(f"chain1 processing started for {pdf_path}")
        
        # Get the original filename from the path
        original_filename = os.path.basename(pdf_path)
        
        # Extract the base name without extension
        base_name = os.path.splitext(original_filename)[0]
        html_filename = f"{base_name}.html"
        
        # Define the path where the HTML file will be saved
        html_output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "html_outputs")
        
        # If hospital_system is provided, use the pre-created directory
        if hospital_system:
            # Sanitize the hospital system name to be safe for filesystem
            safe_hospital_system = re.sub(r'[^\w\s-]', '', hospital_system).strip().replace(' ', '_')
            hospital_system_dir = os.path.join(html_output_dir, safe_hospital_system)
            # Directory should already exist, but create it just in case
            os.makedirs(hospital_system_dir, exist_ok=True)
            html_path = os.path.join(hospital_system_dir, html_filename)
        else:
            # For backward compatibility, still support the root directory
            html_path = os.path.join(html_output_dir, html_filename)
        
        # Process the PDF and generate HTML
        pdf_form = pathlib.Path(pdf_path)
        html_form_initial = generate_form(pdf_form, coordinates)
        validated_form = validate_form(pdf_form, html_form_initial)
        html_content = convert_to_typeform(validated_form)
        
        # Save the HTML to a file
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        print(f"HTML saved to {html_path}")
        
        # Update the database
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "conform.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if a record already exists for this PDF
        cursor.execute(
            "SELECT id FROM universal_pdfs WHERE original_filename = ?",
            (original_filename,)
        )
        
        existing_record = cursor.fetchone()
        
        # Store the relative path to the HTML file (from the html_outputs directory)
        relative_html_path = os.path.join(safe_hospital_system, html_filename) if hospital_system else html_filename
        
        if existing_record:
            # Update the existing record
            cursor.execute(
                """
                UPDATE universal_pdfs 
                SET html_content = ?, html_filename = ?, hospital_system = ?, updated_at = datetime('now')
                WHERE original_filename = ?
                """,
                (html_content, relative_html_path, hospital_system, original_filename)
            )
        else:
            # Insert a new record
            cursor.execute(
                """
                INSERT INTO universal_pdfs (original_filename, html_content, html_filename, hospital_system, created_at, updated_at)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
                """,
                (original_filename, html_content, relative_html_path, hospital_system)
            )
        
        conn.commit()
        conn.close()
        
        print(f"Database updated for {original_filename}")
        return True
    except Exception as e:
        print(f"Error in chain1 processing: {str(e)}")
        return False

if __name__ == "__main__":
    # Connect to the database to get the original filename
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "conform.db")
    
    # Connect to the database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Query the universal_pdfs table for the first entry (for testing)
    cursor.execute("SELECT original_filename FROM universal_pdfs LIMIT 1")
    result = cursor.fetchone()
    
    if result:
        # Use the original filename from the database
        original_filename = result['original_filename']
        pdf_form = pathlib.Path(f"../uploads/{original_filename}")
    else:
        # Fallback to the test file if no entries in the database
        pdf_form = pathlib.Path("../test_files/sterilization_form.pdf")
    
    conn.close()
    
    mock_coordinates = """
    1: Page 1, I have asked for and received information about sterilization from Doctor or Clinic, (30, 664)
    2: Page 1, Specify Type of Operation_1, (29, 500)
    3: Page 1, Birth date, (202, 412)
    4: Page 1, Name of Individual_1, (43, 389)
    5: Page 1, I hereby consent of my own free will to be sterilized by Doctor or Clinic, (124, 376)
    6: Page 1, Specify Type of Operation_2, (102, 351)
    7: Page 1, Signature_1, (28, 252)
    8: Page 1, Date signed_1, (215, 253)
    9: Page 1, Hispanic or Latino, (28, 204)
    10: Page 1, Not Hispanic or Latino, (28, 193)
    11: Page 1, American Indian or Alaska Native, (131, 203)
    12: Page 1, Asian, (131, 192)
    13: Page 1, Black or African American, (131, 182)
    14: Page 1, Native Hawaiian or Other Pacific Islander, (131, 171)
    15: Page 1, White, (131, 160)
    16: Page 1, Language, (146, 95)
    17: Page 1, Interpreter's Signature, (27, 45)
    18: Page 1, Date signed by Interpreter, (208, 47)
    19: Page 1, Name of Individual_2, (348, 679)
    20: Page 1, Specify Type of Operation_3, (313, 646)
    21: Page 1, Signature of Person Obtaining Consent, (310, 503)
    22: Page 1, Date signed by completed by person obtaining consent, (496, 504)
    23: Page 1, Facility, (313, 479)
    24: Page 1, Address, (313, 458)
    25: Page 1, Name of Individual_3, (313, 408)
    26: Page 1, Date of Sterilization, (500, 408)
    27: Page 1, Specify Type of Operation_4, (313, 372)
    28: Page 1, Premature delivery, (312, 113)
    29: Page 1, Individual's Expected Date of Delivery, (461, 103)
    30: Page 1, Emergency abdominal surgery describe circumstances), (312, 92)
    31: Page 1, Enter circumstances, (313, 60)
    32: Page 1, Physician's Signature, (312, 45)
    33: Page 1, Date Physician Signed, (493, 47)
    """
    response = chain1(pdf_form, mock_coordinates)
    print(response)
