import { Readable } from 'stream';

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