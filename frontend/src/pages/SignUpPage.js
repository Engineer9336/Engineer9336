import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    try {
      const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        const detail = data.detail;
        if (typeof detail === "string") {
          setError(detail);
        } else if (Array.isArray(detail)) {
          setError(detail.map((d) => d.msg || JSON.stringify(d)).join(" "));
        } else {
          setError("Registration failed. Please try again.");
        }
        return;
      }
      // Auto-login after successful registration
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="signup-page">
      {/* Left - Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-primary flex items-center justify-center">
                <Shield className="text-primary-foreground" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">ATTENDANCE</h1>
                <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                  monitoring system
                </p>
              </div>
            </div>
            <h2 className="text-xl font-medium tracking-tight">Create Admin Account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Register a new administrator account
            </p>
          </div>

          {error && (
            <div
              className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              data-testid="signup-error"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="signup-form">
            <div className="space-y-2">
              <Label className="text-xs font-bold tracking-[0.2em] uppercase">
                Full Name
              </Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                data-testid="signup-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold tracking-[0.2em] uppercase">
                Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                data-testid="signup-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold tracking-[0.2em] uppercase">
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  data-testid="signup-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold tracking-[0.2em] uppercase">
                Confirm Password
              </Label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                data-testid="signup-confirm-password-input"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="signup-submit-button"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary font-medium hover:underline"
                data-testid="login-link"
              >
                Sign In
              </Link>
            </p>
          </form>

          <Link
            to="/login"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="back-to-login"
          >
            <ArrowLeft size={14} />
            Back to login
          </Link>
        </div>
      </div>

      {/* Right - Image */}
      <div
        className="hidden lg:block relative bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.pexels.com/photos/8090123/pexels-photo-8090123.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="text-3xl font-black tracking-tight">
            Join the System
          </h2>
          <p className="text-sm mt-2 opacity-80">
            Set up your admin account to start managing attendance
          </p>
        </div>
      </div>
    </div>
  );
}
