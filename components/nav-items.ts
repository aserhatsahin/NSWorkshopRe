import type { NavItem } from "./nav-links";

// (staff) ve (owner) layout'ları aynı menüyü kullanır; OWNER_NAV_ITEMS
// yalnızca atölye sahibi oturumunda eklenir.
export const STAFF_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Pano", icon: "dashboard" },
  { href: "/attendance", label: "Yoklama", icon: "attendance" },
  { href: "/students", label: "Öğrenciler", icon: "students" },
  { href: "/groups", label: "Gruplar", icon: "groups" },
  { href: "/products", label: "Malzeme", icon: "products" },
];

export const OWNER_NAV_ITEMS: NavItem[] = [
  { href: "/finance", label: "Finans", icon: "finance" },
  { href: "/settings", label: "Ayarlar", icon: "settings" },
];
