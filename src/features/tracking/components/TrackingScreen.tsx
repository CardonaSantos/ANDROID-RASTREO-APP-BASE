import { useState } from "react";

import { MapPin, Play, Square } from "lucide-react-native";

import { isAppError } from "@/core/errors";

import {
  AppAlert,
  AppButton,
  AppCard,
  AppConfirmDialog,
  AppIcon,
  AppScrollScreen,
  AppStack,
  AppText,
} from "@/design-system";

import { TrackingDeviceCard } from "./TrackingDeviceCard";
import { TrackingFinishedSummaryCard } from "./TrackingFinishedSummaryCard";


import {
  useFinishTrackingMutation,
  useStartTrackingMutation,
  useTrackingStateQuery,
  useTrackingDeviceStatusQuery,
} from "../hooks";
import { TrackingSyncCard } from "./TrackingSyncCard";

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",

    timeStyle: "short",
  }).format(date);
}

function getTrackingErrorMessage(error: unknown): string {
  if (!isAppError(error)) {
    return "No fue posible completar la operación de seguimiento.";
  }

  switch (error.kind) {
    case "network":
      return "No se pudo conectar con el servidor.";

    case "timeout":
      return "El servidor tardó demasiado en responder.";

    case "unauthorized":
      return "La sesión ya no es válida.";

    case "forbidden":
      return "No tienes autorización para utilizar esta función.";

    default:
      return "No fue posible completar la operación de seguimiento.";
  }
}

