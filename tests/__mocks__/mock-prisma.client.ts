/**
 * Mock Prisma Client for Testing
 */

export class MockPrismaClient {
  private mediaRecords = new Map<string, any>();
  private idCounter = 1;

  media = {
    create: jest.fn(async ({ data }: any) => {
      const id = data.id || `mock-id-${this.idCounter++}`;
      const record = {
        id,
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.mediaRecords.set(id, record);
      return record;
    }),

    findMany: jest.fn(async ({ where }: any = {}) => {
      const records = Array.from(this.mediaRecords.values());
      if (!where) return records;

      return records.filter((record) => {
        return Object.entries(where).every(
          ([key, value]) => record[key] === value
        );
      });
    }),

    findUnique: jest.fn(async ({ where }: any) => {
      return this.mediaRecords.get(where.id) || null;
    }),

    delete: jest.fn(async ({ where }: any) => {
      const record = this.mediaRecords.get(where.id);
      this.mediaRecords.delete(where.id);
      return record;
    }),

    update: jest.fn(async ({ where, data }: any) => {
      const record = this.mediaRecords.get(where.id);
      if (!record) return null;

      const updated = {
        ...record,
        ...data,
        updated_at: new Date(),
      };
      this.mediaRecords.set(where.id, updated);
      return updated;
    }),
  };

  clear(): void {
    this.mediaRecords.clear();
    this.idCounter = 1;
  }

  getRecords(): Map<string, any> {
    return this.mediaRecords;
  }
}
