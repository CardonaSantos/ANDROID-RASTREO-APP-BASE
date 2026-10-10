import { Redirect, Stack } from "expo-router";
import { useSessionRouteGuards } from "@/core/routing";

export default function AppLayout() {
  const session = useSessionRouteGuards();
  if (!session.isSettled) return null;
  if (!session.isAuthenticated) return <Redirect href="/login" />;

  return (
    <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
      {/* La Home posee una cabecera compacta con el menú de cuenta. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="tracking" options={{ title: "Jornada" }} />
    </Stack>
  );
}
