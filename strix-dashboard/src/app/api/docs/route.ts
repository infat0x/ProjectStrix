import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Strix Security Dashboard API",
    description:
      "REST API for the Strix AI Penetration Testing Dashboard. Allows launching scans, monitoring results in real-time via SSE, managing users, and retrieving vulnerability findings.\n\n" +
      "## Authentication\n" +
      "All endpoints (except `/auth/login`, `/auth/register`, `/health`) require a valid session cookie (`strix_session`) obtained via `POST /auth/login`.\n\n" +
      "## Rate Limiting\n" +
      "`POST /auth/login` and `POST /auth/register` are rate-limited to **10 requests per minute per IP**. Exceeding this returns HTTP 429.\n\n" +
      "## Role-Based Access\n" +
      "- **USER** — Can manage their own scans, settings and API keys.\n" +
      "- **ADMIN** — Full access including user management, system logs, and all scans.",
    version: "2.0.0",
    contact: {
      name: "Project Strix",
      url: "https://github.com/infat0x/ProjectStrix",
    },
  },
  servers: [{ url: "/api", description: "Current server" }],
  tags: [
    { name: "Health", description: "API health and system status" },
    { name: "Auth", description: "Authentication and session management" },
    { name: "Scans", description: "Security scan management" },
    { name: "Users", description: "User management (ADMIN only)" },
    { name: "Vulnerabilities", description: "Vulnerability management" },
    { name: "Logs", description: "System audit logs (ADMIN only)" },
    { name: "Streaming", description: "Real-time scan output via Server-Sent Events" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description:
          "Returns the health status of the API, strix CLI availability, storage status, and running scan count. Public endpoint — no authentication required.",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "System is healthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
                example: {
                  status: "ok",
                  timestamp: "2026-08-03T12:00:00.000Z",
                  uptime_seconds: 3600,
                  version: "1.0.0",
                  components: {
                    api: { status: "ok", message: "Next.js API is running" },
                    strix_cli: {
                      status: "ok",
                      path: "/usr/local/bin/strix",
                      message: "strix found",
                    },
                    storage: {
                      status: "ok",
                      runs_dir: "/tmp/strix_runs",
                      runs_dir_exists: true,
                      total_scans: 5,
                      running_scans: 1,
                    },
                  },
                },
              },
            },
          },
          "503": { description: "System is unhealthy" },
        },
      },
    },

    // ── AUTH ────────────────────────────────────────────────────────────────
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        description:
          "Authenticates a user with username and password. Sets an **httpOnly, SameSite=Strict** session cookie on success.\n\n" +
          "**Rate limited:** 10 attempts/min per IP. Returns 429 when exceeded.",
        operationId: "loginUser",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Authenticated — session cookie set",
            content: {
              "application/json": {
                example: { success: true, user: { username: "alice", role: "USER" } },
              },
            },
          },
          "400": { description: "Missing or invalid fields" },
          "401": { description: "Invalid credentials" },
          "403": { description: "Account rejected" },
          "429": { description: "Too many login attempts — try again in 60 seconds" },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register",
        description:
          "Creates a new user account. The first registered user becomes ADMIN (auto-approved). Subsequent users start as PENDING and must be approved by an admin.\n\n" +
          "**Password requirements:** minimum 12 characters, must include uppercase, lowercase, and a digit.\n\n" +
          "**Username rules:** 2–32 chars, letters/numbers/`_` only.\n\n" +
          "**Rate limited:** 10 attempts/min per IP.",
        operationId: "registerUser",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
              example: { username: "alice", password: "SecurePass1!" },
            },
          },
        },
        responses: {
          "200": {
            description: "Registered and session cookie set",
            content: {
              "application/json": {
                example: { success: true, user: { username: "alice", role: "USER", status: "PENDING" } },
              },
            },
          },
          "400": { description: "Validation error (password too weak, username invalid)" },
          "409": { description: "Username already exists" },
          "429": { description: "Too many requests" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user profile",
        description: "Returns the profile of the currently authenticated user from the session token.",
        operationId: "getMe",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": { description: "User profile returned" },
          "401": { description: "Not authenticated" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        description: "Destroys the current session cookie.",
        operationId: "logoutUser",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": { description: "Logged out successfully" },
        },
      },
    },

    // ── USER SETTINGS & KEYS ────────────────────────────────────────────────
    "/user/settings": {
      get: {
        tags: ["Auth"],
        summary: "Get user settings",
        description: "Returns account settings and custom LLM models for the authenticated user.",
        operationId: "getUserSettings",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "User settings and custom models",
            content: {
              "application/json": {
                example: {
                  settings: { aggressiveness: 50, maxThreads: 4, webhookUrl: "", notifyOnStart: false, notifyOnFinish: true },
                  customModels: [],
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Auth"],
        summary: "Update user settings",
        description: "Updates user settings (aggressiveness, threads, webhook) or custom LLM model list.",
        operationId: "updateUserSettings",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateSettingsRequest" },
            },
          },
        },
        responses: {
          "200": { description: "Settings saved" },
          "400": { description: "Invalid type" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/user/keys": {
      get: {
        tags: ["Auth"],
        summary: "Get configured API key providers",
        description:
          "Returns a map of configured LLM provider names to **boolean** values indicating whether a key is stored. **Raw keys are never returned.**",
        operationId: "getApiKeyStatus",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "Map of provider → configured (true/false)",
            content: {
              "application/json": {
                example: { openai: true, anthropic: false, deepseek: true },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Auth"],
        summary: "Save API keys",
        description: "Stores LLM provider API keys for the authenticated user. Keys are stored encrypted in the database and are never returned to the client.",
        operationId: "saveApiKeys",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                description: "Map of provider name to API key string",
                example: { openai: "sk-...", deepseek: "sk-ds-..." },
              },
            },
          },
        },
        responses: {
          "200": { description: "Keys saved" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ── SCANS ───────────────────────────────────────────────────────────────
    "/scans": {
      get: {
        tags: ["Scans"],
        summary: "List scans",
        description: "Returns all scans for the authenticated user (ADMINs see all scans), sorted newest first.",
        operationId: "listScans",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "List of scans",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    scans: { type: "array", items: { $ref: "#/components/schemas/ScanSummary" } },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Scans"],
        summary: "Launch a scan",
        description:
          "Starts a new Strix security assessment. The scan runs asynchronously in the background.\n\n" +
          "**API keys** are looked up from the user's stored settings — do not send them in this request.\n\n" +
          "**Input limits:** `instruction` ≤ 25000 chars, `targetList` ≤ 100 000 chars.\n\n" +
          "If the strix CLI is not installed the scan runs in **demo mode** with mock data.",
        operationId: "createScan",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateScanRequest" },
              example: {
                target: "https://your-app.com",
                llmModel: "openai/gpt-4o",
                scanMode: "standard",
                instruction: "Focus on authentication and IDOR vulnerabilities",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Scan started",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateScanResponse" },
              },
            },
          },
          "400": { description: "Validation error — target required or input too long" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/scans/bulk": {
      delete: {
        tags: ["Scans"],
        summary: "Bulk delete scans",
        description: "Stops running processes and deletes multiple scans by ID. Users can only delete their own scans; ADMINs can delete any.",
        operationId: "bulkDeleteScans",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["ids"],
                properties: {
                  ids: { type: "array", items: { type: "string", format: "uuid" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Deleted count returned" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/scans/{id}": {
      get: {
        tags: ["Scans"],
        summary: "Get scan details",
        description: "Returns full scan metadata including status, model, timestamps, and all discovered vulnerabilities. Returns 403 if the scan belongs to another user (non-ADMIN).",
        operationId: "getScan",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/ScanId" }],
        responses: {
          "200": {
            description: "Scan detail with vulnerabilities",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ScanDetail" } },
            },
          },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden — scan belongs to another user" },
          "404": { description: "Scan not found" },
        },
      },
      delete: {
        tags: ["Scans"],
        summary: "Stop or delete a scan",
        description:
          "Without `?purge=true`: sends SIGTERM to the process and marks the scan as stopped.\n\n" +
          "With `?purge=true`: kills the process, deletes all data from disk, and removes the DB record.",
        operationId: "stopScan",
        security: [{ sessionCookie: [] }],
        parameters: [
          { $ref: "#/components/parameters/ScanId" },
          {
            name: "purge",
            in: "query",
            required: false,
            description: "If true, permanently deletes all scan data",
            schema: { type: "boolean", default: false },
          },
        ],
        responses: {
          "200": { description: "Scan stopped or deleted" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "Scan not found" },
        },
      },
    },
    "/scans/{id}/schedule": {
      post: {
        tags: ["Scans"],
        summary: "Set recurring schedule",
        description: "Sets or clears a recurring period for a scan. Valid values: `daily`, `weekly`, `monthly`, `none`.",
        operationId: "scheduleScan",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/ScanId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["period"],
                properties: {
                  period: {
                    type: "string",
                    enum: ["daily", "weekly", "monthly", "none"],
                    description: "Recurrence period. 'none' clears the schedule.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Schedule updated — returns period and next run time" },
          "400": { description: "Invalid period value" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "Scan not found" },
        },
      },
    },
    "/scans/{id}/stream": {
      get: {
        tags: ["Streaming"],
        summary: "Real-time scan log stream (SSE)",
        description:
          "Server-Sent Events stream delivering live agent log lines and discovered vulnerabilities as the scan runs. Replays existing log history on first connect. Sends a final `status` event when the scan finishes.\n\n" +
          "**Event types:**\n- `log` — a single line from the agent output\n- `vulnerability` — a newly discovered vulnerability object\n- `status` — scan finished (`completed` | `failed` | `stopped`)",
        operationId: "streamScan",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/ScanId" }],
        responses: {
          "200": {
            description: "SSE stream",
            content: {
              "text/event-stream": {
                schema: {
                  type: "string",
                  example:
                    'data: {"type":"log","line":"[2026-08-03T12:00:00Z] Starting scan..."}\n\ndata: {"type":"vulnerability","vuln":{...}}\n\ndata: {"type":"status","status":"completed"}\n\n',
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "Scan not found" },
        },
      },
    },

    // ── USERS ───────────────────────────────────────────────────────────────
    "/users": {
      get: {
        tags: ["Users"],
        summary: "List all users",
        description: "Returns all registered users. **ADMIN only.**",
        operationId: "listUsers",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": { description: "List of users" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden — ADMIN required" },
        },
      },
    },
    "/users/{id}": {
      patch: {
        tags: ["Users"],
        summary: "Update user role or status",
        description: "Approves, rejects, or changes the role of a user. **ADMIN only.** Cannot demote or reject the last admin.",
        operationId: "updateUser",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["APPROVED", "PENDING", "REJECTED"] },
                  role: { type: "string", enum: ["ADMIN", "USER"] },
                },
              },
              example: { status: "APPROVED" },
            },
          },
        },
        responses: {
          "200": { description: "User updated" },
          "400": { description: "Cannot demote/reject the last administrator" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden — ADMIN required" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete a user",
        description: "Deletes a user and all associated data. **ADMIN only.** Cannot delete the last admin.",
        operationId: "deleteUser",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        responses: {
          "200": { description: "User deleted" },
          "400": { description: "Cannot delete the last administrator" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden — ADMIN required" },
          "404": { description: "User not found" },
        },
      },
    },
    "/users/pending-count": {
      get: {
        tags: ["Users"],
        summary: "Pending user count",
        description: "Returns the number of users awaiting approval. **ADMIN only.**",
        operationId: "getPendingCount",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": { description: "Count of pending users" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
        },
      },
    },

    // ── VULNERABILITIES ─────────────────────────────────────────────────────
    "/vulnerabilities/bulk": {
      delete: {
        tags: ["Vulnerabilities"],
        summary: "Bulk delete vulnerabilities",
        description: "Deletes multiple vulnerability entries by scan ID + vuln ID pairs. Users can only delete from their own scans.",
        operationId: "bulkDeleteVulnerabilities",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items"],
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        scanId: { type: "string", format: "uuid" },
                        vulnId: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Deleted count returned" },
          "400": { description: "Invalid or empty items" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ── LOGS ────────────────────────────────────────────────────────────────
    "/analytics": {
      get: {
        tags: ["Logs"],
        summary: "Dashboard analytics",
        description: "Returns statistical data for the dashboard overview charts (scan trends, severity breakdown, recent vulnerabilities).",
        operationId: "getAnalytics",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": { description: "Analytics data" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/logs": {
      get: {
        tags: ["Logs"],
        summary: "System logs",
        description: "Returns recent system events and audit entries. **ADMIN only.**",
        operationId: "getLogs",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": { description: "List of log entries" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden — ADMIN required" },
        },
      },
    },
  },

  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "strix_session",
        description: "HttpOnly session cookie obtained via POST /auth/login",
      },
    },
    parameters: {
      ScanId: {
        name: "id",
        in: "path",
        required: true,
        description: "Scan UUID",
        schema: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
      },
      UserId: {
        name: "id",
        in: "path",
        required: true,
        description: "User UUID",
        schema: { type: "string", format: "uuid" },
      },
    },
    schemas: {
      LoginRequest: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", minLength: 2, maxLength: 64, example: "alice" },
          password: { type: "string", minLength: 12, maxLength: 256, example: "SecurePass1!" },
        },
      },
      UpdateSettingsRequest: {
        type: "object",
        required: ["type", "data"],
        properties: {
          type: { type: "string", enum: ["settings", "customModels"] },
          data: {
            oneOf: [
              {
                type: "object",
                description: "Settings payload",
                properties: {
                  aggressiveness: { type: "integer", minimum: 0, maximum: 100 },
                  maxThreads: { type: "integer", minimum: 1, maximum: 32 },
                  webhookUrl: { type: "string", format: "uri" },
                  notifyOnStart: { type: "boolean" },
                  notifyOnFinish: { type: "boolean" },
                },
              },
              {
                type: "array",
                description: "Custom model list",
                items: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    label: { type: "string" },
                  },
                },
              },
            ],
          },
        },
      },
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ok", "degraded", "error"] },
          timestamp: { type: "string", format: "date-time" },
          uptime_seconds: { type: "integer" },
          version: { type: "string" },
          components: {
            type: "object",
            properties: {
              api: { type: "object", properties: { status: { type: "string" }, message: { type: "string" } } },
              strix_cli: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["ok", "not_installed"] },
                  path: { type: "string", nullable: true },
                  message: { type: "string" },
                },
              },
              storage: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  runs_dir: { type: "string" },
                  runs_dir_exists: { type: "boolean" },
                  total_scans: { type: "integer" },
                  running_scans: { type: "integer" },
                },
              },
            },
          },
        },
      },
      CreateScanRequest: {
        type: "object",
        required: ["target"],
        properties: {
          target: { type: "string", description: "Target URL or hostname", example: "https://your-app.com" },
          targetList: { type: "string", description: "Newline-separated list of targets (max 100 000 chars)", example: "https://a.com\nhttps://b.com" },
          scanName: { type: "string", description: "Optional human-readable name for this scan" },
          projectName: { type: "string", description: "Optional project grouping name" },
          llmModel: { type: "string", description: "LLM provider/model in litellm format", default: "openai/gpt-4o", example: "deepseek/deepseek-coder" },
          scanMode: { type: "string", enum: ["quick", "standard", "deep"], default: "standard" },
          instruction: { type: "string", description: "Custom agent instructions (max 25000 chars)", example: "Focus on authentication bypasses" },
          scopeMode: { type: "string", enum: ["auto", "strict", "loose"], default: "auto" },
          maxBudget: { type: "string", description: "Maximum token/cost budget" },
          maxTurns: { type: "string", description: "Maximum agent turns" },
          scheduledAt: { type: "string", format: "date-time", description: "Schedule scan for a future time" },
          resumeRun: { type: "string", format: "uuid", description: "Resume an existing scan by its ID" },
        },
      },
      CreateScanResponse: {
        type: "object",
        properties: {
          scanId: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["running", "scheduled"] },
          mode: { type: "string", enum: ["live", "demo", "simulation"], description: "live = real strix; demo = mock data" },
        },
      },
      ScanSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          target: { type: "string" },
          scanName: { type: "string", nullable: true },
          projectName: { type: "string" },
          llmModel: { type: "string" },
          scanMode: { type: "string", enum: ["quick", "standard", "deep"] },
          status: { type: "string", enum: ["running", "crawling", "scanning", "analyzing", "completed", "failed", "stopped", "scheduled"] },
          period: { type: "string", enum: ["none", "daily", "weekly", "monthly"] },
          nextRunAt: { type: "string", format: "date-time", nullable: true },
          startedAt: { type: "string", format: "date-time" },
          finishedAt: { type: "string", format: "date-time", nullable: true },
          vulnCount: { type: "integer" },
        },
      },
      ScanDetail: {
        allOf: [
          { $ref: "#/components/schemas/ScanSummary" },
          {
            type: "object",
            properties: {
              instruction: { type: "string" },
              vulnerabilities: { type: "array", items: { $ref: "#/components/schemas/Vulnerability" } },
            },
          },
        ],
      },
      Vulnerability: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string", example: "SQL Injection in /api/login" },
          severity: { type: "string", enum: ["critical", "high", "medium", "low", "informative"] },
          endpoint: { type: "string", example: "/api/login" },
          method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
          description: { type: "string" },
          poc: { type: "string", description: "Proof of Concept" },
          cvss: { type: "number", format: "float", minimum: 0, maximum: 10 },
          remediation: { type: "string" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: { error: { type: "string", example: "target is required" } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
