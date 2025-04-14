from modal import Image, App
from ocr_modal import app

@app.local_entrypoint()
def main():
    # Create a simple test string
    test_text = "Hello, OCR test!"
    
    # Import required libraries
    from PIL import Image, ImageDraw, ImageFont
    import io
    
    # Create a new image with white background
    img = Image.new('RGB', (200, 50), color='white')
    d = ImageDraw.Draw(img)
    
    # Add text to the image
    d.text((10,10), test_text, fill='black')
    
    # Convert image to bytes
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr = img_byte_arr.getvalue()
    
    # Call our OCR function
    result = app.process_document.remote(img_byte_arr)
    print(f"OCR Result: {result}") 