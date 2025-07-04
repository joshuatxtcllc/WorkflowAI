import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useToast } from "../hooks/use-toast";

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export default function Login() {
  const [email, setEmail] = useState("admin@jaysframes.com");
  const [password, setPassword] = useState("admin123");
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: 'include', // Include cookies for session
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = "Login failed";
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Login request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      try {
        // Store user info for session-based auth
        if (data?.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        toast({
          title: "Welcome to Jay's Frames!",
          description: `Logged in as ${data?.user?.firstName || 'User'} ${data?.user?.lastName || ''}`,
        });

        // Small delay before redirect to ensure session is established
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
      } catch (error) {
        console.error("Login success handler error:", error);
        // Still redirect even if there's an error with localStorage
        window.location.href = '/dashboard';
      }
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Unable to log in. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Jay's Frames
          </CardTitle>
          <CardDescription>
            Sign in to access your production dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">Default Login:</p>
            <p className="text-sm text-blue-600">Email: admin@jaysframes.com</p>
            <p className="text-sm text-blue-600">Password: admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}