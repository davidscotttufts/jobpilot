import type { ReactElement } from "react";
import { Button, type ButtonProps } from "@mui/material";
import type { Route } from "next";

type LinkButtonProps = Omit<ButtonProps, "component" | "LinkComponent" | "href"> & { href: Route };

/**
 * A Button that navigates. No `component` prop: the theme's `MuiButtonBase.LinkComponent` default
 * already routes any `href` through next/link, so this stays a server component and only adds the
 * typed-route surface.
 */
export function LinkButton(props: LinkButtonProps): ReactElement {
  return <Button {...props} />;
}
