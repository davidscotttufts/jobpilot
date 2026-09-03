"use client";

import type { ReactNode } from "react";
import { describeWeeklySchedule, isPinnedWeekly } from "@jobpilot/contracts/pilot";
import { EventRepeat } from "@mui/icons-material";
import { Chip, Tooltip } from "@mui/material";
import { useApiQuery } from "@/api/hooks";
import { pilotQueries } from "@/api/queries";
import type { CampaignDto } from "@/api/types";

interface CampaignRepeatChipProps {
  campaign: CampaignDto;
}

/**
 * The schedule badge on a campaign that repeats. Self-contained rather than a prop threaded down
 * from the list: every instance shares one cached search query, so a page of rows costs one fetch.
 */
export function CampaignRepeatChip(props: CampaignRepeatChipProps): ReactNode {
  const { campaign } = props;
  const searches = useApiQuery(pilotQueries.searches());

  const search = campaign.pilotSearchId
    ? searches.data?.find((s) => s.id === campaign.pilotSearchId)
    : undefined;
  if (!search || !isPinnedWeekly(search)) {
    return null;
  }

  return (
    <Tooltip
      title={`Repeats ${describeWeeklySchedule(search.cadenceDays, search.cadenceHour, search.cadenceTimeZone)}, while the pilot is running.`}
      enterDelay={400}
    >
      <Chip
        size="small"
        variant="outlined"
        color="primary"
        icon={<EventRepeat fontSize="sm" />}
        label={describeWeeklySchedule(search.cadenceDays, search.cadenceHour)}
      />
    </Tooltip>
  );
}
