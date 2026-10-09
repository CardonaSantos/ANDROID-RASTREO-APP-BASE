import * as Location from "expo-location";
import { Platform } from "react-native";
import { processTrackingLocations } from "../background/tracking-location-processor";

/**
 * Solo después de iniciar una jornada con permisos concedidos.
 * TaskManager sigue siendo el responsable del rastreo posterior.
 * Si no hay fix inicial, el servicio nativo continuará intentándolo.
 */
export async function captureInitialTrackingLocation(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await processTrackingLocations([location]);
  } catch (error) {
    console.warn("[tracking] Primer GPS aún no disponible.", error);
  }
}
