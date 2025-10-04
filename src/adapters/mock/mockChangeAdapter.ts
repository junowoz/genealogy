import { readFileSync } from 'fs';
import path from 'path';
import type { ChangeItem } from '../../domain/types';
import type { ChangeAdapter } from '../interfaces';

function loadChanges(): Record<string, ChangeItem[]> {
  const p = path.join(process.cwd(), 'mocks', 'changes.json');
  return JSON.parse(readFileSync(p, 'utf-8')) as Record<string, ChangeItem[]>;
}

const CHANGES = loadChanges();

export class MockChangeAdapter implements ChangeAdapter {
  async getPersonChanges(personId: string, cursor?: string) {
    const items = CHANGES[personId] ?? [];
    // no real pagination; emulate
    return { changes: items, nextCursor: undefined };
  }
}

