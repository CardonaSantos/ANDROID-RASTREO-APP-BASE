import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/core/query";

import { getMyTrackingState, type TrackingState } from "../api";

import { startTrackingJourney } from "../application";

import { finishTrackingJourney } from "../application";

export const trackingStateQueryKey = ["tracking", "me"] as const;

export function useTrackingStateQuery() {
  return useQuery({
    queryKey: trackingStateQueryKey,

    queryFn: ({ signal }) => getMyTrackingState(signal),
  });
}

export function useStartTrackingMutation() {
  return useMutation({
    mutationKey: ["tracking", "start"],

    mutationFn: () => startTrackingJourney(),
    onSuccess: (result) => {
      const nextState: TrackingState = {
        activo: true,

        sesionTrackingId: result.sesionTrackingId,

        asistenciaId: result.asistenciaId,

        estado: result.estado,

        iniciadoEn: result.iniciadoEn,

        ultimoHeartbeatEn: result.ultimoHeartbeatEn,
      };

      queryClient.setQueryData(trackingStateQueryKey, nextState);
      void queryClient.invalidateQueries({ queryKey: ["tracking", "device-status"] });
    },
  });
}

export function useFinishTrackingMutation() {
  return useMutation({
    mutationKey: ["tracking", "finish"],

    mutationFn: (sesionTrackingId: number) =>
      finishTrackingJourney(sesionTrackingId),

    onSuccess: () => {
      const inactiveState: TrackingState = {
        activo: false,

        sesionTrackingId: null,

        asistenciaId: null,

        estado: null,

        iniciadoEn: null,

        ultimoHeartbeatEn: null,
      };

      queryClient.setQueryData(trackingStateQueryKey, inactiveState);

      void queryClient.invalidateQueries({
        queryKey: ["tracking", "device-status"],
      });
    },
  });
}
