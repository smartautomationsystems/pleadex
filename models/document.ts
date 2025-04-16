import { ObjectId } from 'mongodb';

export interface Document {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  type: string;
  size: number;
  s3Key: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  content?: string | null;
  ocrJobId?: string;
} 