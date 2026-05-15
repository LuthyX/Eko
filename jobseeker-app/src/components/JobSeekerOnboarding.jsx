import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";

const availableLanguages = ["Yoruba", "English", "Igbo", "Pidgin", "Hausa"];
const availableSkills = [
  "Market sales",
  "Carrying",
  "Shop keeping",
  "Customer service",
  "Delivery",
  "Inventory",
];

const JobSeekerOnboarding = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  const [formData, setFormData] = useState({
    location: "Surulere, Lagos",
    languages: ["Yoruba", "English"],
    skills: ["Market sales", "Carrying", "Customer service"],
    daily_rate_expectation: "4000",
  });

  useEffect(() => {
    apiClient
      .get("/auth/onboard/job-seeker/me")
      .then(() => {
        // Profile already exists — go straight to the home dashboard
        navigate("/home", { replace: true });
      })
      .catch(() => {
        setIsChecking(false);
      });
  }, [navigate]);

  const toggleArrayItem = (field, item) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((i) => i !== item)
        : [...prev[field], item],
    }));
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      ...formData,
      daily_rate_expectation: formData.daily_rate_expectation
        ? parseInt(formData.daily_rate_expectation, 10)
        : null,
    };

    try {
      await apiClient.post("/auth/onboard/job-seeker", payload);
      navigate("/home");
    } catch (err) {
      console.error("Onboarding failed:", err);
      if (err.response?.status === 409) {
        navigate("/home");
        return;
      }
      // 5xx fallback: the backend may have committed the profile before
      // crashing in a downstream step (e.g. wallet provisioning hitting
      // Squad with no creds). Re-check via GET and proceed if it exists.
      if (err.response?.status >= 500) {
        try {
          await apiClient.get("/auth/onboard/job-seeker/me");
          navigate("/home");
          return;
        } catch {
          // Profile really doesn't exist — fall through to error display
        }
      }
      setError(
        err.response?.data?.detail ||
          "Failed to save profile. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-surface-bg flex items-center justify-center">
        <div className="text-text-3 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-bg text-text-0 font-sans p-4 flex justify-center items-start">
      <div className="w-[318px] bg-surface-0 rounded-xl border border-border-dark overflow-hidden shadow-lg">
        {/* Navigation */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-light bg-surface-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-0">
              Your profile
            </span>
          </div>
          <span className="text-[11px] text-text-3 font-mono">Step 2 of 2</span>
        </div>

        {/* Body */}
        <div className="p-5">
          <h1 className="text-[19px] font-semibold text-text-0 mb-1 tracking-tight">
            Skills & details
          </h1>
          <p className="text-xs text-text-2 mb-4">
            Help us match you to the right jobs
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-[11px] p-2 rounded-sm border border-red-200 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Location */}
            <div>
              <label className="block text-[10px] text-text-3 font-mono mb-1 tracking-wider uppercase">
                Location (LGA)
              </label>
              <div className="border border-border-dark rounded-sm px-3 py-2 text-[13px] bg-surface-1 flex justify-between items-center transition-colors focus-within:border-brand">
                <input
                  type="text"
                  className="bg-transparent outline-none w-full"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
                <span className="text-sm">📍</span>
              </div>
            </div>

            {/* Languages */}
            <div>
              <label className="block text-[10px] text-text-3 font-mono mb-1 tracking-wider uppercase">
                Languages
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableLanguages.map((lang) => {
                  const isActive = formData.languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleArrayItem("languages", lang)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        isActive
                          ? "bg-brand-light text-brand-deep border-brand-muted font-medium"
                          : "bg-surface-1 text-text-2 border-border-light"
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-[10px] text-text-3 font-mono mb-1 tracking-wider uppercase">
                Skills
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableSkills.map((skill) => {
                  const isActive = formData.skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleArrayItem("skills", skill)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        isActive
                          ? "bg-brand-light text-brand-deep border-brand-muted font-medium"
                          : "bg-surface-1 text-text-2 border-border-light"
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rate Expectation */}
            <div>
              <label className="block text-[10px] text-text-3 font-mono mb-1 tracking-wider uppercase">
                Daily Rate Expectation (₦)
              </label>
              <div className="border border-border-dark rounded-sm px-3 py-2 text-[13px] bg-surface-1 transition-colors focus-within:border-brand">
                <input
                  type="number"
                  className="bg-transparent outline-none w-full"
                  placeholder="e.g. 4000"
                  value={formData.daily_rate_expectation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      daily_rate_expectation: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="h-px bg-border-light my-3"></div>

            {/* Steps Visualizer */}
            <div className="ml-1.5 mb-4">
              <div className="border-l-2 border-brand-muted pl-3.5 pb-3.5 relative">
                <div className="w-3 h-3 rounded-full bg-brand absolute -left-[7px] top-0"></div>
                <div className="text-xs font-semibold text-text-0 mb-0.5 leading-none">
                  Account created
                </div>
                <div className="text-[11px] text-text-2 leading-none">
                  You're signed in
                </div>
              </div>
              <div className="pl-3.5 relative">
                <div className="w-3 h-3 rounded-full bg-brand absolute -left-[7px] top-0"></div>
                <div className="text-xs font-semibold text-text-0 mb-0.5 leading-none">
                  Skills & location
                </div>
                <div className="text-[11px] text-text-2 leading-none">
                  Filling in now · Squad payout account auto-linked on submit
                </div>
              </div>
            </div>

            <button
              disabled={isLoading}
              type="submit"
              className="w-full bg-brand text-white rounded-sm py-3 text-[13px] font-semibold tracking-tight mt-1 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? "Saving..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JobSeekerOnboarding;
