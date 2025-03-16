import os
from dotenv import load_dotenv
import anthropic
import pathlib
import re
import base64

load_dotenv()

client = anthropic.Anthropic(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
)

def get_pdf_base64(pdf_path):
    """Read PDF file and encode as base64"""
    with open(pdf_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def stream_response(messages):
    """Stream response and collect the full text"""
    full_text = ""
    with client.messages.stream(
        model="claude-3-5-sonnet-latest",
        max_tokens=30000,
        temperature=1,
        messages=messages
    ) as stream:
        for text in stream.text_stream:
            full_text += text
            # Optional: print progress
            print(".", end="", flush=True)
    print()  # Newline after streaming completes
    return full_text

def verify_typeform_html(html_content):
    """
    Verify that the generated HTML form meets all requirements for Typeform-style forms.

    Args:
        html_content (str): The HTML content to verify

    Returns:
        str: Feedback from Claude about the form's compliance
    """
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f"""Please verify this HTML form meets the requirements for a Typeform-style multi-step form.

                            Check for the following and provide specific feedback on each point:

                            1. STRUCTURE:
                            - Form uses id="typeform"
                            - Form has action="http://localhost:6969/send_form" method="post"
                            - Has the Tailwind CSS CDN included
                            - Has a fixed progress bar with id="progressBar"
                            - Has proper step transitions and navigation
                            - Mobile-friendly layout

                            2. FUNCTIONALITY:
                            - Properly implements step navigation (nextStep/prevStep functions)
                            - Updates progress bar correctly
                            - Includes form validation
                            - Uses the exact submission code with fetch API
                            - Handles any conditional field displays

                            3. STYLING:
                            - Uses form-step, progress-bar, nav-btn classes
                            - Has smooth transitions between steps (opacity/transform)
                            - Uses consistent color scheme (blue primary buttons, gray back buttons, green submit)
                            - Clean, minimal interface focusing on one question at a time

                            4. SPECIAL FEATURES:
                            - Includes combobox functionality for dropdowns
                            - Includes tooltips for help text

                            Rate the form's compliance on a scale of 1-10 and suggest any improvements.

                            HTML Form:

                            {html_content}"""


                }
            ]
        }
    ]

    return stream_response(messages)
