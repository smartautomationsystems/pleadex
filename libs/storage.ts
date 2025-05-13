import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { ensureAwsConfig } from './env';
import { uploadToS3, getSignedUrlForFile, deleteObject as deleteS3Object } from './aws';

// Check AWS configuration
const requiredEnvVars = {
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('Missing required AWS environment variables:', missingVars);
  throw new Error(`Missing AWS configuration: ${missingVars.join(', ')}`);
}

console.log('AWS Configuration:', {
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_S3_BUCKET,
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
});

// Initialize S3 client only when needed
function getS3Client() {
  ensureAwsConfig();
  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadToS3(file: Buffer, key: string, contentType: string) {
  try {
    console.log('Attempting S3 upload:', {
      key,
      contentType,
      fileSize: file.length,
    });

    const s3Client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    const result = await s3Client.send(command);
    console.log('S3 upload result:', result);

    const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    console.log('Generated S3 URL:', url);
    
    return { url, key };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSignedUrlForFile(key: string, expiresIn: number = 3600) {
  try {
    const s3Client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
}

/**
 * Converts a readable stream to a Buffer
 * @param stream Readable stream to convert
 * @returns Promise resolving to a Buffer
 */
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function getSignedUrlForDocument(key: string): Promise<string> {
  try {
    const s3Client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });

    const expiresIn = 3600; // 1 hour
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    console.log('Generated signed URL:', {
      key,
      expiresIn,
      url: url.substring(0, 50) + '...', // Log first 50 chars to avoid exposing full URL
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    });
    
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
}

export async function deleteObject(key: string) {
  return deleteS3Object(key);
}

// Re-export AWS functions
export { uploadToS3, getSignedUrlForFile, deleteS3Object as deleteObject }; 