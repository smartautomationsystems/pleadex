import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import { connectToMongo } from '@/libs/mongo';
import { WithId, Document } from 'mongodb';

// Types
interface SecuritySettings {
  minPasswordLength: number;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordExpiryDays: number;
}

interface LoggingSettings {
  logLevel: string;
  notificationEmail: string;
  auditRetentionDays: number;
  enablePerformanceMonitoring: boolean;
}

interface BackupSettings {
  schedule: string;
  backupTime: string;
  retentionDays: number;
  maintenanceWindow: string;
}

interface SpeechToTextSettings {
  activeModel: string;
  deepgramApiKey: string;
  languageModel: string;
  enablePunctuation: boolean;
  enableSmartFormat: boolean;
  enableUtteranceEnd: boolean;
  enableDiarization: boolean;
  enableProfanityFilter: boolean;
  enableNumbers: boolean;
  enableRedaction: boolean;
}

interface TextToSpeechSettings {
  activeModel: string;
  provider: string;
  elevenlabsApiKey: string;
  defaultVoice: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  enableOptimizeStreamingLatency: boolean;
  modelId: string;
}

interface AISettings {
  activeModel: string;
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
}

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
  
  // Modifiable Settings
  security: SecuritySettings;
  logging: LoggingSettings;
  backup: BackupSettings;
  speechToText: SpeechToTextSettings;
  textToSpeech: TextToSpeechSettings;
  ai: AISettings;
}

interface ModifiableSettings {
  security: SecuritySettings;
  logging: LoggingSettings;
  backup: BackupSettings;
  speechToText: SpeechToTextSettings;
  textToSpeech: TextToSpeechSettings;
  ai: AISettings;
}

interface SettingsDocument extends ModifiableSettings {
  _id: string;
}

// Get environment-based settings
function getEnvSettings(): Partial<SystemSettings> {
  return {
    // Base Configuration
    environment: process.env.NODE_ENV === 'development' ? 'Development' : 
                process.env.NODE_ENV === 'test' ? 'Staging' : 'Production',
    nodeEnv: process.env.NODE_ENV || 'development',
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    
    // MongoDB Configuration
    mongodbUri: maskSecret(process.env.MONGODB_URI),
    
    // AWS Configuration
    awsRegion: process.env.AWS_REGION || '',
    awsAccessKeyId: maskSecret(process.env.AWS_ACCESS_KEY_ID),
    awsSecretAccessKey: maskSecret(process.env.AWS_SECRET_ACCESS_KEY),
    awsS3Bucket: process.env.AWS_S3_BUCKET || '',
    
    // Email Configuration
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: maskSecret(process.env.SMTP_USER),
    smtpSecure: process.env.SMTP_SECURE === 'true',
  };
}

// Mask sensitive values
function maskSecret(value: string | undefined): string {
  if (!value) return '';
  if (value.length <= 8) return '*'.repeat(value.length);
  return value.slice(0, 4) + '*'.repeat(value.length - 8) + value.slice(-4);
}

// GET /api/settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await connectToMongo();
    const db = client.db();
    const dbSettings = await db.collection<SettingsDocument>('settings').findOne({
      _id: 'system_settings'
    });
    
    console.log('Retrieved settings from DB:', dbSettings);

    // Get environment settings
    const envSettings = getEnvSettings();
    
    // Combine settings
    const settings: SystemSettings = {
      ...envSettings,
      security: dbSettings?.security || {
        minPasswordLength: 12,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        passwordExpiryDays: 90,
      },
      logging: dbSettings?.logging || {
        logLevel: 'ERROR',
        notificationEmail: '',
        auditRetentionDays: 90,
        enablePerformanceMonitoring: false,
      },
      backup: dbSettings?.backup || {
        schedule: 'Daily',
        backupTime: '00:00',
        retentionDays: 30,
        maintenanceWindow: 'Sunday 00:00-04:00 UTC',
      },
      speechToText: dbSettings?.speechToText || {
        activeModel: 'nova-2',
        deepgramApiKey: '',
        languageModel: 'nova-2',
        enablePunctuation: true,
        enableSmartFormat: true,
        enableUtteranceEnd: true,
        enableDiarization: false,
        enableProfanityFilter: false,
        enableNumbers: true,
        enableRedaction: false,
      },
      textToSpeech: dbSettings?.textToSpeech || {
        activeModel: 'eleven_multilingual_v2',
        provider: 'elevenlabs',
        elevenlabsApiKey: '',
        defaultVoice: 'Rachel',
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.0,
        useSpeakerBoost: true,
        enableOptimizeStreamingLatency: true,
        modelId: 'eleven_multilingual_v2',
      },
      ai: dbSettings?.ai || {
        activeModel: 'gpt-4-turbo-preview',
        provider: 'openai',
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
    } as SystemSettings;

    // Only mask environment variables, not user-provided API keys
    const maskedSettings = {
      ...settings,
      awsSecretAccessKey: settings.awsSecretAccessKey ? '********' : '',
      mongodbUri: settings.mongodbUri ? '********' : '',
    };

    console.log('Merged settings:', maskedSettings);
    return NextResponse.json(maskedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings: Partial<SystemSettings> = await request.json();
    console.log('Received settings update:', settings);
    
    // Validate required fields
    if (!settings.security || !settings.logging || !settings.backup || !settings.speechToText || !settings.ai) {
      return NextResponse.json(
        { error: 'Missing required settings' },
        { status: 400 }
      );
    }
    
    const client = await connectToMongo();
    const db = client.db();
    
    // Only allow updating modifiable settings
    const updateData: ModifiableSettings = {
      security: settings.security,
      logging: settings.logging,
      backup: settings.backup,
      speechToText: settings.speechToText,
      textToSpeech: settings.textToSpeech,
      ai: settings.ai,
    };

    const result = await db.collection<SettingsDocument>('settings').updateOne(
      { _id: 'system_settings' },
      { $set: updateData },
      { upsert: true }
    );

    console.log('Update result:', result);
    return NextResponse.json({ 
      message: 'Settings updated successfully',
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 