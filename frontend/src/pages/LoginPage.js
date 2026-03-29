import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
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
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg || JSON.stringify(d)).join(" "));
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page">
      {/* Left - Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
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
            <h2 className="text-xl font-medium tracking-tight">Admin Login</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to manage attendance
            </p>
          </div>

          {error && (
            <div
              className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              data-testid="login-error"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
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
                data-testid="login-email-input"
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
                  placeholder="Enter password"
                  required
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="toggle-password-btn"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>

      {/* Right - Image */}
      <div
        className="hidden lg:block relative bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.pexels.com/photos/22039140/pexels-photo-22039140.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')`,
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="text-3xl font-black tracking-tight">
            Face Recognition
          </h2>
          <p className="text-sm mt-2 opacity-80">
            Automated attendance tracking powered by computer vision
          </p>
        </div>
      </div>
    </div>
  );
}
