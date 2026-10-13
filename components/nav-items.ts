import type { NavItem } from "./nav-links";

const STAFF_PAGES: NavItem[] = [
  { href: "/attendance", label: "Yoklama", icon: "attendance" },
  { href: "/students", label: "Öğrenciler", icon: "students" },
  { href: "/groups", label: "Gruplar", icon: "groups" },
  { href: "/products", label: "Malzeme", icon: "products" },
];

// (staff), (owner) ve (account) layout'ları iki listeyi birlikte verir;
// hangisinin gösterileceğine oturumdaki role göre AppShell karar verir.
export const STAFF_NAV_ITEMS: NavItem[] = [{ href: "/dashboard", label: "Pano", icon: "dashboard" }, ...STAFF_PAGES];

// Atölye sahibinin panosu genel finans özetini içerdiği için ayrı sayfadır.
export const OWNER_NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Pano", icon: "dashboard" },
  ...STAFF_PAGES,
  { href: "/finance", label: "Finans", icon: "finance" },
  { href: "/staff", label: "Personel", icon: "staff" },
  { href: "/audit", label: "Geçmiş", icon: "audit" },
  { href: "/settings", label: "Ayarlar", icon: "settings" },
];

export const STUDENT_NAV_ITEMS: NavItem[] = [{ href: "/panel", label: "Panelim", icon: "home" }];
