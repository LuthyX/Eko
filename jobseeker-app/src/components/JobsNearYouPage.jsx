import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import BottomNav from "./BottomNav";
import { SkeletonCard } from "./Skeleton";

// Animates a number from 0 → target on mount or whenever target changes.
// Eases out with a cubic curve so it slows down at the end (feels natural).
function useCountUp(target, duration = 800) {
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

const JobsNearYouPage = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applyingTo, setApplyingTo] = useState(null);
  const [error, setError] = useState(null);

  const [lastApplyResult, setLastApplyResult] = useState(null);
  // Two-step state so the banner animates IN rather than just appearing
  const [bannerVisible, setBannerVisible] = useState(false);

  // Drives the count-up animation on the score badge in the success banner
  const animatedScore = useCountUp(lastApplyResult?.match_score, 800);

  useEffect(() => {
    if (lastApplyResult) {
      // Defer one frame so the initial off-screen state can paint before
      // we transition into the visible state — without this the browser
      // batches both states and the transition is skipped.
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setBannerVisible(true));
      });
      return () => cancelAnimationFrame(id);
    } else {
      setBannerVisible(false);
    }
  }, [lastApplyResult]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await apiClient.get("/match/opportunities");
        setJobs(response.data);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
        setError("Could not load jobs. Is the backend running?");
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const handleApply = async (jobId) => {
    setApplyingTo(jobId);
    setError(null);
    try {
      const response = await apiClient.post(
        `/match/opportunities/${jobId}/apply`,
      );
      setLastApplyResult(response.data);

      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                already_applied: true,
                my_match_score: response.data.match_score,
              }
            : j,
        ),
      );
    } catch (err) {
      console.error("Failed to apply:", err);
      setError(err.response?.data?.detail || "Could not submit application.");
    } finally {
      setApplyingTo(null);
    }
  };

  const dismissBanner = () => {
    setBannerVisible(false);
    // Wait for the fade-out transition to finish before unmounting
    setTimeout(() => setLastApplyResult(null), 250);
  };

  return (
    <div className="min-h-screen bg-surface-bg text-text-0 font-sans p-4 flex justify-center items-start">
      <div className="w-[318px] bg-surface-0 rounded-xl border border-border-dark overflow-hidden shadow-lg mt-10 relative pb-[60px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-light bg-surface-0">
          <div className="text-[18px] font-bold tracking-tight text-text-0">
            E<em className="text-brand not-italic">k</em>o
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg text-text-2 cursor-pointer">⚙</span>
            <div className="w-7 h-7 rounded-full bg-[#FEF3E0] text-[#7A4800] flex items-center justify-center text-[10px] font-bold">
              EO
            </div>
          </div>
        </div>

        {/* Apply success banner — fades + slides in from above */}
        {lastApplyResult && (
          <div
            className={`mx-4 mt-4 p-3 bg-brand-light border border-brand-muted rounded-md transition-all duration-300 ease-out ${
              bannerVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2"
            }`}
          >
            <div className="flex justify-between items-start mb-1.5">
              <div className="text-[13px] font-semibold text-brand-deep">
                Application sent
              </div>
              {lastApplyResult.match_score != null && (
                <span className="text-[12px] font-bold text-brand-deep font-mono tabular-nums">
                  {Math.round(animatedScore)}% match
                </span>
              )}
            </div>
            {lastApplyResult.match_reasoning && (
              <div className="text-[11px] text-text-2 leading-snug mb-2 italic">
                "{lastApplyResult.match_reasoning}"
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate("/profile")}
                className="text-[11px] font-semibold text-brand-deep underline hover:no-underline"
              >
                View my applications
              </button>
              <button
                onClick={dismissBanner}
                className="text-[10px] text-text-3 hover:text-text-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-4 min-h-[400px]">
          <h1 className="text-[19px] font-semibold text-text-0 mb-0.5 tracking-tight">
            Jobs near you
          </h1>
          <p className="text-xs text-text-2 mb-4">
            Matched to your skills · Surulere, Lagos
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
              <SkeletonCard />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-dark rounded-md">
              <div className="text-2xl mb-2 opacity-60">🔍</div>
              <div className="text-sm text-text-2 mb-1">No jobs yet</div>
              <div className="text-[11px] text-text-3 px-4">
                Check back soon — new opportunities post throughout the day
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {jobs.map((job) => {
                const score = job.my_match_score;
                const isBestFit = score != null && score >= 85;

                return (
                  <div
                    key={job.id}
                    className={`border rounded-md p-3.5 bg-surface-0 transition-all ${
                      isBestFit
                        ? "border-brand-muted bg-[#FAFFFC] shadow-sm"
                        : "border-border-light hover:border-border-dark"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-text-0">
                          {job.title}
                        </div>
                        <div className="text-[11px] text-text-3 font-mono mt-0.5">
                          📍 {job.location}
                        </div>
                        {job.trader_business_name && (
                          <div className="text-[10px] text-text-3 mt-0.5">
                            {job.trader_business_name}
                          </div>
                        )}
                      </div>
                      {isBestFit && (
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full font-mono tracking-wide bg-brand-muted text-brand-deep whitespace-nowrap">
                          {Math.round(score)}% MATCH
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {job.skills_required?.map((skill, idx) => (
                        <span
                          key={`skill-${idx}`}
                          className="text-[10px] text-text-2 bg-surface-1 rounded-full px-2 py-0.5 font-mono"
                        >
                          {skill}
                        </span>
                      ))}
                      <span className="text-[10px] text-text-2 bg-surface-1 rounded-full px-2 py-0.5 font-mono">
                        ₦{job.daily_pay?.toLocaleString()}/day
                      </span>
                      {job.duration_days > 1 && (
                        <span className="text-[10px] text-text-2 bg-surface-1 rounded-full px-2 py-0.5 font-mono">
                          {job.duration_days} days
                        </span>
                      )}
                    </div>

                    {job.description && (
                      <div className="text-[11px] text-text-2 mb-2.5 leading-relaxed">
                        {job.description}
                      </div>
                    )}

                    {job.already_applied ? (
                      <button
                        disabled
                        className="w-full bg-surface-1 text-text-2 border border-border-light rounded-sm py-2.5 text-[13px] font-semibold cursor-default"
                      >
                        Application sent ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApply(job.id)}
                        disabled={applyingTo === job.id}
                        className="w-full bg-brand text-white border-none rounded-sm py-2.5 text-[13px] font-semibold cursor-pointer transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                      >
                        {applyingTo === job.id ? "Applying..." : "Apply now"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <BottomNav active="jobs" />
      </div>
    </div>
  );
};

export default JobsNearYouPage;
