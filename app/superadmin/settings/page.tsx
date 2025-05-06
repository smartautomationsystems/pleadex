'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface SystemSettings {
  // Base Configuration (read from env)
  environment: string;
  nodeEnv: string;
  baseUrl: string;
  
  // MongoDB Configuration
  mongodbUri: string;
  
  // AWS Configuration
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsS3Bucket: string;
  
  // Email Configuration
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecure: boolean;
  
  // Security Settings (modifiable)
  security: {
    minPasswordLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordExpiryDays: number;
  };
  
  // Logging Settings (modifiable)
  logging: {
    logLevel: string;
    notificationEmail: string;
    auditRetentionDays: number;
    enablePerformanceMonitoring: boolean;
  };
  
  // Backup Settings (modifiable)
  backup: {
    schedule: string;
    backupTime: string;
    retentionDays: number;
    maintenanceWindow: string;
  };

  // Speech to Text Settings (modifiable)
  speechToText: {
    deepgramApiKey: string;
    languageModel: string;
    enablePunctuation: boolean;
    enableSmartFormat: boolean;
    enableUtteranceEnd: boolean;
    enableDiarization: boolean;
    enableProfanityFilter: boolean;
    enableNumbers: boolean;
    enableRedaction: boolean;
    activeModel: string;
  };

  // AI Settings (modifiable)
  ai: {
    provider: string;
    openaiConfig: {
      apiKey: string;
      defaultModel: string;
      temperature: number;
      maxTokens: number;
      enableStreaming: boolean;
      enableFunctionCalling: boolean;
      enableContextWindow: boolean;
      contextWindowSize: number;
    };
    anthropicConfig: {
      apiKey: string;
      defaultModel: string;
      temperature: number;
      maxTokens: number;
      enableStreaming: boolean;
      enableContextWindow: boolean;
      contextWindowSize: number;
    };
    activeModel: string;
  };

  // Text to Speech Settings (modifiable)
  textToSpeech: {
    provider: string;
    elevenlabsApiKey: string;
    defaultVoice: string;
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
    enableOptimizeStreamingLatency: boolean;
    activeModel: string;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>({
    environment: '',
    nodeEnv: '',
    baseUrl: '',
    mongodbUri: '',
    awsRegion: '',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsS3Bucket: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpSecure: false,
    security: {
      minPasswordLength: 12,
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      passwordExpiryDays: 90,
    },
    logging: {
      logLevel: 'ERROR',
      notificationEmail: '',
      auditRetentionDays: 90,
      enablePerformanceMonitoring: false,
    },
    backup: {
      schedule: 'Daily',
      backupTime: '00:00',
      retentionDays: 30,
      maintenanceWindow: 'Sunday 00:00-04:00 UTC',
    },
    speechToText: {
      deepgramApiKey: '',
      languageModel: 'nova-2',
      enablePunctuation: true,
      enableSmartFormat: true,
      enableUtteranceEnd: true,
      enableDiarization: false,
      enableProfanityFilter: false,
      enableNumbers: true,
      enableRedaction: false,
      activeModel: 'nova-2',
    },
    textToSpeech: {
      provider: 'elevenlabs',
      elevenlabsApiKey: '',
      defaultVoice: 'Rachel',
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true,
      enableOptimizeStreamingLatency: true,
      activeModel: 'eleven_multilingual_v2',
    },
    ai: {
      provider: 'openai',
      activeModel: 'gpt-4-turbo-preview',
      openaiConfig: {
        apiKey: '',
        defaultModel: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 2000,
        enableStreaming: true,
        enableFunctionCalling: true,
        enableContextWindow: true,
        contextWindowSize: 16000,
      },
      anthropicConfig: {
        apiKey: '',
        defaultModel: 'claude-3-opus-20240229',
        temperature: 0.7,
        maxTokens: 2000,
        enableStreaming: true,
        enableContextWindow: true,
        contextWindowSize: 16000,
      },
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingAIConnection, setTestingAIConnection] = useState(false);
  const [testingTTSConnection, setTestingTTSConnection] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      console.log('Fetched settings:', data);
      
      // Ensure AI settings have the correct structure
      if (data.ai) {
        data.ai = {
          ...data.ai,
          openaiConfig: {
            ...data.ai.openaiConfig,
            apiKey: data.ai.openaiConfig?.apiKey ?? '',
          },
          anthropicConfig: {
            ...data.ai.anthropicConfig,
            apiKey: data.ai.anthropicConfig?.apiKey ?? '',
          },
        };
      }

      // If API keys are masked, keep the existing values
      if (settings) {
        if (data.speechToText?.deepgramApiKey === '********') {
          data.speechToText.deepgramApiKey = settings.speechToText.deepgramApiKey;
        }
        if (data.textToSpeech?.elevenlabsApiKey === '********') {
          data.textToSpeech.elevenlabsApiKey = settings.textToSpeech.elevenlabsApiKey;
        }
        if (data.ai?.openaiConfig?.apiKey === '********') {
          data.ai.openaiConfig.apiKey = settings.ai.openaiConfig.apiKey;
        }
        if (data.ai?.anthropicConfig?.apiKey === '********') {
          data.ai.anthropicConfig.apiKey = settings.ai.anthropicConfig.apiKey;
        }
      }
      
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      // Only send modifiable settings
      const updateData = {
        security: settings.security,
        logging: settings.logging,
        backup: settings.backup,
        speechToText: settings.speechToText,
        ai: settings.ai,
        textToSpeech: settings.textToSpeech,
      };

      console.log('Submitting settings update:', updateData);
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      const result = await response.json();
      console.log('Save result:', result);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testDeepgramConnection = async () => {
    const apiKey = settings?.speechToText.deepgramApiKey;
    if (!apiKey) {
      toast.error('Please enter a Deepgram API key first');
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch('/api/settings/test-deepgram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey,
          options: {
            model: settings.speechToText.languageModel,
            punctuate: settings.speechToText.enablePunctuation,
            smart_format: settings.speechToText.enableSmartFormat,
            utterances: settings.speechToText.enableUtteranceEnd,
            diarize: settings.speechToText.enableDiarization,
            profanity_filter: settings.speechToText.enableProfanityFilter,
            numbers: settings.speechToText.enableNumbers,
            redact: settings.speechToText.enableRedaction,
          }
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to Deepgram');
      }

      toast.success('Successfully connected to Deepgram!');
    } catch (error) {
      console.error('Error testing Deepgram connection:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect to Deepgram');
    } finally {
      setTestingConnection(false);
    }
  };

  const testAIConnection = async () => {
    const currentConfig = settings.ai.provider === 'openai' ? settings.ai.openaiConfig : settings.ai.anthropicConfig;
    const apiKey = currentConfig.apiKey;
    
    if (!apiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    setTestingAIConnection(true);
    try {
      const response = await fetch('/api/settings/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.ai.provider,
          apiKey: apiKey,
          model: settings.ai.activeModel
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to AI provider');
      }

      toast.success(`Successfully connected to ${settings.ai.provider === 'openai' ? 'OpenAI' : 'Anthropic'}!`);
    } catch (error) {
      console.error('Error testing AI connection:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect to AI provider');
    } finally {
      setTestingAIConnection(false);
    }
  };

  const testTTSConnection = async () => {
    const apiKey = settings?.textToSpeech.elevenlabsApiKey;
    if (!apiKey) {
      toast.error('Please enter an ElevenLabs API key first');
      return;
    }

    setTestingTTSConnection(true);
    try {
      const response = await fetch('/api/settings/test-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey,
          modelId: settings.textToSpeech.activeModel
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to ElevenLabs');
      }

      toast.success('Successfully connected to ElevenLabs!');
    } catch (error) {
      console.error('Error testing TTS connection:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect to ElevenLabs');
    } finally {
      setTestingTTSConnection(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-6 flex justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Environment Configuration (Read-only) */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            Environment Configuration
            <span className="badge badge-sm">Read-only</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Environment</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered" 
                value={settings.environment}
                disabled
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Base URL</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered" 
                value={settings.baseUrl}
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* Database Configuration (Read-only) */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            Database Configuration
            <span className="badge badge-sm">Read-only</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">MongoDB URI</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered" 
                value={settings.mongodbUri}
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* AWS Configuration (Read-only) */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            AWS Configuration
            <span className="badge badge-sm">Read-only</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Region</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered" 
                value={settings.awsRegion}
                disabled
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">S3 Bucket</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered" 
                value={settings.awsS3Bucket}
                disabled
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Access Key ID</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered" 
                value={settings.awsAccessKeyId}
                disabled
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Secret Access Key</span>
              </label>
              <input 
                type="password" 
                className="input input-bordered" 
                value={settings.awsSecretAccessKey}
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* Email Configuration (Read-only) */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            Email Configuration
            <span className="badge badge-sm">Read-only</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">SMTP Host</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered" 
                value={settings.smtpHost}
                disabled
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">SMTP Port</span>
              </label>
              <input 
                type="number" 
                className="input input-bordered" 
                value={settings.smtpPort}
                disabled
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">SMTP User</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered" 
                value={settings.smtpUser}
                disabled
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">SMTP Secure</span>
              </label>
              <input 
                type="checkbox" 
                className="toggle toggle-primary" 
                checked={settings.smtpSecure}
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* Speech to Text Configuration */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            Speech to Text Configuration
            <span className="badge badge-primary badge-sm">Modifiable</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Deepgram API Key</span>
                <div className="tooltip" data-tip="Your Deepgram API key. Get one from the Deepgram Console.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <div className="flex gap-2">
                <input 
                  type="password"
                  className="input input-bordered w-full" 
                  value={settings.speechToText.deepgramApiKey}
                  onChange={(e) => setSettings({
                    ...settings,
                    speechToText: {
                      ...settings.speechToText,
                      deepgramApiKey: e.target.value
                    }
                  })}
                  placeholder="Enter your Deepgram API key"
                />
                <button
                  className={`btn btn-primary ${testingConnection ? 'loading' : ''}`}
                  onClick={testDeepgramConnection}
                  disabled={testingConnection || !settings.speechToText.deepgramApiKey}
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Active Model</span>
                <div className="tooltip" data-tip="The AI model currently being used for speech-to-text conversion.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <select 
                className="select select-bordered w-full"
                value={settings.speechToText.activeModel}
                onChange={(e) => setSettings({
                  ...settings,
                  speechToText: {
                    ...settings.speechToText,
                    activeModel: e.target.value,
                    languageModel: e.target.value
                  }
                })}
              >
                <option value="nova-2">Nova 2 (Latest)</option>
                <option value="nova">Nova</option>
                <option value="enhanced">Enhanced</option>
                <option value="base">Base</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Enable Punctuation</span>
                <div className="tooltip" data-tip="Automatically adds punctuation marks to the transcribed text.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary"
                  checked={settings.speechToText.enablePunctuation}
                  onChange={(e) => setSettings({
                    ...settings,
                    speechToText: {
                      ...settings.speechToText,
                      enablePunctuation: e.target.checked
                    }
                  })}
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Enable Smart Format</span>
                <div className="tooltip" data-tip="Automatically formats numbers, dates, times, and other entities in a more readable way.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary"
                  checked={settings.speechToText.enableSmartFormat}
                  onChange={(e) => setSettings({
                    ...settings,
                    speechToText: {
                      ...settings.speechToText,
                      enableSmartFormat: e.target.checked
                    }
                  })}
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Enable Utterance End</span>
                <div className="tooltip" data-tip="Detects when a speaker has finished a sentence or thought, useful for segmenting long audio.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary"
                  checked={settings.speechToText.enableUtteranceEnd}
                  onChange={(e) => setSettings({
                    ...settings,
                    speechToText: {
                      ...settings.speechToText,
                      enableUtteranceEnd: e.target.checked
                    }
                  })}
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Enable Diarization</span>
                <div className="tooltip" data-tip="Identifies and labels different speakers in the audio, useful for multi-person conversations.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary"
                  checked={settings.speechToText.enableDiarization}
                  onChange={(e) => setSettings({
                    ...settings,
                    speechToText: {
                      ...settings.speechToText,
                      enableDiarization: e.target.checked
                    }
                  })}
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Enable Profanity Filter</span>
                <div className="tooltip" data-tip="Automatically filters out or masks profanity in the transcribed text.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary"
                  checked={settings.speechToText.enableProfanityFilter}
                  onChange={(e) => setSettings({
                    ...settings,
                    speechToText: {
                      ...settings.speechToText,
                      enableProfanityFilter: e.target.checked
                    }
                  })}
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Enable Numbers</span>
                <div className="tooltip" data-tip="Converts spoken numbers into their numerical form (e.g., 'one hundred' becomes '100').">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary"
                  checked={settings.speechToText.enableNumbers}
                  onChange={(e) => setSettings({
                    ...settings,
                    speechToText: {
                      ...settings.speechToText,
                      enableNumbers: e.target.checked
                    }
                  })}
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Enable Redaction</span>
                <div className="tooltip" data-tip="Automatically redacts sensitive information like credit card numbers, social security numbers, and other PII.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary"
                  checked={settings.speechToText.enableRedaction}
                  onChange={(e) => setSettings({
                    ...settings,
                    speechToText: {
                      ...settings.speechToText,
                      enableRedaction: e.target.checked
                    }
                  })}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            AI Configuration
            <span className="badge badge-primary badge-sm">Modifiable</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">AI Provider</span>
                <div className="tooltip" data-tip="Choose your preferred AI provider. Each has different models and capabilities.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <select 
                className="select select-bordered w-full"
                value={settings?.ai?.provider ?? 'openai'}
                onChange={(e) => {
                  const newProvider = e.target.value;
                  const defaultModel = newProvider === 'openai' ? 'gpt-4-turbo-preview' : 'claude-3-opus-20240229';
                  setSettings({
                    ...settings,
                    ai: {
                      ...settings.ai,
                      provider: newProvider,
                      activeModel: defaultModel,
                      openaiConfig: {
                        apiKey: settings?.ai?.openaiConfig?.apiKey ?? '',
                        defaultModel: newProvider === 'openai' ? defaultModel : (settings?.ai?.openaiConfig?.defaultModel ?? 'gpt-4-turbo-preview'),
                        temperature: settings?.ai?.openaiConfig?.temperature ?? 0.7,
                        maxTokens: settings?.ai?.openaiConfig?.maxTokens ?? 2000,
                        enableStreaming: settings?.ai?.openaiConfig?.enableStreaming ?? true,
                        enableFunctionCalling: settings?.ai?.openaiConfig?.enableFunctionCalling ?? false,
                        enableContextWindow: settings?.ai?.openaiConfig?.enableContextWindow ?? true,
                        contextWindowSize: settings?.ai?.openaiConfig?.contextWindowSize ?? 16000
                      },
                      anthropicConfig: {
                        apiKey: settings?.ai?.anthropicConfig?.apiKey ?? '',
                        defaultModel: newProvider === 'anthropic' ? defaultModel : (settings?.ai?.anthropicConfig?.defaultModel ?? 'claude-3-opus-20240229'),
                        temperature: settings?.ai?.anthropicConfig?.temperature ?? 0.7,
                        maxTokens: settings?.ai?.anthropicConfig?.maxTokens ?? 2000,
                        enableStreaming: settings?.ai?.anthropicConfig?.enableStreaming ?? true,
                        enableContextWindow: settings?.ai?.anthropicConfig?.enableContextWindow ?? true,
                        contextWindowSize: settings?.ai?.anthropicConfig?.contextWindowSize ?? 16000
                      }
                    }
                  });
                }}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Active Model</span>
                <div className="tooltip" data-tip="The AI model currently being used for text generation.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <select 
                className="select select-bordered w-full"
                value={settings.ai.activeModel}
                onChange={(e) => setSettings({
                  ...settings,
                  ai: {
                    ...settings.ai,
                    activeModel: e.target.value,
                    [settings.ai.provider === 'openai' ? 'openaiConfig' : 'anthropicConfig']: {
                      ...(settings.ai.provider === 'openai' ? settings.ai.openaiConfig : settings.ai.anthropicConfig),
                      defaultModel: e.target.value
                    }
                  }
                })}
              >
                {settings.ai.provider === 'openai' ? (
                  <>
                    <option value="gpt-4-turbo-preview">GPT-4 Turbo (Latest)</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </>
                ) : (
                  <>
                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Temperature</span>
                <div className="tooltip" data-tip="Controls randomness in the output. Lower values are more focused and deterministic, higher values more creative.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                className="range range-primary" 
                value={settings?.ai?.provider === 'openai' 
                  ? settings?.ai?.openaiConfig?.temperature ?? 0.7 
                  : settings?.ai?.anthropicConfig?.temperature ?? 0.7}
                onChange={(e) => setSettings({
                  ...settings,
                  ai: {
                    ...settings.ai,
                    [settings.ai.provider === 'openai' ? 'openaiConfig' : 'anthropicConfig']: {
                      ...(settings.ai.provider === 'openai' ? settings.ai.openaiConfig : settings.ai.anthropicConfig),
                      temperature: parseFloat(e.target.value)
                    }
                  }
                })}
              />
              <div className="flex justify-between text-xs px-2">
                <span>0.0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Max Tokens</span>
                <div className="tooltip" data-tip="Maximum number of tokens to generate in the response. Higher values allow for longer responses but cost more.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <input 
                type="number" 
                className="input input-bordered" 
                min="1"
                max="32000"
                value={settings?.ai?.provider === 'openai' 
                  ? settings?.ai?.openaiConfig?.maxTokens ?? 2000 
                  : settings?.ai?.anthropicConfig?.maxTokens ?? 2000}
                onChange={(e) => setSettings({
                  ...settings,
                  ai: {
                    ...settings.ai,
                    [settings.ai.provider === 'openai' ? 'openaiConfig' : 'anthropicConfig']: {
                      ...(settings.ai.provider === 'openai' ? settings.ai.openaiConfig : settings.ai.anthropicConfig),
                      maxTokens: parseInt(e.target.value) || 2000
                    }
                  }
                })}
              />
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Enable Streaming</span>
                <div className="tooltip" data-tip="Stream responses in real-time as they are generated. Provides faster initial response but may use more tokens.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary"
                  checked={settings?.ai?.provider === 'openai' 
                    ? settings?.ai?.openaiConfig?.enableStreaming ?? true 
                    : settings?.ai?.anthropicConfig?.enableStreaming ?? true}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: {
                      ...settings.ai,
                      [settings.ai.provider === 'openai' ? 'openaiConfig' : 'anthropicConfig']: {
                        ...(settings.ai.provider === 'openai' ? settings.ai.openaiConfig : settings.ai.anthropicConfig),
                        enableStreaming: e.target.checked
                      }
                    }
                  })}
                />
              </label>
            </div>

            {settings?.ai?.provider === 'openai' && (
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Enable Function Calling</span>
                  <div className="tooltip" data-tip="Allow the AI to call predefined functions to perform actions or retrieve information.">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <input 
                    type="checkbox" 
                    className="toggle toggle-primary"
                    checked={settings?.ai?.openaiConfig?.enableFunctionCalling ?? false}
                    onChange={(e) => setSettings({
                      ...settings,
                      ai: {
                        ...settings.ai,
                        openaiConfig: {
                          ...settings.ai.openaiConfig,
                          enableFunctionCalling: e.target.checked
                        }
                      }
                    })}
                  />
                </label>
              </div>
            )}

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Enable Context Window</span>
                <div className="tooltip" data-tip="Maintain conversation history for context. Useful for multi-turn conversations but uses more tokens.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary"
                  checked={settings?.ai?.provider === 'openai' 
                    ? settings?.ai?.openaiConfig?.enableContextWindow ?? true 
                    : settings?.ai?.anthropicConfig?.enableContextWindow ?? true}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: {
                      ...settings.ai,
                      [settings.ai.provider === 'openai' ? 'openaiConfig' : 'anthropicConfig']: {
                        ...(settings.ai.provider === 'openai' ? settings.ai.openaiConfig : settings.ai.anthropicConfig),
                        enableContextWindow: e.target.checked
                      }
                    }
                  })}
                />
              </label>
            </div>

            {(settings?.ai?.provider === 'openai' 
              ? settings?.ai?.openaiConfig?.enableContextWindow ?? true 
              : settings?.ai?.anthropicConfig?.enableContextWindow ?? true) && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Context Window Size</span>
                  <div className="tooltip" data-tip="Maximum number of tokens to keep in conversation history. Higher values allow for longer conversations but use more tokens.">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={settings?.ai?.provider === 'openai' 
                    ? settings?.ai?.openaiConfig?.contextWindowSize ?? 16000 
                    : settings?.ai?.anthropicConfig?.contextWindowSize ?? 16000}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: {
                      ...settings.ai,
                      [settings.ai.provider === 'openai' ? 'openaiConfig' : 'anthropicConfig']: {
                        ...(settings.ai.provider === 'openai' ? settings.ai.openaiConfig : settings.ai.anthropicConfig),
                        contextWindowSize: parseInt(e.target.value)
                      }
                    }
                  })}
                >
                  <option value="4000">4K tokens</option>
                  <option value="8000">8K tokens</option>
                  <option value="16000">16K tokens</option>
                  <option value="32000">32K tokens</option>
                </select>
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text">API Key</span>
                <div className="tooltip" data-tip={`Your ${settings?.ai?.provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key. Get one from the ${settings?.ai?.provider === 'openai' ? 'OpenAI' : 'Anthropic'} Console.`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <div className="flex gap-2">
                <input 
                  type="password"
                  className="input input-bordered w-full" 
                  value={settings?.ai?.provider === 'openai' 
                    ? settings?.ai?.openaiConfig?.apiKey ?? '' 
                    : settings?.ai?.anthropicConfig?.apiKey ?? ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: {
                      ...settings.ai,
                      [settings.ai.provider === 'openai' ? 'openaiConfig' : 'anthropicConfig']: {
                        ...(settings.ai.provider === 'openai' ? settings.ai.openaiConfig : settings.ai.anthropicConfig),
                        apiKey: e.target.value
                      }
                    }
                  })}
                  placeholder={`Enter your ${settings?.ai?.provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
                />
              </div>
            </div>

            <div className="form-control col-span-2">
              <button
                className={`btn btn-primary ${testingAIConnection ? 'loading' : ''}`}
                onClick={testAIConnection}
                disabled={testingAIConnection || (!settings?.ai?.openaiConfig?.apiKey && !settings?.ai?.anthropicConfig?.apiKey)}
              >
                {testingAIConnection ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Text to Speech Configuration */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            Text to Speech Configuration
            <span className="badge badge-primary badge-sm">Modifiable</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">API Key</span>
                <div className="tooltip" data-tip="Your ElevenLabs API key. Get one from the ElevenLabs Console.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <div className="flex gap-2">
                <input 
                  type="password"
                  className="input input-bordered w-full" 
                  value={settings.textToSpeech.elevenlabsApiKey}
                  onChange={(e) => setSettings({
                    ...settings,
                    textToSpeech: {
                      ...settings.textToSpeech,
                      elevenlabsApiKey: e.target.value
                    }
                  })}
                  placeholder="Enter your ElevenLabs API key"
                />
                <button
                  className={`btn btn-primary ${testingTTSConnection ? 'loading' : ''}`}
                  onClick={testTTSConnection}
                  disabled={testingTTSConnection || !settings.textToSpeech.elevenlabsApiKey}
                >
                  {testingTTSConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Active Model</span>
                <div className="tooltip" data-tip="The AI model currently being used for text-to-speech conversion.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <select 
                className="select select-bordered w-full"
                value={settings.textToSpeech.activeModel}
                onChange={(e) => setSettings({
                  ...settings,
                  textToSpeech: {
                    ...settings.textToSpeech,
                    activeModel: e.target.value
                  }
                })}
              >
                <option value="eleven_multilingual_v2">Eleven Multilingual v2</option>
                <option value="eleven_monolingual_v1">Eleven Monolingual v1</option>
                <option value="eleven_turbo_v2">Eleven Turbo v2</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Default Voice</span>
                <div className="tooltip" data-tip="The default voice to use for text-to-speech conversion. Each voice has unique characteristics.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <select 
                className="select select-bordered w-full"
                value={settings.textToSpeech.defaultVoice}
                onChange={(e) => setSettings({
                  ...settings,
                  textToSpeech: {
                    ...settings.textToSpeech,
                    defaultVoice: e.target.value
                  }
                })}
              >
                <option value="Rachel">Rachel</option>
                <option value="Domi">Domi</option>
                <option value="Bella">Bella</option>
                <option value="Antoni">Antoni</option>
                <option value="Elli">Elli</option>
                <option value="Josh">Josh</option>
                <option value="Arnold">Arnold</option>
                <option value="Adam">Adam</option>
                <option value="Sam">Sam</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Stability</span>
                <div className="tooltip" data-tip="Controls how stable the voice is. Lower values make the voice more dynamic, higher values make it more stable.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                className="range range-primary" 
                value={settings.textToSpeech.stability}
                onChange={(e) => setSettings({
                  ...settings,
                  textToSpeech: {
                    ...settings.textToSpeech,
                    stability: parseFloat(e.target.value)
                  }
                })}
              />
              <div className="flex justify-between text-xs px-2">
                <span>0.0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Similarity Boost</span>
                <div className="tooltip" data-tip="Controls how closely the generated speech matches the original voice. Higher values make it more similar to the original voice.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                className="range range-primary" 
                value={settings.textToSpeech.similarityBoost}
                onChange={(e) => setSettings({
                  ...settings,
                  textToSpeech: {
                    ...settings.textToSpeech,
                    similarityBoost: parseFloat(e.target.value)
                  }
                })}
              />
              <div className="flex justify-between text-xs px-2">
                <span>0.0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Style</span>
                <div className="tooltip" data-tip="Controls the speaking style. Higher values make the voice more expressive and dramatic.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                className="range range-primary" 
                value={settings.textToSpeech.style}
                onChange={(e) => setSettings({
                  ...settings,
                  textToSpeech: {
                    ...settings.textToSpeech,
                    style: parseFloat(e.target.value)
                  }
                })}
              />
              <div className="flex justify-between text-xs px-2">
                <span>0.0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Use Speaker Boost</span>
                <div className="tooltip" data-tip="Enhances the clarity and presence of the voice in the generated speech.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary"
                  checked={settings.textToSpeech.useSpeakerBoost}
                  onChange={(e) => setSettings({
                    ...settings,
                    textToSpeech: {
                      ...settings.textToSpeech,
                      useSpeakerBoost: e.target.checked
                    }
                  })}
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Optimize Streaming Latency</span>
                <div className="tooltip" data-tip="Reduces the initial latency when streaming audio, but may slightly impact quality.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary"
                  checked={settings.textToSpeech.enableOptimizeStreamingLatency}
                  onChange={(e) => setSettings({
                    ...settings,
                    textToSpeech: {
                      ...settings.textToSpeech,
                      enableOptimizeStreamingLatency: e.target.checked
                    }
                  })}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings (Modifiable) */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            Security Settings
            <span className="badge badge-primary badge-sm">Modifiable</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Minimum Password Length</span>
              </label>
              <input 
                type="number" 
                className="input input-bordered" 
                min="8" 
                max="32"
                value={settings.security.minPasswordLength}
                onChange={(e) => setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    minPasswordLength: parseInt(e.target.value) || 8
                  }
                })}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Session Timeout (minutes)</span>
              </label>
              <input 
                type="number" 
                className="input input-bordered" 
                min="5"
                value={settings.security.sessionTimeout}
                onChange={(e) => setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    sessionTimeout: parseInt(e.target.value) || 30
                  }
                })}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Failed Login Attempts</span>
              </label>
              <input 
                type="number" 
                className="input input-bordered" 
                min="1"
                value={settings.security.maxLoginAttempts}
                onChange={(e) => setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    maxLoginAttempts: parseInt(e.target.value) || 5
                  }
                })}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Password Expiry (days)</span>
              </label>
              <input 
                type="number" 
                className="input input-bordered" 
                min="0"
                value={settings.security.passwordExpiryDays}
                onChange={(e) => setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    passwordExpiryDays: parseInt(e.target.value) || 90
                  }
                })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logging Settings (Modifiable) */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            Logging Settings
            <span className="badge badge-primary badge-sm">Modifiable</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Log Level</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={settings.logging.logLevel}
                onChange={(e) => setSettings({
                  ...settings,
                  logging: {...settings.logging, logLevel: e.target.value}
                })}
              >
                <option>ERROR</option>
                <option>WARN</option>
                <option>INFO</option>
                <option>DEBUG</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Error Notification Email</span>
              </label>
              <input 
                type="email" 
                className="input input-bordered" 
                placeholder="admin@example.com"
                value={settings.logging.notificationEmail}
                onChange={(e) => setSettings({
                  ...settings,
                  logging: {...settings.logging, notificationEmail: e.target.value}
                })}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Audit Trail Retention (days)</span>
              </label>
              <input 
                type="number" 
                className="input input-bordered" 
                min="30"
                value={settings.logging.auditRetentionDays}
                onChange={(e) => setSettings({
                  ...settings,
                  logging: {...settings.logging, auditRetentionDays: parseInt(e.target.value) || 90}
                })}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Enable Performance Monitoring</span>
              </label>
              <input 
                type="checkbox" 
                className="toggle toggle-primary"
                checked={settings.logging.enablePerformanceMonitoring}
                onChange={(e) => setSettings({
                  ...settings,
                  logging: {...settings.logging, enablePerformanceMonitoring: e.target.checked}
                })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Backup Settings (Modifiable) */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            Backup Settings
            <span className="badge badge-primary badge-sm">Modifiable</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Backup Schedule</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={settings.backup.schedule}
                onChange={(e) => setSettings({
                  ...settings,
                  backup: {...settings.backup, schedule: e.target.value}
                })}
              >
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Backup Time (UTC)</span>
              </label>
              <input 
                type="time" 
                className="input input-bordered"
                value={settings.backup.backupTime}
                onChange={(e) => setSettings({
                  ...settings,
                  backup: {...settings.backup, backupTime: e.target.value}
                })}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Backup Retention (days)</span>
              </label>
              <input 
                type="number" 
                className="input input-bordered" 
                min="7"
                value={settings.backup.retentionDays}
                onChange={(e) => setSettings({
                  ...settings,
                  backup: {...settings.backup, retentionDays: parseInt(e.target.value) || 30}
                })}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Maintenance Window</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={settings.backup.maintenanceWindow}
                onChange={(e) => setSettings({
                  ...settings,
                  backup: {...settings.backup, maintenanceWindow: e.target.value}
                })}
              >
                <option>Sunday 00:00-04:00 UTC</option>
                <option>Saturday 00:00-04:00 UTC</option>
                <option>Custom</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? <span className="loading loading-spinner"></span> : 'Save Changes'}
        </button>
      </div>
    </div>
  );
} 