# FinanceAI - Asistente Inteligente de Salud Financiera

Sistema fullstack de análisis financiero personal que combina inteligencia artificial para clasificar transacciones, evaluar perfiles de riesgo y generar recomendaciones personalizadas.

## Arquitectura General

```text
┌─────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────┐
│   FRONTEND (React)  │────▶│  BACKEND (Spring Boot)  │────▶│  ML SERVICE (Flask)  │
│   Puerto: 5173      │◀────│  Puerto: 8080           │◀────│  Puerto: 5000        │
└─────────────────────┘     └───────────┬─────────────┘     └─────────────────────┘
                                        │
                                        ▼
                            ┌─────────────────────────┐
                            │   MySQL (Railway Cloud)  │
                            │   Puerto: 43018          │
                            └─────────────────────────┘
```

**Flujo de datos:**
1. El usuario carga ingresos y transacciones desde el frontend
2. El frontend envía las transacciones al backend Java
3. El backend detecta categorías genéricas ("Otras") y llama al modelo ML de Flask para clasificarlas
4. Flask usa un modelo Transformer (TensorFlow/Keras) para predecir la categoría (Alimentacion, Transporte, Hogar, etc.)
5. El backend calcula indicadores financieros (DTI, meses de supervivencia, ratio de ahorro)
6. El backend llama al modelo Random Forest de Flask para predecir el perfil financiero (Saludable, En Observacion, En Riesgo)
7. Los resultados se devuelven al frontend para mostrar en dashboard y análisis

---

## Stack Tecnologico

### Frontend
| Tecnologia | Version | Justificacion |
|---|---|---|
| React | 19.1 | Componentes reactivos, virtual DOM eficiente, ecosistema maduro |
| TypeScript | 5.9 | Tipado estático que previene errores en tiempo de desarrollo |
| Vite | 7.1 | Build tool ultrarrápido, HMR instantáneo, ESModules nativos |
| React Router | 7.18 | Enrutamiento SPA con lazy loading y rutas protegidas |
| Radix UI | 1.1 | Componentes accesibles (dialogs) sin estilos impuestos |
| Zod | 4.4 | Validación de esquemas con inferencia de tipos |
| React Hook Form | 7.85 | Formularios performantes con validación integrada |
| Lucide React | 0.540 | Iconos SVG consistentes y tree-shakeable |
| jsPDF | 4.2 | Exportación de reportes a PDF desde el cliente |

### Backend
| Tecnologia | Version | Justificacion |
|---|---|---|
| Java | 21+ | LTS con records, sealed classes, pattern matching |
| Spring Boot | 3.5.3 | Framework enterprise con autoconfiguración y ecosistema completo |
| Spring Data JPA | 3.5 | ORM con Hibernate, repositorios declarativos |
| Spring Security | 6.5 | Autenticación JWT y protección de endpoints |
| MySQL | 9.4 | BD relacional robusta para producción (Railway Cloud) |
| H2 | 2.3 | BD en memoria para desarrollo local rápido |
| JWT (jjwt) | 0.12.3 | Tokens stateless para autenticación de sesiones |
| HikariCP | 5.x | Pool de conexiones de alto rendimiento |

### ML Service (Python)
| Tecnologia | Version | Justificacion |
|---|---|---|
| Python | 3.14 | Ecosistema líder en ML/Data Science |
| Flask | 3.1 | Microframework ligero para exponer modelos como API REST |
| TensorFlow/Keras | 2.19 | Framework de deep learning para el modelo Transformer de categorización |
| scikit-learn | 1.6.1 | Random Forest para clasificación de perfil financiero |
| NumPy | 2.0 | Operaciones numéricas eficientes |
| Pandas | 2.2 | Manipulación de datos tabulares |
| joblib | 1.4 | Serialización eficiente de modelos entrenados (.pkl) |

### Infraestructura
| Servicio | Uso |
|---|---|
| Oracle Cloud (OCI) | VM para hosting del backend Java |
| Railway | Base de datos MySQL en la nube |
| GitHub | Repositorio de código y versionado |
| GitHub Codespaces | Entorno de compilación y despliegue |

---

## Modelos de Machine Learning

### 1. Modelo de Categorización de Transacciones

