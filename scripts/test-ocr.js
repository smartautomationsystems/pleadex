const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

// Initialize S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testOCR() {
  try {
    // 1. Upload sample image to S3
    const imagePath = path.join(__dirname, 'sample.jpg');
    const imageBuffer = fs.readFileSync(imagePath);
    
    const s3Key = `test-ocr-${Date.now()}.jpg`;
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
    });

    await s3.send(uploadCommand);
    console.log('✅ Image uploaded to S3');

    // 2. Get signed URL for the image
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
    });

    const signedUrl = await getSignedUrl(s3, getObjectCommand, { expiresIn: 3600 });
    console.log('✅ Generated signed URL');

    // 3. Call Modal OCR endpoint
    const response = await fetch(process.env.MODAL_OCR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_url: signedUrl,
        document_type: 'image/jpeg',
      }),
    });

    if (!response.ok) {
      throw new Error(`OCR request failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ OCR processing completed');
    console.log('\nExtracted Text:');
    console.log('----------------');
    console.log(result.text);
    console.log('----------------');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOCR(); 