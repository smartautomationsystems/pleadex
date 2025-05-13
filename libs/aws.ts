import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ensureAwsConfig } from './env';

/**
 * Creates a new S3 client instance
 * @returns S3Client instance
 */
export function createS3Client() {
  ensureAwsConfig();
  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Uploads a file to S3
 * @param file Buffer containing file data
 * @param key S3 object key
 * @param contentType MIME type of the file
 * @returns Object containing the URL and key
 */
export async function uploadToS3(file: Buffer, key: string, contentType: string) {
  const s3Client = createS3Client();
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return {
    url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    key
  };
}

/**
 * Generates a signed URL for an S3 object
 * @param key S3 object key
 * @param expiresIn URL expiration time in seconds
 * @returns Signed URL
 */
export async function getSignedUrlForFile(key: string, expiresIn: number = 3600) {
  const s3Client = createS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Deletes an object from S3
 * @param key S3 object key
 */
export async function deleteObject(key: string) {
  const s3Client = createS3Client();
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
} 