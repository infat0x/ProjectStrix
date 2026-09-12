// Route handler — serves a full standalone HTML page with an ultra-premium, dark/crimson Red-Team themed Swagger UI
import { NextResponse } from "next/server";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Strix Security Orchestrator — API Documentation</title>
  <link rel="icon" type="image/svg+xml" href="/logo.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    :root {
      --bg-base: #08090d;
      --bg-surface: #0f1118;
      --bg-surface-elevated: #151822;
      --bg-surface-hover: #1b1f2c;
      --border-subtle: rgba(255, 255, 255, 0.07);
      --border-medium: rgba(255, 255, 255, 0.12);
      --border-crimson: rgba(225, 29, 72, 0.35);
      
      --crimson-primary: #e11d48;
      --crimson-light: #fb7185;
      --crimson-glow: rgba(225, 29, 72, 0.25);
      
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      
      --get-color: #38bdf8;
      --get-bg: rgba(56, 189, 248, 0.1);
      --get-border: rgba(56, 189, 248, 0.3);
      
      --post-color: #34d399;
      --post-bg: rgba(52, 211, 153, 0.1);
      --post-border: rgba(52, 211, 153, 0.3);
      
      --put-color: #fbbf24;
      --put-bg: rgba(251, 191, 36, 0.1);
      --put-border: rgba(251, 191, 36, 0.3);
      
      --delete-color: #f43f5e;
      --delete-bg: rgba(244, 63, 94, 0.12);
      --delete-border: rgba(244, 63, 94, 0.35);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-base);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* Top Bar */
    .top-bar {
      background: rgba(15, 17, 24, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-subtle);
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .logo-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, rgba(225, 29, 72, 0.25), rgba(225, 29, 72, 0.05));
      border: 1px solid var(--border-crimson);
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 16px var(--crimson-glow);
    }

    .logo-icon svg {
      width: 20px;
      height: 20px;
      fill: var(--crimson-light);
    }

    .logo-text-wrap {
      display: flex;
      flex-direction: column;
    }

    .brand-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-title {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.3px;
      color: #fff;
    }

    .tag-badge {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(225, 29, 72, 0.15);
      color: var(--crimson-light);
      border: 1px solid var(--border-crimson);
    }

    .logo-subtitle {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 400;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 14px;
      border-radius: 7px;
      font-size: 0.8rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .btn-dashboard {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }
    .btn-dashboard:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      border-color: var(--border-medium);
    }

    .btn-raw {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-family: 'JetBrains Mono', monospace;
    }
    .btn-raw:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    .btn-health {
      background: rgba(52, 211, 153, 0.08);
      border: 1px solid rgba(52, 211, 153, 0.25);
      color: #34d399;
    }
    .btn-health:hover {
      background: rgba(52, 211, 153, 0.16);
      box-shadow: 0 0 12px rgba(52, 211, 153, 0.2);
    }

    /* Container */
    #swagger-ui-container {
      max-width: 1360px;
      margin: 0 auto;
      padding: 28px 32px 80px;
    }

    /* ==========================================================================
       SWAGGER UI NATIVE RED-TEAM DARK THEME OVERRIDES (NO CSS INVERT)
       ========================================================================== */

    .swagger-ui {
      color: var(--text-secondary);
      font-family: 'Inter', sans-serif;
    }

    /* Hide default Swagger top bar & default branding elements */
    .swagger-ui .topbar { display: none !important; }

    /* Main Info Header Card */
    .swagger-ui .info {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 32px;
      margin: 0 0 28px 0;
      position: relative;
      overflow: hidden;
      box-shadow: 0 6px 30px rgba(0, 0, 0, 0.45);
    }

    .swagger-ui .info::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, var(--crimson-primary), #fb7185, transparent 70%);
    }

    .swagger-ui .info .title {
      font-family: 'Inter', sans-serif;
      font-size: 1.85rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.5px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .swagger-ui .info .title small {
      background: rgba(225, 29, 72, 0.15);
      color: var(--crimson-light);
      border: 1px solid var(--border-crimson);
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 5px;
      vertical-align: middle;
      top: 0;
    }

    .swagger-ui .info a {
      color: var(--crimson-light);
      text-decoration: none;
      transition: color 0.15s;
    }
    .swagger-ui .info a:hover {
      color: #fff;
      text-decoration: underline;
    }

    .swagger-ui .info p,
    .swagger-ui .info li {
      font-size: 0.92rem;
      color: var(--text-secondary);
      line-height: 1.65;
    }

    .swagger-ui .info h2 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 22px 0 10px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .swagger-ui .info code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.84rem;
      background: rgba(255, 255, 255, 0.06);
      color: #cbd5e1;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    /* Scheme & Server Select Bar */
    .swagger-ui .scheme-container {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 16px 24px;
      margin-bottom: 24px;
      box-shadow: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .swagger-ui .schemes {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .swagger-ui .schemes > label {
      font-size: 0.82rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin: 0;
    }

    .swagger-ui .schemes select {
      background: var(--bg-surface-elevated) !important;
      color: var(--text-primary) !important;
      border: 1px solid var(--border-medium) !important;
      border-radius: 7px !important;
      padding: 8px 14px !important;
      font-size: 0.88rem !important;
      font-family: 'JetBrains Mono', monospace !important;
      outline: none !important;
      transition: border-color 0.15s;
    }
    .swagger-ui .schemes select:focus {
      border-color: var(--crimson-primary) !important;
    }

    /* Authorize Button */
    .swagger-ui .btn.authorize {
      background: rgba(225, 29, 72, 0.12);
      border: 1px solid var(--crimson-primary);
      color: var(--crimson-light);
      border-radius: 8px;
      padding: 8px 20px;
      font-size: 0.84rem;
      font-weight: 600;
      letter-spacing: 0.3px;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .swagger-ui .btn.authorize:hover {
      background: rgba(225, 29, 72, 0.22);
      box-shadow: 0 0 16px var(--crimson-glow);
    }
    .swagger-ui .btn.authorize svg {
      fill: var(--crimson-light);
    }

    /* Filter Bar */
    .swagger-ui .filter .operation-filter-input {
      background: var(--bg-surface) !important;
      border: 1px solid var(--border-subtle) !important;
      border-radius: 8px !important;
      color: var(--text-primary) !important;
      padding: 12px 18px !important;
      font-size: 0.9rem !important;
      margin-bottom: 24px !important;
      outline: none !important;
      width: 100% !important;
      transition: all 0.2s;
    }
    .swagger-ui .filter .operation-filter-input:focus {
      border-color: var(--crimson-primary) !important;
      box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.15) !important;
    }

    /* Tag Section Headers */
    .swagger-ui .opblock-tag-section {
      margin-bottom: 24px;
    }

    .swagger-ui .opblock-tag {
      font-family: 'Inter', sans-serif;
      font-size: 1.15rem;
      font-weight: 700;
      color: #f1f5f9;
      border-bottom: 1px solid var(--border-subtle);
      padding: 14px 4px;
      letter-spacing: -0.2px;
    }

    .swagger-ui .opblock-tag:hover {
      background: transparent;
    }

    .swagger-ui .opblock-tag small {
      font-size: 0.82rem;
      color: var(--text-muted);
      font-weight: 400;
      margin-left: 12px;
    }

    /* Operation Blocks (Card Endpoints) */
    .swagger-ui .opblock {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      margin-bottom: 12px;
      box-shadow: none;
      transition: all 0.2s ease;
      overflow: hidden;
    }
    .swagger-ui .opblock:hover {
      border-color: var(--border-medium);
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
    }

    .swagger-ui .opblock .opblock-summary {
      padding: 12px 18px;
      align-items: center;
    }

    .swagger-ui .opblock .opblock-summary-method {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      font-weight: 700;
      border-radius: 6px;
      min-width: 80px;
      text-align: center;
      padding: 6px 0;
      box-shadow: none;
      text-shadow: none;
    }

    .swagger-ui .opblock .opblock-summary-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.92rem;
      font-weight: 600;
      color: #f8fafc;
      letter-spacing: -0.2px;
    }

    .swagger-ui .opblock .opblock-summary-description {
      font-size: 0.82rem;
      color: var(--text-muted);
      font-weight: 400;
    }

    /* Custom HTTP Verb Color Themes */
    /* GET */
    .swagger-ui .opblock.opblock-get {
      background: rgba(15, 17, 24, 0.95);
      border-left: 3px solid var(--get-color);
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: var(--get-bg);
      color: var(--get-color);
      border: 1px solid var(--get-border);
    }

    /* POST */
    .swagger-ui .opblock.opblock-post {
      background: rgba(15, 17, 24, 0.95);
      border-left: 3px solid var(--post-color);
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: var(--post-bg);
      color: var(--post-color);
      border: 1px solid var(--post-border);
    }

    /* PUT */
    .swagger-ui .opblock.opblock-put {
      background: rgba(15, 17, 24, 0.95);
      border-left: 3px solid var(--put-color);
    }
    .swagger-ui .opblock.opblock-put .opblock-summary-method {
      background: var(--put-bg);
      color: var(--put-color);
      border: 1px solid var(--put-border);
    }

    /* DELETE */
    .swagger-ui .opblock.opblock-delete {
      background: rgba(15, 17, 24, 0.95);
      border-left: 3px solid var(--delete-color);
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background: var(--delete-bg);
      color: var(--delete-color);
      border: 1px solid var(--delete-border);
    }

    /* Body of Expanded Endpoint */
    .swagger-ui .opblock-body {
      background: var(--bg-surface-elevated);
      border-top: 1px solid var(--border-subtle);
      padding: 24px 28px;
    }

    .swagger-ui .opblock-description-wrapper p,
    .swagger-ui .opblock-external-docs-wrapper p,
    .swagger-ui .opblock-title_normal p {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* Section Subheaders */
    .swagger-ui .opblock-section-header {
      background: rgba(0, 0, 0, 0.25);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 16px;
      margin-bottom: 16px;
      border-radius: 7px;
    }

    .swagger-ui .opblock-section-header h4 {
      font-size: 0.82rem;
      font-weight: 700;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Tables in Endpoints */
    .swagger-ui table {
      color: var(--text-secondary);
    }
    .swagger-ui table thead tr th,
    .swagger-ui table thead tr td {
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-medium);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 12px;
    }
    .swagger-ui table tbody tr td {
      border-bottom: 1px solid var(--border-subtle);
      padding: 14px 12px;
      font-size: 0.88rem;
    }

    .swagger-ui .parameter__name {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.86rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .swagger-ui .parameter__type {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    /* Inputs, Textareas, Selects inside Operations */
    .swagger-ui input[type=text],
    .swagger-ui input[type=password],
    .swagger-ui textarea,
    .swagger-ui select {
      background: #090a0f !important;
      border: 1px solid var(--border-medium) !important;
      border-radius: 7px !important;
      color: #f8fafc !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 0.86rem !important;
      padding: 9px 13px !important;
      outline: none !important;
    }
    .swagger-ui input[type=text]:focus,
    .swagger-ui textarea:focus,
    .swagger-ui select:focus {
      border-color: var(--crimson-primary) !important;
      box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.15) !important;
    }

    /* "Try it out" & "Execute" Buttons */
    .swagger-ui .btn.try-out__btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-medium);
      color: #cbd5e1;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 0.78rem;
      font-weight: 600;
      transition: all 0.15s;
    }
    .swagger-ui .btn.try-out__btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .swagger-ui .btn.execute {
      background: linear-gradient(135deg, #e11d48, #be123c);
      border: none;
      color: #fff;
      font-weight: 600;
      border-radius: 7px;
      padding: 9px 26px;
      font-size: 0.86rem;
      letter-spacing: 0.3px;
      box-shadow: 0 2px 10px rgba(225, 29, 72, 0.35);
      transition: all 0.2s;
    }
    .swagger-ui .btn.execute:hover {
      background: linear-gradient(135deg, #f43f5e, #e11d48);
      box-shadow: 0 4px 18px rgba(225, 29, 72, 0.5);
      transform: translateY(-1px);
    }

    /* Response Blocks & Pre Code */
    .swagger-ui .responses-inner {
      padding: 0;
    }
    .swagger-ui .response-col_status {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #f1f5f9;
      font-size: 0.9rem;
    }

    .swagger-ui .highlight-code,
    .swagger-ui .microlight,
    .swagger-ui pre {
      background: #06070a !important;
      border: 1px solid var(--border-subtle) !important;
      border-radius: 8px !important;
      color: #e2e8f0 !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 0.84rem !important;
      padding: 16px !important;
    }

    /* Models / Schemas Accordion Section */
    .swagger-ui section.models {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      margin-top: 40px;
      overflow: hidden;
    }

    .swagger-ui section.models h4 {
      font-family: 'Inter', sans-serif;
      font-size: 1.05rem;
      font-weight: 700;
      color: #f8fafc;
      padding: 18px 24px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .swagger-ui section.models .model-container {
      background: transparent;
      margin: 0;
      padding: 14px 24px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .swagger-ui section.models .model-container:last-child {
      border-bottom: none;
    }

    .swagger-ui .model-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.88rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .swagger-ui .model {
      color: var(--text-secondary);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.84rem;
    }

    /* Modal dialog (Authorize) */
    .swagger-ui .dialog-ux .backdrop-ux {
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
    }

    .swagger-ui .dialog-ux .modal-ux {
      background: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: 14px;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.7);
    }

    .swagger-ui .modal-ux-header {
      border-bottom: 1px solid var(--border-subtle);
      padding: 18px 24px;
    }
    .swagger-ui .modal-ux-header h3 {
      color: #fff;
      font-size: 1.1rem;
      font-weight: 700;
    }

    .swagger-ui .modal-ux-content {
      padding: 24px;
      color: var(--text-secondary);
    }

    /* Custom Scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: var(--bg-base);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.25);
    }
  </style>
</head>
<body>
  <!-- Header Bar -->
  <header class="top-bar">
    <div class="logo-group">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24">
          <path d="M12 2L4.5 9v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V9L12 2zm0 3.2L17.5 10H6.5L12 5.2zM6.5 12h11v8h-11v-8z"/>
        </svg>
      </div>
      <div class="logo-text-wrap">
        <div class="brand-row">
          <span class="logo-title">Project Strix</span>
          <span class="tag-badge">REST API</span>
        </div>
        <span class="logo-subtitle">Autonomous Offensive Security Orchestrator</span>
      </div>
    </div>
    
    <nav class="nav-actions">
      <a href="/" class="nav-btn btn-dashboard">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Dashboard
      </a>
      <a href="/api/docs" target="_blank" class="nav-btn btn-raw">
        <span>{ }</span> Raw JSON
      </a>
      <a href="/api/health" target="_blank" class="nav-btn btn-health">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 6px #34d399;"></span>
        Health
      </a>
    </nav>
  </header>

  <!-- Swagger Mount Point -->
  <main id="swagger-ui-container">
    <div id="swagger-ui"></div>
  </main>

  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/docs',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout',
        docExpansion: 'list',
        defaultModelsExpandDepth: 2,
        displayRequestDuration: true,
        tryItOutEnabled: true,
        filter: true,
        persistAuthorization: true,
        syntaxHighlight: {
          activated: true,
          theme: 'agate'
        }
      });
    };
  </script>
</body>
</html>`;

export async function GET() {
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
