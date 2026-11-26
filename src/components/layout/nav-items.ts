import {
  ArrowRight,
  BarChart3,
  Calendar,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  Languages,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Link2,
  List,
  MapPin,
  Settings,
  ShieldCheck,
  Sliders,
  SquarePlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string | string[];
};

export type NavSection = {
  title?: string;
  collapsible?: boolean;
  icon?: LucideIcon;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.read" },
    ],
  },
  {
    items: [
      { label: "Courses List", href: "/courses", icon: List, permission: "courses.read" },
      { label: "Categories List", href: "/categories", icon: Layers, permission: "categories.read" },
      { label: "Accounts", href: "/accounts", icon: Users, permission: ["accounts.read", "users.read"] },
      { label: "FAQs", href: "/faqs", icon: HelpCircle, permission: "faqs.read" },
    ],
  },
  {
    title: "Trainers",
    collapsible: true,
    icon: GraduationCap,
    items: [
      { label: "Trainers", href: "/trainers", icon: GraduationCap, permission: ["users.read", "ROLE_TRAINER"] },
      { label: "Training Master", href: "/training-master", icon: Calendar, permission: ["training-master.read", "users.read", "ROLE_TRAINER", "system.all"] },
      { label: "Send Assessment Links", href: "/assessments/send", icon: Link2, permission: ["assessments.create", "courses.read"] },
      { label: "Assessment Links", href: "/assessments/links", icon: ClipboardList, permission: ["assessments.read", "courses.read"] },
      { label: "Assessment Results", href: "/assessments/results", icon: Lightbulb, permission: ["assessments.read", "audit.read"] },
    ],
  },
  {
    title: "Reports & Logs",
    collapsible: true,
    icon: BarChart3,
    items: [
      {
        label: "Participants Result",
        href: "/reports/participants-result",
        icon: BarChart3,
        permission: ["participants-results.export", "reports.export", "reports.read", "audit.read", "system.all"],
      },
      {
        label: "On-Demand Video Pending Assessment",
        href: "/reports/on-demand-video",
        icon: BarChart3,
        permission: ["on-demand-videos-pending-assessments.export", "reports.export", "reports.read", "audit.read", "system.all"],
      },
      {
        label: "Virtual Training (Division)",
        href: "/reports/virtual-training-division",
        icon: BarChart3,
        permission: ["virtual-training-division.export", "reports.export", "reports.read", "audit.read", "system.all"],
      },
      {
        label: "Virtual Training (Region)",
        href: "/reports/virtual-training-region",
        icon: BarChart3,
        permission: ["virtual-training-region.export", "reports.export", "reports.read", "audit.read", "system.all"],
      },
      {
        label: "Module Wise Summary",
        href: "/reports/module-wise-summary",
        icon: BarChart3,
        permission: ["module-wise-summary.read", "module-wise-summary.export", "reports.read", "audit.read", "system.all"],
      },
      {
        label: "Assessment Summary",
        href: "/reports/assessment-summary",
        icon: BarChart3,
        permission: ["assessment-summary.read", "reports.read", "audit.read", "system.all"],
      },
      {
        label: "Trainer-wise Summary",
        href: "/reports/trainer-wise",
        icon: BarChart3,
        permission: ["trainer-wise-summary.read", "trainer-wise-summary.export", "reports.read", "audit.read", "system.all"],
      },
      {
        label: "Trainer IP Report",
        href: "/reports/trainer-ip-report",
        icon: BarChart3,
        permission: ["trainer-ip-report.export", "reports.export", "reports.read", "audit.read", "system.all"],
      },
      {
        label: "Trainer Access Logs",
        href: "/reports/trainer-access-logs",
        icon: BarChart3,
        permission: ["trainer-access-log.export", "reports.export", "reports.read", "audit.read", "system.all"],
      },
      {
        label: "Request Training",
        href: "/reports/request-training",
        icon: BarChart3,
        permission: ["request-training.export", "reports.export", "reports.read", "audit.read", "system.all"],
      },
      {
        label: "Register Training",
        href: "/reports/register-training",
        icon: BarChart3,
        permission: ["register-training.export", "reports.export", "reports.read", "audit.read", "system.all"],
      },
    ],
  },
  {
    title: "Settings & Masters",
    collapsible: true,
    icon: SquarePlus,
    items: [
      { label: "Admin Users", href: "/admin-users", icon: ArrowRight, permission: "users.read" },
      { label: "Roles & Permissions", href: "/roles", icon: ArrowRight, permission: "roles.read" },
      { label: "Manage Cities", href: "/cities", icon: ArrowRight, permission: ["pincode.read", "system.all"] },
      { label: "Manage Languages", href: "/languages", icon: ArrowRight, permission: "system.all" },
      { label: "Report Scheduler", href: "/report-scheduler", icon: ArrowRight, permission: "system.all" },
    ],
  },
];
