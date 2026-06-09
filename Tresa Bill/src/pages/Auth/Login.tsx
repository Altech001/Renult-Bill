/* eslint-disable @typescript-eslint/no-explicit-any */
import { renultApi } from "@/api/foreform";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Chrome, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AuthShell from "./AuthShell";
import { AuthInput, Divider, PasswordInput, SubmitButton } from "./auth-ui";
import { getGoogleRedirectUri, rememberGoogleRedirectUri } from "./google-auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const from = (location.state as any)?.from?.pathname || "/";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const auth = await renultApi.auth.login({ email, password });
      login(auth);
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to log in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      const redirectUri = getGoogleRedirectUri();
      rememberGoogleRedirectUri(redirectUri);
      const { authorization_url } = await renultApi.auth.googleLoginUrl(redirectUri);
      window.location.href = authorization_url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start Google sign in");
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your billing workspace" seoTitle="Log In" path="/login">
      <div className="w-full">
        <Button type="button" variant="outline" disabled={isGoogleLoading} onClick={handleGoogle} className="w-full h-10 bg-white">
          {isGoogleLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Chrome className="w-4 h-4 mr-2" />}
          Continue with Google
        </Button>
        <Divider />
        <form className="space-y-2" onSubmit={handleSubmit}>
          <AuthInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="youremail@mail.host" autoComplete="email" autoFocus />
          <PasswordInput show={showPassword} onToggle={() => setShowPassword((next) => !next)} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" />
          <Link to="/forgot-password" className="block pt-1 text-[13px] text-slate-900 hover:underline font-medium text-right">
            Forgot password?
          </Link>
          <SubmitButton isLoading={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Log In
          </SubmitButton>
        </form>
      </div>
      <div className="mt-8 text-center">
        <p className="text-[13px] text-slate-600 font-medium">
          New to Renult? <Link to="/signup" className="text-slate-900 hover:underline">Create an account</Link>
        </p>
      </div>
    </AuthShell>
  );
}
