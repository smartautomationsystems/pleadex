'use client';

import { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface CaseCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCaseCreated: () => void;
}

type CaseType = 'filing' | 'defending' | null;
type CreationMethod = 'wizard' | 'form' | null;

interface PartyType {
  id: string;
  label: string;
  description: string;
}

export default function CaseCreationWizard({ isOpen, onClose, onCaseCreated }: CaseCreationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [caseType, setCaseType] = useState<CaseType>(null);
  const [creationMethod, setCreationMethod] = useState<CreationMethod>(null);
  const [partyTypes, setPartyTypes] = useState<PartyType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchPartyTypes();
    }
  }, [isOpen]);

  const fetchPartyTypes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/globals');
      if (!response.ok) {
        throw new Error('Failed to fetch party types');
      }
      const data = await response.json();
      setPartyTypes(data.partyTypes || []);
    } catch (error) {
      console.error('Error fetching party types:', error);
      toast.error('Failed to load party types');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaseTypeSelect = (type: CaseType) => {
    setCaseType(type);
    setStep(2);
  };

  const handleCreationMethodSelect = (method: CreationMethod) => {
    setCreationMethod(method);
    if (method === 'form') {
      // Redirect to case details page
      router.push('/dashboard/cases/new');
      onClose();
    } else {
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!caseType) {
      toast.error('Please select a case type');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `New ${caseType === 'filing' ? 'Filing' : 'Defense'} Case`,
          description: `Case type: ${caseType === 'filing' ? 'Filing against someone' : 'Defending against a case'}`,
          status: 'active',
          partyType: caseType === 'filing' ? 'plaintiff' : 'defendant',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create case');
      }

      toast.success('Case created successfully');
      onCaseCreated();
      onClose();
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('Failed to create case');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create New Case</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>

        <div className="space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-600">What type of case are you creating?</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleCaseTypeSelect('filing')}
                  className="btn btn-outline btn-primary"
                >
                  Filing a Case
                </button>
                <button
                  onClick={() => handleCaseTypeSelect('defending')}
                  className="btn btn-outline btn-primary"
                >
                  Defending a Case
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-gray-600">
                {caseType === 'filing'
                  ? 'You are filing a case against someone else.'
                  : 'A case has been filed against you.'}
              </p>
              <p className="text-gray-600">How would you like to create this case?</p>
              <div className="space-y-2">
                <button
                  onClick={() => handleCreationMethodSelect('wizard')}
                  className="btn btn-primary w-full"
                >
                  Use Case Wizard (Recommended)
                </button>
                <button
                  onClick={() => handleCreationMethodSelect('form')}
                  className="btn btn-outline w-full"
                >
                  Fill Out Form Manually
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setStep(1)}
                  className="btn btn-ghost"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-gray-600">
                You've chosen to use the Case Wizard. This will guide you through the process step by step.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setStep(2)}
                  className="btn btn-ghost"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? 'Creating...' : 'Start Wizard'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 