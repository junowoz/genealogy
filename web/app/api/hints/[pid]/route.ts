import { NextRequest, NextResponse } from 'next/server';
import { MockHintsAdapter } from '../../../../src/adapters/mock/mockHintsAdapter';

export async function GET(_req: NextRequest, ctx: { params: { pid: string } }) {
  const pid = ctx.params.pid;
  const adapter = new MockHintsAdapter();
  const data = await adapter.getHintSummary(pid);
  return NextResponse.json(data);
}

