# MARCAS Rastreo · Android

App de campo para registrar jornadas y posiciones GPS en **MARCAS-GT-SERVER**.
Refactor a partir de `checkpoint-android-studio` (`16b2ffcb`) de
`CardonaSantos/ANDROID-RASTREO-APP-BASE`.

## Interfaz deliberadamente mínima

Solo existen `/login`, `/` (principal) y `/tracking` (jornada).
No se incluyen tickets, instalaciones, cobros, clientes, mapas de supervisión
ni notificaciones del CRM de técnicos. Se conserva la arquitectura de
`src/core` y `src/design-system`, así como el motor de localización
de `src/features/tracking`.

## Conexión con MARCAS-GT-SERVER

Base verificada: rama `update-requerimientos`, commit `38753083`.

| Acción | Método / ruta | Roles |
| --- | --- | --- |
| Login | `POST /auth/login` | usuario activo |
| Iniciar jornada | `POST /real-time-location/tracking/start` | VENDEDOR / REPARTIDOR / ADMIN |
| Estado propio | `GET /real-time-location/tracking/me` | mismos |
| Enviar punto | `POST /real-time-location/tracking/location` | mismos |
| Finalizar jornada | `POST /real-time-location/tracking/:id/finish` | mismos |

Login acepta `{correo, contrasena}` y devuelve `{authToken, usuario}`.
No existe `GET /auth/profile` ni refresh-token en este contrato. La app
guarda el JWT en SecureStore mediante el Session Core y el perfil
validado de login en una entrada segura separada. El servidor vuelve
a comprobar cuenta activa y rol en cada request.

La jornada se crea/retoma en el servidor, con asistencia vinculada.
No se envía `usuarioId` desde el dispositivo: se deriva del JWT.
Los pings contienen `sesionTrackingId`, latitud, longitud, precisión,
velocidad, batería, `capturadoEn` y `claveIdempotencia` estable.

## Ejecución local

1. `npm ci`
2. Copiar `.env.example` a `.env` y editar `EXPO_PUBLIC_API_URL`.
   Android Emulator puede usar `http://10.0.2.2:4000`; dispositivo físico
   usa la IP LAN o un dominio HTTPS accesible.
3. `npx expo run:android` con un dispositivo/emulador configurado.
   El seguimiento en segundo plano usa tareas nativas y no funciona
   como servicio real en la vista previa Web.
4. Iniciar sesión con usuario MARCAS `VENDEDOR`, `REPARTIDOR` o `ADMIN`.
5. Conceder ubicación normal y en segundo plano, activar GPS, iniciar
   jornada y verificar el indicador de servicio y sincronización.

## Socket.IO: infraestructura conservada y preparada para eventos

Realtime sigue en `core/realtime` con su manager, lifecycle, autenticación
JWT en `handshake.auth.token`, handlers e invalidación de TanStack Query.
No se utiliza para **enviar GPS**. Las posiciones se siguen enviando por HTTP
y la cola SQLite conserva los pendientes.

Por defecto no se conecta en la app de campo, para no gastar red ni batería
sin eventos para el rol:

```dotenv
EXPO_PUBLIC_REALTIME_ENABLED=false
EXPO_PUBLIC_REALTIME_URL=
```

Para activar recepción de eventos, cambiar a `true` y reiniciar Metro.
Con URL vacía usa automáticamente `EXPO_PUBLIC_API_URL`; si se especifica
un origen debe ser alcanzable desde Android (en emulador, no usar localhost
del teléfono). El adapter añade namespace `/ws` y path `/socket.io`.

El módulo `application/realtime` registra un binding para eventos de
tracking **del propio usuario** que invalidan `["tracking","me"]`.
Al conectar/reconectar, también se invalida ese estado para recuperar
eventos perdidos mientras Android estuvo en segundo plano. Las demás
features podrán adjuntar bindings de eventos y claves de queries.

**Contrato comprobado en MARCAS-GT-SERVER:** el gateway solo publica
`tracking:location-updated` y `tracking:state-changed` a `role:ADMIN`.
Los usuarios VENDEDOR/REPARTIDOR no reciben estos eventos actualmente:
para notificaciones destinadas a ellos el servidor debe añadir contratos
autorizados y emitir a `user:<id>` o rooms equivalentes. No inventamos
un canal bidireccional GPS ni enviamos eventos sin soporte de backend.

Los errores de reconexión son diagnósticos informativos, no errores fatales
para la jornada; la conexión se suspende en background y se recupera al
volver al primer plano, conforme al ciclo de vida de Core.

