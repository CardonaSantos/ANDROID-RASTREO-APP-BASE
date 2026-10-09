import { Redirect, Stack } from "expo-router";
import { useSessionRouteGuards } from "@/core/routing";

export default function AppLayout() {
  const session = useSessionRouteGuards();
  if (!session.isSettled) return null;
  if (!session.isAuthenticated) return <Redirect href="/login" />;

  return (
    <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
      <Stack.Screen name="index" options={{ title: "MARCAS Rastreo" }} />
      <Stack.Screen name="tracking" options={{ title: "Jornada" }} />
    </Stack>
  );
}
