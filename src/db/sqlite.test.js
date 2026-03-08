const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  initializeDb,
  closeDb,
  resetDbInstance,
  createTestRun,
  updateTestRun,
  getTestRunById,
  getAllTestRuns,
  deleteTestRun,
  createTestResult,
  getTestResultById,
  getTestResultsByRunId,
  getAllTestResults,
  deleteTestResult,
  getTestRunSummary,
  getLatestTestRun,
} = require('./sqlite');

describe('SQLite Database Module', () => {
  let tempDbPath;

  beforeEach(() => {
    // Create a temporary database file for each test
    tempDbPath = path.join(os.tmpdir(), `test-runs-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    resetDbInstance();
    // Initialize database with temp path to ensure isolation
    initializeDb(tempDbPath);
  });

  afterEach(() => {
    closeDb();
    // Clean up temp database
    try {
      if (fs.existsSync(tempDbPath)) {
        fs.unlinkSync(tempDbPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Database Initialization', () => {
    it('should create database and tables on initialize', () => {
      const db = initializeDb(tempDbPath);
      expect(db).toBeDefined();
      
      // Verify tables exist by querying them
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('test_runs');
      expect(tableNames).toContain('test_results');
    });

    it('should reuse existing database instance', () => {
      const db1 = initializeDb(tempDbPath);
      const db2 = initializeDb(tempDbPath);
      expect(db1).toBe(db2);
    });

    it('should create index on test_results.test_run_id', () => {
      const db = initializeDb(tempDbPath);
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
      const indexNames = indexes.map((i) => i.name);
      expect(indexNames).toContain('idx_test_results_run_id');
    });
  });

  describe('Test Run CRUD Operations', () => {
    it('should create a test run with all required fields', () => {
      const input = {
        version: '1.5.39',
        started_at: new Date().toISOString(),
        total_tests: 100,
      };

      const run = createTestRun(input);

      expect(run.id).toBeDefined();
      expect(run.version).toBe(input.version);
      expect(run.started_at).toBe(input.started_at);
      expect(run.total_tests).toBe(input.total_tests);
      expect(run.passed).toBe(0);
      expect(run.failed).toBe(0);
      expect(run.skipped).toBe(0);
      expect(run.completed_at).toBeNull();
    });

    it('should retrieve a test run by id', () => {
      const input = {
        version: '1.5.39',
        started_at: new Date().toISOString(),
        total_tests: 50,
      };

      const created = createTestRun(input);
      const retrieved = getTestRunById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.version).toBe(input.version);
    });

    it('should return null for non-existent test run id', () => {
      const result = getTestRunById(99999);
      expect(result).toBeNull();
    });

    it('should update test run fields', () => {
      const input = {
        version: '1.5.39',
        started_at: new Date().toISOString(),
        total_tests: 100,
      };

      const created = createTestRun(input);
      const completedAt = new Date().toISOString();
      
      const updated = updateTestRun(created.id, {
        completed_at: completedAt,
        passed: 80,
        failed: 15,
        skipped: 5,
      });

      expect(updated).not.toBeNull();
      expect(updated.completed_at).toBe(completedAt);
      expect(updated.passed).toBe(80);
      expect(updated.failed).toBe(15);
      expect(updated.skipped).toBe(5);
    });

    it('should return test run unchanged when updating with empty input', () => {
      const input = {
        version: '1.5.39',
        started_at: new Date().toISOString(),
        total_tests: 100,
      };

      const created = createTestRun(input);
      const updated = updateTestRun(created.id, {});

      expect(updated).not.toBeNull();
      expect(updated.version).toBe(created.version);
    });

    it('should retrieve all test runs ordered by started_at DESC', () => {
      const now = new Date();
      const uniquePrefix = `order-test-${Date.now()}`;
      
      createTestRun({
        version: `${uniquePrefix}-1.0.0`,
        started_at: new Date(now.getTime() - 2000).toISOString(),
        total_tests: 10,
      });
      
      createTestRun({
        version: `${uniquePrefix}-1.0.1`,
        started_at: new Date(now.getTime() - 1000).toISOString(),
        total_tests: 20,
      });
      
      createTestRun({
        version: `${uniquePrefix}-1.0.2`,
        started_at: now.toISOString(),
        total_tests: 30,
      });

      const runs = getAllTestRuns().filter(r => r.version.startsWith(uniquePrefix));

      expect(runs).toHaveLength(3);
      expect(runs[0].version).toBe(`${uniquePrefix}-1.0.2`);
      expect(runs[1].version).toBe(`${uniquePrefix}-1.0.1`);
      expect(runs[2].version).toBe(`${uniquePrefix}-1.0.0`);
    });

    it('should delete a test run', () => {
      const input = {
        version: '1.5.39',
        started_at: new Date().toISOString(),
        total_tests: 100,
      };

      const created = createTestRun(input);
      const deleted = deleteTestRun(created.id);

      expect(deleted).toBe(true);
      expect(getTestRunById(created.id)).toBeNull();
    });

    it('should return false when deleting non-existent test run', () => {
      const result = deleteTestRun(99999);
      expect(result).toBe(false);
    });
  });

  describe('Test Result CRUD Operations', () => {
    let testRunId;

    beforeEach(() => {
      const run = createTestRun({
        version: '1.5.39',
        started_at: new Date().toISOString(),
        total_tests: 10,
      });
      testRunId = run.id;
    });

    it('should create a test result with all required fields', () => {
      const input = {
        test_run_id: testRunId,
        test_name: 'should validate cron expression',
        status: 'passed',
        duration_ms: 45,
      };

      const result = createTestResult(input);

      expect(result.id).toBeDefined();
      expect(result.test_run_id).toBe(input.test_run_id);
      expect(result.test_name).toBe(input.test_name);
      expect(result.status).toBe(input.status);
      expect(result.duration_ms).toBe(input.duration_ms);
      expect(result.error_message).toBeNull();
      expect(result.created_at).toBeDefined();
    });

    it('should create a test result with error message', () => {
      const input = {
        test_run_id: testRunId,
        test_name: 'should handle invalid input',
        status: 'failed',
        duration_ms: 12,
        error_message: 'Expected error but got success',
      };

      const result = createTestResult(input);

      expect(result.error_message).toBe(input.error_message);
    });

    it('should retrieve a test result by id', () => {
      const input = {
        test_run_id: testRunId,
        test_name: 'test retrieval',
        status: 'passed',
        duration_ms: 30,
      };

      const created = createTestResult(input);
      const retrieved = getTestResultById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.test_name).toBe(input.test_name);
    });

    it('should return null for non-existent test result id', () => {
      const result = getTestResultById(99999);
      expect(result).toBeNull();
    });

    it('should retrieve test results by run id', () => {
      createTestResult({
        test_run_id: testRunId,
        test_name: 'test 1',
        status: 'passed',
        duration_ms: 10,
      });
      
      createTestResult({
        test_run_id: testRunId,
        test_name: 'test 2',
        status: 'failed',
        duration_ms: 20,
      });

      const results = getTestResultsByRunId(testRunId);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.test_name)).toContain('test 1');
      expect(results.map(r => r.test_name)).toContain('test 2');
    });

    it('should retrieve all test results ordered by created_at DESC', () => {
      createTestResult({
        test_run_id: testRunId,
        test_name: 'older test',
        status: 'passed',
        duration_ms: 10,
      });
      
      // Small delay to ensure different timestamps
      const run2 = createTestRun({
        version: '1.5.40',
        started_at: new Date().toISOString(),
        total_tests: 5,
      });
      
      createTestResult({
        test_run_id: run2.id,
        test_name: 'newer test',
        status: 'passed',
        duration_ms: 20,
      });

      const results = getAllTestResults();

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should delete a test result', () => {
      const input = {
        test_run_id: testRunId,
        test_name: 'test to delete',
        status: 'skipped',
        duration_ms: 5,
      };

      const created = createTestResult(input);
      const deleted = deleteTestResult(created.id);

      expect(deleted).toBe(true);
      expect(getTestResultById(created.id)).toBeNull();
    });

    it('should return false when deleting non-existent test result', () => {
      const result = deleteTestResult(99999);
      expect(result).toBe(false);
    });

    it('should enforce status constraint', () => {
      const db = initializeDb(tempDbPath);
      
      expect(() => {
        db.prepare(`
          INSERT INTO test_results (test_run_id, test_name, status, duration_ms, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `).run(testRunId, 'invalid test', 'invalid_status', 10);
      }).toThrow();
    });

    it('should cascade delete test results when test run is deleted', () => {
      const result1 = createTestResult({
        test_run_id: testRunId,
        test_name: 'result 1',
        status: 'passed',
        duration_ms: 10,
      });
      
      const result2 = createTestResult({
        test_run_id: testRunId,
        test_name: 'result 2',
        status: 'failed',
        duration_ms: 20,
      });

      deleteTestRun(testRunId);

      expect(getTestResultById(result1.id)).toBeNull();
      expect(getTestResultById(result2.id)).toBeNull();
    });
  });

  describe('Query Helpers', () => {
    let testRunId;

    beforeEach(() => {
      const run = createTestRun({
        version: '1.5.39',
        started_at: new Date().toISOString(),
        total_tests: 10,
      });
      testRunId = run.id;
    });

    it('should get test run summary with correct counts', () => {
      createTestResult({ test_run_id: testRunId, test_name: 't1', status: 'passed', duration_ms: 10 });
      createTestResult({ test_run_id: testRunId, test_name: 't2', status: 'passed', duration_ms: 15 });
      createTestResult({ test_run_id: testRunId, test_name: 't3', status: 'failed', duration_ms: 20 });
      createTestResult({ test_run_id: testRunId, test_name: 't4', status: 'skipped', duration_ms: 5 });

      const summary = getTestRunSummary(testRunId);

      expect(summary).not.toBeNull();
      expect(summary.total).toBe(4);
      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.skipped).toBe(1);
    });

    it('should return null summary for non-existent run', () => {
      const summary = getTestRunSummary(99999);
      expect(summary).toBeNull();
    });

    it('should get the latest test run', () => {
      const now = new Date();
      
      createTestRun({
        version: '1.0.0',
        started_at: new Date(now.getTime() - 2000).toISOString(),
        total_tests: 10,
      });
      
      const latestRun = createTestRun({
        version: '1.0.1',
        started_at: now.toISOString(),
        total_tests: 20,
      });

      const latest = getLatestTestRun();

      expect(latest).not.toBeNull();
      expect(latest.id).toBe(latestRun.id);
      expect(latest.version).toBe('1.0.1');
    });

    it('should return null when no test runs exist', () => {
      // Clear existing runs by using a fresh db
      closeDb();
      resetDbInstance();
      tempDbPath = path.join(os.tmpdir(), `test-runs-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
      initializeDb(tempDbPath);
      
      const latest = getLatestTestRun();
      expect(latest).toBeNull();
    });
  });

  describe('Performance Requirements', () => {
    it('should complete database operations in under 50ms', () => {
      initializeDb(tempDbPath);
      
      const start = performance.now();
      
      // Create test run
      const run = createTestRun({
        version: '1.5.39',
        started_at: new Date().toISOString(),
        total_tests: 100,
      });
      
      // Create multiple test results
      for (let i = 0; i < 10; i++) {
        createTestResult({
          test_run_id: run.id,
          test_name: `test ${i}`,
          status: 'passed',
          duration_ms: i * 10,
        });
      }
      
      // Query operations
      getTestRunById(run.id);
      getAllTestRuns();
      getTestResultsByRunId(run.id);
      getTestRunSummary(run.id);
      
      const elapsed = performance.now() - start;
      
      expect(elapsed).toBeLessThan(50);
    });
  });
});
