# Guida al Deployment (Messa in Cloud)

Per usare questa applicazione sul web, ti consiglio servizi come **Render** (render.com) che offrono un piano gratuito e supportano Docker.

## Pasaggi per Render.com

1.  **Crea un account** su [Render.com](https://render.com).
2.  **Carica il codice su GitHub/GitLab**:
    - Se non l'hai fatto, devi caricare questa cartella su un repository GitHub.
3.  Su Render, clicca **"New + "** -> **"Web Service"**.
4.  Connetti il tuo repository GitHub.
5.  Seleziona il repository del tracking.
6.  Render rileverà automaticamente il `Dockerfile`.
7.  Clicca **"Create Web Service"**.

Render costruirà l'applicazione e ti fornirà un URL (es: `https://poste-tracking.onrender.com`).

## Integrazione nel tuo Sito (Odoo/Aruba)

Una volta che hai l'URL da Render (il Backend), puoi modificare il file `public/script.js` nel tuo sito Frontend (o caricare solo l'HTML/CSS/JS su Aruba) e farlo puntare a quel nuovo indirizzo invece di `localhost:3000` o `/api/track`.

Tuttavia, la soluzione più semplice è usare l'URL fornito da Render direttamente come sito completo, oppure inserirlo in un `<iframe>` nel tuo sito Odoo/Aruba.
