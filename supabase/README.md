# Alertas financieras en Supabase

## Aplicar la migración

1. Abre el proyecto FinanceHome en Supabase Dashboard.
2. Entra a **SQL Editor** y crea una consulta nueva.
3. Copia y ejecuta el contenido de `migrations/20261110000000_financial_notifications.sql`.
4. En **Database > Publications**, confirma que `public.notifications` aparezca en `supabase_realtime`. La migración la agrega automáticamente cuando la publicación existe.

La aplicación usa el presupuesto mensual por hogar. El administrador del hogar lo configura desde el dashboard; los gastos tipo `expense` de `transaction_date` del mes actual activan alertas al alcanzar el 80 %, 90 % y 100 %. Cada integrante recibe su propia fila en el historial y cada fila solo puede ser leída por su destinatario mientras siga perteneciendo al hogar.

## Comportamiento

- Un trigger recalcula alertas al insertar, editar o eliminar gastos, también cuando el movimiento cambia de mes o de hogar.
- Cambiar el presupuesto vuelve a evaluar el mes actual.
- Los umbrales tienen una clave única por destinatario, hogar, mes y porcentaje. Una alerta corregida se desactiva sin borrar historial; si el gasto vuelve a cruzar el umbral, se reactiva la misma fila.
- Las alertas que dejan de aplicar se marcan como leídas para que no permanezcan en el contador pendiente.
- Supabase Realtime actualiza la campana y el historial de la sesión activa.
- La política RLS permite consultar solo notificaciones propias de hogares a los que el usuario pertenece. El cliente solo puede modificar `read_at`.
- Solo una membresía con `role = 'admin'` puede escribir el presupuesto; RLS aplica la misma regla en la base de datos.

## Verificación manual

1. Entra como administrador y establece un presupuesto de prueba, por ejemplo `100000`.
2. Registra gastos del mes por `80000`, `10000` y `10000`. Deben aparecer las alertas 80 %, 90 % y 100 % en la campana de cada integrante autorizado.
3. Marca una alerta como leída y confirma que desaparezca del contador, no del historial.
4. Edita o elimina un gasto para quedar por debajo de un umbral. La alerta correspondiente debe quedar como corregida y dejar de contar como pendiente.
5. Vuelve a cruzar ese umbral. La alerta debe reactivarse sin crear una segunda fila.
6. Accede como usuario que no pertenece al hogar e intenta consultar `notifications`: RLS no debe devolver filas.

La migración se guarda en el repositorio; debe ejecutarse en Supabase Dashboard para que la función esté activa en el proyecto remoto.
