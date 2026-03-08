/**
 * Configuration loader for cron-test39
 * Supports YAML/JSON configs, environment variable overrides, and profile-based configs
 */

import { cosmiconfigSync, CosmiconfigResult } from 'cosmiconfig';
import * as yaml from 'yaml';

/** Configuration profile type */
export type ConfigProfile = 'dev' | 'ci' | 'prod';

/** Configuration options interface */
export interface ConfigOptions {
  /** Timeout in milliseconds */
  timeout: number;
  /** Number of parallel workers */
  parallel: number;
  /** Verbose output mode */
  verbose: boolean;
  /** CI mode (non-interactive) */
  ci: boolean;
  /** Database file path */
  databasePath: string;
  /** Active profile */
  profile: ConfigProfile;
}

/** Partial config from file/env */
export type PartialConfig = Partial<ConfigOptions>;

/** Explorer options for cosmiconfig */
const moduleName = 'crontest39';

/** Default configurations per profile */
const profileDefaults: Record<ConfigProfile, PartialConfig> = {
  dev: {
    timeout: 30000,
    parallel: 4,
    verbose: true,
    ci: false,
    databasePath: './crontest39-dev.db',
  },
  ci: {
    timeout: 60000,
    parallel: 8,
    verbose: false,
    ci: true,
    databasePath: ':memory:',
  },
  prod: {
    timeout: 120000,
    parallel: 16,
    verbose: false,
    ci: false,
    databasePath: './crontest39.db',
  },
};

/** Global defaults */
const globalDefaults: ConfigOptions = {
  timeout: 30000,
  parallel: 4,
  verbose: false,
  ci: false,
  databasePath: './crontest39.db',
  profile: 'dev',
};

/**
 * Parse environment variables with CRONTEST39_ prefix
 * @returns Partial config from environment variables
 */
function parseEnvOverrides(): PartialConfig {
  const envConfig: PartialConfig = {};
  const env = process.env;

  if (env.CRONTEST39_TIMEOUT) {
    const timeout = parseInt(env.CRONTEST39_TIMEOUT, 10);
    if (!isNaN(timeout)) {
      envConfig.timeout = timeout;
    }
  }

  if (env.CRONTEST39_PARALLEL) {
    const parallel = parseInt(env.CRONTEST39_PARALLEL, 10);
    if (!isNaN(parallel)) {
      envConfig.parallel = parallel;
    }
  }

  if (env.CRONTEST39_VERBOSE !== undefined) {
    envConfig.verbose = env.CRONTEST39_VERBOSE.toLowerCase() === 'true' || env.CRONTEST39_VERBOSE === '1';
  }

  if (env.CRONTEST39_CI !== undefined) {
    envConfig.ci = env.CRONTEST39_CI.toLowerCase() === 'true' || env.CRONTEST39_CI === '1';
  }

  if (env.CRONTEST39_DATABASE_PATH) {
    envConfig.databasePath = env.CRONTEST39_DATABASE_PATH;
  }

  if (env.CRONTEST39_PROFILE) {
    const profile = env.CRONTEST39_PROFILE as ConfigProfile;
    if (['dev', 'ci', 'prod'].includes(profile)) {
      envConfig.profile = profile;
    }
  }

  return envConfig;
}

/**
 * Custom YAML loader for cosmiconfig
 */
const yamlLoader = (filepath: string, content: string): unknown => {
  return yaml.parse(content);
};

/**
 * Load configuration from file using cosmiconfig
 * @returns Config file content or null if not found
 */
function loadConfigFile(): PartialConfig {
  const explorer = cosmiconfigSync(moduleName, {
    searchPlaces: [
      '.crontest39rc',
      '.crontest39rc.json',
      '.crontest39rc.yaml',
      '.crontest39rc.yml',
      'crontest39.config.js',
      'crontest39.config.yaml',
      'crontest39.config.yml',
      'package.json',
    ],
    loaders: {
      '.yaml': yamlLoader,
      '.yml': yamlLoader,
    },
  });

  const result: CosmiconfigResult = explorer.search();

  if (result && result.config) {
    // Handle package.json case where config is nested under moduleName
    if (typeof result.config === 'object' && result.config !== null) {
      return result.config as PartialConfig;
    }
  }

  return {};
}

/**
 * Merge configurations in order of precedence:
 * 1. Environment variables (highest)
 * 2. Config file
 * 3. Profile defaults
 * 4. Global defaults (lowest)
 *
 * @param options - Optional overrides
 * @returns Merged configuration
 */
function mergeConfig(options?: PartialConfig): ConfigOptions {
  // Start with global defaults
  const merged: ConfigOptions = { ...globalDefaults };

  // Determine profile (from options, env, or default)
  const envOverrides = parseEnvOverrides();
  const profile = options?.profile ?? envOverrides.profile ?? merged.profile;
  merged.profile = profile;

  // Apply profile defaults
  const profileConfig = profileDefaults[profile];
  Object.assign(merged, profileConfig);

  // Apply config file settings
  const fileConfig = loadConfigFile();
  Object.assign(merged, fileConfig);

  // Apply environment variable overrides
  Object.assign(merged, envOverrides);

  // Apply explicit options (highest precedence)
  if (options) {
    Object.assign(merged, options);
  }

  return merged;
}

/**
 * Load configuration with all overrides applied
 * @param options - Optional configuration overrides
 * @returns Complete configuration object
 */
export function loadConfig(options?: PartialConfig): ConfigOptions {
  return mergeConfig(options);
}

/**
 * Get default configuration for a specific profile
 * @param profile - The configuration profile
 * @returns Default configuration for the profile
 */
export function getProfileDefaults(profile: ConfigProfile): ConfigOptions {
  return {
    ...globalDefaults,
    ...profileDefaults[profile],
    profile,
  };
}

/**
 * Validate configuration options
 * @param config - Configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateConfig(config: PartialConfig): string[] {
  const errors: string[] = [];

  if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout < 0)) {
    errors.push('timeout must be a non-negative number');
  }

  if (config.parallel !== undefined && (typeof config.parallel !== 'number' || config.parallel < 1)) {
    errors.push('parallel must be a positive number');
  }

  if (config.verbose !== undefined && typeof config.verbose !== 'boolean') {
    errors.push('verbose must be a boolean');
  }

  if (config.ci !== undefined && typeof config.ci !== 'boolean') {
    errors.push('ci must be a boolean');
  }

  if (config.databasePath !== undefined && typeof config.databasePath !== 'string') {
    errors.push('databasePath must be a string');
  }

  if (config.profile !== undefined && !['dev', 'ci', 'prod'].includes(config.profile)) {
    errors.push('profile must be one of: dev, ci, prod');
  }

  return errors;
}

export default loadConfig;
