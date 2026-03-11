/**
 * Local development mock data store
 * Simulates DynamoDB for local development without Docker
 */

interface MockStore {
  users: Map<string, any>;
  clients: Map<string, any>;
  invoices: Map<string, any>;
  expenses: Map<string, any>;
  companyProfiles: Map<string, any>;
}

class LocalDataStore {
  private store: MockStore = {
    users: new Map(),
    clients: new Map(),
    invoices: new Map(),
    expenses: new Map(),
    companyProfiles: new Map(),
  };

  // Generic CRUD operations
  async create(table: keyof MockStore, id: string, data: any) {
    this.store[table].set(id, { ...data, id, createdAt: new Date().toISOString() });
    return this.store[table].get(id);
  }

  async get(table: keyof MockStore, id: string) {
    return this.store[table].get(id) || null;
  }

  async list(table: keyof MockStore, filter?: (item: any) => boolean) {
    const items = Array.from(this.store[table].values());
    return filter ? items.filter(filter) : items;
  }

  async update(table: keyof MockStore, id: string, data: any) {
    const existing = this.store[table].get(id);
    if (!existing) throw new Error('Item not found');
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    this.store[table].set(id, updated);
    return updated;
  }

  async delete(table: keyof MockStore, id: string) {
    return this.store[table].delete(id);
  }

  // Clear all data (for testing)
  clear() {
    this.store.users.clear();
    this.store.clients.clear();
    this.store.invoices.clear();
    this.store.expenses.clear();
    this.store.companyProfiles.clear();
  }
}

export const localDB = new LocalDataStore();
