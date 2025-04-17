import mongoose from 'mongoose';

export interface Department {
  number: string;
  name: string;
}

export interface Judge {
  name: string;
  title: string;
  department: string;
}

export interface Court {
  courtName: string;
  jurisdiction: 'state' | 'federal';
  courtState: string;
  courtCounty: string;
  branchName?: string;
  caseTypes: string[];
  address: string;
  mailingAddress?: string;
  departments: Department[];
  judges: Judge[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCourtOverride {
  userId: string;
  courtId: string;
  overrides: {
    departments?: Department[];
    judges?: Judge[];
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new mongoose.Schema({
  number: { type: String, required: true },
  name: { type: String, required: true }
});

const judgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  department: { type: String, required: true }
});

const courtSchema = new mongoose.Schema({
  courtName: { type: String, required: true },
  jurisdiction: { 
    type: String, 
    required: true, 
    enum: ['state', 'federal'] 
  },
  courtState: { type: String, required: true },
  courtCounty: { type: String, required: true },
  branchName: String,
  caseTypes: [{ type: String }],
  address: { type: String, required: true },
  mailingAddress: String,
  departments: [departmentSchema],
  judges: [judgeSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userCourtOverrideSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  courtId: { type: String, required: true, index: true },
  overrides: {
    departments: [departmentSchema],
    judges: [judgeSchema],
    [key: string]: any
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create text index for searchable fields
courtSchema.index({
  courtName: 'text',
  branchName: 'text',
  courtCounty: 'text',
  courtState: 'text',
  'departments.name': 'text',
  'judges.name': 'text'
});

// Update timestamps
courtSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

userCourtOverrideSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Court = mongoose.models.Court || mongoose.model('Court', courtSchema);
export const UserCourtOverride = mongoose.models.UserCourtOverride || mongoose.model('UserCourtOverride', userCourtOverrideSchema); 