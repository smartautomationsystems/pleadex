import { ObjectId } from 'mongodb';

export interface Case {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  description?: string;
  status: 'active' | 'closed' | 'pending';
  createdAt: Date;
  updatedAt: Date;
} 