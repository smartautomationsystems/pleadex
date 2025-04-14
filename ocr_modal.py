from modal import Image, App, web_endpoint
from fastapi import Request
import io
import logging
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = App("ocr-service")

# Image for OCR processing
ocr_image = Image.debian_slim().apt_install("tesseract-ocr").pip_install("pytesseract", "Pillow", "requests")

# Image for web endpoint
web_image = Image.debian_slim().pip_install("fastapi[standard]")

def download_from_s3(s3_signed_url: str) -> bytes:
    """Download a file from S3 using a signed URL."""
    response = requests.get(s3_signed_url)
    response.raise_for_status()  # Ensures we catch 403s cleanly
    return response.content

@app.function(image=ocr_image)
def run_ocr(image_bytes: bytes) -> str:
    """Extract text from an image using Tesseract OCR."""
    from PIL import Image
    import pytesseract
    import io
    
    logger.info("Starting OCR processing...")
    
    try:
        # Open the image from bytes
        image = Image.open(io.BytesIO(image_bytes))
        logger.info(f"Image opened successfully, size: {image.size}")
        
        # Extract text using Tesseract
        text = pytesseract.image_to_string(image)
        logger.info(f"OCR completed, text length: {len(text)}")
        
        return text
    except Exception as e:
        logger.error(f"OCR processing failed: {str(e)}")
        raise

@app.function(image=web_image)
@web_endpoint(method="POST")
async def process_document(request: Request):
    """Process a document and return the extracted text."""
    try:
        logger.info("Received OCR request")
        
        # Get the file content from the request body
        file_content = await request.body()
        logger.info(f"Received file content, size: {len(file_content)} bytes")
        
        if not file_content:
            logger.error("No file content provided")
            return {"error": "No file content provided"}
        
        # Process the image
        logger.info("Starting OCR processing...")
        text = run_ocr.remote(file_content)
        
        logger.info("OCR processing completed successfully")
        return {
            "text": text,
            "confidence": 0.95
        }
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        return {"error": str(e)} 