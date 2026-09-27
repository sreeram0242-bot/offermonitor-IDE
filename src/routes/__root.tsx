import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 text-xl font-medium text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="btn-primary mt-6">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-primary"
          >
            Try again
          </button>
          <a href="/" className="btn-ghost">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
      },
      { title: "CD Billing — Loyalty Tracker" },
      {
        name: "description",
        content:
          "Track customer visits at CD Billing. 6 days in a row earns a free item on the 7th day.",
      },
      { property: "og:title", content: "CD Billing — Loyalty Tracker" },
      {
        property: "og:description",
        content: "6-day streak, 7th day free. Manage bills and menu for CD Billing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fira+Sans:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  if (import.meta.env.VITE_IS_CAPACITOR) {
    return <>{children}</>;
  }
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import {
  LayoutDashboard,
  TrendingUp,
  PlusCircle,
  Users,
  UtensilsCrossed,
  Settings as SettingsIcon,
  Sun,
  Moon,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/revenue", label: "Revenue", Icon: TrendingUp },
  { to: "/new-bill", label: "New Bill", Icon: PlusCircle },
  { to: "/customers", label: "Customers", Icon: Users },
  { to: "/menu", label: "Menu", Icon: UtensilsCrossed },
  { to: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("ek-theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);
  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("ek-theme", next ? "dark" : "light");
      return next;
    });
  };
  return { dark, toggle };
}

import { useSettings } from "../lib/loyalty";
import { SplashScreen } from '@capacitor/splash-screen';

function Sidebar({ onNavigate, dark, toggleDark }: { onNavigate?: () => void; dark: boolean; toggleDark: () => void }) {
  const settings = useSettings();
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-6 py-5">
        <div className="font-display text-xl leading-tight text-primary font-bold">{settings.hotelName}</div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-accent">
          Billing POS
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            activeProps={{
              className: "bg-primary text-primary-foreground hover:bg-primary",
            }}
            activeOptions={{ exact: item.to === "/" }}
          >
            <item.Icon className="h-4 w-4 shrink-0 opacity-80" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-4 flex items-center justify-between text-xs text-muted-foreground">
        <div>
          <div className="font-bold text-foreground">CD Billing POS</div>
          <div className="text-[10px] text-emerald-600 font-semibold">Offline Ready</div>
        </div>
        <button
          onClick={toggleDark}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary border border-border text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          title="Toggle Theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const settings = useSettings();
  const { dark, toggle: toggleDark } = useDarkMode();

  useEffect(() => {
    document.title = `${settings.hotelName} — CD Billing`;
    
    // Prevent Capacitor splash screen bug where touch overlay blocks clicks
    if (import.meta.env.VITE_IS_CAPACITOR) {
      SplashScreen.hide().catch(console.error);
    }
  }, [settings.hotelName]);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" richColors />
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar dark={dark} toggleDark={toggleDark} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile Header with Theme Toggle & Hotel Name */}
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-md px-3.5 py-2.5 md:hidden">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold text-primary truncate max-w-[200px]">
                {settings.hotelName}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleDark}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary border border-border text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {dark ? <Sun className="h-4 w-4 text-accent" /> : <Moon className="h-4 w-4 text-primary" />}
              </button>
              <Link
                to="/new-bill"
                className="btn-accent py-1 px-2.5 text-xs font-bold gap-1 rounded-full shadow-xs"
              >
                + Bill
              </Link>
            </div>
          </header>

          <main className="flex-1 px-3 py-3 md:px-8 md:py-6 pb-20 md:pb-8">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card/95 backdrop-blur-md pb-safe pt-1 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-1 flex-col items-center justify-center py-1.5 text-muted-foreground transition-colors"
              activeProps={{
                className: "text-primary font-bold",
              }}
              activeOptions={{ exact: item.to === "/" }}
            >
              <item.Icon className="h-4 w-4" />
              <span className="mt-1 text-[10px] tracking-wide">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </QueryClientProvider>
  );
}
