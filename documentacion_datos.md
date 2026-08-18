# Documentación - Área de Datos

Proyecto: Hackathon Alura + Oracle - Fintech / Educación Financiera

## 1. Dataset

El dataset es sintético, generado con un script en Python. No hay datos reales de usuarios, todo se armó a partir de reglas y rangos definidos junto con el equipo de Data Science.

Cada fila representa un cliente con su situación financiera de un mes: ingresos, gastos, deuda, ahorro, y algunos indicadores calculados a partir de esos datos.

### Cómo se generó

El script arma primero los valores base (los que un usuario cargaría a mano en una app real): ingreso fijo, ingreso variable, gastos esenciales, gastos no esenciales, cuotas de deuda, ahorro acumulado, frecuencia de gastos en ocio, y modalidad de pago de tarjeta.

A partir de esos valores base, se calculan los demás campos con fórmulas fijas:

- ingreso_mensual = ingreso_mensual_fijo + ingreso_mensual_variable
- gastos_totales_del_mes = gastos_esenciales_mensuales + gastos_no_esenciales_mensuales
- ahorro_mensual = ingreso_mensual - gastos_totales_del_mes - cuotas_mensuales_deuda
- ratio_ahorro_neto = ahorro_mensual / ingreso_mensual
- ratio_endeudamiento_dti = cuotas_mensuales_deuda / ingreso_mensual
- gastos_esenciales_ratio = gastos_esenciales_mensuales / ingreso_mensual
- gastos_estilo_vida_ratio = gastos_no_esenciales_mensuales / ingreso_mensual
- meses_supervivencia = ahorro_total / gastos_esenciales_mensuales (si gastos_esenciales es 0, queda vacío)

El perfil financiero se asigna según el ratio de endeudamiento:

- Saludable: ratio_endeudamiento_dti menor o igual a 0.20
- En Observación: entre 0.21 y 0.36
- En Riesgo: mayor a 0.36

Se generaron 500 clientes. La distribución de deuda no es pareja a propósito: la mayoría de los clientes quedan con deuda baja o moderada, y una porción menor con deuda alta, para que el modelo tenga ejemplos de las tres categorías en proporciones realistas.

## 2. Base de datos

Se armó una tabla en MySQL, `clientes_financiero`, que replica la estructura del dataset. Se agregaron restricciones (CHECK) en las columnas donde tenía sentido, por ejemplo que los montos no puedan ser negativos, o que el perfil financiero solo pueda tomar los tres valores definidos. Esto es para que no se puedan cargar datos inconsistentes por error.

El campo `ahorro_mensual` es la única excepción a la regla de "no negativo", porque un mes con gasto mayor al ingreso da un ahorro negativo, y eso es un dato válido (significa que el cliente se endeudó ese mes).

La tabla se fue actualizando a medida que el equipo de DS sumó columnas nuevas al dataset (`ahorro_previo` y `modalidad_pago_tarjeta` se agregaron en una segunda vuelta).

## 3. Despliegue en la nube

La base se levantó en Railway

Pasos que se siguieron:

1. Se creó un proyecto en Railway y se agregó un servicio de MySQL.
2. Desde la pestaña de conexión pública del servicio se obtuvieron los datos de acceso (host, puerto, usuario, contraseña, nombre de base).
3. Con esos datos se armó la conexión desde DBeaver.
4. Se creó la tabla y se importó el dataset generado.


## 4. OCI

La consigna del hackathon pide usar al menos un servicio de OCI (Oracle Cloud). Se eligió Object Storage, para guardar ahí el modelo entrenado por el equipo de Data Science una vez que esté listo, y que el equipo de Backend lo pueda descargar desde ahí para levantarlo en la API.

Esta parte quedó pendiente de definir si se usa una cuenta personal o si el hackathon provee acceso propio.

