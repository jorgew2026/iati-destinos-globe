# Destinos IATI

Globo 3D para pantalla gigante con los destinos de las pólizas vendidas en la semana en curso (lunes → hoy) en las propiedades GA4 de IATI Seguros (España, Portugal, Italia, LATAM y ROW).

- **Web:** GitHub Pages, carpeta `site/`. La página lee `site/data.json` y lo vuelve a leer cada 10 minutos sin recargar.
- **Datos:** `scripts/fetch_ga4.py` consulta la GA4 Data API (evento `purchase`, parámetro `destination` → `customEvent:destination`). `scripts/build.py` normaliza los nombres de país (ES/PT/IT/EN) a ISO y agrega por mercado.
- **Actualización:** `.github/workflows/refresh.yml` se ejecuta cada hora, hace commit de `data.json` y despliega.
- **Credenciales:** secreto de repositorio `GA4_SA_KEY` con el JSON de una cuenta de servicio con rol Lector en las 7 propiedades. Nunca se guarda en el repositorio.
