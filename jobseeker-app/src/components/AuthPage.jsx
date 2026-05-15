import React, { useState } from "react";
import apiClient from "../api/client";

const AuthPage = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role: "job_seeker",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const payload = { email: formData.email, password: formData.password };
        const response = await apiClient.post("/auth/login", payload);
        localStorage.setItem("token", response.data.access_token);
        onAuthSuccess();
      } else {
        // Always register as job_seeker — this app doesn't support trader signup
        await apiClient.post("/auth/register", {
          ...formData,
          role: "job_seeker",
        });

        const loginResponse = await apiClient.post("/auth/login", {
          email: formData.email,
          password: formData.password,
        });

        localStorage.setItem("token", loginResponse.data.access_token);
        onAuthSuccess();
      }
    } catch (err) {
      console.error("Auth error:", err);

      let errorMessage = "Authentication failed. Please try again.";

      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail
            .map((e) => `${e.loc[e.loc.length - 1]}: ${e.msg}`)
            .join(" | ");
        } else {
          errorMessage = err.response.data.detail;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-bg text-text-0 font-sans p-4 flex justify-center items-start">
      <div className="w-[318px] bg-surface-0 rounded-xl border border-border-dark overflow-hidden shadow-lg mt-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-light bg-surface-0">
          <div className="text-[18px] font-bold tracking-tight text-text-0">
            E<em className="text-brand not-italic">k</em>o
          </div>
          {!isLogin && (
            <span className="text-[11px] text-text-3 font-mono">
              Step 1 of 2
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-5">
          <h1 className="text-[19px] font-semibold text-text-0 mb-1 tracking-tight">
            {isLogin ? "Welcome back" : "Find work in Lagos"}
          </h1>
          <p className="text-xs text-text-2 mb-4">
            {isLogin
              ? "Sign in to your account"
              : "Get matched to trusted traders nearby"}
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-[11px] p-2 rounded-sm border border-red-200 mb-4 transition-opacity">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {!isLogin && (
              <div className="field">
                <label className="block text-[10px] text-text-3 font-mono mb-1 tracking-wider uppercase">
                  Full Name
                </label>
                <div className="border border-border-dark rounded-sm px-3 py-2 text-[13px] bg-surface-1 transition-colors focus-within:border-brand">
                  <input
                    type="text"
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    className="bg-transparent outline-none w-full"
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label className="block text-[10px] text-text-3 font-mono mb-1 tracking-wider uppercase">
                Email
              </label>
              <div className="border border-border-dark rounded-sm px-3 py-2 text-[13px] bg-surface-1 transition-colors focus-within:border-brand">
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-transparent outline-none w-full"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="field">
                <label className="block text-[10px] text-text-3 font-mono mb-1 tracking-wider uppercase">
                  Phone
                </label>
                <div className="border border-border-dark rounded-sm px-3 py-2 text-[13px] bg-surface-1 transition-colors focus-within:border-brand">
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="bg-transparent outline-none w-full"
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label className="block text-[10px] text-text-3 font-mono mb-1 tracking-wider uppercase">
                Password
              </label>
              <div className="border border-border-dark rounded-sm px-3 py-2 text-[13px] bg-surface-1 transition-colors focus-within:border-brand">
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="bg-transparent outline-none w-full"
                />
              </div>
            </div>

            <button
              disabled={isLoading}
              type="submit"
              className="w-full bg-brand text-white rounded-sm py-3 text-[13px] font-semibold tracking-tight mt-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading
                ? "Processing..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </button>

            <div className="text-center text-xs text-text-3 mt-2">
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
              <span
                onClick={() => setIsLogin(!isLogin)}
                className="text-brand font-medium cursor-pointer hover:underline"
              >
                {isLogin ? "Create account" : "Sign in"}
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
