import pathlib
import base64


def pdf_to_base64(pdf_path: pathlib.Path) -> str:
    """
    Converts a PDF file to a Base64 string.

    Args:
        pdf_path: A pathlib.Path object representing the path to the PDF file.

    Returns:
        A Base64 string representation of the PDF file.
    """
    try:
        with open(pdf_path, "rb") as pdf_file:
            encoded_string = base64.b64encode(pdf_file.read()).decode("utf-8")
            return encoded_string
    except FileNotFoundError:
        raise FileNotFoundError(f"The file {pdf_path} was not found.")
    except Exception as e:
        raise Exception(f"An error occurred: {e}")
