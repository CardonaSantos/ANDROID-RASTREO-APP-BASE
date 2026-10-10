import { useState } from "react";
import { useRouter } from "expo-router";
import {
  CheckCircle2,
  CircleHelp,
  LogOut,
  MapPin,
  Navigation,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";

import {
  AppAlert,
  AppAvatar,
  AppBadge,
  AppButton,
  AppCard,
  AppConfirmDialog,
  AppDivider,
  AppIcon,
  AppIconButton,
  AppInline,
  AppMenu,
  AppScrollScreen,
  AppStack,
  AppText,
} from "@/design-system";
import { useAuthProfileQuery, useLogoutMutation } from "@/features/auth";
import {
  useTrackingDeviceStatusQuery,
  useTrackingStateQuery,
} from "@/features/tracking/hooks";

function formatRole(role: string | undefined): string {
  switch (role) {
    case "VENDEDOR":
      return "Vendedor";
    case "REPARTIDOR":
      return "Repartidor";
    case "ADMIN":
      return "Administrador";
    default:
      return role ?? "Personal de campo";
  }
}

/**
 * Inicio de MARCAS: una única tarea destacada, estados técnicos breves
 * y cierre de sesión en el menú de cuenta, no como CTA principal.
 * Los colores, tipografías, tamaños y overlays proceden del Design System.
 */
export default function HomeScreen() {
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const profile = useAuthProfileQuery();
  const tracking = useTrackingStateQuery();
  const device = useTrackingDeviceStatusQuery();
  const logout = useLogoutMutation();

  const name = profile.data?.nombre ?? "Mi cuenta";
  const role = formatRole(profile.data?.rol);
  const active = tracking.data?.activo === true;
  const stateUnavailable = tracking.isError;
  const stateLoading = tracking.isPending;

  const gpsReady = Boolean(device.data?.supported && device.data.locationServicesEnabled);
  const permissionsReady = Boolean(
    device.data?.supported &&
      device.data.foregroundPermission === "granted" &&
      device.data.backgroundPermission === "granted",
  );

  const deviceStatusUnavailable = device.isPending || device.isError;
  const gpsStatus = deviceStatusUnavailable
    ? "Por verificar"
    : gpsReady
      ? "Activado"
      : "Desactivado";
  const permissionsStatus = deviceStatusUnavailable
    ? "Por verificar"
    : permissionsReady
      ? "Concedidos"
      : "Pendientes";

  return (
    <AppScrollScreen contentPaddingVertical="xl">
      <AppStack gap="2xl">
        <AppInline align="center" justify="space-between" gap="md">
          <AppStack gap="xxs" flex>
            <AppText variant="titleLarge" weight="bold" numberOfLines={1}>
              Marcas Guatemala
            </AppText>
            <AppText variant="labelSmall" tone="muted">
              OPERACIONES DE CAMPO
            </AppText>
          </AppStack>
          <AppMenu
            anchor={({ toggle }) => (
              <AppIconButton
                icon={UserRound}
                accessibilityLabel="Abrir menú de cuenta"
                variant="soft"
                tone="neutral"
                size="lg"
                onPress={toggle}
              />
            )}
            items={[
              {
                id: "current-user",
                label: name,
                description: role,
                disabled: true,
              },
              { type: "separator", id: "user-divider" },
              {
                id: "logout",
                label: "Cerrar sesión",
                icon: LogOut,
                tone: "danger",
                disabled: logout.isPending,
                onPress: () => setConfirmLogout(true),
              },
            ]}
          />
        </AppInline>

        <AppStack gap="xs">
          <AppText variant="headlineSmall" weight="semibold">
            Mi espacio de trabajo
          </AppText>
          <AppText tone="secondary">
            Tu jornada y el estado de tu dispositivo, en un solo lugar.
          </AppText>
        </AppStack>

        <AppCard variant="tonal" radius="xl" padding="lg">
          <AppInline gap="md" align="center">
            <AppAvatar name={profile.data?.nombre} size="lg" tone="primary" />
            <AppStack gap="xs" flex>
              <AppText variant="labelSmall" tone="muted">
                SESIÓN DE TRABAJO
              </AppText>
              <AppText variant="titleMedium" weight="semibold" numberOfLines={2}>
                {name}
              </AppText>
              <AppBadge tone="neutral" variant="soft">
                {role}
              </AppBadge>
            </AppStack>
          </AppInline>
        </AppCard>

        <AppCard variant="tonal" tone={active ? "success" : "primary"} radius="xl" padding="xl">
          <AppStack gap="lg">
            <AppInline justify="space-between" align="center" gap="sm">
              <AppText variant="labelMedium" tone="secondary" weight="semibold">
                MI JORNADA
              </AppText>
              <AppBadge
                tone={stateUnavailable ? "warning" : active ? "success" : "neutral"}
                icon={active ? CheckCircle2 : CircleHelp}
              >
                {stateLoading
                  ? "Consultando"
                  : stateUnavailable
                    ? "Sin conexión"
                    : active
                      ? "En curso"
                      : "Pendiente"}
              </AppBadge>
            </AppInline>

            <AppStack gap="sm">
              <AppText variant="titleLarge" weight="semibold">
                {stateLoading
                  ? "Consultando tu jornada"
                  : stateUnavailable
                    ? "No se pudo consultar tu jornada"
                    : active
                      ? "Jornada en curso"
                      : "Todo listo para comenzar"}
              </AppText>
              <AppText tone="secondary">
                {stateUnavailable
                  ? "Revisa tu conexión para confirmar el estado de la jornada."
                  : active
                    ? "Revisa el GPS, los permisos y los envíos desde tu jornada."
                    : "Abre tu jornada para comprobar los permisos e iniciar el seguimiento."}
              </AppText>
            </AppStack>

            <AppButton
              fullWidth
              size="lg"
              leadingIcon={active ? Navigation : MapPin}
              onPress={() => router.push("/tracking")}
            >
              {active ? "Ver jornada" : "Abrir jornada"}
            </AppButton>
            {stateUnavailable ? (
              <AppButton
                variant="outlined"
                fullWidth
                onPress={() => void tracking.refetch()}
              >
                Reintentar consulta
              </AppButton>
            ) : null}
          </AppStack>
        </AppCard>

        <AppStack gap="md">
          <AppInline align="center" justify="space-between">
            <AppText variant="titleMedium" weight="semibold">
              Estado del dispositivo
            </AppText>
            <AppBadge
              tone={gpsReady && permissionsReady ? "success" : "neutral"}
              variant="soft"
            >
              {gpsReady && permissionsReady ? "Preparado" : "Revisar"}
            </AppBadge>
          </AppInline>

          <AppCard variant="outlined" radius="lg" padding="lg">
            <AppStack gap="lg">
              <AppInline gap="md" align="center">
                <AppIcon
                  icon={MapPin}
                  size="lg"
                  tone={deviceStatusUnavailable ? "muted" : gpsReady ? "success" : "warning"}
                  decorative
                />
                <AppStack gap="xxs" flex>
                  <AppText variant="labelLarge" weight="semibold">
                    Ubicación del sistema
                  </AppText>
                  <AppText variant="bodyMedium" tone="secondary">
                    {gpsStatus}
                  </AppText>
                </AppStack>
              </AppInline>

              <AppDivider />

              <AppInline gap="md" align="center">
                <AppIcon
                  icon={ShieldCheck}
                  size="lg"
                  tone={deviceStatusUnavailable ? "muted" : permissionsReady ? "success" : "warning"}
                  decorative
                />
                <AppStack gap="xxs" flex>
                  <AppText variant="labelLarge" weight="semibold">
                    Permisos de ubicación
                  </AppText>
                  <AppText variant="bodyMedium" tone="secondary">
                    {permissionsStatus}
                  </AppText>
                </AppStack>
              </AppInline>
            </AppStack>
          </AppCard>
          <AppText variant="caption" tone="muted">
            Durante una jornada activa, Android registra ubicación en segundo plano.
            Puedes comprobar los envíos desde Jornada.
          </AppText>
        </AppStack>

        {profile.isError ? (
          <AppAlert tone="warning" title="Perfil local no disponible">
            Si cambiaste de cuenta, vuelve a iniciar sesión.
          </AppAlert>
        ) : null}
        {logout.isError ? (
          <AppAlert tone="danger" title="No se pudo cerrar sesión">
            La jornada debe finalizar y sus ubicaciones deben sincronizarse
            antes de salir. Comprueba la conexión e inténtalo nuevamente.
          </AppAlert>
        ) : null}
      </AppStack>

      <AppConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        icon={LogOut}
        title="Cerrar sesión"
        description="Si tu jornada está activa, primero se sincronizarán las ubicaciones y se registrará la salida. ¿Deseas continuar?"
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        confirmTone="danger"
        tone="danger"
        onConfirm={async () => {
          await logout.mutateAsync();
        }}
      />
    </AppScrollScreen>
  );
}
