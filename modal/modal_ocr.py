import modal
from fastapi import FastAPI
from pydantic import BaseModel
import os

class DocumentRequest(BaseModel):
    document_url: str
    document_type: str

web_app = FastAPI()
app = modal.App("pleadex-ocr")

# Define the image with required OCR and PDF processing tools
image = (
    modal.Image.debian_slim()
    .apt_install(
        "tesseract-ocr",
        "libtesseract-dev",
        "poppler-utils",  # Required for pdf2image
        "libpoppler-cpp-dev",
        "pkg-config"
    )
    .pip_install(
        "pytesseract",
        "Pillow",
        "requests",
        "fastapi",
        "pdf2image"
    )
)

@app.function(image=image)
def process_document(document_url: str, document_type: str) -> str:
    import requests
    from PIL import Image
    import pytesseract
    import io
    from pdf2image import convert_from_bytes
    
    # Download the document
    response = requests.get(document_url)
    if not response.ok:
        raise Exception(f"Failed to download document: {response.status_code}")
    
    # Process based on document type
    if document_type == "application/pdf":
        # Convert PDF to images
        images = convert_from_bytes(response.content)
        
        # Process each page
        extracted_text = []
        for i, image in enumerate(images):
            # Extract text from the image
            text = pytesseract.image_to_string(image)
            extracted_text.append(f"--- Page {i+1} ---\n{text}")
        
        return "\n\n".join(extracted_text)
    else:
        # For images, process directly
        image = Image.open(io.BytesIO(response.content))
        text = pytesseract.image_to_string(image)
        return text

@web_app.post("/process")
async def ocr_endpoint(request: DocumentRequest) -> dict:
    """Process a document and return extracted text."""
    text = process_document.remote(request.document_url, request.document_type)
    return {"text": text}

@modal.asgi_app()
def fastapi_app():
    return web_app 