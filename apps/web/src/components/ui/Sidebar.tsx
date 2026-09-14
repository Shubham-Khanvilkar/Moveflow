"use client";

import { useState } from "react";
import { useAuth } from "../admin/AuthContext";

export type PageId =
  | "dashboard" | "employees" | "drivers" | "vehicles" | "guards"
  | "bookings" | "trips" | "dispatch" | "gps-tracking" | "routes"
  | "no-show" | "expenses" | "billing" | "safety" | "incidents"
  | "analytics" | "ai-copilot" | "notifications" | "admin-roles"
  | "admin-access" | "org-sites" | "org-lobs" | "org-shifts"
  | "compliance" | "vendors" | "settings" | "audit" | "saas"
  | "control-room" | "finance" | "reports" | "support"
  | "feature-flags" | "driver-wallet" | "employee-self"
  | "platform-admin" | "pricing-rules" | "vehicle-types"
  | "business-analyst" | "cost-optimization" | "financial-analyst"
  | "command-center" | "savings-tracker"
  | "cxo-ceo" | "cxo-cfo" | "cxo-coo" | "cxo-chro" | "cxo-cio"
  | "booking-calendar" | "role-matrix" | "profile-editor"
  | "company-onboarding" | "location-change-requests"
  | "digital-twin" | "cost-leaks" | "vendor-truth" | "predictive-analytics" | "capacity-exchange"
  | "cxo-intelligence";

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

const iconMap: Record<string, string> = {
  LayoutDashboard: "📊",
  Users: "👤",
  Car: "🚗",
  Truck: "🚐",
  Calendar: "📅",
  Send: "📋",
  Radio: "🎛️",
  Map: "🗺️",
  Route: "🛤️",
  CheckCircle: "✅",
  UserX: "🚫",
  Handshake: "🤝",
  BarChart3: "📈",
  FileText: "📋",
  Building: "🏢",
  Settings: "⚙️",
  Home: "🏠",
  Plus: "➕",
  Bell: "🔔",
  Wallet: "💸",
  User: "👤",
  Clock: "🕐",
  Navigation: "🧭",
  AlertTriangle: "⚠️",
  AlertCircle: "🚨",
  Shield: "🛡️",
  Lock: "🔒",
  CreditCard: "💳",
  DollarSign: "💰",
  Building2: "🏗️",
  RefreshCw: "🔄",
  CheckSquare: "☑️",
};

