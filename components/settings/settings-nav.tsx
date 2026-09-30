import type { SettingsTab } from "@/lib/settings/types";
import { User, Lock, Bell, Building2 } from "lucide-react";

interface SettingsNavProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  isAdmin: boolean;
}

export function SettingsNav({
  activeTab,
  onTabChange,
  isAdmin,
}: SettingsNavProps) {
  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security & Account", icon: Lock },
    { id: "preferences", label: "Preferences", icon: Bell },
  ];

  if (isAdmin) {
    tabs.push({ id: "club", label: "Club Configuration", icon: Building2 });
  }

  return (
    <nav className="flex flex-wrap gap-2 border-b pb-2" aria-label="Settings Tabs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
