import type { ReactElement } from "react";

interface JsonLdProps {
  /** One schema.org node, or several to emit as an array in a single tag. */
  data: object | object[];
}

/** Server-rendered `application/ld+json` block. `<` is escaped so JSON can't close the tag early. */
export function JsonLd(props: JsonLdProps): ReactElement {
  const { data } = props;
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: only way to emit ld+json; `<` is escaped above
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
