import { ObjectId } from 'mongodb';

export interface Form {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  type: string;
  size: number;
  s3Key: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  fields?: any[] | null;
  ocrJobId?: string;
} 