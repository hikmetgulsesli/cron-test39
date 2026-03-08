export interface DatabaseEntry {
    id: string;
    data: unknown;
    createdAt: Date;
}
export declare class Database {
    private entries;
    insert(entry: DatabaseEntry): void;
    getAll(): DatabaseEntry[];
    findById(id: string): DatabaseEntry | undefined;
}
//# sourceMappingURL=index.d.ts.map