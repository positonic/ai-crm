"use client";

import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";

export function useSessionResize(eventId: string, venueId: string) {
  const utils = api.useUtils();

  const resize = api.schedule.resizeSession.useMutation({
    onMutate: async ({ sessionId, newStartTime, newEndTime }) => {
      await utils.schedule.getFloorSessions.cancel({ eventId, venueId });

      const previousData = utils.schedule.getFloorSessions.getData({
        eventId,
        venueId,
      });

      utils.schedule.getFloorSessions.setData({ eventId, venueId }, (old) => {
        if (!old) return old;

        const updatedSessions = old.sessions.map((session) => {
          if (session.id !== sessionId) return session;
          return {
            ...session,
            startTime: new Date(newStartTime),
            endTime: new Date(newEndTime),
          };
        });

        return { ...old, sessions: updatedSessions };
      });

      return { previousData };
    },
    onSuccess: () => {
      notifications.show({
        title: "Session resized",
        message: "Duration updated successfully.",
        color: "green",
      });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        utils.schedule.getFloorSessions.setData(
          { eventId, venueId },
          context.previousData,
        );
      }
      notifications.show({
        title: "Resize failed",
        message: err.message,
        color: "red",
      });
    },
  });

  const handleResize = (
    sessionId: string,
    newStartTime: Date,
    newEndTime: Date,
  ) => {
    resize.mutate({ sessionId, newStartTime, newEndTime });
  };

  return { handleResize, isPending: resize.isPending };
}
