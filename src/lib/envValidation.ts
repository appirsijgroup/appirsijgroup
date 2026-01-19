/**
 * Environment Variables Validation
 *
 * Security best practices:
 * 1. Validate all environment variables at build time
 * 2. Throw error early if required variables are missing (server-side only)
 * 3. Type-safe environment variable access
 * 4. Graceful fallback for client-side
 */

type EnvVariable = 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

interface EnvSchema {
  [key: string]: {
    required: boolean;
    validator?: (value: string) => boolean;
    errorMessage?: string;
  };
}

// Define environment variable schema
const envSchema: EnvSchema = {
  NEXT_PUBLIC_SUPABASE_URL: {
    required: true,
    validator: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    errorMessage: 'Must be a valid URL (e.g., https://your-project.supabase.co)'
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    required: true,
    validator: (value) => value.length > 50, // Supabase keys are typically long JWT tokens
    errorMessage: 'Must be a valid Supabase anon key (typically a long JWT token)'
  }
};

// Validate all environment variables (server-side only)
function validateEnv(): void {
  const errors: string[] = [];

  for (const [envVar, config] of Object.entries(envSchema)) {
    const value = process.env[envVar];

    if (config.required && !value) {
      errors.push(`❌ Missing required environment variable: ${envVar}`);
      continue;
    }

    if (value && config.validator && !config.validator(value)) {
      errors.push(
        `❌ Invalid ${envVar}: ${config.errorMessage || 'Format validation failed'}`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      '\n' +
      '═══════════════════════════════════════════════════════════════\n' +
      '  Environment Variables Validation Failed\n' +
      '═══════════════════════════════════════════════════════════════\n' +
      errors.join('\n') +
      '\n\n' +
      'Please check your .env.local file and ensure all required variables are set.\n' +
      'Refer to .env.local.example for the correct format.\n' +
      '═══════════════════════════════════════════════════════════════\n'
    );
  }

}

// Run validation immediately when this module is imported (server-side only)
if (typeof window === 'undefined') {
  // Only run on server side
  validateEnv();
}

/**
 * Type-safe accessor for environment variables
 * Returns undefined if variable is not defined (graceful fallback)
 * Logs warning in development for missing vars
 */
export function getEnvVar(key: EnvVariable): string | undefined {
  const value = process.env[key];

  if (!value) {
    // Only warn in development, fail silently in production for client-side
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    }
    return undefined;
  }

  return value;
}

/**
 * Safely get environment variable with fallback
 */
export function getEnvVarOrDefault(key: EnvVariable, defaultValue: string): string {
  return getEnvVar(key) || defaultValue;
}

/**
 * Check if all required environment variables are set
 * Useful for conditional feature flags
 */
export function isEnvConfigured(): boolean {
  try {
    for (const [envVar, config] of Object.entries(envSchema)) {
      if (config.required && !process.env[envVar]) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

// Re-export for convenience
export { validateEnv };
