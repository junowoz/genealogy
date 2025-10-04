import { NextRequest, NextResponse } from 'next/server';
import { MockChangeAdapter } from '../../../../../src/adapters/mock/mockChangeAdapter';

export async function GET(_req: NextRequest, ctx: { params: { pid: string } }) {
  const pid = ctx.params.pid;
  const adapter = new MockChangeAdapter();
  const data = await adapter.getPersonChanges(pid);
  return NextResponse.json(data);
}

