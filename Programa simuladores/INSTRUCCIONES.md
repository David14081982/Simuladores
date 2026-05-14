# SIMULADOR DE CRÉDITOS — GUÍA DE DESPLIEGUE
## Paso a paso, sin conocimientos técnicos avanzados

---

## ESTRUCTURA DE ARCHIVOS ENTREGADOS

```
simulador/
├── frontend/
│   ├── index.html   ← Interfaz completa
│   ├── styles.css   ← Estilos
│   ├── config.js    ← ⚠️ Aquí van los ajustes
│   ├── api.js       ← Comunicación con Sheets
│   ├── motors.js    ← Motor de cálculo financiero
│   ├── pdf.js       ← Generación de PDF
│   ├── ui.js        ← Interfaz y renderizado
│   └── app.js       ← Controlador principal
└── backend/
    └── Code.gs      ← Google Apps Script
```

---

## PASO 1 — PREPARAR EL GOOGLE SPREADSHEET

1. Abre el Spreadsheet:
   https://docs.google.com/spreadsheets/d/1MMVJIRPdstsCpHIrbSOi-WDoo9Yp3kYwUsAx9NfS1vk

2. Copia el ID del Spreadsheet desde la URL:
   - La URL se ve así: `.../spreadsheets/d/**1MMVJIRPdstsCpHIrbSOi-WDoo9Yp3kYwUsAx9NfS1vk**/edit`
   - El ID es: `1MMVJIRPdstsCpHIrbSOi-WDoo9Yp3kYwUsAx9NfS1vk`
   - Guárdalo, lo necesitarás en el Paso 3.

---

## PASO 2 — CREAR EL APPS SCRIPT

1. Con el Spreadsheet abierto, haz clic en:
   **Extensiones → Apps Script**

2. Se abrirá el editor de código en una nueva pestaña.

3. Borra todo el contenido del archivo `Code.gs` que aparece.

4. Copia y pega TODO el contenido del archivo `backend/Code.gs` entregado.

5. **IMPORTANTE:** En la línea 17 del código, reemplaza:
   ```
   const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';
   ```
   por:
   ```
   const SPREADSHEET_ID = '1MMVJIRPdstsCpHIrbSOi-WDoo9Yp3kYwUsAx9NfS1vk';
   ```

6. Guarda el archivo con **Ctrl+S** (o Cmd+S en Mac).

---

## PASO 3 — EJECUTAR EL SETUP INICIAL (una sola vez)

1. En el editor de Apps Script, arriba a la izquierda hay un menú desplegable.
   Selecciona la función: **`setupInicial`**

2. Haz clic en el botón **▶ Ejecutar**

3. Te pedirá permisos. Acepta todos:
   - Haz clic en **"Revisar permisos"**
   - Elige tu cuenta de Google
   - Haz clic en **"Avanzado"** → **"Ir a (nombre del proyecto) (no seguro)"**
   - Haz clic en **"Permitir"**

4. Cuando termine, en el Spreadsheet deberán aparecer 3 hojas nuevas:
   - **PROGRAMAS** (con 3 filas de ejemplo)
   - **SIMULACIONES** (vacía, con encabezados)
   - **AMORTIZACIONES** (vacía, con encabezados)

---

## PASO 4 — DESPLEGAR COMO WEB APP

1. En el editor de Apps Script, haz clic en **"Implementar"** (botón azul arriba a la derecha)

2. Selecciona **"Nueva implementación"**

3. Haz clic en el ícono ⚙️ junto a "Tipo" y selecciona **"Aplicación web"**

4. Configura así:
   - **Descripción:** `Simulador de Créditos v1`
   - **Ejecutar como:** `Yo (tu@email.com)`
   - **Quién tiene acceso:** `Cualquier persona`

5. Haz clic en **"Implementar"**

6. Copia la **URL de la aplicación web** que aparece.
   Se ve así:
   ```
   https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxx/exec
   ```
   **Guarda esta URL, la necesitas en el Paso 5.**

---

## PASO 5 — CONECTAR EL FRONTEND CON EL BACKEND

1. Abre el archivo `frontend/config.js`

2. Encuentra la línea:
   ```javascript
   APPS_SCRIPT_URL: 'https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec',
   ```

3. Reemplaza la URL con la que copiaste en el Paso 4:
   ```javascript
   APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxx/exec',
   ```

4. Guarda el archivo.

---

## PASO 6 — SUBIR EL FRONTEND A UN HOSTING

Necesitas hospedar los 7 archivos del frontend. Opciones gratuitas:

### OPCIÓN A: GitHub Pages (recomendado)

1. Crea una cuenta gratuita en https://github.com
2. Crea un repositorio nuevo (público)
3. Sube los 7 archivos de la carpeta `frontend/`
4. Ve a **Settings → Pages → Branch: main → Save**
5. Tu URL quedará: `https://tu-usuario.github.io/nombre-repo/`

