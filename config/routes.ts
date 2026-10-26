/**
 * Centralized Route Configuration
 * Menyimpan seluruh definisi path routing agar type-safe dan konsisten di seluruh layer.
 */

export const ROUTES = {
  HOME: "/",
  COMPARE: "/compare",
  MOVIES: "/movies",
  USERS: "/users",
  ITEMS: {
    LIST: "/items",
    DETAIL: (id: string) => `/items/${id}` as const,
  },
  ABOUT: "/about",
} as const;

export interface NavItem {
  label: string;
  href: string;
  description?: string;
}

export const MAIN_NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Dashboard",
    href: ROUTES.HOME,
    description: "Halaman utama ringkasan sistem",
  },
  {
    label: "Komparasi Top-N",
    href: ROUTES.COMPARE,
    description: "Perbandingan NBCF vs Klaster NBCF vs Ground Truth",
  },
];
