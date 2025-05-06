import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Alert,
  CircularProgress
} from '@mui/material';
import CourtAutocomplete from './CourtAutocomplete';
import { Court } from '@/models/court';

interface Judge {
  name: string;
  title: string;
}

interface Department {
  number: string;
  name: string;
  phone?: string;
  judges: Judge[];
}

interface DepartmentData {
  departments: Department[];
}

interface DepartmentBulkImportProps {
  initialCourt?: Court | null;
  onImportSuccess?: () => void;
}

export default function DepartmentBulkImport({ 
  initialCourt,
  onImportSuccess 
}: DepartmentBulkImportProps) {
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(initialCourt || null);
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCourt) {
      setSelectedCourt(initialCourt);
    }
  }, [initialCourt]);

  const handleImport = async () => {
    if (!selectedCourt) {
      setError('Please select a court first');
      return;
    }

    try {
      // Parse and validate JSON
      const data: DepartmentData = JSON.parse(jsonInput);
      
      if (!Array.isArray(data.departments)) {
        throw new Error('Invalid JSON format: departments must be an array');
      }

      // Validate each department
      data.departments.forEach((dept, index) => {
        if (!dept.number || !dept.name) {
          throw new Error(`Invalid department at index ${index}: number and name are required`);
        }
        if (!Array.isArray(dept.judges)) {
          throw new Error(`Invalid judges array in department ${dept.number}`);
        }
        dept.judges.forEach((judge, jIndex) => {
          if (!judge.name || !judge.title) {
            throw new Error(`Invalid judge at index ${jIndex} in department ${dept.number}: name and title are required`);
          }
        });
      });

      setLoading(true);
      setError(null);
      setSuccess(null);

      // Send to API
      const response = await fetch('/api/courts/departments/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courtId: selectedCourt._id,
          departments: data.departments
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import departments');
      }

      setSuccess('Departments and judges imported successfully');
      setJsonInput('');
      
      // Call success callback if provided
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import departments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Bulk Import Departments and Judges
      </Typography>

      {!initialCourt && (
        <Box sx={{ mb: 3 }}>
          <CourtAutocomplete
            value={selectedCourt}
            onChange={setSelectedCourt}
            error={!!error && !selectedCourt}
            helperText={error && !selectedCourt ? 'Please select a court' : ''}
          />
        </Box>
      )}

      <TextField
        fullWidth
        multiline
        rows={10}
        value={jsonInput}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJsonInput(e.target.value)}
        placeholder="Paste your JSON here..."
        error={!!error}
        helperText={error || 'Enter departments and judges in JSON format'}
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        onClick={handleImport}
        disabled={loading || !selectedCourt || !jsonInput}
        sx={{ mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Import'}
      </Button>

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Expected JSON Format:
        </Typography>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '1rem',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`{
  "departments": [
    {
      "number": "D1",
      "name": "Family Law",
      "phone": "(714) 834-5600",
      "judges": [
        {
          "name": "Judge John Smith",
          "title": "Presiding Judge"
        }
      ]
    }
  ]
}`}
        </pre>
      </Box>
    </Box>
  );
} 