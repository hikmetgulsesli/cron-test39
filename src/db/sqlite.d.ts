import { DatabaseSync } from 'node:sqlite';
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
export declare function initializeDb(dbPath?: string): DatabaseSync;
export declare function closeDb(): void;
export declare function resetDbInstance(): void;
export declare function createTestRun(input: CreateTestRunInput): TestRun;
export declare function updateTestRun(id: number, input: UpdateTestRunInput): TestRun | null;
export declare function getTestRunById(id: number): TestRun | null;
export declare function getAllTestRuns(): TestRun[];
export declare function deleteTestRun(id: number): boolean;
export declare function createTestResult(input: CreateTestResultInput): TestResult;
export declare function getTestResultById(id: number): TestResult | null;
export declare function getTestResultsByRunId(testRunId: number): TestResult[];
export declare function getAllTestResults(): TestResult[];
export declare function deleteTestResult(id: number): boolean;
export declare function getTestRunSummary(runId: number): {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
} | null;
export declare function getLatestTestRun(): TestRun | null;
