import { NextRequest, NextResponse } from 'next/server';
import { MockPedigreeAdapter } from '../../../../../src/adapters/mock/mockPedigreeAdapter';

export async function GET(_req: NextRequest, ctx: { params: { pid: string } }) {
  const pid = ctx.params.pid;
  const adapter = new MockPedigreeAdapter();
  const data = await adapter.getAncestry(pid, 3);
  return NextResponse.json(data);
}

