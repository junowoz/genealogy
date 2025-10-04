import { readFileSync } from 'fs';
import path from 'path';
import type { AncestryResult, DescendancyResult } from '../../domain/types';
import type { PedigreeAdapter } from '../interfaces';

function load<T>(file: string): T {
  const p = path.join(process.cwd(), 'mocks', file);
  return JSON.parse(readFileSync(p, 'utf-8')) as T;
}

const ancestry = load<Record<string, AncestryResult>>('ancestry.json');
const descendancy = load<Record<string, DescendancyResult>>('descendancy.json');

export class MockPedigreeAdapter implements PedigreeAdapter {
  async getAncestry(personId: string, generations: number): Promise<AncestryResult> {
    const found = ancestry[personId];
    if (!found) {
      return { rootId: personId, generations, nodes: {} };
    }
    return found;
  }
  async getDescendancy(personId: string, generations: number): Promise<DescendancyResult> {
    const found = descendancy[personId];
    if (!found) {
      return { rootId: personId, generations, nodes: {} };
    }
    return found;
  }
}

