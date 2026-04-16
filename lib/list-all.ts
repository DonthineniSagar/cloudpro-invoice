import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

type ModelName = keyof typeof client.models;
const client = generateClient<Schema>();

/**
 * Fetch all records from an Amplify model, handling pagination automatically.
 * Use this instead of .list() to avoid silently missing records.
 */
export async function listAll<T>(
  model: { list: (opts?: any) => Promise<{ data: T[]; nextToken?: string | null }> },
  opts?: { filter?: Record<string, any>; limit?: number }
): Promise<T[]> {
  const all: T[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const res = await model.list({
      ...opts,
      limit: opts?.limit ?? 500,
      ...(nextToken ? { nextToken } : {}),
    });
    all.push(...(res.data || []));
    nextToken = res.nextToken;
  } while (nextToken);
  return all;
}
