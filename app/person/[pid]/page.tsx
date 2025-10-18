import PersonPageClient from './PersonPageClient';

export default function PersonPage({ params }: { params: { pid: string } }) {
  return <PersonPageClient pid={params.pid} />;
}