export function TrackingScreen() {
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const trackingQuery = useTrackingStateQuery();
  const deviceQuery = useTrackingDeviceStatusQuery();

  const startMutation = useStartTrackingMutation();

  const finishMutation = useFinishTrackingMutation();

  /*
   * =====================================================
   * CARGANDO ESTADO DE JORNADA
   * =====================================================
   */

  if (trackingQuery.isPending) {
    return (
      <AppScrollScreen>
        <AppStack gap="md">
          <AppText variant="headlineSmall" weight="semibold">
            Seguimiento GPS
          </AppText>

          <AppText tone="muted">Consultando estado...</AppText>
        </AppStack>
      </AppScrollScreen>
    );
  }

  /*
   * =====================================================
   * ERROR CONSULTANDO JORNADA
   * =====================================================
   */

  if (trackingQuery.isError) {
    return (
      <AppScrollScreen>
        <AppStack gap="lg">
          <AppText variant="headlineSmall" weight="semibold">
            Seguimiento GPS
          </AppText>

          <AppAlert tone="danger" title="No se pudo cargar el tracking">
            {getTrackingErrorMessage(trackingQuery.error)}
          </AppAlert>

          <AppButton
            variant="outlined"
            onPress={() => {
              void trackingQuery.refetch();
            }}
          >
            Reintentar
          </AppButton>
        </AppStack>
      </AppScrollScreen>
    );
  }

  const tracking = trackingQuery.data;
  const device = deviceQuery.data;
  const canStart = Boolean(device?.supported && device.locationServicesEnabled &&
    device.foregroundPermission === "granted" && device.backgroundPermission === "granted");

  return (
    <AppScrollScreen>
      <AppStack gap="2xl">
        {/*
         * =================================================
         * ENCABEZADO
         * =================================================
         */}

        <AppStack gap="xs">
          <AppText variant="headlineSmall" weight="semibold">
            Seguimiento GPS
          </AppText>

          <AppText tone="muted">Control de jornada y ubicación.</AppText>
        </AppStack>

        {/*
         * =================================================
         * JORNADA ACTIVA
         * =================================================
         */}

        {tracking.activo ? (
          <>
            <AppAlert tone="success" title="Jornada activa">
              La sesión de seguimiento se encuentra activa.
            </AppAlert>

            {/*
             * ---------------------------------------------
             * RESUMEN DE SESIÓN
             * ---------------------------------------------
             */}

            <AppCard>
              <AppStack gap="lg">
                <AppStack gap="xs">
                  <AppIcon icon={MapPin} size="lg" tone="primary" decorative />

                  <AppText variant="titleMedium" weight="semibold">
                    Sesión #{tracking.sesionTrackingId}
                  </AppText>
                </AppStack>

                <AppStack gap="xs">
                  <AppText variant="labelMedium" tone="muted">
                    Estado
                  </AppText>

                  <AppText>{tracking.estado}</AppText>
                </AppStack>

                <AppStack gap="xs">
                  <AppText variant="labelMedium" tone="muted">
                    Inicio de jornada
                  </AppText>

                  <AppText>{formatDate(tracking.iniciadoEn)}</AppText>
                </AppStack>

                {/* <AppStack gap="xs">
                  <AppIcon icon={Clock} size="sm" tone="muted" decorative />

                  <AppText variant="labelMedium" tone="muted">
                    Último heartbeat
                  </AppText>

                  <AppText>{formatDate(tracking.ultimoHeartbeatEn)}</AppText>
                </AppStack> */}
              </AppStack>
            </AppCard>

            {/*
             * ---------------------------------------------
             * PERFIL GPS
             * ---------------------------------------------
             *
             * Puede cambiarse durante una jornada.
             * Cambiarlo NO modifica sesionTrackingId
             * ni finaliza la asistencia.
             */}



            {/*
             * ---------------------------------------------
             * ESTADO NATIVO DEL DISPOSITIVO
             * ---------------------------------------------
             */}

            <TrackingDeviceCard journeyActive />

            <TrackingSyncCard sessionId={tracking.sesionTrackingId} />

            {/*
             * ---------------------------------------------
             * ERROR DE FINALIZACIÓN
             * ---------------------------------------------
             */}

            {finishMutation.isError ? (
              <AppAlert tone="danger" title="No se pudo finalizar la jornada">
                {getTrackingErrorMessage(finishMutation.error)}
              </AppAlert>
            ) : null}

            {/*
             * ---------------------------------------------
             * FINALIZAR JORNADA
             * ---------------------------------------------
             */}

            <AppButton
              fullWidth
              size="lg"
              tone="danger"
              variant="outlined"
              leadingIcon={Square}
              onPress={() => {
                setFinishDialogOpen(true);
              }}
            >
              Finalizar jornada
            </AppButton>

            {/*
             * ---------------------------------------------
             * CONFIRMACIÓN
             * ---------------------------------------------
             */}

            <AppConfirmDialog
              open={finishDialogOpen}
              onOpenChange={setFinishDialogOpen}
              title="Finalizar jornada"
              description="Se registrará tu hora de salida y se detendrá el seguimiento GPS."
              tone="danger"
              confirmTone="danger"
              confirmLabel="Finalizar jornada"
              cancelLabel="Cancelar"
              dismissable
              onConfirm={async () => {
                await finishMutation.mutateAsync(tracking.sesionTrackingId);
              }}
            >
              <AppAlert tone="warning" title="El seguimiento se detendrá">
                Una vez finalizada la jornada, el dispositivo dejará de
                registrar nuevas ubicaciones.
              </AppAlert>
            </AppConfirmDialog>
          </>
        ) : (
          /*
           * =================================================
           * SIN JORNADA ACTIVA
           * =================================================
           */

          <>
            {/*
             * ---------------------------------------------
             * ÚLTIMA JORNADA FINALIZADA
             * ---------------------------------------------
             *
             * Solo aparece inmediatamente después
             * de cerrar una jornada desde esta pantalla.
             */}

            {finishMutation.data ? (
              <>
                <TrackingFinishedSummaryCard
                  summary={finishMutation.data.summary}
                />

                {!finishMutation.data.localServiceStopped ? (
                  <AppAlert tone="warning" title="Servicio local pendiente">
                    La jornada fue cerrada correctamente en el servidor, pero el
                    servicio local de ubicación requiere reconciliación.
                  </AppAlert>
                ) : null}
              </>
            ) : null}

            {/*
             * ---------------------------------------------
             * PERFIL PARA PRÓXIMA JORNADA
             * ---------------------------------------------
             */}



            <TrackingDeviceCard journeyActive={false} />
            {!canStart ? (
              <AppAlert tone="warning" title="GPS pendiente">
                Activa el GPS y concede ubicación y segundo plano antes de iniciar.
              </AppAlert>
            ) : null}
            {/*
             * ---------------------------------------------
             * ESTADO INACTIVO
             * ---------------------------------------------
             */}

            <AppAlert tone="neutral" title="Sin jornada activa">
              Inicia una jornada para comenzar el seguimiento de ubicación.
            </AppAlert>

            {startMutation.isError ? (
              <AppAlert tone="danger" title="No se pudo iniciar la jornada">
                {getTrackingErrorMessage(startMutation.error)}
              </AppAlert>
            ) : null}

            {/*
             * ---------------------------------------------
             * INICIAR JORNADA
             * ---------------------------------------------
             */}

            <AppButton
              fullWidth
              size="lg"
              leadingIcon={Play}
              loading={startMutation.isPending}
              disabled={!canStart}
              loadingAccessibilityLabel="Iniciando jornada"
              onPress={() => {
                setStartDialogOpen(true);
              }}
            >
              Iniciar jornada
            </AppButton>

            <AppConfirmDialog
              open={startDialogOpen}
              onOpenChange={setStartDialogOpen}
              title="Iniciar jornada"
              description="Se registrará tu hora de entrada y la jornada quedará activa."
              tone="info"
              confirmTone="primary"
              confirmLabel="Iniciar jornada"
              cancelLabel="Cancelar"
              dismissable
              onConfirm={async () => {
                await startMutation.mutateAsync();

                finishMutation.reset();
              }}
            >
              <AppAlert tone="info" title="El seguimiento comenzará">
                Se iniciará el servicio GPS en segundo plano y se enviará
                una ubicación inicial cuando Android la proporcione.
              </AppAlert>
            </AppConfirmDialog>
          </>
        )}
      </AppStack>
    </AppScrollScreen>
  );
}
