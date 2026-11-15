import { serializeJsonLd, type JsonLdObject } from "@/lib/schema";

/**
 * Renders structured data inline. Kept as a server component: nothing here
 * needs the client, and JSON-LD is read from the initial HTML.
 */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
