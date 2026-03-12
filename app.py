import os

import streamlit as st
import streamlit.components.v1 as components


st.set_page_config(
    page_title="Recorrido virtual Fiorino",
    layout="wide",
    page_icon="🧭",
)

st.title("Recorrido virtual Fiorino")

st.markdown(
    """
Este proyecto contiene un recorrido virtual 360° construido con **Marzipano**.

Para desplegarlo en Streamlit Cloud se recomienda:

- Publicar el contenido estático de `app-files/` (HTML, JS, CSS, imágenes)
  en un hosting estático (por ejemplo GitHub Pages, Netlify, etc.).
- Configurar aquí la URL pública de ese tour.
""",
    unsafe_allow_html=True,
)


def get_tour_url() -> str:
    # 1) Prioridad: secreto de Streamlit (`.streamlit/secrets.toml`)
    #    Ejemplo:
    #    [tour]
    #    url = "https://tu-dominio.com/app-files/"
    tour_url = None
    try:
        tour_section = st.secrets.get("tour", {})
        tour_url = tour_section.get("url")
    except Exception:
        tour_url = None

    # 2) Variable de entorno TOUR_URL (útil en despliegues personalizados)
    if not tour_url:
        tour_url = os.getenv("TOUR_URL")

    # 3) Valor por defecto para desarrollo local
    if not tour_url:
        tour_url = "http://127.0.0.1:8000/"

    return tour_url.rstrip("/") + "/"


tour_url = get_tour_url()

st.subheader("Vista del tour")

st.markdown(
    f"""
URL actual configurada para el tour:

`{tour_url}`

Si el tour no se carga:
- En local, asegúrate de tener un servidor (por ejemplo `python -m http.server 8000` en `app-files/`).
- En producción (Streamlit Cloud), publica primero el contenido de `app-files/` y cambia la URL a la definitiva.
""",
    unsafe_allow_html=True,
)

components.iframe(src=tour_url, height=700, scrolling=True)

