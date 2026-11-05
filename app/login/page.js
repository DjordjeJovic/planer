
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "./login.css";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        if (loading) {
            return;
        }

        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            setError("Enter a valid email address.");
            return;
        }

        if (password.length < 6) {
            setError("Password must contain at least 6 characters.");
            return;
        }

        setError("");
        setMessage("");
        setLoading(true);

        if (isSignUp) {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
            });

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            if (data.session) {
                router.replace("/planer");
                return;
            }

            setMessage("Check your email to confirm your account.");
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        router.replace("/planer");
    }

    return (
        <main className="login-page">
            <div className="login-card">
                <div className="login-brand">
                    <span className="login-brand-mark" />
                    Planner
                </div>

                <h1 className="login-title">
                    {isSignUp ? "Create your account" : "Welcome back"}
                </h1>

                <p className="login-subtitle">
                    {isSignUp
                        ? "Sign up to start planning your week."
                        : "Log in to open your weekly planner."}
                </p>

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    <label className="login-label" htmlFor="login-email">
                        Email
                    </label>

                    <input
                        id="login-email"
                        className="login-input"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />

                    <label className="login-label" htmlFor="login-password">
                        Password
                    </label>

                    <div className="login-password-wrap">
                        <input
                            id="login-password"
                            className="login-input"
                            type={showPassword ? "text" : "password"}
                            autoComplete={isSignUp ? "new-password" : "current-password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />

                        <button
                            className="login-toggle"
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>

                    {error && (
                        <p className="login-error" role="alert">
                            {error}
                        </p>
                    )}

                    {message && (
                        <p className="login-subtitle" role="status">
                            {message}
                        </p>
                    )}

                    <button
                        className="login-submit"
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Please wait..."
                            : isSignUp
                                ? "Sign up"
                                : "Log in"}
                    </button>
                </form>

                <p className="login-subtitle">
                    {isSignUp
                        ? "Already have an account? "
                        : "Don't have an account? "}

                    <button
                        type="button"
                        className="login-toggle"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError("");
                            setMessage("");
                        }}
                    >
                        {isSignUp ? "Log in" : "Sign up"}
                    </button>
                </p>
            </div>
        </main>
    );
}
