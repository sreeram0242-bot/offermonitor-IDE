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

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "◐" },
  { to: "/revenue", label: "Revenue", icon: "₹" },
  { to: "/new-bill", label: "New Bill", icon: "＋" },
  { to: "/customers", label: "Customers", icon: "◇" },
  { to: "/menu", label: "Menu", icon: "☰" },
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

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const settings = useSettings();
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-6 py-5">
        <div className="font-display text-xl leading-tight text-primary">{settings.hotelName}</div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-accent">
          Loyalty Tracker
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            activeProps={{
              className: "bg-primary text-primary-foreground hover:bg-primary",
            }}
            activeOptions={{ exact: item.to === "/" }}
          >
            <span className="text-base opacity-70">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border px-6 py-4 text-[11px] leading-relaxed text-muted-foreground">
        <div className="font-medium text-foreground">Contact</div>
        <div className="mt-1">9025898839</div>
        <div>8438260344</div>
        <div className="mt-2">80 feet road, opp. BOB Bank, Karur</div>
      </div>
    </aside>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const settings = useSettings();

  useEffect(() => {
    document.title = `${settings.hotelName} — Loyalty Tracker`;
    
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
          <Sidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 flex items-center justify-center border-b border-border bg-card px-4 py-3 md:hidden">
            <div className="font-display text-lg text-primary">{settings.hotelName}</div>
          </header>

          <main className="flex-1 px-3 py-4 md:px-8 md:py-8 pb-20 md:pb-8">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card pb-safe pt-1 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-1 flex-col items-center justify-center py-2 text-muted-foreground transition-colors"
              activeProps={{
                className: "text-primary",
              }}
              activeOptions={{ exact: item.to === "/" }}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="mt-1 text-[10px] font-medium tracking-wide">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </QueryClientProvider>
  );
}
