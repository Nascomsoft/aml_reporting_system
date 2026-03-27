"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, FormInput, AlertBanner } from "@/components";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("bank_officer");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    {
      id: "bank_officer",
      label: "Bank Compliance Officer",
      icon: "🏦",
      description: "Alert monitoring & case investigation",
    },
    {
      id: "admin",
      label: "System Administrator",
      icon: "⚙️",
      description: "System configuration & management",
    },
    {
      id: "regulator",
      label: "Regulatory Authority",
      icon: "📋",
      description: "STR submissions & monitoring",
    },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-sidebar) 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="w-full max-w-2xl">
        {/* Logo & Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center font-bold text-2xl flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-700) 100%)",
                color: "white",
              }}
            >
              ⚖️
            </div>
            <div className="text-left">
              <h1 className="heading-3 text-primary m-0">AML Monitor</h1>
              <p className="text-sm text-text-secondary m-0">
                Nigerian Compliance System
              </p>
            </div>
          </div>
          <p className="text-text-tertiary text-base mt-3">
            Secure access to the Anti-Money Laundering monitoring and reporting system
          </p>
        </div>

        {/* Main Form Container */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Role Selection Sidebar */}
          <div className="lg:col-span-2">
            <div className="card">
              <h6 className="heading-6 text-primary mb-4">Select Your Role</h6>
              <div className="flex flex-col gap-3">
                {roleOptions.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`
                      p-4 rounded-lg text-left transition-all
                      ${
                        selectedRole === role.id
                          ? "bg-primary-600 bg-opacity-20 border border-primary-600"
                          : "bg-bg-tertiary border border-border-default hover:border-primary-600 hover:bg-opacity-50"
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{role.icon}</span>
                      <div>
                        <p className="font-semibold text-primary text-sm">
                          {role.label}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                          {role.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Info Box */}
              <div className="mt-6 pt-6 border-t border-border-default">
                <p className="text-xs text-text-tertiary mb-3 font-medium">
                  Demo Credentials:
                </p>
                <div className="space-y-2 text-xs text-text-secondary">
                  <p>
                    <span className="font-mono bg-bg-secondary px-2 py-1 rounded">
                      officer@bank.com
                    </span>
                  </p>
                  <p>
                    <span className="font-mono bg-bg-secondary px-2 py-1 rounded">
                      password
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="lg:col-span-3">
            <div className="card">
              <h5 className="heading-5 text-primary mb-6">Sign In</h5>

              {error && (
                <AlertBanner
                  type="danger"
                  message={error}
                  onClose={() => setError("")}
                  className="mb-6"
                />
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <FormInput
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@bank.com"
                  required
                  disabled={loading}
                  helperText="Enter your institutional email"
                />

                <FormInput
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  helperText="Your secure password"
                />

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border border-border-default"
                      disabled={loading}
                    />
                    <span className="text-text-secondary">Remember me on this device</span>
                  </label>
                  <a
                    href="#"
                    className="text-primary-600 hover:underline font-medium"
                  >
                    Forgot password?
                  </a>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  isLoading={loading}
                  fullWidth
                  size="lg"
                >
                  {loading ? "Signing in..." : "Sign In to Dashboard"}
                </Button>
              </form>

              {/* Footer */}
              <div className="mt-6 pt-6 border-t border-border-default text-center">
                <p className="text-xs text-text-tertiary">
                  AML Monitoring System v1.0 • Central Bank of Nigeria
                </p>
                <p className="text-xs text-text-tertiary mt-2">
                  🇳🇬 Secured & Compliant • Protected Access
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Security Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-text-tertiary flex items-center justify-center gap-2">
            <span>🔒</span>
            Secured connection • CBN-compliant system • All activities logged
          </p>
        </div>
      </div>
    </div>
  );
}
