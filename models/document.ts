import { ObjectId } from 'mongodb';

export interface Document {
  _id: ObjectId;
  userId: ObjectId;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  ocrText?: string;
  ocrJobId?: string;
  createdAt: Date;
  updatedAt: Date;
} 