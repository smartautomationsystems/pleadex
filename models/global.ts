import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

export interface Global {
  _id?: ObjectId;
  type: 'caseType' | 'courtJurisdiction' | 'formField' | 'template' | 'caseEvent';
  key: string;
  label: string;
  value: any;
  coreCategory?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type GlobalType = Global['type'];

export type GlobalCategory = 'fieldDefinition' | 'referenceObject';

export type FieldDefinitionValue = {
  fieldType: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  repeatable?: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
};

export type ReferenceObjectValue = {
  [key: string]: any; // Flexible structure for reference data
};

export type GlobalValue = FieldDefinitionValue | ReferenceObjectValue;

const globalSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['formField', 'court', 'caseType', 'template']
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  label: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['fieldDefinition', 'referenceObject']
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  coreCategory: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
globalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Global = mongoose.models.Global || mongoose.model('Global', globalSchema); 