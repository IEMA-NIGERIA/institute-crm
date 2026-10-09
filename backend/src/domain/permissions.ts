/**
 * Permission catalog. The set of keys is owned by code (routes check them at compile time);
 * which role holds which permission is stored in the database and editable at runtime.
 *
 * Adding a permission: add it here, then add a migration that inserts the key (and any default grants).
 */
export const PERMISSIONS = {
    ENQUIRIES_READ: "enquiries:read",
    ENQUIRIES_WRITE: "enquiries:write",
    APPLICATIONS_READ: "applications:read",
    APPLICATIONS_WRITE: "applications:write",
    APPLICATIONS_SCREEN: "applications:screen",
    APPLICATIONS_REVIEW: "applications:review",
    PERSONS_READ: "persons:read",
    PERSONS_WRITE: "persons:write",
    INTERACTIONS_LOG: "interactions:log",
    EVENTS_REGISTER_MEMBERS: "events:register-members",
    EVENTS_MANAGE_REGISTRATIONS: "events:manage-registrations",
    COMMUNICATIONS_SEND: "communications:send",
    CERTIFICATIONS_MANAGE: "certifications:manage",
    TRAINING_MANAGE: "training:manage",
    ASSESSMENTS_RECORD: "assessments:record",
    PARTNERSHIPS_MANAGE: "partnerships:manage",
    MEMBERS_ISSUE_NUMBER: "members:issue-number",
    MEMBERS_APPROVE_CHANGES: "members:approve-changes",
    WORK_REASSIGN: "work:reassign",
    REPORTS_VIEW: "reports:view",
    MEMBERS_VIEW_REGISTER_SUMMARY: "members:view-register-summary",
    PAYMENTS_READ: "payments:read",
    PAYMENTS_CONFIRM_OFFLINE: "payments:confirm-offline",
    SYSTEM_CONFIGURE: "system:configure",
    USERS_READ: "users:read",
    USERS_MANAGE: "users:manage",
    ROLES_MANAGE: "roles:manage",
    INTEGRATIONS_MANAGE: "integrations:manage",
    AUDIT_LOG_READ: "audit-log:read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as [Permission, ...Permission[]];

const PERMISSION_SET: ReadonlySet<string> = new Set(ALL_PERMISSIONS);
export const isPermission = (value: string): value is Permission => PERMISSION_SET.has(value);

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
    "enquiries:read": "View enquiries",
    "enquiries:write": "Capture and manage enquiries",
    "applications:read": "View membership applications",
    "applications:write": "Capture and manage membership applications",
    "applications:screen": "Screen applications for eligibility and forward them to the Committee",
    "applications:review": "Review forwarded applications and record decisions with comments",
    "persons:read": "View person records",
    "persons:write": "Maintain person records",
    "interactions:log": "Log interactions with people and organisations",
    "events:register-members": "Register members for events",
    "events:manage-registrations": "Manage event registrations",
    "communications:send": "Send communications to assigned segments",
    "certifications:manage": "Manage certification candidates",
    "training:manage": "Manage training cohorts",
    "assessments:record": "Record attendance, exam results, project report outcomes and CEUs",
    "partnerships:manage": "Manage the corporate, institutional and partner pipeline, proposals and MoUs",
    "members:issue-number": "Issue membership numbers",
    "members:approve-changes": "Approve grade upgrades, waivers and reinstatements",
    "work:reassign": "Reassign work between staff",
    "reports:view": "View dashboards and reports",
    "members:view-register-summary": "View the member register summary",
    "payments:read": "View dues and fee payment status and payment references",
    "payments:confirm-offline": "Mark offline payments as confirmed",
    "system:configure": "Full system configuration",
    "users:read": "View staff users",
    "users:manage": "Create and manage staff users",
    "roles:manage": "View the permission catalog and change role permissions",
    "integrations:manage": "Administer integrations",
    "audit-log:read": "Access the audit log",
};

/**
 * Superuser role: always holds every permission in the catalog, including ones added later.
 * Its grants cannot be edited, which also guarantees nobody can lock everyone out of role management.
 */
export const SYSTEM_ADMINISTRATOR_ROLE = "system administrator";

/** The permissions a role actually holds, given what is stored for it. */
export const effectivePermissions = (roleTitle: string, stored: readonly Permission[]): Permission[] =>
    roleTitle === SYSTEM_ADMINISTRATOR_ROLE ? [...ALL_PERMISSIONS].sort() : [...new Set(stored)].sort();

const MEMBERSHIP_OFFICER: readonly Permission[] = [
    "enquiries:read",
    "enquiries:write",
    "applications:read",
    "applications:write",
    "persons:read",
    "persons:write",
    "interactions:log",
    "events:register-members",
    "communications:send",
];

/**
 * Default grants, seeded by migration 0005 (which keeps its own frozen copy).
 * Used by tests and as documentation; the database is the source of truth at runtime.
 */
export const DEFAULT_ROLE_PERMISSIONS: Readonly<Record<string, readonly Permission[]>> = {
    "membership officer": MEMBERSHIP_OFFICER,
    "certification & training coordinator": [
        "certifications:manage",
        "training:manage",
        "assessments:record",
        "events:manage-registrations",
        "persons:read",
    ],
    "partnership officer": ["partnerships:manage", "interactions:log", "persons:read"],
    "registrar/membership manager": [
        ...MEMBERSHIP_OFFICER,
        "applications:screen",
        "members:issue-number",
        "members:approve-changes",
        "work:reassign",
    ],
    "membership committee": ["applications:review"],
    "management / governing council": ["reports:view", "members:view-register-summary"],
    finance: ["payments:read", "payments:confirm-offline"],
    [SYSTEM_ADMINISTRATOR_ROLE]: ALL_PERMISSIONS,
};
