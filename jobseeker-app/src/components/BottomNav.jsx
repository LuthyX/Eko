import React from "react";
import { useNavigate } from "react-router-dom";

const tabs = [
  { id: "home", label: "Home", icon: "🏠", path: "/home" },
  { id: "jobs", label: "Jobs", icon: "💼", path: "/jobs" },
  { id: "applications", label: "Apps", icon: "📋", path: "/profile" },
  { id: "earnings", label: "Earnings", icon: "👛", path: "/earnings" },
];

const BottomNav = ({ active }) => {
  const navigate = useNavigate();

  return (
    <div className="absolute bottom-0 left-0 w-full flex border-t border-border-light bg-surface-0 pt-2 pb-1.5">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <div
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`flex-1 flex flex-col items-center gap-1 text-[9px] font-medium tracking-wide cursor-pointer transition-colors ${
              isActive ? "text-brand" : "text-text-3 hover:text-text-2"
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </div>
        );
      })}
    </div>
  );
};

export default BottomNav;
