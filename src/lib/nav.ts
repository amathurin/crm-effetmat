import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/forfaits", label: "Forfaits", icon: Package },
  { href: "/factures", label: "Factures", icon: FileText },
  { href: "/reglages", label: "Réglages", icon: Settings },
];
