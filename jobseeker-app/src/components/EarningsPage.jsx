import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import BottomNav from "./BottomNav";
import Skeleton from "./Skeleton";

// Same hook as JobsNearYouPage — kept local for portability so each
// component can be dropped in independently. If you prefer DRY, move
// this into src/utils/useCountUp.js and import from both.
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

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const EarningsPage = () => {
  const navigate = useNavigate();
  const [paid, setPaid] = useState([]);
  const [opps, setOpps] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const appsRes = await apiClient.get("/match/applications/mine");
        const paidApps = appsRes.data.filter(
          (a) => a.status === "completed" || a.paid_at != null,
        );
        paidApps.sort((a, b) => {
          const at = a.paid_at || a.created_at;
          const bt = b.paid_at || b.created_at;
          return new Date(bt) - new Date(at);
        });
        setPaid(paidApps);

        const uniqueOppIds = [
          ...new Set(paidApps.map((a) => a.opportunity_id)),
        ];
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
      } catch (err) {
        console.error("Failed to load earnings:", err);
        setError("Could not load earnings.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const totalEarned = paid.reduce((sum, app) => {
    const opp = opps[app.opportunity_id];
    if (!opp) return sum;
    return sum + (opp.daily_pay || 0) * (opp.duration_days || 0);
  }, 0);

  // Only start counting up once everything has loaded — otherwise the
  // number animates twice (once on apps load, again when opps fill in)
  const animatedTotal = useCountUp(isLoading ? null : totalEarned, 1200);

  return (
    <div className="min-h-screen bg-surface-bg text-text-0 font-sans p-4 flex justify-center items-start">
      <div className="w-[318px] bg-surface-0 rounded-xl border border-border-dark overflow-hidden shadow-lg mt-10 relative pb-[60px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-light bg-surface-0">
          <div className="text-[18px] font-bold tracking-tight text-text-0">
            E<em className="text-brand not-italic">k</em>o
          </div>
          <div className="w-7 h-7 rounded-full bg-[#FEF3E0] text-[#7A4800] flex items-center justify-center text-[10px] font-bold">
            EO
          </div>
        </div>

        {/* Body */}
        <div className="p-4 min-h-[400px]">
          <h1 className="text-[19px] font-semibold text-text-0 mb-0.5 tracking-tight">
            Earnings
          </h1>
          <p className="text-xs text-text-2 mb-4">
            Paid via Squad to your linked account
          </p>

          {/* Total card with count-up */}
          <div className="bg-brand text-white rounded-md p-4 mb-4 relative overflow-hidden shadow-sm">
            <div className="text-[10px] font-mono tracking-wider opacity-80 mb-1">
              TOTAL EARNED
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 bg-white/20" />
            ) : (
              <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums">
                ₦{Math.round(animatedTotal).toLocaleString()}
              </div>
            )}
            <div className="text-[11px] opacity-80 mt-1.5">
              {isLoading
                ? "Loading..."
                : `${paid.length} ${paid.length === 1 ? "job" : "jobs"} completed`}
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-xs mb-4 p-2 rounded-sm border border-red-200 bg-red-50">
              {error}
            </div>
          )}

          <div className="text-[10px] text-text-3 font-mono tracking-wider uppercase mb-2">
            Recent payouts
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="border border-border-light rounded-md p-3 bg-surface-0 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <Skeleton className="h-3 w-2/3 mb-1.5" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : paid.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border-dark rounded-md">
              <div className="text-2xl mb-2 opacity-60">👛</div>
              <div className="text-sm text-text-2 mb-2">No earnings yet</div>
              <div className="text-[11px] text-text-3 mb-3 px-4">
                You'll see payouts here once a trader marks a job complete
              </div>
              <button
                onClick={() => navigate("/jobs")}
                className="text-[12px] text-brand font-medium underline hover:no-underline"
              >
                Find jobs to apply for
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {paid.map((app) => {
                const opp = opps[app.opportunity_id];
                const amount =
                  opp && opp.daily_pay && opp.duration_days
                    ? opp.daily_pay * opp.duration_days
                    : null;
                return (
                  <div
                    key={app.id}
                    className="border border-border-light rounded-md p-3 bg-surface-0 flex justify-between items-start gap-2 transition-all hover:border-border-dark"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-text-0 truncate">
                        {opp?.title || "Job"}
                      </div>
                      <div className="text-[10px] text-text-3 font-mono mt-0.5">
                        {formatDate(app.paid_at || app.created_at)}
                      </div>
                      {app.squad_payout_ref && (
                        <div className="text-[9px] text-text-3 font-mono mt-0.5 truncate">
                          Squad ref: {app.squad_payout_ref}
                        </div>
                      )}
                    </div>
                    <div className="text-[13px] font-bold text-brand-deep whitespace-nowrap tabular-nums">
                      +₦{amount != null ? amount.toLocaleString() : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <BottomNav active="earnings" />
      </div>
    </div>
  );
};

export default EarningsPage;
