import PersonPageClient from './PersonPageClient';

type PageProps = {
  params: Promise<{ pid: string }>;
};

export default async function PersonPage({ params }: PageProps) {
  const { pid } = await params;
  return <PersonPageClient pid={pid} />;
}
