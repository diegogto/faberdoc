/**
 * TypeScript types derived from the Faberdoc SQL schema (masterplan.md).
 * These replicate the database structure for type-safe frontend usage.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type OrganizationType = "OWNER" | "CLIENT" | "CONTRACTOR";

export type ProjectMemberRole =
  | "ADMIN"
  | "REVIEWER"
  | "OWNER_APPROVER"
  | "VIEWER";

export type RevisionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "ISSUED";

export type CommentStatus = "OPEN" | "RESPONDED" | "CLOSED";

export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED";

export type PaymentStatus = "PAID" | "PENDING" | "FAILED";

// ─── Core Entities ──────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  org_type: OrganizationType;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface User {
  id: string;
  organization_id: string;
  full_name: string;
  avatar_url: string | null;
  is_admin?: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_name: string;
  status: SubscriptionStatus;
  storage_limit_mb: number;
  projects_limit: number;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionExpense {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  billing_date: string;
  invoice_url: string | null;
  payment_status: PaymentStatus;
  created_at: string;
}

// ─── Projects ───────────────────────────────────────────────────────────────

/**
 * Dynamic property definition stored as JSONB.
 * Each property has a key, label, type, and optional values for dropdowns.
 */
export interface CustomPropertyDefinition {
  key: string;
  label: string;
  type: "text" | "select" | "number";
  options?: string[];
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  naming_pattern: string;
  custom_properties_definition: CustomPropertyDefinition[];
  client_info: Record<string, unknown> | null;
  created_at: string;
  deleted_at: string | null;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
}

// ─── Documents & Revisions ──────────────────────────────────────────────────

export interface Document {
  id: string;
  project_id: string;
  document_code: string;
  title: string;
  custom_properties: Record<string, string | number> | null;
  created_at: string;
  deleted_at: string | null;
}

export interface Revision {
  id: string;
  document_id: string;
  uploader_id: string;
  version_label: string;
  version_index: number;
  status: RevisionStatus;
  created_at: string;
}

export interface FileRecord {
  id: string;
  revision_id: string;
  s3_key: string;
  file_name: string;
  file_size_bytes: number;
  created_at: string;
}

// ─── Issuance & Transmittals ────────────────────────────────────────────────

export interface IssuanceLog {
  id: string;
  revision_id: string;
  original_planned_date: string;
  current_planned_date: string;
  actual_issuance_date: string | null;
  iteration_count: number;
  created_at: string;
}

export interface Transmittal {
  id: string;
  project_id: string;
  transmittal_code: string;
  sender_id: string;
  recipient_org_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  revision_id: string;
  author_id: string;
  content: string;
  status: CommentStatus;
  response_text: string | null;
  closed_at: string | null;
  created_at: string;
}

// ─── View Models (Enriched types for UI display) ────────────────────────────

export interface DocumentTableRow {
  id: string;
  document_code: string;
  title: string;
  latest_revision: string;
  status: RevisionStatus | null;
  planned_date: string | null;
  actual_date: string | null;
  has_files?: boolean;
  [key: string]: unknown;
}

/** Transmittal row as displayed in the transmittal table */
export interface TransmittalTableRow {
  id: string;
  transmittal_code: string;
  recipient_name: string;
  document_count: number;
  created_at: string;
  sender_name: string;
}

/** Project with role info for sidebar display */
export interface ProjectWithRole {
  id: string;
  name: string;
  organization_id: string;
  organization_name: string;
  role: ProjectMemberRole;
  is_own_organization: boolean;
}

/** Document detail for drawer */
export interface DocumentDetail {
  document: Document;
  revisions: (Revision & {
    files: FileRecord[];
    uploader_name: string;
    comments: Comment[];
  })[];
  issuance: IssuanceLog | null;
}
