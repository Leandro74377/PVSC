# Finance AI Dashboard Backend API

Backend RESTful API para un dashboard de análisis de salud financiera, desarrollado con Java y Spring Boot.....

## Características

✅ **Gestión de Usuarios** - Crear, actualizar y eliminar usuarios  
✅ **Gestión de Transacciones** - Registrar ingresos y gastos  
✅ **Dashboard Completo** - Métricas, gráficos y análisis financiero  
✅ **Sistema de Alertas** - Alertas automáticas sobre salud financiera  
✅ **Recomendaciones** - Consejos personalizados según el análisis  
✅ **Análisis por Categorías** - Desglose de gastos por categoría  
✅ **Evolución Mensual** - Histórico de ingresos vs gastos  
✅ **Cálculo de Puntuación** - Score de salud financiera (0-100)

## Requisitos Previos

- Java 17 o superior
- Maven 3.6+
- Git

## Instalación y Configuración

### 1. Clonar o descargar el proyecto

```bash
cd c:\Users\DETPC\PVSC
```

### 2. Compilar el proyecto

```bash
mvn clean install
```

### 3. Ejecutar la aplicación

```bash
mvn spring-boot:run
```

La API estará disponible en: `http://localhost:8080/api`

### 4. Acceder a la consola H2 (opcional)

```
http://localhost:8080/api/h2-console
```

## Estructura del Proyecto

```
src/main/java/com/financeai/
├── config/              # Configuraciones (Security, DataInitializer)
├── controller/          # Controllers REST
├── dto/                 # Data Transfer Objects
├── entity/              # Entidades JPA
├── repository/          # Interfaces Repository
├── service/             # Interfaces de Servicios
├── service/impl/        # Implementaciones de Servicios
└── FinanceAiApplication.java
```

## Endpoints de la API

### 📊 Dashboard
```
GET  /api/dashboard/{userId}              - Obtener dashboard completo
GET  /api/dashboard/{userId}/metrics      - Obtener métricas financieras
```

### 👤 Usuarios
```
POST   /api/users                         - Crear nuevo usuario
GET    /api/users/{userId}                - Obtener usuario
GET    /api/users/email/{email}           - Buscar por email
PUT    /api/users/{userId}                - Actualizar usuario
PUT    /api/users/{userId}/financial      - Actualizar datos financieros
DELETE /api/users/{userId}                - Eliminar usuario
```

### 💰 Transacciones
```
POST   /api/transactions                  - Crear transacción
GET    /api/transactions/user/{userId}    - Obtener todas las transacciones
GET    /api/transactions/user/{userId}/recent?limit=5 - Últimas transacciones
GET    /api/transactions/{transactionId}  - Obtener transacción
DELETE /api/transactions/{transactionId}  - Eliminar transacción
```

### 🏷️ Categorías
```
GET    /api/categories                    - Listar todas las categorías
GET    /api/categories/{name}             - Obtener categoría por nombre
POST   /api/categories                    - Crear categoría
```

### 🔔 Alertas
```
GET    /api/alerts/user/{userId}          - Obtener alertas del usuario
GET    /api/alerts/user/{userId}/unread   - Obtener alertas no leídas
PUT    /api/alerts/{alertId}/read         - Marcar alerta como leída
```

## Ejemplos de Uso

### Crear Usuario

```bash
POST http://localhost:8080/api/users
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "password123",
  "firstName": "Juan",
  "lastName": "Pérez",
  "monthlyIncome": 900000,
  "monthlyExpenses": 760000,
  "emergencyFund": 36000,
  "monthlyDebt": 180000
}
```

### Crear Transacción

```bash
POST http://localhost:8080/api/transactions?userId=1
Content-Type: application/json

{
  "description": "Supermercado La Anónima",
  "amount": 45230,
  "category": "Alimentación",
  "transactionDate": "2024-05-20T14:30:00",
  "type": "EXPENSE"
}
```

### Obtener Dashboard

```bash
GET http://localhost:8080/api/dashboard/1
```

### Actualizar Datos Financieros

```bash
PUT http://localhost:8080/api/users/1/financial?income=950000&expenses=780000&emergencyFund=40000&debt=185000
```

## Modelos de Datos

### User
- `id`: Long (Primary Key)
- `email`: String (Unique)
- `password`: String (Encoded)
- `firstName`: String
- `lastName`: String
- `monthlyIncome`: Double
- `monthlyExpenses`: Double
- `emergencyFund`: Double
- `monthlyDebt`: Double
- `createdAt`: LocalDateTime
- `updatedAt`: LocalDateTime

