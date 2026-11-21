import { hasPermission } from "./auth-jwt";

export interface RoutePermissionRule {
  pattern: RegExp;
  permission?: string | Array<string>;
  href: string;
}

/**
 * Route authorization rules in priority order.
 * - href: Target canonical path for this route (used for finding the first accessible route)
 * - permission: Required permission(s) - if undefined, requires at least some app permission
 */
export const ROUTE_PERMISSIONS: Array<RoutePermissionRule> = [
  // Dashboard
  {
    pattern: /^\/dashboard(?:\/.*)?$/u,
    permission: "dashboard.read",
    href: "/dashboard",
  },

  // Courses
  {
    pattern: /^\/courses\/new(?:\/.*)?$/u,
    permission: "courses.create",
    href: "/courses",
  },
  {
    pattern: /^\/courses\/[^/]+\/edit(?:\/.*)?$/u,
    permission: "courses.update",
    href: "/courses",
  },
  {
    pattern: /^\/courses(?:\/.*)?$/u,
    permission: "courses.read",
    href: "/courses",
  },

  // Categories
  {
    pattern: /^\/categories\/new(?:\/.*)?$/u,
    permission: "categories.create",
    href: "/categories",
  },
  {
    pattern: /^\/categories\/[^/]+\/edit(?:\/.*)?$/u,
    permission: "categories.update",
    href: "/categories",
  },
  {
    pattern: /^\/categories(?:\/.*)?$/u,
    permission: "categories.read",
    href: "/categories",
  },

  // Accounts
  {
    pattern: /^\/accounts\/new(?:\/.*)?$/u,
    permission: "accounts.create",
    href: "/accounts",
  },
  {
    pattern: /^\/accounts(?:\/.*)?$/u,
    permission: ["accounts.read", "users.read"],
    href: "/accounts",
  },

  // FAQs
  {
    pattern: /^\/faqs\/new(?:\/.*)?$/u,
    permission: "faqs.create",
    href: "/faqs",
  },
  {
    pattern: /^\/faqs\/[^/]+\/edit(?:\/.*)?$/u,
    permission: "faqs.update",
    href: "/faqs",
  },
  { pattern: /^\/faqs(?:\/.*)?$/u, permission: "faqs.read", href: "/faqs" },

  // Trainers
  {
    pattern: /^\/trainers\/new(?:\/.*)?$/u,
    permission: "users.create",
    href: "/trainers",
  },
  {
    pattern: /^\/trainers\/[^/]+\/edit(?:\/.*)?$/u,
    permission: "users.update",
    href: "/trainers",
  },
  {
    pattern: /^\/trainers(?:\/.*)?$/u,
    permission: ["users.read", "ROLE_TRAINER"],
    href: "/trainers",
  },

  // Assessments
  {
    pattern: /^\/assessments\/send(?:\/.*)?$/u,
    permission: ["assessments.create", "courses.read"],
    href: "/assessments/send",
  },
  {
    pattern: /^\/assessments\/links(?:\/.*)?$/u,
    permission: ["assessments.read", "courses.read"],
    href: "/assessments/links",
  },
  {
    pattern: /^\/assessments\/results(?:\/.*)?$/u,
    permission: ["assessments.read", "audit.read"],
    href: "/assessments/results",
  },

  // Reports
  {
    pattern: /^\/reports\/participants-result(?:\/.*)?$/u,
    permission: ["reports.read", "audit.read"],
    href: "/reports/participants-result",
  },
  {
    pattern: /^\/reports\/on-demand-video(?:\/.*)?$/u,
    permission: ["reports.read", "audit.read"],
    href: "/reports/on-demand-video",
  },
  {
    pattern: /^\/reports\/virtual-training-division(?:\/.*)?$/u,
    permission: ["reports.read", "audit.read"],
    href: "/reports/virtual-training-division",
  },
  {
    pattern: /^\/reports\/virtual-training-region(?:\/.*)?$/u,
    permission: ["reports.read", "audit.read"],
    href: "/reports/virtual-training-region",
  },
  {
    pattern: /^\/reports\/module-wise-summary(?:\/.*)?$/u,
    permission: ["reports.read", "audit.read"],
    href: "/reports/module-wise-summary",
  },
  {
    pattern: /^\/reports\/assessment-summary(?:\/.*)?$/u,
    permission: ["reports.read", "audit.read"],
    href: "/reports/assessment-summary",
  },
  {
    pattern: /^\/reports\/trainer-wise(?:\/.*)?$/u,
    permission: ["reports.read", "audit.read"],
    href: "/reports/trainer-wise",
  },
  {
    pattern: /^\/reports\/trainer-ip-report(?:\/.*)?$/u,
    permission: ["reports.read", "audit.read"],
    href: "/reports/trainer-ip-report",
  },
  {
    pattern: /^\/reports\/trainer-access-logs(?:\/.*)?$/u,
    permission: ["reports.read", "audit.read"],
    href: "/reports/trainer-access-logs",
  },
  {
    pattern: /^\/reports(?:\/.*)?$/u,
    permission: ["reports.read", "audit.read"],
    href: "/reports/participants-result",
  },

  // Admin Users & Settings
  {
    pattern: /^\/admin-users\/new(?:\/.*)?$/u,
    permission: "users.create",
    href: "/admin-users",
  },
  {
    pattern: /^\/admin-users\/[^/]+\/edit(?:\/.*)?$/u,
    permission: "users.update",
    href: "/admin-users",
  },
  {
    pattern: /^\/admin-users(?:\/.*)?$/u,
    permission: "users.read",
    href: "/admin-users",
  },
  {
    pattern: /^\/users(?:\/.*)?$/u,
    permission: "users.read",
    href: "/admin-users",
  },

  // Roles
  {
    pattern: /^\/roles\/new(?:\/.*)?$/u,
    permission: "roles.create",
    href: "/roles",
  },
  {
    pattern: /^\/roles\/[^/]+\/edit(?:\/.*)?$/u,
    permission: "roles.update",
    href: "/roles",
  },
  { pattern: /^\/roles(?:\/.*)?$/u, permission: "roles.read", href: "/roles" },

  // Cities
  {
    pattern: /^\/cities\/new(?:\/.*)?$/u,
    permission: "pincode.create",
    href: "/cities",
  },
  {
    pattern: /^\/cities\/[^/]+\/edit(?:\/.*)?$/u,
    permission: "pincode.update",
    href: "/cities",
  },
  {
    pattern: /^\/cities(?:\/.*)?$/u,
    permission: ["pincode.read", "system.all"],
    href: "/cities",
  },

  // Languages & Masters
  {
    pattern: /^\/languages\/new(?:\/.*)?$/u,
    permission: "system.all",
    href: "/languages",
  },
  {
    pattern: /^\/languages(?:\/.*)?$/u,
    permission: "system.all",
    href: "/languages",
  },

  // Report Scheduler
  {
    pattern: /^\/report-scheduler(?:\/.*)?$/u,
    permission: "system.all",
    href: "/report-scheduler",
  },
];

