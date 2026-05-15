import type { PropsWithChildren, ReactElement } from "react";
import { Container } from "@mui/material";

export default function MainLayout(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {children}
    </Container>
  );
}
