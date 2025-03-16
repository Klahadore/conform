from PyPDF2 import PdfReader, PdfWriter

def list_pdf_text_fields(pdf_path):
    """
    Lists all text fields from an AcroForm PDF, including page number, field name, and coordinates.

    Returns:
        List of tuples [(page_number, field_name, (x1, y1, x2, y2)), ...]
    """
    reader = PdfReader(pdf_path)
    text_fields = []

    for page_num, page in enumerate(reader.pages, start=1):  # Start pages at 1
        if "/Annots" in page:
            for annot in page["/Annots"]:
                annot_obj = annot.get_object()
                if "/T" in annot_obj:  # Form field
                    field_name = annot_obj["/T"]
                    rect = annot_obj["/Rect"]  # Bounding box [x1, y1, x2, y2]

                    # Convert coordinates to integers (if necessary)
                    x1, y1, x2, y2 = map(int, rect)

                    # Append tuple (page number, field name, coordinates)
                    text_fields.append((page_num, field_name, (x1, y1, x2, y2)))

    if not text_fields:
        print("No form text fields found or PDF does not have AcroForm text fields.")
    else:
        print("Available text fields:")
        for _, field_name, _, in text_fields:
            print(f'"{field_name}": ""')

    return text_fields

def extract_field_mapping(text_fields):
    """
    Input:
        text_fields (list): List of tuples [(page_number, field_name, (x1, y1, x2, y2)), ...]

    Output:
        dict { "1": "PatientName", "2": "DateOfBirth", ... }
    """
    return {str(i + 1): field_name for i, (_, field_name, _) in enumerate(text_fields)}

def rename_json_keys(json_data, field_mapping):
    """
    Replaces index-based keys in JSON with actual PDF field names.

    Input:
        json_data (dict): Incoming JSON data with index-based keys.
        field_mapping (dict): Mapping of index-based keys to actual field names.

    Output:
        dict: JSON data with field names replacing index-based keys.
    """
    return {field_mapping.get(k, k): v for k, v in json_data.items()}

def fill_pdf(input_pdf, output_pdf, json_data):
    """
    Extracts field mapping, renames JSON keys, and fills a PDF with the mapped values.

    Args:
        input_pdf (str): Path to input PDF file.
        output_pdf (str): Path to save the filled PDF.
        json_data (dict): Dictionary of values to populate the PDF form.

    Saves:
        A new PDF with the form fields filled.
    """
    # Step 1: Extract field names from the PDF
    text_fields = list_pdf_text_fields(input_pdf)
    # Step 2: Create mapping of index → field name
    field_mapping = extract_field_mapping(text_fields)
    # Step 3: Rename JSON keys using the mapping
    field_values = rename_json_keys(json_data, field_mapping)
    print(field_values)
    # Step 4: Read and write the PDF with updated values
    reader = PdfReader(input_pdf)
    writer = PdfWriter()

    for page in reader.pages:
        writer.add_page(page)

    form_fields = reader.get_fields()

    if form_fields:
        writer.update_page_form_field_values(writer.pages[0], {k: field_values.get(k, v) for k, v in form_fields.items()})

    with open(output_pdf, "wb") as out:
        writer.write(out)
    
    print(f"Saved filled PDF to '{output_pdf}'")

def generate_field_mapping_string(pdf_path):
    """
    Generates a formatted string listing all form fields in a PDF with their page number,
    field name, and coordinates.
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        str: A formatted string with numbered entries for each field in the format:
             "1: Page X, Field Name, (x, y)"
    """
    # Get the text fields from the PDF
    text_fields = list_pdf_text_fields(pdf_path)
    
    # Create the formatted string
    result_lines = []
    for i, (page_num, field_name, coords) in enumerate(text_fields, start=1):
        # Extract the center point (x, y) from the rectangle coordinates
        x1, y1, x2, y2 = coords
        center_x = (x1 + x2) // 2
        center_y = (y1 + y2) // 2
        
        # Format the line
        line = f"{i}: Page {page_num}, {field_name}, ({center_x}, {center_y})"
        result_lines.append(line)
    
    # Join all lines into a single string
    return "\n".join(result_lines)

if __name__ == "__main__":
    input_pdf = "sterilization.pdf"
    output_pdf = "filled_sterilization.pdf"

    # Incoming JSON data with index-based keys
    json_data = {
        '1': 'Dr. Sarah Johnson', '2': 'Hysteroscopic Sterilization', '3': '1985-06-15', '4': 'Jane Doe', '5': 'Dr. Sarah Johnson', '6': 'Bilateral Tubal Ligation', '7': '', '8': '2025-03-16', '9': '/On', '15': '/On', '16': 'Tagalog', '17': '', '18': '2025-03-15', '19': 'Jane Doe', '20': 'Bilateral Tubal Ligation', '21': '', '22': '2025-03-16', '23': "Women's Health Clinic", '24': '456 Medical Center Blvd, Anytown, CA 94102', '25': 'Jane Doe', '26': '2023-08-15', '27': 'Bilateral Tubal Ligation', '29': '', '31': '', '32': '', '33': '2025-03-16', 'waiting_period_normal': '/On', 'waiting_period': 'normal'
    }

    # Fill the PDF with the renamed JSON data
    fill_pdf(input_pdf, output_pdf, json_data)
