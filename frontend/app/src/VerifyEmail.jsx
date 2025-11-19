import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./verify-email.css";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("Verifying your email...");
  const [email, setEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please check your email link.");
      return;
    }

    // Verify email
    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch(`/auth/verify-email?token=${token}`, {
        method: "GET",
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("Email verified successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        setStatus("error");
        setMessage(result.error || "Failed to verify email. Please try again.");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("error");
      setMessage("Cannot connect to server. Please try again later.");
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }

    setResendLoading(true);

    try {
      const response = await fetch("/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage("Verification email resent! Please check your email.");
        setEmail("");
      } else {
        setMessage(result.error || "Failed to resend verification email.");
      }
    } catch (error) {
      console.error("Resend error:", error);
      setMessage("Cannot connect to server. Please try again later.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="verify-email-container">
      <div className="verify-card">
        <h1>Email Verification</h1>

        {status === "verifying" && (
          <div className="status verifying">
            <div className="spinner"></div>
            <p>{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="status success">
            <div className="checkmark">✓</div>
            <p>{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="status error">
            <div className="error-icon">✕</div>
            <p>{message}</p>

            <div className="resend-section">
              <h3>Didn't receive the email?</h3>
              <form onSubmit={handleResend}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" disabled={resendLoading}>
                  {resendLoading ? "Sending..." : "Resend Verification Email"}
                </button>
              </form>
            </div>

            <button className="back-button" onClick={() => navigate("/")}>
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