**Arquitectura:** Transformer con Context Fusion (inspirado en DragoNet de Busson et al. 2023)

**Entradas:**
- `nombre_tienda` (texto) — nombre del comercio
- `subcategoria` (texto) — contexto adicional
- `esencial` (booleano) — si es gasto esencial o no

**Salidas (6 categorías):**
- Alimentacion
- Entretenimiento
- Finanzas
- Hogar
- Salud
- Transporte

**Preprocesamiento:**
- TextVectorization con vocabulario de 5000 tokens
- Secuencias de longitud 5
- Vocabulario ajustado solo con datos de entrenamiento (sin data leakage)

**Resultados:** Accuracy 100% en test (dataset con relación determinista entre subcategoría y categoría principal)

**Archivos generados:**
- `modelo_categoria_full.keras` — modelo Keras serializado
- `artefactos_categoria.pkl` — LabelEncoder + vocabulario + versiones

### 2. Modelo de Perfil Financiero

**Arquitectura:** Random Forest Classifier (100 estimadores)

**Entradas (5 features):**
- `meses_supervivencia` — ahorro_total / (gastos_esenciales + deudas)
- `score_supervivencia` — puntaje 0-35 según meses de respaldo
- `score_ahorro` — puntaje 0-35 según ratio de ahorro (regla 50/30/20)
- `score_endeudamiento` — puntaje 0-30 según DTI (regla del 36%)
- `score_financiero` — suma total (escala 0-100)

**Salidas (3 perfiles):**
- Saludable
- En Observacion
- En Riesgo

**Tratamiento de desbalanceo:** SMOTE (sobremuestreo sintético) para la clase minoritaria

**Resultados:** Accuracy 96.21% — detección perfecta (1.00 precision/recall) para perfil "En Riesgo"

**Archivo generado:**
- `modelo_riesgo_financiero.pkl` — modelo Random Forest serializado

### Sistema de Scoring (reglas de negocio)

| Componente | Máximo | Criterio |
|---|---|---|
| Supervivencia | 35 pts | 0 meses=0pts, 1-3=15pts, 4-6=25pts, >6=35pts |
| Ahorro | 35 pts | Negativo=0pts, <10%=15pts, 10-20%=25pts, >20%=35pts |
| Endeudamiento | 30 pts | DTI>36%=0pts, 20-36%=15pts, <20%=30pts |
| Penalización | -15 pts | Pago parcial de tarjeta |

---

## Estructura del Proyecto

```text
PVSC/
├── src/main/java/com/financeai/    # Backend Java
│   ├── config/                     # SecurityConfig, CORS, DataInitializer
│   ├── controller/                 # REST Controllers
│   ├── dto/                        # Data Transfer Objects
│   ├── entity/                     # JPA Entities (Usuario, Transaccion, Categoria, Alerta)
│   ├── repository/                 # Spring Data JPA Repositories
│   ├── service/                    # Interfaces de servicios
│   │   └── impl/                   # Implementaciones (DashboardService, MlService, TransactionService)
│   └── FinanceAiApplication.java
├── src/main/resources/
│   ├── application.properties      # Config desarrollo (H2)
│   └── application-prod.properties # Config producción (MySQL Railway)
├── frontend/                       # React App
│   ├── src/
│   │   ├── api/                    # Clientes HTTP (auth, dashboard, transactions)
│   │   ├── app/router/             # React Router config
│   │   ├── components/             # UI components (Button, Card, Layout)
│   │   ├── features/
│   │   │   ├── analysis/           # Wizard de análisis + gateway al backend
│   │   │   ├── dashboard/          # Dashboard con charts (DonutChart, BarChart)
│   │   │   ├── goals/              # Metas de ahorro
│   │   │   ├── landing/            # Landing page
│   │   │   └── notifications/      # Centro de notificaciones
│   │   ├── hooks/                  # useGoogleAuth
│   │   ├── pages/                  # Page components
│   │   ├── styles/                 # tokens.css + globals.css
│   │   ├── types/                  # TypeScript interfaces
│   │   └── utils/                  # formatters, ProtectedRoute, exportUtils
│   ├── package.json
│   └── vite.config.ts
├── ml-service/                     # Python ML API
│   ├── app.py                      # Flask server con endpoints de predicción
│   ├── requirements.txt            # Dependencias Python
│   ├── modelo_categoria_full.keras # Modelo Transformer de categorías
│   ├── artefactos_categoria.pkl    # LabelEncoder + vocabulario
│   └── modelo_riesgo_financiero.pkl # Modelo Random Forest de perfil
└── pom.xml                         # Maven config
```

