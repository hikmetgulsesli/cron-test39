/**
 * Tests for configuration loader
 */

import { loadConfig, getProfileDefaults, validateConfig, ConfigProfile, ConfigOptions } from './loader';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    delete process.env.CRONTEST39_TIMEOUT;
    delete process.env.CRONTEST39_PARALLEL;
    delete process.env.CRONTEST39_VERBOSE;
    delete process.env.CRONTEST39_CI;
    delete process.env.CRONTEST39_DATABASE_PATH;
    delete process.env.CRONTEST39_PROFILE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('default configuration', () => {
    it('should return default config when no options provided', () => {
      const config = loadConfig();

      expect(config.timeout).toBe(30000);
      expect(config.parallel).toBe(4);
      expect(config.verbose).toBe(true); // dev profile default
      expect(config.ci).toBe(false);
      expect(config.databasePath).toBe('./crontest39-dev.db'); // dev profile default
      expect(config.profile).toBe('dev');
    });

    it('should use dev profile defaults', () => {
      const config = loadConfig({ profile: 'dev' });

      expect(config.timeout).toBe(30000);
      expect(config.parallel).toBe(4);
      expect(config.verbose).toBe(true);
      expect(config.ci).toBe(false);
      expect(config.databasePath).toBe('./crontest39-dev.db');
    });

    it('should use ci profile defaults', () => {
      const config = loadConfig({ profile: 'ci' });

      expect(config.timeout).toBe(60000);
      expect(config.parallel).toBe(8);
      expect(config.verbose).toBe(false);
      expect(config.ci).toBe(true);
      expect(config.databasePath).toBe(':memory:');
    });

    it('should use prod profile defaults', () => {
      const config = loadConfig({ profile: 'prod' });

      expect(config.timeout).toBe(120000);
      expect(config.parallel).toBe(16);
      expect(config.verbose).toBe(false);
      expect(config.ci).toBe(false);
      expect(config.databasePath).toBe('./crontest39.db');
    });
  });

  describe('environment variable overrides', () => {
    it('should override timeout from environment variable', () => {
      process.env.CRONTEST39_TIMEOUT = '45000';
      const config = loadConfig();

      expect(config.timeout).toBe(45000);
    });

    it('should override parallel from environment variable', () => {
      process.env.CRONTEST39_PARALLEL = '8';
      const config = loadConfig();

      expect(config.parallel).toBe(8);
    });

    it('should override verbose from environment variable with "true"', () => {
      process.env.CRONTEST39_VERBOSE = 'true';
      const config = loadConfig();

      expect(config.verbose).toBe(true);
    });

    it('should override verbose from environment variable with "1"', () => {
      process.env.CRONTEST39_VERBOSE = '1';
      const config = loadConfig();

      expect(config.verbose).toBe(true);
    });

    it('should override ci from environment variable', () => {
      process.env.CRONTEST39_CI = 'true';
      const config = loadConfig();

      expect(config.ci).toBe(true);
    });

    it('should override databasePath from environment variable', () => {
      process.env.CRONTEST39_DATABASE_PATH = '/custom/path/db.sqlite';
      const config = loadConfig();

      expect(config.databasePath).toBe('/custom/path/db.sqlite');
    });

    it('should override profile from environment variable', () => {
      process.env.CRONTEST39_PROFILE = 'prod';
      const config = loadConfig();

      expect(config.profile).toBe('prod');
      expect(config.timeout).toBe(120000); // prod default
    });

    it('should ignore invalid profile from environment variable', () => {
      process.env.CRONTEST39_PROFILE = 'invalid';
      const config = loadConfig();

      expect(config.profile).toBe('dev'); // fallback to dev
    });

    it('should ignore invalid timeout from environment variable', () => {
      process.env.CRONTEST39_TIMEOUT = 'not-a-number';
      const config = loadConfig();

      expect(config.timeout).toBe(30000); // dev default
    });
  });

  describe('explicit options override', () => {
    it('should override all settings with explicit options', () => {
      const options: Partial<ConfigOptions> = {
        timeout: 50000,
        parallel: 10,
        verbose: true,
        ci: true,
        databasePath: '/custom/db.sqlite',
        profile: 'ci',
      };

      const config = loadConfig(options);

      expect(config.timeout).toBe(50000);
      expect(config.parallel).toBe(10);
      expect(config.verbose).toBe(true);
      expect(config.ci).toBe(true);
      expect(config.databasePath).toBe('/custom/db.sqlite');
      expect(config.profile).toBe('ci');
    });

    it('should override environment variables with explicit options', () => {
      process.env.CRONTEST39_TIMEOUT = '45000';
      const config = loadConfig({ timeout: 55000 });

      expect(config.timeout).toBe(55000);
    });
  });

  describe('precedence order', () => {
    it('should apply precedence: defaults < profile < env < options', () => {
      process.env.CRONTEST39_TIMEOUT = '45000';
      const config = loadConfig({ timeout: 55000, profile: 'prod' });

      // Explicit option should win over env
      expect(config.timeout).toBe(55000);
      // But other values should come from profile (prod)
      expect(config.parallel).toBe(16);
    });
  });
});

