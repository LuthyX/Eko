import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import BottomNav from "./BottomNav";
import { SkeletonCard } from "./Skeleton";

const STATUS_LABELS = {
  suggested: {
    label: "Pending review",
    color: "bg-surface-1 text-text-2 border-border-light",
  },
  accepted: {
    label: "Accepted",
    color: "bg-brand-light text-brand-deep border-brand-muted",
  },
  rejected: {
    label: "Not selected",
    color: "bg-red-50 text-red-600 border-red-200",
  },
  completed: {
    label: "Paid",
    color: "bg-brand-light text-brand-deep border-brand-muted font-bold",
  },
};

const MyApplications = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [opps, setOpps] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const appsRes = await apiClient.get("/match/applications/mine");
        const myApps = appsRes.data;
        setApps(myApps);

        const uniqueOppIds = [...new Set(myApps.map((a) => a.opportunity_id))];
        const oppPromises = uniqueOppIds.map((id) =>
          apiClient
            .get(`/match/opportunities/${id}`)
            .then((r) => [id, r.data])
            .catch((err) => {
              console.warn(`Could not load opportunity ${id}:`, err);
              return [id, null];
            }),
        );
        const oppResults = await Promise.all(oppPromises);
        const oppMap = Object.fromEntries(
          oppResults.filter(([_, v]) => v !== null),
        );
        setOpps(oppMap);
      } catch (err) {
        console.error("Failed to load applications:", err);
        setError("Could not load applications.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

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
            My applications
          </h1>
          <p className="text-xs text-text-2 mb-4">
            Track the jobs you've applied for
          </p>

          {error && (
            <div className="text-red-500 text-xs mb-4 p-2 rounded-sm border border-red-200 bg-red-50">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col gap-2.5">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-dark rounded-md">
              <div className="text-2xl mb-2 opacity-60">📋</div>
              <div className="text-sm text-text-2 mb-2">
                No applications yet
              </div>
              <button
                onClick={() => navigate("/jobs")}
                className="text-[12px] text-brand font-medium underline hover:no-underline"
              >
                Browse jobs
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {apps.map((app) => {
                const opp = opps[app.opportunity_id];
                const statusInfo = STATUS_LABELS[app.status] || {
                  label: app.status,
                  color: "bg-surface-1 text-text-2 border-border-light",
                };
                const totalPay =
                  opp && opp.daily_pay && opp.duration_days
                    ? opp.daily_pay * opp.duration_days
                    : null;

                return (
                  <div
                    key={app.id}
                    className="border border-border-light rounded-md p-3.5 bg-surface-0 transition-all hover:border-border-dark"
                  >
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-text-0">
                          {opp?.title || "Loading…"}
                        </div>
                        {opp?.location && (
                          <div className="text-[11px] text-text-3 font-mono mt-0.5">
                            📍 {opp.location}
                          </div>
                        )}
                      </div>
                      {app.match_score != null && (
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full font-mono tracking-wide bg-brand-muted text-brand-deep whitespace-nowrap tabular-nums">
                          {Math.round(app.match_score)}%
                        </span>
                      )}
                    </div>

                    {app.match_reasoning && (
                      <div className="text-[11px] text-text-2 leading-relaxed mb-2.5 italic">
                        "{app.match_reasoning}"
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border tracking-wider ${statusInfo.color}`}
                      >
                        {statusInfo.label.toUpperCase()}
                      </span>
                      {totalPay && (
                        <span className="text-[11px] text-text-2 font-mono tabular-nums">
                          ₦{totalPay.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <BottomNav active="applications" />
      </div>
    </div>
  );
};

export default MyApplications;
