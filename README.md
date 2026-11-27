# Destinos IATI

Globo 3D para pantalla gigante con los destinos de las pólizas vendidas en la semana en curso (lunes → hoy) en las propiedades GA4 de IATI Seguros (España, Portugal, Italia, LATAM y ROW).

- **Web:** GitHub Pages, carpeta `site/`. La página lee `site/data.json` y lo vuelve a leer cada 10 minutos sin recargar.
- **Datos:** `scripts/fetch_ga4.py` consulta la GA4 Data API (evento `purchase`, parámetro `destination` → `customEvent:destination`). `scripts/build.py` normaliza los nombres de país (ES/PT/IT/EN) a ISO y agrega por mercado.
- **Actualización:** `.github/workflows/refresh.yml` se ejecuta cada hora, hace commit de `data.json` y despliega.
- **Credenciales:** secreto de repositorio `GA4_SA_KEY` con el JSON de una cuenta de servicio con rol Lector en las 7 propiedades. Nunca se guarda en el repositorio.

## Pantallas gestionadas por Admira

Añadir [la versión para Admira](https://jorgew2026.github.io/iati-destinos-globe/admira.html) como **Contenido Web**. Para emitir la vuelta completa de seis vistas, configurar al menos 60 segundos de duración. Si en un equipo concreto se necesita controlar la precarga desde Admira, usar el [contenedor URL oficial de Admira](https://docs.admira.com/contenidos/contenidos-html/contenidos-url) con esta misma dirección.

El HTML se genera en cada despliegue con el último agregado de GA4, la cartografía y Onest. El panel arranca con los datos incluidos y consulta el JSON publicado cada diez minutos. La animación empieza cuando el contenido tiene dimensiones visibles. La hora indica la última actualización de los datos.

Para generar una copia local con el agregado disponible, ejecutar `python3 scripts/build_admira.py`. El resultado queda en `site/admira.html` y se puede usar como HTML autónomo.
