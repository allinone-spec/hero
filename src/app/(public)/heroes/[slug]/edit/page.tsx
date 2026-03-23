import HeroOwnerEditClient from "./HeroOwnerEditClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function HeroOwnerEditPage({ params }: Props) {
  const { slug } = await params;
  return <HeroOwnerEditClient slug={slug} />;
}