/**
 * Ordered list of candidate landing routes when resolving the first available page
 */
export const CANDIDATE_LANDING_ROUTES: Array<{
  href: string;
  permission?: string | Array<string>;
}> = [
  { href: "/dashboard", permission: "dashboard.read" },
  { href: "/courses", permission: "courses.read" },
  { href: "/categories", permission: "categories.read" },
  { href: "/accounts", permission: ["accounts.read", "users.read"] },
  { href: "/faqs", permission: "faqs.read" },
  { href: "/trainers", permission: ["users.read", "ROLE_TRAINER"] },
  {
    href: "/assessments/send",
    permission: ["assessments.create", "courses.read"],
  },
  {
    href: "/assessments/links",
    permission: ["assessments.read", "courses.read"],
  },
  {
    href: "/assessments/results",
    permission: ["assessments.read", "audit.read"],
  },
  {
    href: "/reports/participants-result",
    permission: ["reports.read", "audit.read"],
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
export function getFirstAccessibleRoute(
  userPermissionsOrRoles: Array<string>
): string | null {
  if (!userPermissionsOrRoles || userPermissionsOrRoles.length === 0) {
    return null;
  }

  // If dashboard is permitted, it's always the primary landing page
  if (hasPermission(userPermissionsOrRoles, "dashboard.read")) {
    return "/dashboard";
  }

  for (const candidate of CANDIDATE_LANDING_ROUTES) {
    if (
      candidate.permission &&
      hasPermission(userPermissionsOrRoles, candidate.permission)
    ) {
      return candidate.href;
    }
  }

  return null;
}

/**
 * Checks if a specific path is allowed for the user's permissions
 */
export function isRouteAllowed(
  pathname: string,
  userPermissionsOrRoles: Array<string>
): boolean {
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
      if (!rule.permission) {
        return true;
      }
      return hasPermission(userPermissionsOrRoles, rule.permission);
    }
  }

  // If not explicitly matched in ROUTE_PERMISSIONS, allow if user has at least one valid app route
  return getFirstAccessibleRoute(userPermissionsOrRoles) !== null;
}
