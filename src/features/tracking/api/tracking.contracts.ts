import { z } from "zod";

export const trackingStatusSchema = z.enum([
  "ACTIVA",
  "FINALIZADA",
  "EXPIRADA",
]);

export const trackingInactiveStateSchema = z.object({
  activo: z.literal(false),

  sesionTrackingId: z.null(),

  asistenciaId: z.null(),

  estado: z.null(),

  iniciadoEn: z.null(),

  ultimoHeartbeatEn: z.null(),
});

export const trackingActiveStateSchema = z.object({
  activo: z.literal(true),

  sesionTrackingId: z.number().int().positive(),

  asistenciaId: z.number().int().positive(),

  estado: trackingStatusSchema,

  iniciadoEn: z.string().min(1),

  ultimoHeartbeatEn: z.string().min(1),
});

export const trackingStateSchema = z.discriminatedUnion("activo", [
  trackingInactiveStateSchema,
  trackingActiveStateSchema,
]);

export const startTrackingResponseSchema = z.object({
  sesionTrackingId: z.number().int().positive(),

  asistenciaId: z.number().int().positive(),

  estado: trackingStatusSchema,

  iniciadoEn: z.string().min(1),

  ultimoHeartbeatEn: z.string().min(1),
});

//FINALIZAR JORNADA

export const finishTrackingResponseSchema = z.object({
  sesionTrackingId: z.number().int().positive(),

  asistenciaId: z.number().int().positive(),

  estado: z.literal("FINALIZADA"),

  iniciadoEn: z.string().min(1),

  finalizadoEn: z.string().min(1),

  ultimoHeartbeatEn: z.string().min(1),

  duracionMinutos: z.number().int().nonnegative(),

  horaEntrada: z.string().min(1),

  horaSalida: z.string().min(1),
});

export const registerTrackingLocationInputSchema = z.object({
  claveIdempotencia: z.string().trim().min(1).max(200).optional(),
  sesionTrackingId: z.number().int().positive(),

  latitud: z.number().min(-90).max(90),

  longitud: z.number().min(-180).max(180),

  precision: z.number().nonnegative().nullable(),

  velocidad: z.number().nonnegative().nullable(),

  bateria: z.number().int().min(0).max(100).nullable(),

  capturadoEn: z.string().min(1),
});

export const registerTrackingLocationResponseSchema = z.object({
  ubicacionId: z.number().int().positive(),

  sesionTrackingId: z.number().int().positive(),

  estado: trackingStatusSchema,

  capturadoEn: z.string().min(1),

  recibidoEn: z.string().min(1),

  ultimoHeartbeatEn: z.string().min(1),
});

export type FinishTrackingResponse = z.infer<
  typeof finishTrackingResponseSchema
>;

export type TrackingStatus = z.infer<typeof trackingStatusSchema>;

export type TrackingState = z.infer<typeof trackingStateSchema>;

export type TrackingActiveState = z.infer<typeof trackingActiveStateSchema>;

export type StartTrackingResponse = z.infer<typeof startTrackingResponseSchema>;

export type RegisterTrackingLocationInput = z.infer<
  typeof registerTrackingLocationInputSchema
>;

export type RegisterTrackingLocationResponse = z.infer<
  typeof registerTrackingLocationResponseSchema
>;
