/**
 * Mock authentication for local development
 */

interface MockUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

class MockAuth {
  private currentUser: MockUser | null = null;

  async signUp(email: string, password: string) {
    const user = {
      id: `user-${Date.now()}`,
      email,
    };
    this.currentUser = user;
    return { user };
  }

  async signIn(email: string, password: string) {
    const user = {
      id: `user-${Date.now()}`,
      email,
    };
    this.currentUser = user;
    return { user };
  }

  async signOut() {
    this.currentUser = null;
  }

  async getCurrentUser() {
    return this.currentUser;
  }

  async updateUserAttributes(attributes: Partial<MockUser>) {
    if (!this.currentUser) throw new Error('No user signed in');
    this.currentUser = { ...this.currentUser, ...attributes };
    return this.currentUser;
  }
}

export const mockAuth = new MockAuth();
