from modal import Image, App, fastapi_endpoint
from fastapi import UploadFile, File
import io

app = App("ocr-service")

# Image for OCR processing
ocr_image = Image.debian_slim().apt_install("tesseract-ocr").pip_install("pytesseract", "Pillow")

# Image for web endpoint
web_image = Image.debian_slim().pip_install("fastapi[standard]")

@app.function(image=ocr_image)
def run_ocr(image_bytes: bytes) -> str:
    """Extract text from an image using Tesseract OCR."""
    from PIL import Image
    import pytesseract
    import io
    
    # Open the image from bytes
    image = Image.open(io.BytesIO(image_bytes))
    
    # Extract text using Tesseract
    text = pytesseract.image_to_string(image)
    
    return text

@app.function(image=web_image)
@fastapi_endpoint()
async def process_document(file: UploadFile = File(...)):
    """Process a document and return the extracted text."""
    # Read the uploaded file
    contents = await file.read()
    
    # Process the image
    text = run_ocr.remote(contents)
    
    return {"text": text} 