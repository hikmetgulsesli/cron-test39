"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDb = initializeDb;
exports.closeDb = closeDb;
exports.resetDbInstance = resetDbInstance;
exports.createTestRun = createTestRun;
exports.updateTestRun = updateTestRun;
exports.getTestRunById = getTestRunById;
exports.getAllTestRuns = getAllTestRuns;
exports.deleteTestRun = deleteTestRun;
exports.createTestResult = createTestResult;
exports.getTestResultById = getTestResultById;
exports.getTestResultsByRunId = getTestResultsByRunId;
exports.getAllTestResults = getAllTestResults;
exports.deleteTestResult = deleteTestResult;
exports.getTestRunSummary = getTestRunSummary;
exports.getLatestTestRun = getLatestTestRun;
const node_sqlite_1 = require("node:sqlite");
const path = __importStar(require("path"));
let dbInstance = null;
function initializeDb(dbPath) {
    if (dbInstance) {
        return dbInstance;
    }
    const targetPath = dbPath || path.join(process.cwd(), 'test-runs.db');
    const db = new node_sqlite_1.DatabaseSync(targetPath);
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
function closeDb() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
function resetDbInstance() {
    dbInstance = null;
}
// Test Run CRUD Operations
function createTestRun(input) {
    const db = initializeDb();
    const insert = db.prepare(`
    INSERT INTO test_runs (version, started_at, total_tests)
    VALUES (?, ?, ?)
  `);
    const result = insert.run(input.version, input.started_at, input.total_tests);
    const select = db.prepare('SELECT * FROM test_runs WHERE id = ?');
    return select.get(result.lastInsertRowid);
}
function updateTestRun(id, input) {
    const db = initializeDb();
    const updates = [];
    const values = [];
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
function getTestRunById(id) {
    const db = initializeDb();
    const select = db.prepare('SELECT * FROM test_runs WHERE id = ?');
    const result = select.get(id);
    return result ? result : null;
}
function getAllTestRuns() {
    const db = initializeDb();
    const select = db.prepare('SELECT * FROM test_runs ORDER BY started_at DESC');
    return select.all();
}
function deleteTestRun(id) {
    const db = initializeDb();
    const stmt = db.prepare('DELETE FROM test_runs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}
// Test Result CRUD Operations
function createTestResult(input) {
    const db = initializeDb();
    const insert = db.prepare(`
    INSERT INTO test_results (test_run_id, test_name, status, duration_ms, error_message, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
    const result = insert.run(input.test_run_id, input.test_name, input.status, input.duration_ms, input.error_message || null);
    const select = db.prepare('SELECT * FROM test_results WHERE id = ?');
    return select.get(result.lastInsertRowid);
}
function getTestResultById(id) {
    const db = initializeDb();
    const select = db.prepare('SELECT * FROM test_results WHERE id = ?');
    const result = select.get(id);
    return result ? result : null;
}
function getTestResultsByRunId(testRunId) {
    const db = initializeDb();
    const select = db.prepare('SELECT * FROM test_results WHERE test_run_id = ? ORDER BY created_at');
    return select.all(testRunId);
}
function getAllTestResults() {
    const db = initializeDb();
    const select = db.prepare('SELECT * FROM test_results ORDER BY created_at DESC');
    return select.all();
}
function deleteTestResult(id) {
    const db = initializeDb();
    const stmt = db.prepare('DELETE FROM test_results WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}
// Query Helpers
function getTestRunSummary(runId) {
    const db = initializeDb();
    // First check if the test run exists
    const runExists = db.prepare('SELECT 1 FROM test_runs WHERE id = ?').get(runId);
    if (!runExists)
        return null;
    const select = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
    FROM test_results
    WHERE test_run_id = ?
  `);
    const result = select.get(runId);
    if (!result)
        return null;
    return {
        total: result.total || 0,
        passed: result.passed || 0,
        failed: result.failed || 0,
        skipped: result.skipped || 0,
    };
}
function getLatestTestRun() {
    const db = initializeDb();
    const select = db.prepare('SELECT * FROM test_runs ORDER BY started_at DESC LIMIT 1');
    const result = select.get();
    return result ? result : null;
}
