import { hasPermission } from "./auth-jwt";

export type RoutePermissionRule = {
  pattern: RegExp;
  permission?: string | string[];
  href: string;
};

/**
 * Route authorization rules in priority order.
 * - href: Target canonical path for this route (used for finding the first accessible route)
 * - permission: Required permission(s) - if undefined, requires at least some app permission
 */
export const ROUTE_PERMISSIONS: RoutePermissionRule[] = [
  // Dashboard
  { pattern: /^\/dashboard(\/.*)?$/, permission: "dashboard.read", href: "/dashboard" },

  // Courses
  { pattern: /^\/courses\/new(\/.*)?$/, permission: "courses.create", href: "/courses" },
  { pattern: /^\/courses\/[^/]+\/edit(\/.*)?$/, permission: "courses.update", href: "/courses" },
  { pattern: /^\/courses(\/.*)?$/, permission: "courses.read", href: "/courses" },

  // Categories
  { pattern: /^\/categories\/new(\/.*)?$/, permission: "categories.create", href: "/categories" },
  { pattern: /^\/categories\/[^/]+\/edit(\/.*)?$/, permission: "categories.update", href: "/categories" },
  { pattern: /^\/categories(\/.*)?$/, permission: "categories.read", href: "/categories" },

  // Accounts
  { pattern: /^\/accounts\/new(\/.*)?$/, permission: "accounts.create", href: "/accounts" },
  { pattern: /^\/accounts(\/.*)?$/, permission: ["accounts.read", "users.read"], href: "/accounts" },

  // FAQs
  { pattern: /^\/faqs\/new(\/.*)?$/, permission: "faqs.create", href: "/faqs" },
  { pattern: /^\/faqs\/[^/]+\/edit(\/.*)?$/, permission: "faqs.update", href: "/faqs" },
  { pattern: /^\/faqs(\/.*)?$/, permission: "faqs.read", href: "/faqs" },

  // Trainers
  { pattern: /^\/trainers\/new(\/.*)?$/, permission: "users.create", href: "/trainers" },
  { pattern: /^\/trainers\/[^/]+\/edit(\/.*)?$/, permission: "users.update", href: "/trainers" },
  { pattern: /^\/trainers(\/.*)?$/, permission: ["users.read", "ROLE_TRAINER"], href: "/trainers" },

  // Training Master
  { pattern: /^\/training-master\/new(\/.*)?$/, permission: ["training-master.create", "training-master.manage"], href: "/training-master" },
  { pattern: /^\/training-master\/[^/]+\/edit(\/.*)?$/, permission: ["training-master.update", "training-master.manage"], href: "/training-master" },
  { pattern: /^\/training-master(\/.*)?$/, permission: ["training-master.read", "training-master.manage", "training-master.create", "training-master.update"], href: "/training-master" },

  // Assessments
  { pattern: /^\/assessments\/send(\/.*)?$/, permission: ["assessments.create", "courses.read"], href: "/assessments/send" },
  { pattern: /^\/assessments\/links(\/.*)?$/, permission: ["assessments.read", "courses.read"], href: "/assessments/links" },
  { pattern: /^\/assessments\/results(\/.*)?$/, permission: ["assessments.read", "audit.read"], href: "/assessments/results" },

  // Reports
  {
    pattern: /^\/reports\/participants-result(\/.*)?$/,
    permission: ["participants-results.export", "reports.export", "reports.read", "audit.read", "system.all"],
    href: "/reports/participants-result",
  },
  {
    pattern: /^\/reports\/on-demand-video(\/.*)?$/,
    permission: ["on-demand-videos-pending-assessments.export", "reports.export", "reports.read", "audit.read", "system.all"],
    href: "/reports/on-demand-video",
  },
  {
    pattern: /^\/reports\/virtual-training-division(\/.*)?$/,
    permission: ["virtual-training-division.export", "reports.export", "reports.read", "audit.read", "system.all"],
    href: "/reports/virtual-training-division",
  },
  {
    pattern: /^\/reports\/virtual-training-region(\/.*)?$/,
    permission: ["virtual-training-region.export", "reports.export", "reports.read", "audit.read", "system.all"],
    href: "/reports/virtual-training-region",
  },
  {
    pattern: /^\/reports\/module-wise-summary(\/.*)?$/,
    permission: ["module-wise-summary.read", "module-wise-summary.export", "reports.read", "audit.read", "system.all"],
    href: "/reports/module-wise-summary",
  },
  {
    pattern: /^\/reports\/assessment-summary(\/.*)?$/,
    permission: ["assessment-summary.read", "reports.read", "audit.read", "system.all"],
    href: "/reports/assessment-summary",
  },
  {
    pattern: /^\/reports\/trainer-wise(\/.*)?$/,
    permission: ["trainer-wise-summary.read", "trainer-wise-summary.export", "reports.read", "audit.read", "system.all"],
    href: "/reports/trainer-wise",
  },
  {
    pattern: /^\/reports\/trainer-ip-report(\/.*)?$/,
    permission: ["trainer-ip-report.export", "reports.export", "reports.read", "audit.read", "system.all"],
    href: "/reports/trainer-ip-report",
  },
  {
    pattern: /^\/reports\/trainer-access-logs(\/.*)?$/,
    permission: ["trainer-access-log.export", "reports.export", "reports.read", "audit.read", "system.all"],
    href: "/reports/trainer-access-logs",
  },
  {
    pattern: /^\/reports\/request-training(\/.*)?$/,
    permission: ["request-training.export", "reports.export", "reports.read", "audit.read", "system.all"],
    href: "/reports/request-training",
  },
  {
    pattern: /^\/reports\/register-training(\/.*)?$/,
    permission: ["register-training.export", "reports.export", "reports.read", "audit.read", "system.all"],
    href: "/reports/register-training",
  },
  {
    pattern: /^\/reports(\/.*)?$/,
    permission: [
      "participants-results.export",
      "on-demand-videos-pending-assessments.export",
      "virtual-training-division.export",
      "virtual-training-region.export",
      "module-wise-summary.read",
      "module-wise-summary.export",
      "assessment-summary.read",
      "trainer-wise-summary.read",
      "trainer-wise-summary.export",
      "trainer-ip-report.export",
      "trainer-access-log.export",
      "reports.read",
      "audit.read",
      "system.all",
    ],
    href: "/reports/participants-result",
  },

  // Admin Users & Settings
  { pattern: /^\/admin-users\/new(\/.*)?$/, permission: "users.create", href: "/admin-users" },
  { pattern: /^\/admin-users\/[^/]+\/edit(\/.*)?$/, permission: "users.update", href: "/admin-users" },
  { pattern: /^\/admin-users(\/.*)?$/, permission: "users.read", href: "/admin-users" },
  { pattern: /^\/users(\/.*)?$/, permission: "users.read", href: "/admin-users" },

  // Roles
  { pattern: /^\/roles\/new(\/.*)?$/, permission: "roles.create", href: "/roles" },
  { pattern: /^\/roles\/[^/]+\/edit(\/.*)?$/, permission: "roles.update", href: "/roles" },
  { pattern: /^\/roles(\/.*)?$/, permission: "roles.read", href: "/roles" },

  // Cities
  { pattern: /^\/cities\/new(\/.*)?$/, permission: "pincode.create", href: "/cities" },
  { pattern: /^\/cities\/[^/]+\/edit(\/.*)?$/, permission: "pincode.update", href: "/cities" },
  { pattern: /^\/cities(\/.*)?$/, permission: ["pincode.read", "system.all"], href: "/cities" },

  // Languages & Masters
  { pattern: /^\/languages\/new(\/.*)?$/, permission: "system.all", href: "/languages" },
  { pattern: /^\/languages(\/.*)?$/, permission: "system.all", href: "/languages" },

  // Report Scheduler
  { pattern: /^\/report-scheduler(\/.*)?$/, permission: "system.all", href: "/report-scheduler" },
];