---

## Endpoints del Backend

### Autenticacion
| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | /api/users | Registrar usuario |
| POST | /api/auth/login | Login con email/password |
| POST | /api/auth/google | Login con Google OAuth |

### Usuarios
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | /api/users/{id} | Obtener usuario |
| PUT | /api/users/{id}/financial | Actualizar datos financieros |

### Transacciones
| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | /api/transactions?userId={id} | Crear transacción (clasifica con ML si es "Otras") |
| GET | /api/transactions/user/{id} | Obtener todas las transacciones del usuario |
| PUT | /api/transactions/{id} | Actualizar transacción |
| DELETE | /api/transactions/{id} | Eliminar transacción |

### Dashboard
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | /api/dashboard/{userId} | Obtener métricas, categorías, evolución, alertas, recomendaciones |

### ML Service (Flask)
| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | /predict/categoria | Predecir categoría de una transacción |
| POST | /calcular-finanzas | Calcular indicadores y predecir perfil financiero |
| GET | /health | Health check del servicio |

---

## Configuracion y Ejecucion Local

### Requisitos
- Java 21+
- Maven 3.6+
- Node.js 18+ y pnpm
- Python 3.10+
- Git

### 1. Backend (Spring Boot + H2)

```bash
cd PVSC
mvn spring-boot:run
```
Disponible en `http://localhost:8080/api/`

### 2. ML Service (Flask + TensorFlow)

```bash
cd ml-service
pip install -r requirements.txt
python app.py
```
Disponible en `http://localhost:5000/`

### 3. Frontend (React + Vite)

```bash
cd frontend
pnpm install
pnpm dev
```
Disponible en `http://localhost:5173/`

### Variables de entorno del frontend

Crear `frontend/.env` basado en `.env.example`:
```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_GEMINI_API_KEY=tu_key_aqui
VITE_GOOGLE_CLIENT_ID=tu_client_id_aqui
```

---

## Despliegue en Produccion

### Backend en OCI (Oracle Cloud)

```bash
# Compilar JAR (desde Codespace o local con Java 21)
mvn clean package -DskipTests

# Subir a OCI
scp -i ssh-key.key target/finance-dashboard-api-1.0.0.jar ubuntu@146.181.60.43:/home/ubuntu/

# En la VM OCI:
export SPRING_DATASOURCE_URL="jdbc:mysql://tokaido.proxy.rlwy.net:43018/railway?..."
export SPRING_DATASOURCE_USERNAME="root"
export SPRING_DATASOURCE_PASSWORD="tu_password"

java -jar finance-dashboard-api.jar --spring.profiles.active=prod
```

### Base de datos (Railway MySQL)

- Host: `tokaido.proxy.rlwy.net`
- Puerto: `43018`
- Base de datos: `railway`
- `ddl-auto: update` — crea tablas automáticamente

### Perfiles de Spring Boot

| Perfil | BD | DDL | Uso |
|---|---|---|---|
| default | H2 en memoria | create-drop | Desarrollo local |
| prod | MySQL Railway | update | Producción en OCI |

---

## Flujo de un Analisis Financiero

```text
1. Usuario → carga ingresos ($850.000 sueldo)
2. Usuario → carga transacciones (Coto $45.000, Uber $4.500, Netflix $5.500)
3. Frontend → PUT /users/{id}/financial (actualiza ingresos, deuda, fondo emergencia)
4. Frontend → POST /transactions (envía cada transacción)
5. Backend → detecta categoría "Otras" → llama Flask /predict/categoria
6. Flask → modelo Transformer predice: Coto→Alimentacion, Uber→Transporte, Netflix→Entretenimiento
7. Backend → guarda transacciones con categoría ML en MySQL
8. Frontend → GET /dashboard/{id}
9. Backend → calcula métricas (DTI, ahorro, meses supervivencia)
10. Backend → llama Flask /calcular-finanzas con datos del usuario
11. Flask → modelo Random Forest predice: "Saludable" (score 85/100)
12. Backend → devuelve dashboard completo al frontend
13. Frontend → muestra: perfil, score, categorías, gráficos, recomendaciones
```

