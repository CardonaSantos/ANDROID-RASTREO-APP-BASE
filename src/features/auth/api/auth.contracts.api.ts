import { z } from "zod";

export const TRACKING_ALLOWED_ROLES = ["VENDEDOR", "REPARTIDOR", "ADMIN"] as const;

export const loginCredentialsSchema = z.object({
  correo: z.string().trim().email("Ingresa un correo electrónico válido."),
  contrasena: z.string().min(4, "La contraseña debe tener al menos 4 caracteres."),
});

export const authUserSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1),
  correo: z.string().email(),
  rol: z.string().min(1),
  activo: z.boolean(),
  empresaId: z.number().int().positive().nullable(),
});

export const loginResponseSchema = z.object({
  authToken: z.string().min(1),
  usuario: authUserSchema,
});

export const profileResponseSchema = authUserSchema;
export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export interface AuthSessionPayload {
  user: AuthUser;
  accessToken: string;
}
