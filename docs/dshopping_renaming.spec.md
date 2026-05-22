# dShopping — Renombramiento de Aplicación y Ajustes de Contraste (Especificación Técnica)

Esta especificación técnica detalla los requerimientos, cambios de diseño visual y el plan de migración para renombrar completamente la aplicación **dCompras Lite** a **dShopping Lite** (o **dShopping**), además de corregir los problemas de contraste visual reportados en modo Claro (Light) y modo Oscuro (Dark).

---

## 1. Contexto y Objetivo

El cliente ha solicitado un cambio de marca (rebranding) del sistema de compras multi-empresa. El nombre actual **dCompras / dCompras Lite** será reemplazado globalmente por **dShopping / dShopping Lite**. 

Asimismo, se requiere solucionar deficiencias en la legibilidad del texto en ambos temas de color (Light y Dark). Específicamente, algunos textos inactivos o secundarios (como los enlaces de navegación de la barra lateral, descripciones en tarjetas y encabezados secundarios) presentan muy bajo contraste con sus respectivos fondos transparentes (glassmorphism), dificultando la lectura.

---

## 2. Reglas de Negocio (RN)

### RN-01: Renombramiento Global y Consistente
- El nombre **dShopping** debe sustituir a **dCompras** en todas las interfaces de usuario visibles (títulos de página, logotipos, banners, loading screens, PDFs y reportes exportados).
- La clave interna del paquete en `package.json` debe renombrarse a `dshopping-lite` de manera consistente.
- Los comentarios internos en código fuente que hagan referencia a "dCompras Lite" deben ser actualizados a "dShopping Lite" para mantener la consistencia técnica de la documentación del código.

### RN-02: Accesibilidad de Contraste (Cumplimiento WCAG 2.1)
- Todo el texto secundario (inactive buttons, muted text, descripciones de tarjetas) debe tener una relación de contraste mínima de **4.5:1** contra el fondo de su contenedor.
- En **Modo Claro**, el color de texto `--muted-foreground` debe oscurecerse para aumentar el contraste sobre el fondo transparente `--panel-main` (`oklch(1 0 180 / 0.7)`).
- En **Modo Oscuro**, se debe asegurar que no existan clases CSS o variables con valores de opacidad excesivos que dificulten la visualización del texto sobre fondos oscuros.

---

## 3. Contratos de Datos y Configuración (TypeScript)

No se alterarán las interfaces de datos del negocio (`Invoice`, `Provider`, `Company`, etc.). Sin embargo, se actualizarán los metadatos y configuraciones del proyecto:

### 3.1 package.json
- `name`: Cambia de `"dcompras-lite"` a `"dshopping-lite"`.

### 3.2 index.html
- `<title>`: Cambia de `dCompras Lite — Control Cambiario y Cuentas por Pagar` a `dShopping Lite — Control Cambiario y Cuentas por Pagar`.

---

## 4. Endpoints y Lógica del Backend (Supabase)

No hay cambios en los endpoints o tablas de Supabase en cuanto a su estructura funcional. Sin embargo, las descripciones o comentarios SQL de la base de datos se actualizarán conceptualmente en los scripts de migración para reflejar el nombre de **dShopping**.

---

## 5. Componentes Frontend y Cambios Visuales

Se modificarán los siguientes componentes clave para aplicar el renombramiento y corregir el contraste:

| Componente | Cambios de Texto | Cambios de Estilos / Contraste |
|------------|------------------|--------------------------------|
| `Layout.tsx` | Reemplazar "dCompras" por "dShopping". | Cambiar clases de texto de los botones inactivos del sidebar para que no utilicen el valor antiguo de `text-muted-foreground` en claro, o ajustar la variable `--muted-foreground` global. |
| `Login.tsx` | Reemplazar "dCompras" por "dShopping" en la cabecera y el sidebar informativo de login. | Asegurar legibilidad del texto explicativo lateral. |
| `App.tsx` | Cambiar mensaje "Cargando dCompras Lite..." por "Cargando dShopping Lite...". | Mantener efecto de carga animada de forma consistente. |
| `Invoices.tsx` | Reemplazar texto del recibo PDF de "dCompras Lite" a "dShopping Lite". | N/A |
| `Reports.tsx` | Cambiar título y nombre de descarga de archivos a "dShopping_Reporte...". | N/A |

### 5.1 Ajuste de Contraste en `src/index.css`
Ajustaremos la variable `--muted-foreground` en Modo Claro para darle mayor contraste.
- **Antes (Light Mode):** `--muted-foreground: oklch(0.551 0.023 264.365);` (Luminosidad 55% -> Gris medio, muy claro para fondos transparentes)
- **Ahora (Light Mode):** `--muted-foreground: oklch(0.38 0.02 264.365);` (Luminosidad 38% -> Gris oscuro, contraste excelente superior a 4.5:1)

En Modo Oscuro, revisaremos y ajustaremos para asegurar que la legibilidad se mantenga óptima.

---

## 6. Flujo de Usuario (UX)

El flujo de usuario permanece idéntico al actual, pero con la nueva identidad de marca:
1. El usuario abre la aplicación y visualiza la pantalla de carga de **dShopping Lite**.
2. Ingresa a la pantalla de Login con el branding de **dShopping**.
3. Navega por el panel de administración donde la barra lateral ostenta el logotipo de **dShopping**.
4. Al exportar reportes en Excel o PDF, los encabezados y nombres de archivos generados reflejan la marca **dShopping**.

---

## 7. Criterios de Aceptación (CA)

- [ ] **CA-01:** La palabra "dCompras" debe ser reemplazada por "dShopping" en todas las vistas de la aplicación (Dashboard, Invoices, Providers, Reports, Login, Layout, App).
- [ ] **CA-02:** El título de la pestaña del navegador debe mostrar "dShopping Lite".
- [ ] **CA-03:** En Modo Claro, los elementos inactivos del menú lateral (sidebar) y textos secundarios de tarjetas de métricas deben ser claramente legibles (contraste de contraste >= 4.5:1).
- [ ] **CA-04:** La compilación mediante `npm run build` debe realizarse sin ningún tipo de error de linter o compilación.
- [ ] **CA-05:** Se debe inicializar un repositorio Git en la raíz del proyecto y preparar los archivos para el primer commit de la marca dShopping.

---

## 8. Notas y Dependencias
No se introducen nuevas dependencias para esta tarea. Se utilizarán las herramientas nativas de Git para la creación del repositorio.
