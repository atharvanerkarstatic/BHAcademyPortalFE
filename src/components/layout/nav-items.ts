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
      { label: "Accounts", href: "/accounts", icon: Users, permission: "users.read" },
      { label: "FAQs", href: "/faqs", icon: HelpCircle, permission: "faqs.read" },
    ],
  },
  {
    items: [
      { label: "New Zoom Meet. Link", href: "/zoom/new", icon: Link2, permission: "sessions.read" },
      { label: "Zoom Meeting Links", href: "/zoom/links", icon: Link2, permission: "sessions.read" },
      { label: "Send Assessment Link", href: "/assessments/send", icon: Link2, permission: "courses.read" },
      { label: "Assessment Links", href: "/assessments/links", icon: ClipboardList, permission: "courses.read" },
      { label: "Assessment Results", href: "/assessments/results", icon: Lightbulb, permission: "audit.read" },
    ],
  },
  {
    items: [{ label: "Trainers", href: "/trainers", icon: GraduationCap, permission: "users.read" }],
  },
  {
    title: "Reports & Logs",
    collapsible: true,
    icon: BarChart3,
    items: [
      { label: "Participants Result", href: "/reports/participants-result", icon: BarChart3, permission: "audit.read" },
      { label: "On-Demand Video Pending Assessment", href: "/reports/on-demand-video", icon: BarChart3, permission: "audit.read" },
      { label: "Virtual Training (Division)", href: "/reports/virtual-training-division", icon: BarChart3, permission: "audit.read" },
      { label: "Virtual Training (Region)", href: "/reports/virtual-training-region", icon: BarChart3, permission: "audit.read" },
      { label: "Module Wise Summary", href: "/reports/module-wise-summary", icon: BarChart3, permission: "audit.read" },
    ],
  },
  {
    title: "Settings & Masters",
    collapsible: true,
    icon: Settings,
    items: [
      { label: "Admin Users", href: "/admin-users", icon: ArrowRight, permission: "users.read" },
      { label: "Roles & Permissions", href: "/roles", icon: ArrowRight, permission: "roles.read" },
      { label: "Manage Cities", href: "/cities", icon: ArrowRight, permission: "system.all" },
      { label: "Manage Languages", href: "/languages", icon: ArrowRight },
      { label: "Report Scheduler", href: "/report-scheduler", icon: ArrowRight, permission: "system.all" },
    ],
  },
];
