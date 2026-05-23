import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import {
  TYPE_LABELS,
  STATUS_LABELS,
  formatBytes,
} from "@/lib/helpers";

export const revalidate = 0;

type Props = {
  params: {
    slug: string;
  };
};

export default async function ResourcePage({
  params,
}: Props) {
  const supabase = await createClient();

  const { data: resource } = await supabase
    .from("resources")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!resource) {
    notFound();
  }

  const typeInfo =
    TYPE_LABELS[resource.type] ||
    TYPE_LABELS.belge;

  const statusInfo =
    STATUS_LABELS[resource.status] ||
    STATUS_LABELS.to_read;

  return (
    <div>
      <div className="breadcrumb">
        <Link href="/">Ana sayfa</Link>
        <span> / </span>
        <span>{resource.title}</span>
      </div>

      <div className="detail-card">
        <h1>{resource.title}</h1>

        <p>{resource.author}</p>

        <span>{typeInfo.label}</span>

        <span>{statusInfo.label}</span>

        {resource.description && (
          <p>{resource.description}</p>
        )}
      </div>
    </div>
  );
}