---

## Conexion entre Servicios

### Frontend → Backend
- HTTP REST con JWT Bearer token en header `Authorization`
- Base URL configurable via `VITE_API_BASE_URL`
- Fallback a datos mock si el backend no responde

### Backend → ML Service
- HTTP REST interno (RestTemplate)
- URL configurable: `ml.service.url` (default: `http://localhost:5000`)
- Si Flask no responde, el backend usa cálculo local como fallback

### Backend → MySQL
- HikariCP connection pool
- Perfil `default`: H2 en memoria (desarrollo)
- Perfil `prod`: MySQL Railway via SSL

---

## Equipo

| Nombre | Rol |
|---|---|
| Fernando Thiele | Data Scientist |
| Juan Manuel Roldan | Backend Developer |
| Magali Aldana Suarez | Frontend Developer |
| Thiago Baber Feli | Full Stack Developer |
| Lucia Evelyn Jantus | Data Scientist |
| Matias Bueno | Data Engineer |
| Alan Joel Romero | Software Engineer |
| Yanacelly Moreira | Project Manager |
| Leandro Baque | Autonomous Agent Engineer |

---

## Licencia

Este proyecto fue desarrollado como parte de la simulacion No Country - Equipo g9-latam-team08.


---

## Convenciones de Nomenclatura

El proyecto usa una convencion dual deliberada para mantener compatibilidad entre los tres servicios:

| Capa | Convencion | Ejemplo | Razon |
|---|---|---|---|
| Java (codigo interno) | camelCase | `nombreTienda`, `ahorroMensual` | Estandar del lenguaje Java |
| JSON (API REST) | snake_case | `nombre_tienda`, `ahorro_mensual` | Estandar de APIs REST, compatible con Python |
| Python (Flask) | snake_case | `nombre_tienda`, `ahorro_previo` | Estandar del lenguaje Python |
| TypeScript (frontend) | camelCase | `monthlyIncome`, `totalExpenses` | Estandar de JavaScript/TypeScript |
| CSS (clases) | BEM kebab-case | `.goal-card__title` | Estandar de CSS modular |

La conversion entre Java camelCase y JSON snake_case se logra con la anotacion `@JsonProperty` en cada campo de los DTOs:

```java
// Ejemplo: DashboardMetricsDTO.java
@JsonProperty("ahorro_mensual")    // snake_case en el JSON de la API
private Double ahorroMensual;       // camelCase interno en Java
```

```java
// Ejemplo: CreateTransactionDTO.java
@JsonProperty("nombre_tienda")
private String nombreTienda;

@JsonProperty("categoria_principal")
private String categoriaPrincipal;
```

Esto permite que:
- El backend Java siga sus convenciones nativas (camelCase)
- El ML service Python reciba y envie datos en su formato natural (snake_case)
- La API sea consistente y predecible para cualquier consumidor externo
- El frontend TypeScript mapee los campos snake_case del JSON a sus interfaces locales
Cada lenguaje de programación tiene una forma "oficial" o aceptada por la comunidad para nombrar variables, funciones y clases. No es obligatorio, pero si no la seguís, tu código se ve raro para otros desarrolladores.

camelCase (Java, JavaScript, TypeScript):

java

String nombreTienda;
Double ahorroMensual;
int gastosTotalesDelMes;
La primera palabra va en minúscula, las siguientes empiezan con mayúscula. Java y JavaScript lo adoptaron desde su creación.

snake_case (Python, APIs REST):

python

nombre_tienda = "Coto"
ahorro_mensual = 150000
gastos_totales_del_mes = 450000
Todo en minúsculas separado por guiones bajos. Python lo define en su guía oficial (PEP 8). Las APIs REST también lo usan porque es más legible en URLs y JSON.

PascalCase (clases en todos los lenguajes):

java

class DashboardMetricsDTO { }
class TransactionService { }
Cada palabra empieza con mayúscula. Se usa para nombres de clases.

