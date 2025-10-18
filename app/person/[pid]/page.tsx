import PersonDetails from "./_components/PersonDetails";

type PageProps = {
  params: Promise<{ pid: string }>;
};

export default async function PersonPage({ params }: PageProps) {
  const { pid } = await params;
  return <PersonDetails pid={pid} />;
}
