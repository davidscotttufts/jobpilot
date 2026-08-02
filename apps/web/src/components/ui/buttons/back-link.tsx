import type { ReactElement, ReactNode } from "react";
import { ArrowBack } from "@mui/icons-material";
import type { SxProps, Theme } from "@mui/material";
import type { Route } from "next";
import { LinkButton } from "./link-button";

interface BackLinkProps {
  href: Route;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

/** Back link above a page title. The -1 inset pulls the label flush without shrinking the hover target. */
export function BackLink(props: BackLinkProps): ReactElement {
  const { href, children, sx } = props;
  return (
    <LinkButton
      href={href}
      size="small"
      variant="text"
      startIcon={<ArrowBack fontSize="sm" />}
      sx={[{ alignSelf: "flex-start", ml: -1 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {children}
    </LinkButton>
  );
}