### Transaction
- `id`: Long (Primary Key)
- `user`: User (Foreign Key)
- `description`: String
- `amount`: Double
- `category`: Category (Foreign Key)
- `type`: INCOME/EXPENSE
- `confidence`: Integer (0-100)
- `transactionDate`: LocalDateTime
- `createdAt`: LocalDateTime
- `updatedAt`: LocalDateTime

### Category
- `id`: Long (Primary Key)
- `name`: String (Unique)
- `color`: String (Hex color)
- `percentage`: Integer (Budget %)
- `icon`: String (Emoji or icon)

### Alert
- `id`: Long (Primary Key)
- `user`: User (Foreign Key)
- `title`: String
- `message`: String
- `type`: AlertType (LOW_EMERGENCY_FUND, HIGH_EXPENSES, etc.)
- `isRead`: Boolean
- `createdAt`: LocalDateTime

## Métricas del Dashboard

El score de salud financiera se calcula basado en:

- **Deuda**: Si > 50% ingresos: -30 puntos | Si > 30%: -15 puntos
- **Fondo de Emergencia**: Si < 1 mes: -20 puntos | Si < 3 meses: -10 puntos  
- **Relación Gastos/Ingresos**: Si > 85%: -10 puntos | Si > 70%: -5 puntos

### Categorías de Gastos Predefinidas

- 🏠 Vivienda (30%)
- 🍔 Alimentación (25%)
- 🚗 Transporte (15%)
- ⚙️ Servicios (10%)
- ⚕️ Salud (8%)
- 🎬 Entretenimiento (10%)
- 📦 Otros (2%)

## Alertas Automáticas

El sistema genera automáticamente:

1. **Fondo de emergencia bajo** - Si cubre < 1 mes de gastos
2. **Nivel de deuda alto** - Si > 50% de ingresos
3. **Gastos muy altos** - Si > 85% de ingresos

## Recomendaciones

El sistema proporciona recomendaciones automáticas:

1. Reducir gastos variables (entretenimiento, servicios)
2. Aumentar fondo de emergencia (3-6 meses de gastos)
3. Monitorear y reducir deuda

## Base de Datos

Por defecto, el proyecto usa **H2** (base de datos en memoria).

Para usar **PostgreSQL**, modifica `application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/financedb
spring.datasource.driverClassName=org.postgresql.Driver
spring.datasource.username=postgres
spring.datasource.password=your_password
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
```

Y agrega la dependencia en `pom.xml`:

```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

## CORS

El backend está configurado para aceptar solicitudes desde:
- `http://localhost:3000`
- `http://localhost:4200`

Modifica `FinanceAiApplication.java` para agregar más orígenes según sea necesario.

## Logs

Los logs están configurados en `application.properties`:

```properties
logging.level.root=INFO
logging.level.com.financeai=DEBUG
```

## Build y Deployment

### Compilar JAR ejecutable

```bash
mvn clean package
```

### Ejecutar JAR

```bash
java -jar target/finance-dashboard-api-1.0.0.jar
```

## Tecnologías Utilizadas

- **Spring Boot 3.2.0** - Framework
- **Spring Data JPA** - ORM
- **Spring Security** - Autenticación
- **H2 Database** - Base de datos
- **Lombok** - Reducir boilerplate
- **Maven** - Gestor de dependencias
- **JWT** - Autenticación por tokens (incluido, listo para usar)

## Variables de Entorno

Puedes configurar variables de entorno en `application.properties` o crear un archivo `application-prod.properties` para producción.

## Desarrollo Futuro

- [ ] Implementar JWT Authentication
- [ ] Agregar Swagger/OpenAPI documentation
- [ ] Implementar paginación en endpoints
- [ ] Agregar filtros avanzados
- [ ] Implementar caching
- [ ] Agregar tests unitarios e integración
- [ ] Implementar CI/CD
- [ ] Agregar más tipos de alertas

## Troubleshooting

### Error: "Port 8080 is already in use"
```bash
# Cambiar puerto en application.properties
server.port=8081
```

### Error: "Table creation"
Verifica que `spring.jpa.hibernate.ddl-auto=create-drop` está en `application.properties`

### Error: "User not found"
Asegúrate de que el usuario exista antes de crear transacciones

## Contacto y Soporte

Para reportar issues o sugerencias, contacta al equipo de desarrollo.

## Licencia

Este proyecto está bajo licencia MIT.

---

**Última actualización:** 2024-07-26
