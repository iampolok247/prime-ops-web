import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("polok@primeacademy.org"); // quick default for you
  const [password, setPassword] = useState("password123");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-royal/10 to-gold/10">
      <form
        onSubmit={submit}
        className="bg-white shadow-soft rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex justify-center mb-4">
          <img
            src="https://primeacademy.org/logo-full.png"
            alt="Prime Academy"
            className="w-56 object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-navy mb-4">Sign in</h1>
        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}
        <label className="block text-sm text-royal mb-1">Email</label>
        <input
          className="w-full border rounded-xl px-3 py-2 mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
        />
        <label className="block text-sm text-royal mb-1">Password</label>
        <input
          className="w-full border rounded-xl px-3 py-2 mb-4"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          disabled={loading}
          className="w-full bg-gold text-navy rounded-xl py-2 font-semibold hover:bg-lightgold transition"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
        <p className="mt-3 text-xs text-royal/70">
          Default password for seeded users: <b>password123</b>
        </p>
        <h1>hello world</h1>
      </form>
    </div>
  );
}
