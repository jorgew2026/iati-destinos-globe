# Destinos IATI

Globo 3D para pantalla gigante con los destinos de las pólizas vendidas en la semana en curso (lunes → hoy) en las propiedades GA4 de IATI Seguros (España, Portugal, Italia, LATAM y ROW).

- **Web:** GitHub Pages, carpeta `site/`. La página lee `site/data.json` y lo vuelve a leer cada 10 minutos sin recargar.
- **Datos:** `scripts/fetch_ga4.py` consulta la GA4 Data API (evento `purchase`, parámetro `destination` → `customEvent:destination`). `scripts/build.py` normaliza los nombres de país (ES/PT/IT/EN) a ISO y agrega por mercado.
- **Actualización:** `.github/workflows/refresh.yml` se ejecuta cada hora, hace commit de `data.json` y despliega.
- **Credenciales:** secreto de repositorio `GA4_SA_KEY` con el JSON de una cuenta de servicio con rol Lector en las 7 propiedades. Nunca se guarda en el repositorio.

## Pantallas gestionadas por Admira

Añadir [la versión para Admira](https://jorgew2026.github.io/iati-destinos-globe/admira.html) como **Contenido Web**. Para emitir la vuelta completa de seis vistas, configurar al menos 60 segundos de duración. Si en un equipo concreto se necesita controlar la precarga desde Admira, usar el [contenedor URL oficial de Admira](https://docs.admira.com/contenidos/contenidos-html/contenidos-url) con esta misma dirección.

GitHub genera seis imágenes a partir del último agregado de GA4. El reproductor muestra una cada diez segundos y comprueba si hay datos nuevos cada diez minutos. Cada imagen muestra el panel split-flap con los cinco destinos destacados y el total semanal del mercado. La fecha visible indica cuándo se actualizaron los datos.

Para generar una copia local, instalar `playwright==1.56.0` y disponer de Google Chrome. Ejecutar `python3 scripts/build_admira.py` para escribir el HTML y su JSON de actualizaciones en `site/`. Se puede indicar otra ubicación de Chrome con `ADMIRA_CHROME`.
