const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

async function testS3Access() {
  try {
    console.log('Testing AWS S3 access...');
    console.log('AWS Configuration:', {
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    });

    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const command = new HeadBucketCommand({
      Bucket: process.env.AWS_S3_BUCKET,
    });
    
    await s3Client.send(command);
    console.log(`Successfully connected to bucket "${process.env.AWS_S3_BUCKET}"`);
    
  } catch (error) {
    console.error('Error testing S3 access:', error);
    if (error.name === 'InvalidAccessKeyId') {
      console.error('The AWS Access Key ID is invalid');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.error('The AWS Secret Access Key is invalid');
    } else if (error.name === 'NoSuchBucket') {
      console.error('The specified bucket does not exist');
    } else if (error.name === 'AccessDenied') {
      console.error('Access denied. Check IAM permissions');
    }
  }
}

testS3Access(); 