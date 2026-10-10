import { safeDestination } from '../state/authDestination.js';
﻿import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { supabase } from "../services/live/supabase.js";
import { useAuth } from "../state/AuthState.jsx";
import { Notice } from "../components.jsx";
export default function Auth() {
  const { session, ready, expired, signOut, authError } = useAuth(),
    location = useLocation(),
    reset = location.pathname === "/auth/reset";
  const [mode, setMode] = useState("Sign in"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setPending(true);
    setMessage("");
    setError("");
    try {
      const origin = window.location.origin;
      let response;
      if (reset) {
        if (!session)
          throw new Error(
            "Open a valid recovery link before setting a password",
          );
        response = await supabase.auth.updateUser({ password });
      } else if (mode === "Reset password")
        response = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: origin + "/auth/reset",
        });
      else if (mode === "Sign up")
        response = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: origin + "/auth/callback" },
        });
      else
        response = await supabase.auth.signInWithPassword({ email, password });
      if (response.error) throw response.error;
      setPassword("");
      setMessage(
        reset
          ? "Password updated."
          : mode === "Sign in"
            ? "Signed in. Private cloud workspace is available."
            : mode === "Sign up"
              ? "Sign-up request accepted. Check your email to confirm your account."
              : "If the account exists, check its email for a recovery link.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };
  const callback=location.pathname==='/auth/callback';
  if(ready&&session&&!reset)return <Navigate replace to={safeDestination(new URLSearchParams(location.search).get('next'))}/>;
  return (
    <div className="auth-grid">
      <div className="auth-intro">
        <p className="eyebrow">MeghDrishti / access gateway</p>
        <h2>Climate Portfolio Intelligence</h2>
        <p>
          Trace operational dependencies and inspect evidence. Private cloud
          storage is separate from anonymous demo history.
        </p>
        <Notice>
          Signing in does not upload local holdings. Use the explicit import
          action in the private workspace.
        </Notice>
        <Link to="/evidence">Review data coverage</Link>
      </div>
      <div className="auth-form">
        <h1>{reset ? "Set new password" : "Authentication"}</h1>
        {!supabase ? (
          <Notice>
            Authentication not connected. Not configured. Configure Supabase to
            enable private account access. The demo does not require sign-in.
          </Notice>
        ) : !ready ? (
          <Notice>Restoring session...</Notice>
        ) : (
          <>
            {expired && (
              <Notice error>
                Your session expired or access was rejected. Sign in again.
              </Notice>
            )}
            {session && !reset ? (
              <section>
                <p>Signed in as {session.user.email}</p>
                <div className="actions">
                  <Link className="button" to="/portfolio">
                    My portfolios
                  </Link>
                  <button
                    className="secondary"
                    onClick={async () => {
                      await signOut();
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </section>
            ) : (
              <section>
                {!reset && (
                  <div className="actions">
                    {["Sign in", "Sign up", "Reset password"].map((m) => (
                      <button
                        className={mode === m ? "" : "secondary"}
                        key={m}
                        onClick={() => setMode(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                {reset && !session ? (
                  <Notice>
                    Open the recovery email in the same browser that requested
                    it. A valid session is required to change the password.
                  </Notice>
                ) : (
                  <form onSubmit={submit}>
                    <div className="fields">
                      {!reset && (
                        <label>
                          Email
                          <input
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </label>
                      )}
                      {(reset || mode !== "Reset password") && (
                        <label>
                          {reset ? "New password" : "Password"}
                          <input
                            type="password"
                            autoComplete={
                              reset || mode === "Sign up"
                                ? "new-password"
                                : "current-password"
                            }
                            minLength={8}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </label>
                      )}
                    </div>
                    <button disabled={pending}>
                      {pending
                        ? "Submitting..."
                        : reset
                          ? "Update password"
                          : mode}
                    </button>
                  </form>
                )}
              </section>
            )}
          </>
        )}
        {callback&&ready&&!session&&<Notice error>Confirmation could not be completed. Request a new confirmation link and open it in the same browser.</Notice>}
        {authError&&<Notice error>{authError}</Notice>}
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <Link className="button secondary" to="/overview">
          Continue to workspace
        </Link>
      </div>
    </div>
  );
}
