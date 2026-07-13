import type { ReactElement, ReactNode } from "react";
import { Link } from "@mui/material";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  /** Ellipsize onto one line at this width (px) - for table cells holding long URLs. */
  truncateTo?: number;
}

/**
 * External link with standard new-tab / noopener / inherited-color styling (e.g. grid cells).
 * `component="a"` is explicit: next/link is the theme's default for MuiLink, and it has no business
 * rendering an off-site URL.
 */
export function ExternalLink(props: ExternalLinkProps): ReactElement {
  const { href, children, truncateTo } = props;
  return (
    <Link
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      color="inherit"
      sx={
        truncateTo
          ? {
              display: "block",
              maxWidth: truncateTo,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }
          : undefined
      }
    >
      {children}
    </Link>
  );
}