kebab-case (CSS, URLs):

css

.goal-card__title { }
.notifications-page__header { }
Todo en minúsculas separado por guiones. Es el estándar de CSS.

En tu proyecto usás camelCase en Java y TypeScript porque eso es lo que la comunidad espera ver. Si pusieras snake_case en Java, funcionaría igual pero cualquier dev Java que lo lea pensaría que algo anda mal. Es como escribir en español con las tildes en el lugar incorrecto: se entiende, pero se nota que está fuera de norma.

El @JsonProperty es el puente: tu código Java sigue siendo camelCase, pero cuando manda datos al frontend o al Python, los traduce a snake_case automáticamente.

Sí es escalable. Acá por qué:

1. Arquitectura de microservicios desacoplada

Cada pieza corre independiente:

Backend Java (puerto 8080)
ML Service Python (puerto 5000)
Frontend (estático, se puede poner en CDN)
Base de datos (Railway, separada de la app)
Si mañana necesitás 10x más tráfico, escalás solo el componente que lo requiere. El ML tarda? Levantás 3 instancias de Flask con un load balancer. El backend se satura? Sumás otra VM de OCI.

2. Base de datos externalizada (Railway MySQL)

La BD no vive adentro del servidor. Vive en Railway que maneja replicación, backups y uptime. Si OCI se cae, la data sigue viva. Si cambiás de hosting, apuntás a la misma BD.

3. Stateless (sin estado en el servidor)

El backend usa JWT — no guarda sesiones en memoria. Cualquier request puede ir a cualquier instancia del backend y funciona igual. Eso es requisito para escalar horizontalmente (múltiples servidores).

4. Modelos ML separados del backend

El ML corre como servicio independiente. Podés:

Re-entrenarlo sin tocar el backend
Cambiar de TensorFlow a otro framework sin que Java se entere
Escalarlo en GPU si los modelos crecen
Agregar más modelos (ej: detección de fraude) sin modificar la API principal
5. Frontend independiente y deployable en CDN

React con Vite genera archivos estáticos. Podés ponerlos en Vercel, Netlify o CloudFront. Escala a millones de usuarios sin tocar backend porque son archivos HTML/JS/CSS servidos desde edge servers.

6. Perfiles de configuración (dev/prod)

application.properties para desarrollo local con H2, application-prod.properties para producción con MySQL. Podés agregar application-staging.properties para un entorno de pruebas intermedio sin cambiar código.

7. La estructura de features en frontend

Cada feature (analysis/, dashboard/, goals/, notifications/) es un módulo independiente con sus propios componentes, tipos, utils y mocks. Podés agregar features nuevas (presupuestos, inversiones, etc.) sin romper las existentes.

Lo que faltaría para escalar a producción real:

Docker containers para cada servicio
Orquestación con Docker Compose o Kubernetes
Rate limiting en la API
Cache (Redis) para queries frecuentes del dashboard
CI/CD pipeline (GitHub Actions)
Monitoring (Prometheus + Grafana)
Tests automatizados
Pero la base está. No es un monolito — es un sistema distribuido con responsabilidades separadas.

Python (ml-service): snake_case

python

nombre_tienda = "Coto"
categoria_predicha = "Alimentacion"
ratio_ahorro_neto = 0.20
meses_supervivencia = 6
ingreso_mensual_fijo = 850000
Variables, funciones, endpoints, claves del JSON — todo snake_case. Es la convención de Python (PEP 8).

Frontend (TypeScript/React): camelCase

typescript

// Variables y funciones
const monthlyIncome = 850000;
const totalExpenses = 450000;
function fetchDashboardData() { }
function handleMarkAsRead() { }

// Interfaces
interface NotificationItem {
  createdAtLabel: string;
  relatedEntityType: string;
}
Pero cuando el frontend recibe datos del backend (que vienen en snake_case del JSON), los mapea:

typescript

// El JSON llega así (snake_case del backend):
{ "ahorro_mensual": 150000, "meses_supervivencia": 6 }

