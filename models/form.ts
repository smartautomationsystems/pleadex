import { ObjectId } from 'mongodb';

export interface Form {
  _id: ObjectId;
  name: string;
  description: string;
  category: 'pleadings' | 'motions' | 'orders' | 'other';
  type: string;
  size: number;
  s3Key: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fields: Array<{ key: string; value: string }>;
  fileUrl: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  error?: string;
} 