## Seguimiento y seguridad

- `expo-task-manager` define la tarea antes de montar Expo Router.
- `expo-location` mantiene foreground service visible en Android durante la jornada.
- Ubicaciones aceptadas se guardan primero en SQLite y después se envían
  por HTTP. Reintentos comparten `claveIdempotencia`.
- Primer punto: se solicita un fix inmediato tras iniciar el servicio.
  Después se envía por tiempo (objetivo 5 min con perfil normal) **o**
  distancia (250 m). Android puede modular la frecuencia real.
- Al recuperar red o volver a primer plano, se reconcilia con el
  estado del servidor y se vacía la cola.
- Finalizar y cerrar sesión requieren sincronizar ubicaciones pendientes;
  una caída de red no debe descartarlas silenciosamente.
- El backend expira jornadas sin heartbeat (por defecto tras 120 min,
  con barrido cada 10 min). Una desconexión prolongada puede hacer que
  la jornada expire antes de sincronizar sus pings: este riesgo requiere
  una política de producto/backend si se planea operar offline por horas.
- Web es solo vista previa: SecureStore y SQLite de tracking son nativos.

## Validación

```bash
npx tsc --noEmit
npm run lint
npm run test:tracking
npm test -- --runInBand
```

Además probar en **Android físico**: permisos desde cero, bloqueo de pantalla,
recorrido real, modo avión y reconexión, volver a abrir la app, cierre con
cola pendiente, y verificación de pings/horarios desde MARCAS-GT-UI.

**Nota**: el identificador Android cambió a `com.cardonasantos.marcasrastreo`.
Se retiró el EAS `projectId` de la app anterior; configurar un proyecto EAS
nuevo antes de generar builds remotos.

## Build Android de Marcas Guatemala (EAS)

El perfil `marcas-production` hereda de `production`: genera APK
firmada para distribución interna, activa `autoIncrement` y utiliza el
entorno EAS `production`. La URL del servidor **no se fija en el repositorio**;
se administra desde las variables de entorno del proyecto EAS.

### Primera configuración de un proyecto EAS independiente

```powershell
npm install -g eas-cli
eas login
eas init
eas project:info
```

Al ejecutar `eas init`, elegir **crear un proyecto nuevo** llamado
Marcas Guatemala, sin vincularlo al proyecto anterior NOVA. El CLI
actualiza `expo.extra.eas.projectId` en `app.json`. Conservar ese
identificador en GitHub para reproducir las compilaciones posteriores.
El identificador Android debe seguir siendo
`com.cardonasantos.marcasrastreo`.

### Variables públicas del entorno EAS production

Introducir la URL **HTTPS completa y real** de MARCAS-GT-SERVER,
sin `/auth`, `/tracking` ni `/socket.io` al final:

```powershell
$apiUrl = "https://TU_DOMINIO_REAL_DE_RAILWAY"
eas env:set --name EXPO_PUBLIC_API_URL --value $apiUrl --environment production --visibility plaintext
eas env:list --environment production
```

El perfil fija `EXPO_PUBLIC_APP_ENV=production` y
`EXPO_PUBLIC_REALTIME_ENABLED=false` mediante `build.env`.
**No** se incluye `EXPO_PUBLIC_REALTIME_URL`: EAS rechaza valores vacíos
en `build.env`, y no necesitamos configurar un origen de Socket.IO
cuando el canal está desactivado. El GPS transmite ubicaciones por HTTP
y no necesita Socket.IO activo.
Nunca almacenar secretos/JWT/contraseñas en `EXPO_PUBLIC_*`.

### Iniciar compilación APK

```powershell
eas build --platform android --profile marcas-production
```

Durante la primera build, permitir que EAS genere/gestione la keystore
Android. El enlace de expo.dev al terminar permite instalar la APK en
un dispositivo Android; no se requiere Metro. Revisar primero que
`eas project:info` apunte al proyecto nuevo.

Para Play Store no usar esta APK: se requiere una build `.aab` y el
proceso de firma/publicación correspondiente.

### Prueba de campo previa a distribución

Comprobar en teléfono físico: instalación, login, permisos de ubicación
precisa y segundo plano, inicio de jornada, GPS correcto, bloqueo de pantalla,
registro de pings en MARCAS-GT-UI, cierre de jornada, offline/reconexión y
cola SQLite. El emulador usa ubicación simulada.

**No usar** `10.0.2.2` en ninguna compilación de producción; esa dirección
solo comunica al emulador con el computador anfitrión.
