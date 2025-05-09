import { ObjectId } from 'mongodb';

export interface CaseEvent {
  date: string; // ISO string
  type: string; // references a global variable key
  title: string;
  description?: string;
  aiSuggested: boolean;
  createdBy: string; // user id or "ai"
}

export interface Case {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  description?: string;
  status: 'active' | 'closed' | 'pending';
  events: CaseEvent[];
  createdAt: Date;
  updatedAt: Date;
} 