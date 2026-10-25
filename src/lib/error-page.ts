export function renderErrorPage(error?: unknown): string {
  const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const errorStack = error instanceof Error ? error.stack : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #0c0d0f; color: #f3f4f6; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 32rem; width: 100%; text-align: center; padding: 2.5rem; background: #141518; border: 1px solid rgba(255,255,255,0.08); border-radius: 1.5rem; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
      h1 { font-size: 1.5rem; margin: 0 0 0.75rem; font-weight: 800; color: #fff; }
      p { color: #9ca3af; margin: 0 0 1.5rem; font-size: 0.875rem; }
      .err-box { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #f87171; font-family: monospace; font-size: 0.75rem; padding: 0.75rem; border-radius: 0.75rem; text-align: left; overflow-x: auto; margin-bottom: 1.5rem; }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.625rem 1.25rem; border-radius: 9999px; font: inherit; font-size: 0.8125rem; font-weight: 700; cursor: pointer; text-decoration: none; border: 1px solid transparent; transition: all 0.2s; }
      .primary { background: #f97316; color: #000; }
      .primary:hover { background: #ea580c; }
      .secondary { background: rgba(255,255,255,0.05); color: #fff; border-color: rgba(255,255,255,0.12); }
      .secondary:hover { background: rgba(255,255,255,0.1); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      ${errorMessage ? `<div class="err-box"><strong>Error:</strong> ${errorMessage}${errorStack ? `<br/><br/><strong>Stack:</strong><br/>${errorStack}` : ""}</div>` : ""}
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
