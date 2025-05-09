'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface VariableMatch {
  fieldKey: string;
  existingVariable?: {
    name: string;
    category: string;
  };
  proposedVariable?: {
    name: string;
    category: string;
    type: string;
    required: boolean;
    placeholder?: string;
  };
}

interface FormFieldMatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: VariableMatch[];
  onApprove: (matches: VariableMatch[]) => Promise<void>;
}

export default function FormFieldMatchesModal({
  isOpen,
  onClose,
  matches,
  onApprove,
}: FormFieldMatchesModalProps) {
  const [editedMatches, setEditedMatches] = useState<VariableMatch[]>(matches);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMatchChange = (index: number, field: keyof VariableMatch, value: any) => {
    setEditedMatches(prev => {
      const newMatches = [...prev];
      if (field === 'existingVariable' || field === 'proposedVariable') {
        newMatches[index] = {
          ...newMatches[index],
          [field]: {
            ...newMatches[index][field],
            ...value
          }
        };
      } else {
        newMatches[index] = {
          ...newMatches[index],
          [field]: value
        };
      }
      return newMatches;
    });
  };

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      await onApprove(editedMatches);
      toast.success('Form fields processed successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to process form fields');
      console.error('Error approving matches:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl">
        <h3 className="font-bold text-lg mb-4">Review Form Field Matches</h3>
        
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Form Field</th>
                <th>Match Type</th>
                <th>Variable Name</th>
                <th>Category</th>
                <th>Type</th>
                <th>Required</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {editedMatches.map((match, index) => (
                <tr key={index}>
                  <td>{match.fieldKey}</td>
                  <td>
                    {match.existingVariable ? 'Existing' : 'New'}
                  </td>
                  <td>
                    {match.existingVariable ? (
                      <span>{match.existingVariable.name}</span>
                    ) : (
                      <input
                        type="text"
                        className="input input-bordered input-sm w-full"
                        value={match.proposedVariable?.name || ''}
                        onChange={(e) => handleMatchChange(index, 'proposedVariable', { name: e.target.value })}
                      />
                    )}
                  </td>
                  <td>
                    {match.existingVariable ? (
                      <span>{match.existingVariable.category}</span>
                    ) : (
                      <input
                        type="text"
                        className="input input-bordered input-sm w-full"
                        value={match.proposedVariable?.category || ''}
                        onChange={(e) => handleMatchChange(index, 'proposedVariable', { category: e.target.value })}
                      />
                    )}
                  </td>
                  <td>
                    {!match.existingVariable && (
                      <select
                        className="select select-bordered select-sm w-full"
                        value={match.proposedVariable?.type || 'text'}
                        onChange={(e) => handleMatchChange(index, 'proposedVariable', { type: e.target.value })}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="select">Select</option>
                        <option value="textarea">Textarea</option>
                      </select>
                    )}
                  </td>
                  <td>
                    {!match.existingVariable && (
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={match.proposedVariable?.required || false}
                        onChange={(e) => handleMatchChange(index, 'proposedVariable', { required: e.target.checked })}
                      />
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        setEditedMatches(prev => {
                          const newMatches = [...prev];
                          if (match.existingVariable) {
                            newMatches[index] = {
                              fieldKey: match.fieldKey,
                              proposedVariable: {
                                name: match.fieldKey,
                                category: 'fieldDefinition',
                                type: 'text',
                                required: false
                              }
                            };
                          } else {
                            newMatches[index] = {
                              fieldKey: match.fieldKey,
                              existingVariable: {
                                name: match.proposedVariable?.name || '',
                                category: match.proposedVariable?.category || ''
                              }
                            };
                          }
                          return newMatches;
                        });
                      }}
                    >
                      {match.existingVariable ? 'Switch to New' : 'Switch to Existing'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-action">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleApprove}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Processing...
              </>
            ) : (
              'Approve & Process'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 