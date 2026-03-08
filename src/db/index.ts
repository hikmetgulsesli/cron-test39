export interface DatabaseEntry {
  id: string;
  data: unknown;
  createdAt: Date;
}

export class Database {
  private entries: DatabaseEntry[] = [];

  public insert(entry: DatabaseEntry): void {
    this.entries.push(entry);
  }

  public getAll(): DatabaseEntry[] {
    return this.entries;
  }

  public findById(id: string): DatabaseEntry | undefined {
    return this.entries.find((entry) => entry.id === id);
  }
}
