import type { ReactElement } from "react";
import { Box, Card } from "@mui/material";
import type { JobListingSummaryDto } from "@/api/types";
import { JobRow } from "./job-row";

interface JobListProps {
  jobs: JobListingSummaryDto[];
}

// Sibling borders, not Stack's `divider`: Stack clones that element, and one created in a server
// component can reach the client still lazy, which breaks the clone during SSR.
const rowSx = {
  "& + &": { borderTop: 1, borderColor: "divider" },
} as const;

/** Listings as one framed, divided list - the /jobs results and the similar-jobs section. */
export function JobList(props: JobListProps): ReactElement {
  const { jobs } = props;
  return (
    <Card>
      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {jobs.map((job) => (
          <Box component="li" key={job.id} sx={rowSx}>
            <JobRow job={job} />
          </Box>
        ))}
      </Box>
    </Card>
  );
}
