import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { LayoutDashboard, UserPlus, Camera, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/register", icon: UserPlus, label: "Register User" },
  { to: "/attendance", icon: Camera, label: "Mark Attendance" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-black tracking-tight" data-testid="app-title">ATTENDANCE</h1>
        <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase mt-1">monitoring system</p>
      </div>
      <nav className="flex-1 p-3 space-y-1" data-testid="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
            data-testid={`nav-${label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate max-w-[140px]" data-testid="user-email">
            {user?.email}
          </span>
          <ThemeToggle />
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
          data-testid="logout-btn"
        >
          <LogOut size={16} />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col" data-testid="sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} data-testid="mobile-menu-btn">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          <h1 className="text-sm font-black tracking-tight">ATTENDANCE</h1>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-6 md:p-8 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
