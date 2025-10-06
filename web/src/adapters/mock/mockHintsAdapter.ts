import { readFileSync } from 'fs';
import path from 'path';
import type { HintsAdapter } from '../interfaces';
import type { HintSummary } from '../../domain/types';

function loadHints(): Record<string, HintSummary> {
  const p = path.join(process.cwd(), 'mocks', 'hints.json');
  return JSON.parse(readFileSync(p, 'utf-8')) as Record<string, HintSummary>;
}

const HINTS = loadHints();

export class MockHintsAdapter implements HintsAdapter {
  async getHintSummary(personId: string): Promise<HintSummary> {
    return (
      HINTS[personId] ?? {
        personId,
        total: 0,
        recordHints: 0,
        treeHints: 0,
        fsHintsUrl: `https://www.familysearch.org/tree/hints/person/${encodeURIComponent(personId)}`,
      }
    );
  }
}

