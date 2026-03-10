import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';

export interface TestRun {
  id: number;
  version: string;
  started_at: string;
  completed_at: string | null;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface TestResult {
  id: number;
  test_run_id: number;
  test_name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  error_message: string | null;
  created_at: string;
}

export interface CreateTestRunInput {
  version: string;
  started_at: string;
  total_tests: number;
}

export interface UpdateTestRunInput {
  completed_at?: string;
  passed?: number;
  failed?: number;
  skipped?: number;
}

export interface CreateTestResultInput {
  test_run_id: number;
  test_name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  error_message?: string | null;
}

let dbInstance: DatabaseSync | null = null;

export function initializeDb(dbPath?: string): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const targetPath = dbPath || path.join(process.cwd(), 'test-runs.db');
  const db = new DatabaseSync(targetPath);

  // Create test_runs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      total_tests INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Create test_results table with foreign key
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_run_id INTEGER NOT NULL,
      test_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('passed', 'failed', 'skipped')),
      duration_ms INTEGER NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
    )
  `);

  // Create index for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON test_results(test_run_id)
  `);

  dbInstance = db;
  return db;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function resetDbInstance(): void {
  dbInstance = null;
}

// Test Run CRUD Operations

export function createTestRun(input: CreateTestRunInput): TestRun {
  const db = initializeDb();
  const insert = db.prepare(`
    INSERT INTO test_runs (version, started_at, total_tests)
    VALUES (?, ?, ?)
  `);
  const result = insert.run(input.version, input.started_at, input.total_tests);
  
  const select = db.prepare('SELECT * FROM test_runs WHERE id = ?');
  return select.get(result.lastInsertRowid) as unknown as TestRun;
}

export function updateTestRun(id: number, input: UpdateTestRunInput): TestRun | null {
  const db = initializeDb();
  
  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  
  if (input.completed_at !== undefined) {
    updates.push('completed_at = ?');
    values.push(input.completed_at);
  }
  if (input.passed !== undefined) {
    updates.push('passed = ?');
    values.push(input.passed);
  }
  if (input.failed !== undefined) {
    updates.push('failed = ?');
    values.push(input.failed);
  }
  if (input.skipped !== undefined) {
    updates.push('skipped = ?');
    values.push(input.skipped);
  }
  
  if (updates.length === 0) {
    return getTestRunById(id);
  }
  
  values.push(id);
  const query = `UPDATE test_runs SET ${updates.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);
  
  return getTestRunById(id);
}

export function getTestRunById(id: number): TestRun | null {
  const db = initializeDb();
  const select = db.prepare('SELECT * FROM test_runs WHERE id = ?');
  const result = select.get(id);
  return result ? (result as unknown as TestRun) : null;
}

export function getAllTestRuns(): TestRun[] {
  const db = initializeDb();
  const select = db.prepare('SELECT * FROM test_runs ORDER BY started_at DESC');
  return select.all() as unknown as TestRun[];
}

export function deleteTestRun(id: number): boolean {
  const db = initializeDb();
  const stmt = db.prepare('DELETE FROM test_runs WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Test Result CRUD Operations

export function createTestResult(input: CreateTestResultInput): TestResult {
  const db = initializeDb();
  const insert = db.prepare(`
    INSERT INTO test_results (test_run_id, test_name, status, duration_ms, error_message, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  const result = insert.run(
    input.test_run_id,
    input.test_name,
    input.status,
    input.duration_ms,
    input.error_message || null
  );
  
  const select = db.prepare('SELECT * FROM test_results WHERE id = ?');
  return select.get(result.lastInsertRowid) as unknown as TestResult;
}

export function getTestResultById(id: number): TestResult | null {
  const db = initializeDb();
  const select = db.prepare('SELECT * FROM test_results WHERE id = ?');
  const result = select.get(id);
  return result ? (result as unknown as TestResult) : null;
}

export function getTestResultsByRunId(testRunId: number): TestResult[] {
  const db = initializeDb();
  const select = db.prepare('SELECT * FROM test_results WHERE test_run_id = ? ORDER BY created_at');
  return select.all(testRunId) as unknown as TestResult[];
}

export function getAllTestResults(): TestResult[] {
  const db = initializeDb();
  const select = db.prepare('SELECT * FROM test_results ORDER BY created_at DESC');
  return select.all() as unknown as TestResult[];
}

export function deleteTestResult(id: number): boolean {
  const db = initializeDb();
  const stmt = db.prepare('DELETE FROM test_results WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Query Helpers

export function getTestRunSummary(runId: number): {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
} | null {
  const db = initializeDb();
  
  // First check if the test run exists
  const runExists = db.prepare('SELECT 1 FROM test_runs WHERE id = ?').get(runId);
  if (!runExists) return null;
  
  const select = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
    FROM test_results
    WHERE test_run_id = ?
  `);
  const result = select.get(runId) as unknown as { total: number; passed: number; failed: number; skipped: number } | undefined;
  
  if (!result) return null;
  
  return {
    total: result.total || 0,
    passed: result.passed || 0,
    failed: result.failed || 0,
    skipped: result.skipped || 0,
  };
}

export function getLatestTestRun(): TestRun | null {
  const db = initializeDb();
  const select = db.prepare('SELECT * FROM test_runs ORDER BY started_at DESC LIMIT 1');
  const result = select.get();
  return result ? (result as unknown as TestRun) : null;
}
