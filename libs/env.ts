/**
 * Ensures that all required environment variables are present
 * @param vars List of environment variable names to check
 * @throws Error if any required variable is missing
 */
export function ensureEnvVars(...vars: string[]) {
  const missing = vars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Ensures AWS configuration is present
 * @throws Error if any AWS configuration is missing
 */
export function ensureAwsConfig() {
  ensureEnvVars(
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET'
  );
}

/**
 * Ensures OpenAI configuration is present
 * @throws Error if OpenAI API key is missing
 */
export function ensureOpenAIConfig() {
  ensureEnvVars('OPENAI_API_KEY');
}

/**
 * Ensures MongoDB configuration is present
 * @throws Error if MongoDB URI is missing
 */
export function ensureMongoConfig() {
  ensureEnvVars('MONGODB_URI');
} 