/**
 * Ordered list of candidate landing routes when resolving the first available page
 */
export const CANDIDATE_LANDING_ROUTES: { href: string; permission?: string | string[] }[] = [
  { href: "/dashboard", permission: "dashboard.read" },
  { href: "/courses", permission: "courses.read" },
  { href: "/categories", permission: "categories.read" },
  { href: "/accounts", permission: ["accounts.read", "users.read"] },
  { href: "/faqs", permission: "faqs.read" },
  { href: "/trainers", permission: ["users.read", "ROLE_TRAINER"] },
  { href: "/training-master", permission: ["users.read", "ROLE_TRAINER", "system.all"] },
  { href: "/assessments/send", permission: ["assessments.create", "courses.read"] },
  { href: "/assessments/links", permission: ["assessments.read", "courses.read"] },
  { href: "/assessments/results", permission: ["assessments.read", "audit.read"] },
  {
    href: "/reports/participants-result",
    permission: [
      "participants-results.export",
      "on-demand-videos-pending-assessments.export",
      "virtual-training-division.export",
      "virtual-training-region.export",
      "module-wise-summary.read",
      "module-wise-summary.export",
      "assessment-summary.read",
      "trainer-wise-summary.read",
      "trainer-wise-summary.export",
      "trainer-ip-report.export",
      "trainer-access-log.export",
      "reports.read",
      "audit.read",
      "system.all",
    ],
  },
  { href: "/admin-users", permission: "users.read" },
  { href: "/roles", permission: "roles.read" },
  { href: "/cities", permission: ["pincode.read", "system.all"] },
  { href: "/languages", permission: "system.all" },
  { href: "/report-scheduler", permission: "system.all" },
];

/**
 * Given the user's combined roles and permissions:
 * - If user has dashboard.read, returns "/dashboard".
 * - Otherwise, finds the first route the user is authorized to access.
 * - If user has zero authorized pages, returns null.
 */
export function getFirstAccessibleRoute(userPermissionsOrRoles: string[]): string | null {
  if (!userPermissionsOrRoles || userPermissionsOrRoles.length === 0) {
    return null;
  }

  // If dashboard is permitted, it's always the primary landing page
  if (hasPermission(userPermissionsOrRoles, "dashboard.read")) {
    return "/dashboard";
  }

  for (const candidate of CANDIDATE_LANDING_ROUTES) {
    if (candidate.permission && hasPermission(userPermissionsOrRoles, candidate.permission)) {
      return candidate.href;
    }
  }

  return null;
}

/**
 * Checks if a specific path is allowed for the user's permissions
 */
export function isRouteAllowed(pathname: string, userPermissionsOrRoles: string[]): boolean {
  // Common personal utility pages always accessible to authenticated users
  if (
    pathname === "/access-denied" ||
    pathname === "/profile" ||
    pathname === "/change-password"
  ) {
    return true;
  }

  // Find the most specific rule that matches
  for (const rule of ROUTE_PERMISSIONS) {
    if (rule.pattern.test(pathname)) {
      if (!rule.permission) return true;
      return hasPermission(userPermissionsOrRoles, rule.permission);
    }
  }

  // If not explicitly matched in ROUTE_PERMISSIONS, allow if user has at least one valid app route
  return getFirstAccessibleRoute(userPermissionsOrRoles) !== null;
}
