export interface Vulnerability {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "informative" | "info";
  endpoint: string;
  method?: string;
  description: string;
  poc?: string;
  poc_description?: string;
  poc_script_code?: string;
  cvss?: number;
  remediation?: string;
  target?: string;
  status?: string;
}

export interface ScanDetail {
  id: string;
  target: string;
  scanName?: string;
  llmModel: string;
  scanMode: string;
  status: "running" | "completed" | "failed" | "stopped";
  startedAt: string;
  finishedAt: string | null;
  vulnerabilities: Vulnerability[];
  payload?: any;
}

export const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  informative: 4,
  info: 4,
};
