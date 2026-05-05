import { Button } from "@due-date-hq/ui/components/button";
import { Input } from "@due-date-hq/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@due-date-hq/ui/components/select";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, ListChecks, Target } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { queryClient, trpc } from "@/utils/trpc";

import type { DashboardTaskRow } from "@due-date-hq/api/routers/dashboard";

type DeadlineTaskStatus = DashboardTaskRow["status"];

const statusLabels: Record<DeadlineTaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  waiting_on_client: "Waiting on client",
  done: "Done",
};

export function BulkTaskActions({
  disabled = false,
  onClearSelection,
  selectedTaskIds,
  taskStatuses,
}: {
  disabled?: boolean;
  onClearSelection: () => void;
  selectedTaskIds: Set<string>;
  taskStatuses: ReadonlyArray<DeadlineTaskStatus>;
}) {
  const [bulkActionsOpen, setBulkActionsOpen] = React.useState(false);
  const [bulkStatus, setBulkStatus] = React.useState<DeadlineTaskStatus>("in_progress");
  const [bulkFirmTargetDate, setBulkFirmTargetDate] = React.useState("");
  const selectedCount = selectedTaskIds.size;

  const bulkUpdateStatus = useMutation(
    trpc.tasks.bulkUpdateStatus.mutationOptions({
      onSuccess: (result) => {
        toast.success(`Updated ${result.updatedCount} task statuses.`);
        onClearSelection();
        void queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const bulkUpdateFirmTarget = useMutation(
    trpc.tasks.bulkUpdateFirmTargetDate.mutationOptions({
      onSuccess: (result) => {
        toast.success(`Updated ${result.updatedCount} firm target dates.`);
        onClearSelection();
        setBulkFirmTargetDate("");
        void queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  React.useEffect(() => {
    if (selectedCount === 0) {
      setBulkActionsOpen(false);
    }
  }, [selectedCount]);

  const isBusy = disabled || bulkUpdateStatus.isPending || bulkUpdateFirmTarget.isPending;

  return (
    <div className="relative z-[60] flex h-10 items-center justify-end">
      <div className={selectedCount > 0 ? "relative" : "invisible relative"}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-32 justify-between border-ddhq-border-strong bg-card text-foreground shadow-sm"
          aria-expanded={bulkActionsOpen}
          disabled={selectedCount === 0 || isBusy}
          onClick={() => setBulkActionsOpen((current) => !current)}
        >
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="size-3.5" />
            批量操作
          </span>
          <ChevronDown
            className={`size-3.5 transition-transform ${bulkActionsOpen ? "rotate-180" : ""}`}
          />
        </Button>
        {bulkActionsOpen ? (
          <div className="absolute right-0 top-10 z-[70] w-[28rem] rounded-lg border border-border/90 bg-popover p-3 text-foreground shadow-xl">
            <div className="mb-3">
              <div className="text-sm font-semibold">批量操作</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {selectedCount} selected rows
              </div>
            </div>
            <div className="grid gap-2">
              <div className="grid grid-cols-[5.5rem_1fr_5rem] items-center gap-2">
                <div className="text-xs font-medium text-muted-foreground">Status</div>
                <Select
                  value={bulkStatus}
                  onValueChange={(value) => setBulkStatus(value as DeadlineTaskStatus)}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-20"
                  disabled={selectedCount === 0 || isBusy}
                  onClick={() =>
                    bulkUpdateStatus.mutate({
                      taskIds: [...selectedTaskIds],
                      status: bulkStatus,
                    })
                  }
                >
                  Apply
                </Button>
              </div>
              <div className="grid grid-cols-[5.5rem_1fr_5rem] items-center gap-2">
                <div className="text-xs font-medium text-muted-foreground">Firm target</div>
                <Input
                  aria-label="Bulk firm target date"
                  className="h-8 w-full"
                  type="date"
                  value={bulkFirmTargetDate}
                  onChange={(event) => setBulkFirmTargetDate(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-20"
                  disabled={selectedCount === 0 || isBusy}
                  onClick={() =>
                    bulkUpdateFirmTarget.mutate({
                      taskIds: [...selectedTaskIds],
                      firmTargetDate: bulkFirmTargetDate || null,
                    })
                  }
                >
                  <Target className="size-3.5" />
                  Apply
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
