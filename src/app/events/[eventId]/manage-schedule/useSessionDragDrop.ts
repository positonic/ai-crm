"use client";

import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";

export function useSessionDragDrop(eventId: string, venueId: string) {
  const utils = api.useUtils();

  const reschedule = api.schedule.rescheduleSession.useMutation({
    onMutate: async ({ sessionId, newStartTime, newRoomId }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await utils.schedule.getFloorSessions.cancel({ eventId, venueId });

      // Snapshot the previous value
      const previousData = utils.schedule.getFloorSessions.getData({
        eventId,
        venueId,
      });

      // Optimistically update the cache
      utils.schedule.getFloorSessions.setData({ eventId, venueId }, (old) => {
        if (!old) return old;

        const updatedSessions = old.sessions.map((session) => {
          if (session.id !== sessionId) return session;

          // Calculate duration to preserve it
          const oldStart = new Date(session.startTime).getTime();
          const oldEnd = new Date(session.endTime).getTime();
          const duration = oldEnd - oldStart;

          const newStart = new Date(newStartTime);
          const newEnd = new Date(newStart.getTime() + duration);

          return {
            ...session,
            startTime: newStart,
            endTime: newEnd,
            roomId: newRoomId ?? session.roomId,
          };
        });

        return { ...old, sessions: updatedSessions };
      });

      return { previousData };
    },
    onSuccess: (data) => {
      const shiftCount = data.shifted.length;
      notifications.show({
        title: "Session rescheduled",
        message:
          shiftCount > 0
            ? `Session moved. ${String(shiftCount)} other session${shiftCount > 1 ? "s" : ""} shifted.`
            : "Session moved successfully.",
        color: "green",
      });
      // Refetch to get the authoritative server state (including any shifted sessions)
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
    },
    onError: (err, _variables, context) => {
      // Roll back to the previous value on error
      if (context?.previousData) {
        utils.schedule.getFloorSessions.setData(
          { eventId, venueId },
          context.previousData,
        );
      }
      notifications.show({
        title: "Reschedule failed",
        message: err.message,
        color: "red",
      });
    },
  });

  const handleDrop = (
    sessionId: string,
    newStartTime: Date,
    newRoomId: string | null | undefined,
  ) => {
    reschedule.mutate({
      sessionId,
      newStartTime,
      newRoomId: newRoomId ?? null,
    });
  };

  return { handleDrop, isPending: reschedule.isPending };
}
