# Key Features

Project Strix provides a comprehensive suite of features distributed across its architecture, empowering both security teams and developers.

## 1. Advanced Web Dashboard (UI)
- **Modern & Responsive Design:** A fully glassmorphic, dark-themed interface built with Next.js App Router and React.
- **Interactive Data Visualization:** Real-time metrics including a dynamic Target Resilience score, Active Pentests counter, and Critical Exploit highlights.
- **Analytics & Charts:** A powerful Recharts-based dashboard view that maps out vulnerability severities and scan progress trends in a clean, visual format.
- **In-App Notifications:** Real-time alert system notifying users the moment a scan completes or a critical vulnerability is found.

## 2. Autonomous Pentesting Engine
- **LLM Integration:** Leverages cutting-edge models (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, OpenRouter, Nemotron) for contextual vulnerability discovery.
- **Custom Scan Modes:** Supports `quick`, `standard`, and `deep` scan intensities depending on your engagement scope and depth.
- **Target Flexibility:** Can analyze Live URLs, GitHub Repositories, and local code directories.
- **Custom Instructions:** Allows users to provide natural language prompts (e.g., "Focus exclusively on IDOR vulnerabilities in the billing API module").

## 3. Real-Time Intelligence
- **Live Terminal Emulation:** An embedded web terminal (`xterm.js`) streams the AI agent's internal thought process and logs in real-time using Server-Sent Events (SSE).
- **On-the-fly Findings:** Vulnerabilities populate the dashboard the exact moment the AI discovers them, complete with Severity Badges and CVSS scoring.

## 4. Intelligent Scan Resumption
- **Resume Failed/Stopped Scans:** Pick up right where a scan left off by simply pasting the Previous Run ID (UUID) into the dashboard.
- **Dynamic Model Overriding:** Optionally override the LLM model during resumption, allowing you to seamlessly switch AI providers (e.g., from OpenAI to OpenRouter) if you run into rate limits mid-scan.

## 5. Enterprise-Grade Security
- **Role-Based Access Control (RBAC):** Distinct `ADMIN` and `USER` roles. Admin users get access to system-level logs and configurations.
- **Hardened Authentication:** JWT-based session management, brute-force protection (Rate Limiting), secure HTTP headers, and strict CSRF cookies.
- **System Audit Logs:** A dedicated interface for Admins to monitor who initiated scans, logged in, or encountered errors.

## 6. Automation & CI/CD
- **Recurring Scan Scheduler:** Set up automated scans (e.g., "Run every Sunday at 3 AM") directly from the dashboard via the built-in Node.js Scheduler Daemon.
- **PDF Export:** One-click generation of professional PDF reports detailing all discovered vulnerabilities, Proof of Concepts (PoC), and remediation advice.
- **Interactive API Docs:** Built-in Swagger UI (`/api/docs`) for developers to programmatically trigger scans and integrate Strix into their CI/CD pipelines.