// El frontend lo lee directamente con esos nombres:
const margin = metrics.ahorro_mensual;
const months = metrics.meses_supervivencia;
No hace una transformación formal — lee las propiedades snake_case tal cual vienen del JSON y las usa internamente. Las interfaces propias del frontend sí usan camelCase (monthlyIncome, emergencyCoverageMonths), pero al consumir la API acepta ambos estilos.

Est. Credits Used: 0.71
Elapsed time: 13s


Checkpoint
Restore
y es buena o no buena practica

Kiro
Es buena práctica que cada lenguaje use su propia convención. Eso está bien.

Lo que no es ideal en tu proyecto es que el frontend lee los campos snake_case del backend directamente sin mapearlos:

typescript

// Esto funciona pero mezcla convenciones:
const margin = metrics.ahorro_mensual;
const months = metrics.meses_supervivencia;
La práctica más limpia sería mapear en un solo punto (ya lo hacés en dashboard.ts):

typescript

// Buena práctica — mapeo en la capa API:
function mapDashboard(dto) {
  return {
    monthlyIncome: dto.metrics.ingreso_mensual,     // snake → camel
    totalExpenses: dto.metrics.gastos_totales_del_mes,
    emergencyFundMonths: dto.metrics.meses_supervivencia,
  };
}
Después todo el frontend usa solo camelCase. Eso ya lo hacés en el dashboard.ts con mapDashboard(). El único lugar donde se mezcla es en el RealAnalysisGateway que lee metrics.ahorro_mensual directamente.

Resumen:

Lo que hacés	Veredicto
Java usa camelCase	Correcto
Python usa snake_case	Correcto
API JSON expone snake_case	Correcto
Frontend usa camelCase en sus interfaces	Correcto
dashboard.ts mapea snake→camel	Correcto
RealAnalysisGateway lee snake_case directo	Aceptable pero no ideal
No es un problema grave — funciona, es legible y consistente. En un proyecto más grande valdrías tener una capa de mapeo estricta para todo, pero para el alcance de este MVP está bien.
Las rutas usan kebab-case (guiones) en el frontend y camelCase o sustantivos simples en el backend:

Rutas del Frontend (React Router)

/                    → Landing page
/login               → Iniciar sesión
/register            → Registro
/dashboard           → Panel principal
/historial           → Historial de transacciones
/analisis/nuevo      → Wizard de nuevo análisis
/metas               → Metas de ahorro
/notificaciones      → Centro de notificaciones
/soporte             → Página de soporte
Todas en minúsculas, separadas por /, sin camelCase. Estándar de URLs.

Endpoints del Backend (API REST)

POST   /api/users
POST   /api/auth/login
POST   /api/auth/google
GET    /api/users/{id}
PUT    /api/users/{id}/financial
POST   /api/transactions?userId={id}
GET    /api/transactions/user/{id}
PUT    /api/transactions/{id}
DELETE /api/transactions/{id}
GET    /api/dashboard/{userId}
GET    /api/categories
GET    /api/alerts/user/{userId}
Sustantivos en plural, minúsculas, sin verbos en la URL. El verbo lo da el método HTTP (GET, POST, PUT, DELETE).

Comunicación Frontend → Backend
typescript

// frontend/src/api/auth.ts
authenticatedFetch(`${env.apiBaseUrl}/dashboard/${userId}`)
//                  http://localhost:8080/api/dashboard/1

// frontend/src/api/transactions.ts
authenticatedFetch(`${env.apiBaseUrl}/transactions?userId=${userId}`, {
  method: "POST",
  body: JSON.stringify(data),  // JSON con snake_case
})
El flujo es:


Frontend                          Backend
   │                                 │
   │  POST /api/transactions         │
   │  Header: Bearer eyJhbG...       │
   │  Body: {"nombre_tienda":"Coto"} │
   │────────────────────────────────▶│
   │                                 │── verifica JWT
   │                                 │── llama Flask ML si es "Otras"
   │                                 │── guarda en MySQL
   │  Response: 200                  │
   │  {"id":1,"categoria_principal": │
   │   "Alimentacion","monto":45000} │
   │◀────────────────────────────────│
   │                                 │
Cada request lleva el JWT en el header Authorization: Bearer {token}. El backend valida el token antes de procesar. Si no es válido, devuelve 401 y el frontend redirige al login.

Est. Credits Used: 0.75
Elapsed time: 35s

