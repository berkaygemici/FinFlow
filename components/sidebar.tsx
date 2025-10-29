"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  TrendingUp,
  PieChart,
  Upload,
  Settings,
  Moon,
  Sun,
  Wallet,
  Target,
  TrendingDown,
  ArrowUpCircle,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Upload", href: "/dashboard/upload", icon: Upload },
  { name: "Income", href: "/dashboard/income", icon: ArrowUpCircle },
  { name: "Expenses", href: "/dashboard/expenses", icon: TrendingDown },
  { name: "Trends", href: "/dashboard/trends", icon: TrendingUp },
  { name: "Categories", href: "/dashboard/categories", icon: PieChart },
  { name: "Budgets", href: "/dashboard/budgets", icon: Target },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="flex flex-col w-64 min-h-screen border-r bg-card"
    >
      <div className="flex items-center gap-2 p-6 border-b">
        <Wallet className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Finance</h1>
          <p className="text-xs text-muted-foreground">Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute right-2 w-1 h-8 bg-primary-foreground rounded-full"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full"
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-4 h-4 mr-2" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 mr-2" />
              Dark Mode
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
}
