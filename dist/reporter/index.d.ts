export interface Report {
    id: string;
    timestamp: Date;
    results: unknown[];
}
export declare class Reporter {
    private reports;
    generateReport(results: unknown[]): Report;
    getReports(): Report[];
}
//# sourceMappingURL=index.d.ts.map