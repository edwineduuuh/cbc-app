"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Upload,
  FileQuestion,
  ClipboardList,
  BarChart3,
  Users,
  Sparkles,
  LogOut,
} from "lucide-react";

// Superseded by the app sidebar (components/NavBar.js). Kept as a no-op so
// pages that still render <AdminNavigation /> need no change.
export default function AdminNavigation() {
  return null;
}
