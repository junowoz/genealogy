import LinkedClient from "./LinkedClient";

type PageProps = {
  searchParams: Promise<{ state?: string }>;
};

export default async function LinkedPage({ searchParams }: PageProps) {
  const { state } = await searchParams;
  return <LinkedClient state={state ?? "web"} />;
}
