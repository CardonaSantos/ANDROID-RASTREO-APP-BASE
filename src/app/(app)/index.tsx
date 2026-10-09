import { useState } from "react";
import { useRouter } from "expo-router";
import { LogOut, MapPin, Navigation } from "lucide-react-native";
import {
  AppAlert, AppButton, AppCard, AppConfirmDialog,
  AppScrollScreen, AppStack, AppText,
} from "@/design-system";
import { useAuthProfileQuery, useLogoutMutation } from "@/features/auth";
import { useTrackingStateQuery } from "@/features/tracking/hooks";

export default function HomeScreen() {
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const profile = useAuthProfileQuery();
  const tracking = useTrackingStateQuery();
  const logout = useLogoutMutation();

  return (
    <AppScrollScreen>
      <AppStack gap="xl">
        <AppStack gap="xs">
          <AppText variant="headlineSmall" weight="semibold">MARCAS Rastreo</AppText>
          <AppText tone="muted">Registro de jornada y seguimiento GPS.</AppText>
        </AppStack>

        <AppCard>
          <AppStack gap="sm">
            <AppText variant="titleMedium" weight="semibold">
              {profile.data?.nombre ?? "Mi cuenta"}
            </AppText>
            <AppText tone="secondary">
              {profile.data?.rol ?? "Personal de campo"}
            </AppText>
          </AppStack>
        </AppCard>

        <AppCard>
          <AppStack gap="md">
            <AppText variant="titleMedium" weight="semibold">Mi jornada</AppText>
            {tracking.isPending ? (
              <AppText tone="muted">Consultando el servidor...</AppText>
            ) : tracking.isError ? (
              <AppAlert tone="danger" title="No se pudo consultar la jornada">
                Comprueba la conexión y vuelve a intentarlo.
              </AppAlert>
            ) : (
              <AppAlert
                tone={tracking.data.activo ? "success" : "neutral"}
                title={tracking.data.activo ? "Jornada activa" : "Sin jornada activa"}
              >
                {tracking.data.activo
                  ? "El seguimiento está en curso. Comprueba el estado del GPS en Jornada."
                  : "Inicia tu jornada antes de salir a campo."}
              </AppAlert>
            )}
            <AppButton
              fullWidth
              leadingIcon={tracking.data?.activo ? Navigation : MapPin}
              onPress={() => router.push("/tracking")}
            >
              {tracking.data?.activo ? "Ver jornada" : "Abrir jornada"}
            </AppButton>
            {tracking.isError ? (
              <AppButton variant="outlined" onPress={() => void tracking.refetch()}>
                Reintentar consulta
              </AppButton>
            ) : null}
          </AppStack>
        </AppCard>

        {profile.isError ? (
          <AppAlert tone="warning" title="Perfil local no disponible">
            Vuelve a iniciar sesión si la aplicación fue actualizada desde otra cuenta.
          </AppAlert>
        ) : null}
        {logout.isError ? (
          <AppAlert tone="danger" title="No se pudo cerrar sesión">
            Antes de salir se debe sincronizar y finalizar cualquier jornada activa.
            Comprueba la conexión y vuelve a intentarlo.
          </AppAlert>
        ) : null}
        <AppButton
          fullWidth
          variant="outlined"
          tone="danger"
          leadingIcon={LogOut}
          loading={logout.isPending}
          onPress={() => setConfirmLogout(true)}
        >
          Cerrar sesión
        </AppButton>
        <AppConfirmDialog
          open={confirmLogout}
          onOpenChange={setConfirmLogout}
          title="Cerrar sesión"
          description="Si existe una jornada activa, se sincronizarán sus ubicaciones y se registrará la salida antes de cerrar sesión."
          confirmLabel="Cerrar sesión"
          cancelLabel="Cancelar"
          confirmTone="danger"
          tone="danger"
          onConfirm={async () => { await logout.mutateAsync(); }}
        />
      </AppStack>
    </AppScrollScreen>
  );
}
