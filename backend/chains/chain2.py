import os
from dotenv import load_dotenv
import anthropic
import json
import re
import base64
from pathlib import Path
import traceback

# Load environment variables
load_dotenv()

# Initialize Anthropic client
client = anthropic.Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY"),
)

def extract_html(text):
    """Extract HTML content from the response"""
    print(f"Extracting HTML from response of length {len(text)}")
    
    # Try to extract code block if present
    html_blocks = re.findall(r"```html\n(.*?)\n```", text, re.DOTALL)
    if html_blocks:
        print("Found HTML code block")
        return html_blocks[0]

    # Try to extract generic code block if html-specific not found
    code_blocks = re.findall(r"```\n(.*?)\n```", text, re.DOTALL)
    if code_blocks:
        print("Found generic code block")
        return code_blocks[0]

    # If no code blocks, try to extract content between HTML tags
    html_content = re.findall(r"<html.*?>(.*?)</html>", text, re.DOTALL)
    if html_content:
        print("Found HTML tags")
        return f"<html>{html_content[0]}</html>"

    # If none of the above worked, return the entire text (might still be HTML)
    print("No specific HTML format found, returning entire text")
    return text

def stream_response(messages):
    """Stream response and collect the full text"""
    print("Starting API call to Claude...")
    full_text = ""
    try:
        with client.messages.stream(
            model="claude-3-7-sonnet-20250219",
            max_tokens=50000,  # Increased to ensure we get complete HTML
            temperature=0,
            messages=messages
        ) as stream:
            for text in stream.text_stream:
                full_text += text
                # Print a dot every 100 characters to show progress
                if len(full_text) % 100 == 0:
                    print(".", end="", flush=True)
        print()  # Newline after streaming completes
        print(f"Received response of length {len(full_text)}")
        return full_text
    except Exception as e:
        print(f"Error in API call: {str(e)}")
        raise

def enhance_form_with_context(template_html: str, context_data):
    """
    Enhance an HTML form with context-aware prefilled values and dropdowns

    Args:
        template_html: HTML template form string
        context_data: Dictionary with context about patient, doctor, practice, etc.

    Returns:
        Enhanced HTML form as a string
    """
    # Convert context_data to a formatted string
    context_str = json.dumps(context_data, indent=2)

    print("Enhancing form with context...")
    prompt = f"""You're going to enhance an HTML form with context-aware features.

I'll provide you with:
1. An HTML template form
2. Context data about the patient, doctor, practice, etc.

Your task is to modify the HTML form to:
1. Prepopulate text inputs with relevant information from the context
2. Create appropriate dropdown options for applicable fields
3. Maintain the same form structure and all original IDs

IMPORTANT REQUIREMENTS:
- DO NOT change any input IDs - they must remain exactly the same
- Ensure the form submits the same JSON structure as before
- Make intelligent decisions about which context data matches which form fields
- Add a small note at the top explaining that some fields have been prefilled

HTML TEMPLATE FORM:
{template_html}

CONTEXT DATA:
{context_str}

Provide ONLY the modified HTML in your response. The HTML should be a complete, functional form.
"""

    response_text = stream_response([
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        }
    ])

    # Extract HTML from the response
    enhanced_html = extract_html(response_text)
    
    # Validate the HTML
    if not enhanced_html or len(enhanced_html) < 100:
        print(f"Warning: Received suspiciously short HTML response ({len(enhanced_html) if enhanced_html else 0} chars)")
        if len(response_text) > 1000:
            print(f"Original response was {len(response_text)} chars, attempting to extract HTML again")
            # If the original response was long but extraction failed, just use the whole response
            enhanced_html = response_text
    
    # Check if the HTML contains closing tags
    if enhanced_html and not ("</html>" in enhanced_html.lower() or "</body>" in enhanced_html.lower()):
        print("Warning: HTML appears to be truncated (missing closing tags)")
        
    return enhanced_html

def chain2(template_path, context_data):
    """
    Process an HTML template with patient and doctor data to create a prefilled form.
    
    Args:
        template_path (str): Path to the HTML template file
        context_data (dict): Dictionary with context about patient, doctor, practice, etc.
        
    Returns:
        tuple: (success, enhanced_html_or_error_message)
    """
    try:
        print(f"chain2 processing started for {template_path}")
        
        # Read the template file
        template_file = Path(template_path)
        if not template_file.exists():
            error_msg = f"Template file not found: {template_path}"
            print(error_msg)
            return False, error_msg
            
        template_text = template_file.read_text(encoding='utf-8')
        print(f"Original template size: {len(template_text)} bytes")
        
        # Generate enhanced form
        try:
            enhanced_html = enhance_form_with_context(template_text, context_data)
            
            # Verify that we got a valid HTML response
            if not enhanced_html:
                error_msg = "Received empty HTML response from API"
                print(error_msg)
                return False, error_msg
                
            if len(enhanced_html) < 100:
                error_msg = f"Received suspiciously short HTML response ({len(enhanced_html)} chars)"
                print(error_msg)
                return False, error_msg
            
            print(f"Enhanced HTML size: {len(enhanced_html)} bytes")
            
        except Exception as e:
            error_msg = f"Error processing template: {str(e)}"
            print(error_msg)
            print(f"Traceback: {traceback.format_exc()}")
            return False, error_msg
        
        # Create output filename
        output_filename = f"filled_{template_file.name}"
        output_dir = template_file.parent
        output_path = output_dir / output_filename
        
        # Save the enhanced HTML
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(enhanced_html)
            
        print(f"Enhanced HTML saved to {output_path}")
        
        return True, {
            "success": True,
            "filled_template_path": str(output_path),
            "filled_template_filename": output_filename
        }
    except Exception as e:
        error_msg = f"Error in chain2 processing: {str(e)}"
        print(error_msg)
        print(f"Traceback: {traceback.format_exc()}")
        return False, error_msg


if __name__ == "__main__":
    # Example usage
    import pathlib

    # Example context data
    context_data = {
        "patient": {
            "name": "Jane Doe",
            "dob": "1985-06-15",
            "address": "123 Main St, Anytown, CA 94102",
            "ethnicity": "Hispanic or Latino",
            "race": "White",
            "preferred_language": "English",
        },
        "doctor": {
            "name": "Dr. Sarah Johnson",
            "specialty": "OBGYN",
            "license": "MD12345",
            "facility": "Women's Health Clinic",
        },
        "practice": {
            "name": "Women's Health Clinic",
            "address": "456 Medical Center Blvd, Anytown, CA 94102",
            "phone": "(555) 123-4567",
        },
        "procedure": {
            "type": "Bilateral Tubal Ligation",
            "date": "2023-08-15",
            "codes": ["58670", "58671", "58600"],
        },
    }

    template_path = Path("../test_files/sterilization_template.html")
    
    # Test the chain2 function
    success, result = chain2(template_path, context_data)
    print(f"Success: {success}")
    print(f"Result: {result}")
