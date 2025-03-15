import os
from dotenv import load_dotenv
import anthropic
import json
import re
import base64
from pathlib import Path

load_dotenv()

# Initialize Anthropic client
client = anthropic.Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY"),
)

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

        temperature=0,
        messages=messages
    ) as stream:
        for text in stream.text_stream:
            full_text += text
            print(".", end="", flush=True)
    print()  # Newline after streaming completes
    return full_text

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
1. Analyze the form and identify all input fields and their purposes
2. Prepopulate text inputs with relevant information from the context
3. Create appropriate dropdown options for applicable fields based on the context and field purpose
4. Ensure users can still edit all fields (whether prepopulated or dropdown)
5. Maintain the same form structure and all original IDs

IMPORTANT REQUIREMENTS:
- DO NOT change any input IDs - they must remain exactly the same
- Ensure the form submits the same JSON structure as before
- For dropdowns, use a hybrid approach: show a dropdown but allow free text entry
- Infer appropriate dropdown options for fields based on their purpose and context:
  * For procedure types, infer related procedures based on doctor's specialty
  * For language options, provide common languages
  * For race/ethnicity fields, include standard census categories
  * For any other fields that would benefit from a dropdown, create logical options
- Add clear visual indication of prefilled fields (subtle background color)
- Add explanatory tooltips where appropriate
- Make intelligent decisions about which context data matches which form fields
- Add a small note at the top explaining that some fields have been prefilled based on available information

HTML TEMPLATE FORM:
{template_html}

CONTEXT DATA:
{context_str}

Provide only the modified HTML in your response. The HTML should be a complete, functional form that maintains all the original functionality while adding the enhancements described.
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
    return enhanced_html

if __name__ == "__main__":
    # Example usage
    from chain1 import chain1
    import pathlib
    pdf_form = pathlib.Path("../test_files/sterilization_form.pdf")

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

    # Example context data
    context_data = {
        "patient": {
            "name": "Jane Doe",
            "dob": "1985-06-15",
            "address": "123 Main St, Anytown, CA 94102",
            "ethnicity": "Hispanic or Latino",
            "race": "White",
            "preferred_language": "English"
        },
        "doctor": {
            "name": "Dr. Sarah Johnson",
            "specialty": "OBGYN",
            "license": "MD12345",
            "facility": "Women's Health Clinic"
        },
        "practice": {
            "name": "Women's Health Clinic",
            "address": "456 Medical Center Blvd, Anytown, CA 94102",
            "phone": "(555) 123-4567"
        },
        "procedure": {
            "type": "Bilateral Tubal Ligation",
            "date": "2023-08-15",
            "codes": ["58670", "58671", "58600"]
        }
    }

    # Generate enhanced form
    enhanced_html = enhance_form_with_context(response, context_data)

    print("______ ENHANCED HTML ________")
    print(enhanced_html)
