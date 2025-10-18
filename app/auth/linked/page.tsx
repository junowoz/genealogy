import LinkedSuccessPage from "../../_components/LinkedSuccessPage";

type PageProps = {
  searchParams: Promise<{ state?: string }>;
};

export default async function LinkedPage({ searchParams }: PageProps) {
  const { state } = await searchParams;
  return <LinkedSuccessPage state={state ?? "web"} />;
}
