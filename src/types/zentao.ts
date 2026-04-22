export type BugStatus = "active" | "resolved" | "closed" | "all";

export type TaskStatus = "wait" | "doing" | "done" | "all";

export type BugResolutionType =
  | "fixed"
  | "notrepro"
  | "duplicate"
  | "bydesign"
  | "willnotfix"
  | "tostory"
  | "external";

export interface ZentaoAuthSession {
  baseUrl: string;
  account: string;
  token: string;
  expiresAt?: number;
}

export interface ZentaoProduct {
  id: number;
  name: string;
  code?: string;
}

export interface ZentaoBug {
  id: number;
  title: string;
  status: string;
  severity?: number;
  pri?: number;
  assignedTo?: string;
  openedBy?: string;
  openedDate?: string;
}

export interface ZentaoBugDetail extends ZentaoBug {
  steps?: string;
  comment?: string;
  story?: number;
  task?: number;
  project?: number;
  product?: number;
}

export interface ResolveBugPayload {
  resolution: BugResolutionType;
  resolvedBuild?: string;
  duplicateBug?: number;
  comment?: string;
}

/** 禅道 API v1：POST /bugs/{id}/active */
export interface ActivateBugPayload {
  assignedTo?: string;
  /** 影响版本（文档为数组）；未传时默认 ["trunk"] */
  openedBuild?: string | string[];
  comment?: string;
}