### OPCIÓN B: Netlify Drop (más fácil, sin cuenta)

1. Ve a https://app.netlify.com/drop
2. Arrastra la carpeta `frontend/` completa
3. Netlify te da una URL inmediatamente

### OPCIÓN C: Google Sites

1. Abre https://sites.google.com
2. Crea un sitio nuevo
3. Inserta → Insertar código HTML → pega el index.html
   *(Limitado: no funciona bien con múltiples archivos JS)*

**Recomendación: usa GitHub Pages o Netlify.**

---

## PASO 7 — CONECTAR EN GLIDE

1. Abre tu app en Glide
2. Ve al componente donde quieres embeber el simulador
3. Elige **Web Embed** o **Iframe**
4. Pega la URL del hosting del Paso 6
5. Ajusta el tamaño recomendado: **ancho 100%, alto mínimo 700px**

---

## PASO 8 — CONFIGURAR LOS PROGRAMAS

El administrador configura los programas directamente en la hoja **PROGRAMAS** del Spreadsheet.

### Columnas de la hoja PROGRAMAS:

| Columna | Descripción | Ejemplo |
|---|---|---|
| ID | Identificador único | 1, 2, 3... |
| Nombre | Nombre que ve el usuario | "Cirugías" |
| TipoMotor | Motor de cálculo | `motor_standard` o `motor_autos` |
| Encabezado | Texto del encabezado del PDF | "Plan de Créditos - Cirugías" |
| Icono | Emoji del programa | 🏥 |
| LogoBase64 | Logo en base64 para el PDF | *(pegar imagen en base64)* |
| PrecioContado | Precio fijo (0 si no aplica) | 87000 |
| PrecioFinanciamiento | Solo para Autos | 120000 |
| GastosAdmin | Gastos administrativos fijos | 2500 |
| SeguroArgos | Seguro Argos fijo | 640 |
| InteresCajaChica | % interés Caja Chica | 0.03 |
| InteresSuptiexpress | % interés SutiExpress | 0.05 |
| PlazoMaximo | Máximo de períodos permitidos | 24 |
| Periodicidad | `quincenal`, `mensual` o `semanal` | quincenal |
| EngancheMinimo | 0 = sin mínimo, otro = mínimo | 0 |
| Activo | TRUE = visible, FALSE = oculto | TRUE |

### Agregar un programa nuevo:
- Simplemente agrega una fila nueva en la hoja PROGRAMAS
- Llena todos los campos
- Pon `Activo = TRUE`
- El simulador lo mostrará automáticamente en la siguiente carga

### Ocultar un programa:
- Cambia `Activo` a `FALSE`

### Agregar logo al PDF:
1. Convierte tu imagen a Base64: https://www.base64-image.de/
2. Copia el resultado
3. Pégalo en la columna `LogoBase64` del programa

---

## PASO 9 — ACTUALIZAR EL APPS SCRIPT

Si en el futuro necesitas hacer cambios al backend:

1. Abre el editor de Apps Script
2. Haz los cambios
3. Haz clic en **"Implementar" → "Administrar implementaciones"**
4. Haz clic en el ícono ✏️ de la implementación activa
5. En "Versión" selecciona **"Nueva versión"**
6. Haz clic en **"Implementar"**
7. La URL permanece igual — no necesitas cambiar nada en el frontend.

---

## SOLUCIÓN DE PROBLEMAS COMUNES

### "No hay programas activos"
- Verifica que ejecutaste `setupInicial`
- Verifica que la URL en `config.js` es correcta
- Verifica que el Apps Script está desplegado como "Cualquier persona"

### El PDF no descarga
- Verifica que los CDN de jsPDF están accesibles desde el navegador
- Prueba en Chrome (el más compatible)

### "Error al guardar"
- Verifica que el Spreadsheet ID en `Code.gs` es correcto
- El Apps Script debe estar desplegado como "Ejecutar como: Yo"

### Los cálculos no coinciden con el Excel
- Verifica que los parámetros (GastosAdmin, SeguroArgos, %) en la hoja PROGRAMAS
  coinciden exactamente con los del Excel original

---

## ARQUITECTURA PARA EL FUTURO

Para agregar nuevos programas (dental, funerario, escolar, etc.):
→ Solo agrega filas en la hoja PROGRAMAS. Sin tocar código.

Para crear un motor nuevo (diferente lógica financiera):
→ Agrega una función en `motors.js` y registra el nombre en la columna TipoMotor.

Para permisos por usuario (programas visibles según rol):
→ Agrega columna `Roles` en PROGRAMAS y filtra en `getProgramas()` del backend.

Para dashboard/reportes:
→ Los datos ya están en SIMULACIONES y AMORTIZACIONES listos para conectar a
  Looker Studio, Google Data Studio, o crear una hoja DASHBOARD con fórmulas.
