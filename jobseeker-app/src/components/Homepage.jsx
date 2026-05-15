import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient, { logout } from "../api/client";
import BottomNav from "./BottomNav";
import Skeleton from "./Skeleton";

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target == null) {
      setValue(0);
      return;
    }
    setValue(0);
    let raf;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

const greetingFor = (hour) => {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const statusLabel = (status) => {
  switch (status) {
    case "completed":
      return "Paid";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Not selected";
    default:
      return "Pending review";
  }
};

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [apps, setApps] = useState([]);
  const [opps, setOpps] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        // /wallet/me is the source of truth for earnings — use balance_naira
        // directly instead of joining applications with opportunities and
        // summing the daily_pay × duration math like we did before.
        const [meRes, walletRes, appsRes] = await Promise.all([
          apiClient.get("/auth/me"),
          apiClient.get("/wallet/me").catch(() => ({ data: null })),
          apiClient.get("/match/applications/mine"),
        ]);
        setUser(meRes.data);
        setWallet(walletRes.data);
        setApps(appsRes.data);

        // Still need opp details for the Recent activity titles —
        // MatchResponse doesn't denormalise the opportunity fields.
        const uniqueOppIds = [
          ...new Set(appsRes.data.map((a) => a.opportunity_id)),
        ];
        if (uniqueOppIds.length > 0) {
          const oppPromises = uniqueOppIds.map((id) =>
            apiClient
              .get(`/match/opportunities/${id}`)
              .then((r) => [id, r.data])
              .catch(() => [id, null]),
          );
          const oppResults = await Promise.all(oppPromises);
          const oppMap = Object.fromEntries(
            oppResults.filter(([_, v]) => v !== null),
          );
          setOpps(oppMap);
        }
      } catch (err) {
        console.error("Failed to load home:", err);
        // 401 is handled globally by the client interceptor — only surface
        // genuine failures here.
        if (err.response?.status !== 401) {
          setError("Could not load your dashboard.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const paid = apps.filter(
    (a) => a.status === "completed" || a.paid_at != null,
  );
  const accepted = apps.filter((a) => a.status === "accepted");
  const pending = apps.filter((a) => a.status === "suggested");

  // Wallet balance is the source of truth — falls back to 0 if wallet
  // hasn't loaded (e.g. backend down). The count-up only starts once
  // loading is done so it doesn't restart partway through.
  const totalEarned = wallet?.balance_naira || 0;
  const animatedEarned = useCountUp(isLoading ? null : totalEarned, 1200);

  const bestMatchScore =
    apps.length > 0 ? Math.max(...apps.map((a) => a.match_score ?? 0)) : null;

  const recentApps = [...apps]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  const firstName = user?.full_name?.split(" ")[0] || "there";
  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((s) => s[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "EO";
  const greeting = greetingFor(new Date().getHours());

  return (
    <div className="min-h-screen bg-surface-bg text-text-0 font-sans p-4 flex justify-center items-start">
      <div className="w-[318px] bg-surface-0 rounded-xl border border-border-dark overflow-hidden shadow-lg mt-10 relative pb-[60px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-light bg-surface-0">
          <div className="text-[18px] font-bold tracking-tight text-text-0">
            E<em className="text-brand not-italic">k</em>o
          </div>
          <div
            onClick={logout}
            title="Sign out"
            className="w-7 h-7 rounded-full bg-[#FEF3E0] text-[#7A4800] flex items-center justify-center text-[10px] font-bold cursor-pointer hover:ring-2 hover:ring-brand-muted transition-all"
          >
            {initials}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 min-h-[400px]">
          {/* Greeting */}
          <div className="mb-4">
            <div className="text-[10px] text-text-3 font-mono tracking-wider uppercase mb-1">
              {greeting}
            </div>
            <h1 className="text-[22px] font-semibold text-text-0 tracking-tight">
              {isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                <>
                  {firstName} <span className="font-normal">👋</span>
                </>
              )}
            </h1>
          </div>

          {/* Hero earnings card — sourced from wallet.balance_naira */}
          <div className="bg-brand text-white rounded-md p-4 mb-3 relative overflow-hidden shadow-sm">
            <div className="text-[10px] font-mono tracking-wider opacity-80 mb-1">
              EARNED ON EKO
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 bg-white/20" />
            ) : (
              <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums">
                ₦{Math.round(animatedEarned).toLocaleString()}
              </div>
            )}
            <div className="text-[11px] opacity-80 mt-1.5">
              {paid.length} {paid.length === 1 ? "job" : "jobs"} completed
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <StatCard
              label="In progress"
              value={isLoading ? null : accepted.length}
              loading={isLoading}
            />
            <StatCard
              label="Pending"
              value={isLoading ? null : pending.length}
              loading={isLoading}
            />
            <StatCard
              label="Completed"
              value={isLoading ? null : paid.length}
              loading={isLoading}
            />
            <StatCard
              label="Best match"
              value={
                isLoading
                  ? null
                  : bestMatchScore != null && bestMatchScore > 0
                    ? `${Math.round(bestMatchScore)}%`
                    : "—"
              }
              loading={isLoading}
            />
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate("/jobs")}
            className="w-full bg-brand text-white rounded-sm py-3 text-[13px] font-semibold tracking-tight mb-4 transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Browse new jobs →
          </button>

          {error && (
            <div className="text-red-500 text-xs mb-3 p-2 rounded-sm border border-red-200 bg-red-50">
              {error}
            </div>
          )}

          {/* Recent activity */}
          <div className="text-[10px] text-text-3 font-mono tracking-wider uppercase mb-2">
            Recent activity
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentApps.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border-dark rounded-md">
              <div className="text-[11px] text-text-3 px-4">
                No activity yet. Apply to a job to get started.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentApps.map((app) => {
                const opp = opps[app.opportunity_id];
                return (
                  <div
                    key={app.id}
                    onClick={() => navigate("/profile")}
                    className="border border-border-light rounded-md p-2.5 bg-surface-0 flex justify-between items-center gap-2 cursor-pointer transition-all hover:border-border-dark"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-text-0 truncate">
                        {opp?.title || "Job"}
                      </div>
                      <div className="text-[10px] text-text-3 mt-0.5">
                        {statusLabel(app.status)}
                      </div>
                    </div>
                    {app.match_score != null && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono bg-brand-muted text-brand-deep whitespace-nowrap tabular-nums">
                        {Math.round(app.match_score)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sign out */}
          <div className="mt-6 pt-4 border-t border-border-light text-center">
            <button
              onClick={logout}
              className="text-[11px] text-text-3 font-medium hover:text-text-2 transition-colors"
            >
              Sign out
            </button>
            {user?.email && (
              <div className="text-[10px] text-text-3 mt-1 font-mono">
                {user.email}
              </div>
            )}
          </div>
        </div>

        <BottomNav active="home" />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, loading }) => (
  <div className="border border-border-light rounded-md p-3 bg-surface-0">
    <div className="text-[9px] text-text-3 font-mono tracking-wider uppercase mb-1">
      {label}
    </div>
    {loading ? (
      <Skeleton className="h-5 w-8" />
    ) : (
      <div className="text-[20px] font-semibold text-text-0 tabular-nums">
        {value}
      </div>
    )}
  </div>
);

export default HomePage;
