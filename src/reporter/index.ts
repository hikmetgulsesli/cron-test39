export interface Report {
  id: string;
  timestamp: Date;
  results: unknown[];
}

export class Reporter {
  private reports: Report[] = [];

  public generateReport(results: unknown[]): Report {
    const report: Report = {
      id: `report-${Date.now()}`,
      timestamp: new Date(),
      results,
    };
    this.reports.push(report);
    return report;
  }

  public getReports(): Report[] {
    return this.reports;
  }
}
