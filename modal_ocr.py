import modal
import pytesseract
from PIL import Image
import requests
from io import BytesIO
import pdf2image

stub = modal.Stub("pleadex-ocr")

# Create an image with the necessary dependencies
image = modal.Image.debian_slim().pip_install(
    "pytesseract",
    "Pillow",
    "requests",
    "pdf2image"
).apt_install("tesseract-ocr", "poppler-utils")

@stub.function(image=image)
def extract_text_from_url(url: str, doc_type: str) -> str:
    """Extract text from a document URL."""
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        if doc_type.lower() == 'pdf':
            # Convert PDF to images
            pdf_bytes = BytesIO(response.content)
            images = pdf2image.convert_from_bytes(pdf_bytes.read())
            text = ""
            for img in images:
                text += pytesseract.image_to_string(img) + "\n"
            return text
        else:
            # Process image directly
            img = Image.open(BytesIO(response.content))
            return pytesseract.image_to_string(img)
            
    except Exception as e:
        return f"Error processing document: {str(e)}"

@stub.webhook
def process(request):
    """Webhook endpoint for processing documents."""
    try:
        data = request.json()
        url = data.get("url")
        doc_type = data.get("type", "image")
        
        if not url:
            return {"error": "URL is required"}, 400
            
        text = extract_text_from_url.remote(url, doc_type)
        return {"text": text}
        
    except Exception as e:
        return {"error": str(e)}, 500

if __name__ == "__main__":
    stub.serve() 