describe('getProfileDefaults', () => {
  it('should return dev profile defaults', () => {
    const defaults = getProfileDefaults('dev');

    expect(defaults.timeout).toBe(30000);
    expect(defaults.parallel).toBe(4);
    expect(defaults.verbose).toBe(true);
    expect(defaults.ci).toBe(false);
    expect(defaults.databasePath).toBe('./crontest39-dev.db');
    expect(defaults.profile).toBe('dev');
  });

  it('should return ci profile defaults', () => {
    const defaults = getProfileDefaults('ci');

    expect(defaults.timeout).toBe(60000);
    expect(defaults.parallel).toBe(8);
    expect(defaults.verbose).toBe(false);
    expect(defaults.ci).toBe(true);
    expect(defaults.databasePath).toBe(':memory:');
    expect(defaults.profile).toBe('ci');
  });

  it('should return prod profile defaults', () => {
    const defaults = getProfileDefaults('prod');

    expect(defaults.timeout).toBe(120000);
    expect(defaults.parallel).toBe(16);
    expect(defaults.verbose).toBe(false);
    expect(defaults.ci).toBe(false);
    expect(defaults.databasePath).toBe('./crontest39.db');
    expect(defaults.profile).toBe('prod');
  });
});

describe('validateConfig', () => {
  it('should return empty array for valid config', () => {
    const errors = validateConfig({
      timeout: 30000,
      parallel: 4,
      verbose: false,
      ci: false,
      databasePath: './test.db',
      profile: 'dev',
    });

    expect(errors).toEqual([]);
  });

  it('should return empty array for empty config', () => {
    const errors = validateConfig({});
    expect(errors).toEqual([]);
  });

  it('should error on negative timeout', () => {
    const errors = validateConfig({ timeout: -1 });
    expect(errors).toContain('timeout must be a non-negative number');
  });

  it('should error on zero parallel', () => {
    const errors = validateConfig({ parallel: 0 });
    expect(errors).toContain('parallel must be a positive number');
  });

  it('should error on negative parallel', () => {
    const errors = validateConfig({ parallel: -1 });
    expect(errors).toContain('parallel must be a positive number');
  });

  it('should error on non-boolean verbose', () => {
    const errors = validateConfig({ verbose: 'yes' as unknown as boolean });
    expect(errors).toContain('verbose must be a boolean');
  });

  it('should error on non-boolean ci', () => {
    const errors = validateConfig({ ci: 1 as unknown as boolean });
    expect(errors).toContain('ci must be a boolean');
  });

  it('should error on non-string databasePath', () => {
    const errors = validateConfig({ databasePath: 123 as unknown as string });
    expect(errors).toContain('databasePath must be a string');
  });

  it('should error on invalid profile', () => {
    const errors = validateConfig({ profile: 'invalid' as ConfigProfile });
    expect(errors).toContain('profile must be one of: dev, ci, prod');
  });

  it('should return multiple errors for invalid config', () => {
    const errors = validateConfig({
      timeout: -1,
      parallel: 0,
      verbose: 'yes' as unknown as boolean,
    });

    expect(errors).toContain('timeout must be a non-negative number');
    expect(errors).toContain('parallel must be a positive number');
    expect(errors).toContain('verbose must be a boolean');
  });
});
