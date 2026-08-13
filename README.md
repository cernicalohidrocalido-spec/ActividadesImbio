# IMBIO · Registro de Actividades

App web para **IMBIO Pabellón de Arteaga, Aguascalientes** que registra actividades municipales (recolección de muebles, limpieza, órdenes de poda, etc.) con ubicación en mapa, fotos, y genera reportes en **PDF** (contabilización por tipo + desglose) y **Excel** (tabla completa).

---

## Tabla de contenidos

1. [Stack tecnológico](#stack-tecnológico)
2. [Requisitos previos](#requisitos-previos)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Configuración de base de datos](#configuración-de-base-de-datos)
5. [Setup local (desarrollo)](#setup-local-desarrollo)
6. [Variables de entorno](#variables-de-entorno)
7. [Despliegue en producción](#despliegue-en-producción)
8. [API endpoints](#api-endpoints)
9. [Comandos útiles](#comandos-útiles)
10. [Troubleshooting](#troubleshooting)

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React | 19.2.8 |
| Frontend | Vite | 8.2.1 |
| Frontend | TypeScript | 5.6+ |
| Frontend | Tailwind CSS | 4.x (vía `@tailwindcss/vite`) |
| Frontend | HERO UI | 3.2.4 (componentes) |
| Frontend | Leaflet | 1.9.4 + react-leaflet 5.0.0 |
| Frontend | react-aria-components | 1.20.0 (peer de HERO UI) |
| Backend | Node.js | 20+ (probado con 22) |
| Backend | Fastify | 5.x |
| Backend | Prisma | 5.22+ |
| Backend | exceljs | 4.4+ (genera .xlsx) |
| Backend | @react-pdf/renderer | 4.6+ (genera PDF) |
| BD | PostgreSQL | 14+ |
| Package manager | npm workspaces | npm 10+ |

> **Importante:** El cliente usa **React 19** y el servidor usa **React 18.3.1** (para compatibilidad con `@react-pdf/renderer`). El sistema de workspaces de npm maneja esto automáticamente.

---

## Requisitos previos

1. **Node.js 20+** (recomendado 22 LTS) y npm 10+
2. **PostgreSQL 14+** corriendo y accesible
3. **Acceso de red** para descargar dependencias npm
4. **~500 MB de disco** para node_modules, uploads, y BD

### Crear la base de datos

```bash
# Conectarse como superusuario de Postgres
sudo -u postgres psql

# Crear usuario y BD
CREATE USER imbio WITH PASSWORD 'imbio';
CREATE DATABASE actividades_imbio OWNER imbio;
GRANT ALL PRIVILEGES ON DATABASE actividades_imbio TO imbio;
\q
```

> **Alternativa con docker** (si no quieres instalar Postgres localmente):
> ```bash
> docker run -d --name imbio-pg \
>   -e POSTGRES_USER=imbio \
>   -e POSTGRES_PASSWORD=imbio \
>   -e POSTGRES_DB=actividades_imbio \
>   -p 5432:5432 \
>   postgres:16-alpine
> ```

---

## Estructura del proyecto

```
ActividadesImbio/
├── package.json                # Workspaces: client + server
├── README.md                   # Este archivo
├── .gitignore
│
├── client/                      # Frontend (Vite + React 19)
│   ├── package.json
│   ├── vite.config.ts           # Vite + Tailwind plugin + manualChunks
│   ├── tsconfig*.json
│   ├── public/
│   │   ├── favicon.svg
│   │   └── logo-pabellon.png    # Logo del H. Ayuntamiento
│   └── src/
│       ├── main.tsx             # Entry point (monta Toast.Provider + TiposProvider + App)
│       ├── App.tsx              # Vista principal (HomeView)
│       ├── index.css            # Tailwind + HERO UI + Leaflet imports
│       ├── lib/
│       │   ├── api.ts           # Funciones fetch() hacia el backend
│       │   ├── types.ts         # TipoConfig, Actividad, etc.
│       │   ├── tipos.tsx        # Context para tipos de intervención
│       │   ├── geocode.ts       # Reverse geocoding (Nominatim/OSM)
│       │   ├── format.ts        # formatDate, toInputDate, currentMonth
│       │   ├── toast.ts         # toastQueue + notify/success/error/warning
│       │   └── leaflet-fix.ts   # Fix de íconos default de Leaflet
│       └── components/
│           ├── Navbar.tsx              # Header con logo
│           ├── ActivityCard.tsx         # Card de actividad
│           ├── ActivityForm.tsx        # Form crear/editar (Modal)
│           ├── ActivityFilters.tsx     # Filtros + botones export
│           ├── MapView.tsx             # Mapa con pins y popup
│           ├── LocationPicker.tsx      # Mapa del formulario
│           ├── TipoManager.tsx         # Modal gestionar tipos
│           ├── TipoPill.tsx            # Pill custom (color real del tipo)
│           └── ErrorBoundary.tsx
│
└── server/                      # Backend (Fastify + Prisma)
    ├── package.json
    ├── tsconfig.json
    ├── prisma/
    │   ├── schema.prisma        # Modelos: TipoConfig, Actividad, Foto
    │   └── seed.ts              # Datos iniciales
    └── src/
        ├── index.ts             # Entry: registra rutas y arranca
        ├── lib/
        │   ├── prisma.ts        # Cliente Prisma singleton
        │   ├── filters.ts       # buildActividadWhere() compartido
        │   ├── tipo-colors.ts   # TIPO_COLOR_HEX (server)
        │   └── pdf.tsx          # ReporteResumenDocument (@react-pdf)
        └── routes/
            ├── activities.ts    # CRUD /api/actividades
            ├── tipos.ts         # CRUD /api/tipos
            ├── photos.ts        # Upload/delete de fotos
            └── reports.tsx      # GET /api/reportes/pdf + /api/reportes/excel
```

---

## Configuración de base de datos

El schema está en `server/prisma/schema.prisma`. Dos modelos principales:

- **`TipoConfig`** — Tipos de intervención configurables (id, key, label, color, order, activo)
- **`Actividad`** — Registro de actividad (id, nombre, tiposIntervencion[], fecha, realizadaPor, direccion, descripcion, lat, lng)
- **`Foto`** — Fotos asociadas a una actividad (1 a N)

Las fotos se guardan como archivos en `server/uploads/` y la URL relativa (`/uploads/xxx.jpg`) se guarda en la BD.

### Variables de entorno (server/.env)

Crear `server/.env` (copiar de `.env.example`):

```env
PORT=4000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://imbio:imbio@localhost:5432/actividades_imbio
PUBLIC_BASE_URL=http://localhost:4000
UPLOAD_DIR=./uploads
```

> `PUBLIC_BASE_URL` se usa para resolver las URLs relativas de las fotos dentro del PDF. En producción debe ser la URL pública del backend (ej. `https://api.ejemplo.com`).

### Variables de entorno (client/.env)

Crear `client/.env`:

```env
VITE_API_BASE_URL=
```

> Dejar vacío en desarrollo (el proxy de Vite redirige `/api/*` al server). En producción poner la URL del backend (ej. `https://api.ejemplo.com`).

---

## Setup local (desarrollo)

```bash
# 1. Clonar el repo
git clone <url>
cd ActividadesImbio

# 2. Instalar dependencias (workspaces instala todo)
npm install

# 3. Configurar server
cd server
cp .env.example .env
# Editar .env si necesitas cambiar credenciales de Postgres

# 4. Generar Prisma Client y aplicar schema
npx prisma generate
npx prisma db push
# (alternativa con migraciones versionadas: npx prisma migrate deploy)

# 5. Sembrar datos iniciales (6 tipos + opcionalmente 2 actividades demo)
npm run seed

# 6. Arrancar todo (server + client con concurrently)
cd ..
npm run dev
```

Abre:

- **Cliente:** `http://localhost:5173`
- **API:** `http://localhost:4000/api/health` → debe responder `{"ok":true,...}`

### Comandos individuales

```bash
# Solo cliente
npm run dev:client

# Solo servidor
npm run dev:server

# Build de producción del cliente (a /dist)
npm run build -w client

# Build de producción del server (a /dist)
npm run build -w server
```

---

## Variables de entorno

### `server/.env`

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `4000` | Puerto del backend |
| `HOST` | `0.0.0.0` | Interfaz de red (0.0.0.0 = todas) |
| `CORS_ORIGIN` | `http://localhost:5173` | Orígenes CORS permitidos (separados por coma) |
| `DATABASE_URL` | — | URL de conexión a Postgres |
| `PUBLIC_BASE_URL` | `http://localhost:4000` | URL pública para imágenes en PDF |
| `UPLOAD_DIR` | `./uploads` | Carpeta donde se guardan las fotos |

### `client/.env`

| Variable | Default | Descripción |
|---|---|---|
| `VITE_API_BASE_URL` | (vacío) | URL base del API. Vacío = usa proxy de Vite. Producción: URL pública del server |

---

## Despliegue en producción

Hay **tres opciones** recomendadas, de menor a mayor esfuerzo:

### Opción A: Docker Compose (recomendado)

Crear `docker-compose.yml` en la raíz:

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: imbio
      POSTGRES_PASSWORD: imbio
      POSTGRES_DB: actividades_imbio
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U imbio"]
      interval: 5s
      retries: 10

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      PORT: 4000
      HOST: 0.0.0.0
      DATABASE_URL: postgresql://imbio:imbio@db:5432/actividades_imbio
      CORS_ORIGIN: https://app.ejemplo.com
      PUBLIC_BASE_URL: https://api.ejemplo.com
      UPLOAD_DIR: /app/uploads
    volumes:
      - uploads:/app/uploads
    ports:
      - "4000:4000"

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: https://api.ejemplo.com
    restart: unless-stopped
    depends_on:
      - server
    ports:
      - "80:80"

volumes:
  pgdata:
  uploads:
```

**`server/Dockerfile`:**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm install --workspaces=false --include-workspace-root=false -w server

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server/ ./server/
RUN cd server && npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY server/prisma ./server/prisma
WORKDIR /app/server
EXPOSE 4000
# Aplicar schema y arrancar
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && node dist/index.js"]
```

**`client/Dockerfile`:**

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm install --workspaces=false --include-workspace-root=false -w client
COPY client/ ./client/
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN cd client && npm run build

FROM nginx:alpine
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`client/nginx.conf`:**

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # Rutas API → backend
  location /api/ {
    proxy_pass http://server:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Uploads → backend
  location /uploads/ {
    proxy_pass http://server:4000;
  }

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

**Desplegar:**

```bash
# Build y arrancar
docker compose up -d --build

# Sembrar tipos iniciales (una sola vez)
docker compose exec server sh -c "npx tsx prisma/seed.ts"

# Ver logs
docker compose logs -f
```

### Opción B: Build estático + Node (un solo servidor)

```bash
# 1. Build del cliente
cd client
npm run build      # genera client/dist/

# 2. Build del server
cd ../server
npm run build      # genera server/dist/

# 3. Copiar el dist del cliente al server para servirlo estáticamente
mkdir -p public
cp -r ../client/dist/* public/

# 4. Ajustar server/src/index.ts para servir el dist:
#    await app.register(fastifyStatic, {
#      root: path.resolve(process.cwd(), 'public'),
#      prefix: '/',
#    });

# 5. Arrancar
cd ..
NODE_ENV=production node server/dist/index.js
```

### Opción C: Servidor Node + Nginx como reverse proxy

```nginx
# /etc/nginx/sites-available/imbio
server {
  listen 80;
  server_name app.ejemplo.com;
  root /var/www/imbio/client/dist;
  index index.html;

  location /api/ {
    proxy_pass http://localhost:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 60s;
  }

  location /uploads/ {
    proxy_pass http://localhost:4000;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

```bash
# Build
cd ActividadesImbio
npm install
cd client && npm run build && cd ..
cd server && npm run build

# Deploy
sudo cp -r client/dist /var/www/imbio/
sudo systemctl enable --now imbio-server
# (crear /etc/systemd/system/imbio-server.service que ejecuta node /opt/imbio/server/dist/index.js)
```

### Reverse proxy con HTTPS (producción)

Poner **Caddy** o **Traefik** delante para HTTPS automático con Let's Encrypt:

```caddyfile
# /etc/caddy/Caddyfile
api.ejemplo.com {
  reverse_proxy localhost:4000
}
app.ejemplo.com {
  reverse_proxy localhost:5173
  # O si serviste el build estático, reverse_proxy localhost:80
}
```

---

## API endpoints

Base URL: `http://localhost:4000`

### Actividades

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/actividades?mes=YYYY-MM&tipo=A,B&q=texto&desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | Lista con filtros opcionales |
| `GET` | `/api/actividades/:id` | Detalle de una actividad |
| `POST` | `/api/actividades` | Crear nueva |
| `PUT` | `/api/actividades/:id` | Actualizar |
| `DELETE` | `/api/actividades/:id` | Eliminar |

### Tipos de intervención

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/tipos?activo=true` | Lista (opcional filtrar por activo) |
| `POST` | `/api/tipos` | Crear nuevo tipo |
| `PUT` | `/api/tipos/:id` | Actualizar (label, color, activo) |
| `DELETE` | `/api/tipos/:id` | Soft delete (activo=false) |

### Fotos

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/actividades/:id/fotos` | Subir fotos (multipart) |
| `DELETE` | `/api/fotos/:id` | Eliminar foto |

### Reportes

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/reportes/pdf?mes=YYYY-MM&tipo=A,B&q=...` | PDF con contabilización + desglose |
| `GET` | `/api/reportes/excel?mes=...&tipo=...&q=...` | Excel con 3 hojas (Actividades / Resumen / Filtros) |

### Health

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | `{ ok: true, ts: ... }` |

---

## Comandos útiles

```bash
# Resetear BD y sembrar de cero
cd server
npx prisma db push --force-reset --accept-data-loss
npm run seed

# Inspeccionar BD
npx prisma studio
# Abre http://localhost:5555

# Build de producción
cd ..
npm run build

# Limpiar uploads
rm -rf server/uploads/*

# Ver logs del server
cd server
npm run dev  # los logs salen en consola
```

---

## Troubleshooting

### "Can't access property useState, resolveDispatcher() is null"

Causa: el HMR de Vite se corrompió (suele pasar tras muchos cambios).
**Fix:** `rm -rf client/node_modules/.vite` y reiniciar `npm run dev`. Si persiste, hard refresh en el navegador (`Cmd+Shift+R`).

### "listen EADDRINUSE: address already in use 0.0.0.0:4000"

Otro proceso tiene el puerto. **Fix:** `lsof -ti:4000 | xargs kill -9`.

### "A React Element from an older version of React was rendered" (PDF)

Causa: el cliente usa React 19, pero `@react-pdf/renderer` no es compatible. **Fix:** el server ya incluye una copia local de `@react-pdf/*` en `server/node_modules/`. Si se borra, restaurar con:
```bash
cd server
npm install --save react@^18.3.1 react-dom@^18.3.1
cp -r /path/to/root/node_modules/@react-pdf ./node_modules/
```

### "Cannot find module '@prisma/client'" o errores de Prisma

```bash
cd server
npx prisma generate
```

### Las fotos no se ven en el PDF

Verificar que `PUBLIC_BASE_URL` apunte a la URL pública del backend (no `localhost`).

### "Module not found" al hacer build del cliente

```bash
cd client
rm -rf node_modules/.vite dist
npm install
```

---

## Agregar un nuevo tipo de intervención

Hay dos formas:

**A) Desde la UI:** Abrir la app → "+ Nueva actividad" → "⚙️ Gestionar tipos" → llenar el formulario y "+ Agregar".

**B) Directo en BD:**
```sql
INSERT INTO "TipoConfig" (key, label, color, "order", activo, "createdAt", "updatedAt")
VALUES ('MIPRESUPUESTO', 'Mantenimiento de presupuesto', 'info', 100, true, NOW(), NOW());
```

Los colores válidos son: `success`, `warning`, `danger`, `info`, `primary`, `secondary`, `accent`, `neutral`.

---

## Licencia

Software propietario de IMBIO Pabellón de Arteaga.