function mapIconToEmoji(icon: string): string {
  return iconMap[icon] || "📌";
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, navigation } = useAuth();

  // Group navigation items by category based on role
  const navGroups = buildNavGroups(user?.activeRole || user?.role, navigation);

  return (
    <aside
      className={`bg-white border-r border-gray-200 min-h-[calc(100vh-57px)] sticky top-[57px] transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full p-3 text-gray-400 hover:text-gray-600 text-xs border-b border-gray-100"
      >
        {collapsed ? "→" : "← Collapse"}
      </button>
      <nav className="p-2 space-y-4 overflow-y-auto max-h-[calc(100vh-100px)]">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activePage === item.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span className="text-base flex-shrink-0">{mapIconToEmoji(item.icon)}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

interface NavGroup {
  label: string;
  items: { id: PageId; icon: string; label: string }[];
}

function buildNavGroups(role: string | undefined, navigation: any[] | undefined): NavGroup[] {
  if (!navigation || navigation.length === 0) {
    return getDefaultNavGroups(role);
  }

  // Map navigation items to PageIds
  const routeToPageId: Record<string, PageId> = {
    '/platform': 'platform-admin',
    '/platform/companies': 'platform-admin',
    '/platform/billing': 'saas',
    '/platform/security': 'admin-access',
    '/platform/audit': 'audit',
    '/transport/dashboard': 'dashboard',
    '/transport/employees': 'employees',
    '/transport/bookings': 'bookings',
    '/transport/dispatch': 'dispatch',
    '/transport/control-room': 'control-room',
    '/transport/trips': 'trips',
    '/transport/drivers': 'drivers',
    '/transport/vehicles': 'vehicles',
    '/transport/vehicle-types': 'vehicle-types',
    '/transport/routes': 'routes',
    '/transport/compliance': 'compliance',
    '/transport/no-show': 'no-show',
    '/transport/vendors': 'vendors',
    '/transport/reports': 'reports',
    '/transport/policies': 'settings',
    '/transport/organization': 'org-sites',
    '/transport/settings': 'settings',
    '/management/dashboard': 'dashboard',
    '/management/team': 'employees',
    '/management/transport': 'trips',
    '/management/approvals': 'bookings',
    '/management/reports': 'reports',
    '/employee/dashboard': 'employee-self',
    '/employee/transport': 'trips',
    '/employee/bookings': 'bookings',
    '/employee/book': 'bookings',
    '/employee/trips': 'trips',
    '/employee/notifications': 'notifications',
    '/employee/expenses': 'expenses',
    '/employee/profile': 'settings',
    '/driver/dashboard': 'dashboard',
    '/driver/availability': 'drivers',
    '/driver/trips': 'trips',
    '/driver/navigation': 'gps-tracking',
    '/driver/passengers': 'employees',
    '/driver/boarding': 'trips',
    '/driver/no-show': 'no-show',
    '/driver/breakdown': 'safety',
    '/driver/sos': 'safety',
    '/driver/notifications': 'notifications',
    '/driver/profile': 'profile-editor',
    '/vendor/dashboard': 'dashboard',
    '/vendor/drivers': 'drivers',
    '/vendor/vehicles': 'vehicles',
    '/vendor/trips': 'trips',
    '/vendor/invoices': 'billing',
    '/finance/dashboard': 'finance',
    '/finance/invoices': 'billing',
    '/finance/reconciliation': 'billing',
    '/finance/budget': 'finance',
    '/finance/reports': 'reports',
    '/security/dashboard': 'admin-access',
    '/security/events': 'admin-access',
    '/security/audit': 'audit',
    '/security/access': 'admin-access',
    '/auditor/dashboard': 'audit',
    '/auditor/audit': 'audit',
    '/auditor/compliance': 'compliance',
    '/auditor/reports': 'reports',
    '/analytics/business-analyst': 'business-analyst',
    '/analytics/cost-optimization': 'cost-optimization',
    '/analytics/financial': 'financial-analyst',
    '/analytics/savings': 'savings-tracker',
    '/analytics/command-center': 'command-center',
    '/analytics/cxo': 'cxo-ceo',
    '/transport/calendar': 'booking-calendar',
    '/admin/role-matrix': 'role-matrix',
    '/profile': 'profile-editor',
    '/platform/onboard': 'company-onboarding',
    '/platform/location-changes': 'location-change-requests',
  };

  const groups: NavGroup[] = [];
  const mainItems: { id: PageId; icon: string; label: string }[] = [];
  const adminItems: { id: PageId; icon: string; label: string }[] = [];

  for (const nav of navigation) {
    const pageId = routeToPageId[nav.route] || 'dashboard';
    const item = { id: pageId, icon: nav.icon, label: nav.label };

    if (nav.route.startsWith('/platform') || nav.route.startsWith('/security') || nav.route.startsWith('/auditor')) {
      adminItems.push(item);
    } else {
      mainItems.push(item);
    }
  }

  if (mainItems.length > 0) {
    groups.push({ label: 'Navigation', items: mainItems });
  }
  if (adminItems.length > 0) {
    groups.push({ label: 'Administration', items: adminItems });
  }

  return groups.length > 0 ? groups : getDefaultNavGroups(role);
}

function getDefaultNavGroups(role: string | undefined): NavGroup[] {
  const roleDefaults: Record<string, NavGroup[]> = {
    NAVIRA_PLATFORM_ADMINISTRATOR: [
      { label: 'Platform', items: [
        { id: 'platform-admin', icon: '🏗️', label: 'Platform Command Center' },
        { id: 'company-onboarding', icon: '🏢', label: 'Onboard Company' },
        { id: 'location-change-requests', icon: '📍', label: 'Location Requests' },
        { id: 'admin-access', icon: '🔒', label: 'Security' },
        { id: 'admin-roles', icon: '👥', label: 'Roles & Permissions' },
        { id: 'role-matrix', icon: '🔐', label: 'Permission Matrix' },
        { id: 'feature-flags', icon: '🚩', label: 'Feature Flags' },
        { id: 'audit', icon: '📝', label: 'Audit Log' },
        { id: 'profile-editor', icon: '👤', label: 'My Profile' },
      ]},
      { label: 'Intelligence', items: [
        { id: 'cxo-intelligence', icon: '📊', label: 'CXO Intelligence' },
        { id: 'digital-twin', icon: '🧬', label: 'Digital Twin' },
        { id: 'cost-leaks', icon: '💸', label: 'Cost Leak Detector' },
        { id: 'vendor-truth', icon: '🔍', label: 'Vendor Truth' },
        { id: 'predictive-analytics', icon: '🔮', label: 'Predictive Analytics' },
        { id: 'capacity-exchange', icon: '🔄', label: 'Capacity Exchange' },
      ]},
    ],
    COMPANY_ADMIN: [
      { label: 'Administration', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'employees', icon: '👤', label: 'Employees' },
        { id: 'trips', icon: '🗺️', label: 'Transport' },
        { id: 'reports', icon: '📈', label: 'Reports' },
        { id: 'settings', icon: '⚙️', label: 'Settings' },
      ]},
    ],
    TRANSPORT_ADMIN: [
      { label: 'Operations', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'employees', icon: '👤', label: 'Employees' },
        { id: 'bookings', icon: '📅', label: 'Bookings' },
        { id: 'booking-calendar', icon: '🗓️', label: 'Calendar View' },
        { id: 'dispatch', icon: '📋', label: 'Dispatch' },
        { id: 'control-room', icon: '🎛️', label: 'Live Status' },
        { id: 'trips', icon: '🗺️', label: 'Trips' },
        { id: 'drivers', icon: '🚗', label: 'Drivers' },
        { id: 'vehicles', icon: '🚐', label: 'Vehicles' },
        { id: 'vehicle-types', icon: '🚗', label: 'Vehicle Types' },
        { id: 'routes', icon: '🛤️', label: 'Routes' },
        { id: 'location-change-requests', icon: '📍', label: 'Location Requests' },
        { id: 'compliance', icon: '✅', label: 'Compliance' },
        { id: 'no-show', icon: '🚫', label: 'No-Show' },
        { id: 'vendors', icon: '🤝', label: 'Vendors' },
        { id: 'reports', icon: '📈', label: 'Reports' },
        { id: 'role-matrix', icon: '🔐', label: 'Permission Matrix' },
        { id: 'settings', icon: '⚙️', label: 'Settings' },
        { id: 'profile-editor', icon: '👤', label: 'My Profile' },
      ]},
      { label: 'Intelligence', items: [
        { id: 'cxo-intelligence', icon: '📊', label: 'CXO Intelligence' },
        { id: 'digital-twin', icon: '🧬', label: 'Digital Twin' },
        { id: 'cost-leaks', icon: '💸', label: 'Cost Leaks' },
        { id: 'vendor-truth', icon: '🔍', label: 'Vendor Truth' },
        { id: 'predictive-analytics', icon: '🔮', label: 'Predictions' },
        { id: 'capacity-exchange', icon: '🔄', label: 'Capacity Exchange' },
      ]},
    ],
    NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR: [
      { label: 'Finance', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'billing', icon: '💳', label: 'Billing' },
        { id: 'reports', icon: '📈', label: 'Reports' },
      ]},
    ],
    MANAGER: [
      { label: 'Management', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'employees', icon: '👤', label: 'Team' },
        { id: 'trips', icon: '🗺️', label: 'Transport' },
        { id: 'bookings', icon: '📅', label: 'Approvals' },
        { id: 'booking-calendar', icon: '🗓️', label: 'Calendar' },
        { id: 'reports', icon: '📈', label: 'Reports' },
        { id: 'profile-editor', icon: '👤', label: 'Profile' },
      ]},
    ],
    EMPLOYEE: [
      { label: 'My Transport', items: [
        { id: 'employee-self', icon: '🏠', label: 'Home' },
        { id: 'bookings', icon: '📅', label: 'My Bookings' },
        { id: 'booking-calendar', icon: '🗓️', label: 'Calendar' },
        { id: 'trips', icon: '🗺️', label: 'My Trips' },
        { id: 'expenses', icon: '💸', label: 'Expenses' },
        { id: 'notifications', icon: '🔔', label: 'Notifications' },
        { id: 'profile-editor', icon: '👤', label: 'Profile' },
      ]},
    ],
    DRIVER: [
      { label: 'Driver', items: [
        { id: 'dashboard', icon: '🏠', label: 'Home' },
        { id: 'trips', icon: '🗺️', label: "Today's Trips" },
        { id: 'gps-tracking', icon: '🧭', label: 'Navigation' },
        { id: 'no-show', icon: '🚫', label: 'No-Show' },
        { id: 'safety', icon: '🚨', label: 'SOS' },
        { id: 'notifications', icon: '🔔', label: 'Notifications' },
        { id: 'settings', icon: '⚙️', label: 'Profile' },
      ]},
    ],
    VENDOR_ADMIN: [
      { label: 'Vendor', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'drivers', icon: '🚗', label: 'Drivers' },
        { id: 'vehicles', icon: '🚐', label: 'Vehicles' },
        { id: 'trips', icon: '🗺️', label: 'Trips' },
        { id: 'reports', icon: '📈', label: 'Reports' },
      ]},
    ],
    GUARD: [
      { label: 'Guard', items: [
        { id: 'dashboard', icon: '🏠', label: 'Home' },
        { id: 'trips', icon: '🗺️', label: 'Active Trips' },
        { id: 'safety', icon: '🚨', label: 'SOS' },
        { id: 'notifications', icon: '🔔', label: 'Notifications' },
      ]},
    ],
    NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR: [
      { label: 'Security', items: [
        { id: 'admin-access', icon: '🔒', label: 'Security Dashboard' },
        { id: 'audit', icon: '📝', label: 'Audit Log' },
        { id: 'incidents', icon: '🚨', label: 'Incidents' },
      ]},
    ],
    NAVIRA_PLATFORM_AUDITOR: [
      { label: 'Audit & Compliance', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'audit', icon: '📝', label: 'Audit Log' },
        { id: 'compliance', icon: '✅', label: 'Compliance' },
        { id: 'reports', icon: '📈', label: 'Reports' },
      ]},
    ],
    BUSINESS_ANALYST: [
      { label: 'Analytics', items: [
        { id: 'business-analyst', icon: '📊', label: 'Business Analytics' },
        { id: 'cost-optimization', icon: '💰', label: 'Cost Optimization' },
        { id: 'savings-tracker', icon: '🎯', label: 'Savings Tracker' },
        { id: 'reports', icon: '📈', label: 'Reports' },
        { id: 'settings', icon: '⚙️', label: 'Profile' },
      ]},
    ],
    COST_OPTIMIZATION_ANALYST: [
      { label: 'Optimization', items: [
        { id: 'cost-optimization', icon: '💰', label: 'Cost Optimization' },
        { id: 'savings-tracker', icon: '🎯', label: 'Savings Tracker' },
        { id: 'business-analyst', icon: '📊', label: 'Analytics' },
        { id: 'reports', icon: '📈', label: 'Reports' },
      ]},
    ],
    FINANCIAL_ANALYST: [
      { label: 'Finance', items: [
        { id: 'financial-analyst', icon: '💰', label: 'Financial Analytics' },
        { id: 'billing', icon: '💳', label: 'Billing' },
        { id: 'savings-tracker', icon: '🎯', label: 'Savings Tracker' },
        { id: 'reports', icon: '📈', label: 'Reports' },
        { id: 'settings', icon: '⚙️', label: 'Profile' },
      ]},
    ],
    INTERNAL_FINANCE: [
      { label: 'Finance', items: [
        { id: 'financial-analyst', icon: '💰', label: 'Financial Analytics' },
        { id: 'billing', icon: '💳', label: 'Billing' },
        { id: 'finance', icon: '📊', label: 'Finance Dashboard' },
        { id: 'savings-tracker', icon: '🎯', label: 'Savings Tracker' },
        { id: 'reports', icon: '📈', label: 'Reports' },
        { id: 'settings', icon: '⚙️', label: 'Profile' },
      ]},
    ],
    ROUTE_OPTIMIZATION_ANALYST: [
      { label: 'Route Optimization', items: [
        { id: 'routes', icon: '🛤️', label: 'Routes' },
        { id: 'cost-optimization', icon: '💰', label: 'Cost Optimization' },
        { id: 'gps-tracking', icon: '🗺️', label: 'Live Map' },
        { id: 'reports', icon: '📈', label: 'Reports' },
      ]},
    ],
    DATA_ANALYST: [
      { label: 'Analytics', items: [
        { id: 'analytics', icon: '📊', label: 'Analytics' },
        { id: 'business-analyst', icon: '📈', label: 'Business Analytics' },
        { id: 'reports', icon: '📋', label: 'Reports' },
        { id: 'settings', icon: '⚙️', label: 'Profile' },
      ]},
    ],
    MIS_ANALYST: [
      { label: 'MIS & Reports', items: [
        { id: 'reports', icon: '📈', label: 'Reports' },
        { id: 'analytics', icon: '📊', label: 'Analytics' },
        { id: 'settings', icon: '⚙️', label: 'Profile' },
      ]},
    ],
    WORKFORCE_ANALYST: [
      { label: 'Workforce Analytics', items: [
        { id: 'business-analyst', icon: '📊', label: 'Business Analytics' },
        { id: 'employees', icon: '👤', label: 'Employees' },
        { id: 'trips', icon: '🗺️', label: 'Trips' },
        { id: 'reports', icon: '📈', label: 'Reports' },
        { id: 'settings', icon: '⚙️', label: 'Profile' },
      ]},
    ],
    INTERNAL_OWNER: [
      { label: 'Enterprise', items: [
        { id: 'command-center', icon: '🏢', label: 'Command Center' },
        { id: 'platform-admin', icon: '🏗️', label: 'Platform Admin' },
        { id: 'business-analyst', icon: '📊', label: 'Business Analytics' },
        { id: 'financial-analyst', icon: '💰', label: 'Financial Analytics' },
        { id: 'savings-tracker', icon: '🎯', label: 'Savings Tracker' },
        { id: 'admin-access', icon: '🔒', label: 'Security' },
        { id: 'audit', icon: '📝', label: 'Audit Log' },
        { id: 'settings', icon: '⚙️', label: 'Settings' },
      ]},
    ],
    CEO: [
      { label: 'Executive', items: [
        { id: 'cxo-ceo', icon: '👔', label: 'CEO Dashboard' },
        { id: 'command-center', icon: '🏢', label: 'Command Center' },
        { id: 'reports', icon: '📈', label: 'Reports' },
      ]},
    ],
    CFO: [
      { label: 'Executive', items: [
        { id: 'cxo-cfo', icon: '💰', label: 'CFO Dashboard' },
        { id: 'financial-analyst', icon: '📊', label: 'Financial Analytics' },
        { id: 'billing', icon: '💳', label: 'Billing' },
        { id: 'savings-tracker', icon: '🎯', label: 'Savings Tracker' },
        { id: 'reports', icon: '📈', label: 'Reports' },
      ]},
    ],
    COO: [
      { label: 'Executive', items: [
        { id: 'cxo-coo', icon: '⚙️', label: 'COO Dashboard' },
        { id: 'command-center', icon: '🏢', label: 'Command Center' },
        { id: 'control-room', icon: '🎛️', label: 'Live Status' },
        { id: 'reports', icon: '📈', label: 'Reports' },
      ]},
    ],
    CHRO: [
      { label: 'Executive', items: [
        { id: 'cxo-chro', icon: '👥', label: 'CHRO Dashboard' },
        { id: 'employees', icon: '👤', label: 'Employees' },
        { id: 'reports', icon: '📈', label: 'Reports' },
      ]},
    ],
    CIO: [
      { label: 'Executive', items: [
        { id: 'cxo-cio', icon: '🖥️', label: 'CIO Dashboard' },
        { id: 'admin-access', icon: '🔒', label: 'Security' },
        { id: 'audit', icon: '📝', label: 'Audit Log' },
        { id: 'settings', icon: '⚙️', label: 'Settings' },
      ]},
    ],
  };

  return roleDefaults[role || ''] || roleDefaults.EMPLOYEE;
}
