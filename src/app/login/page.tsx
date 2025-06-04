"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader,  CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError("Email atau password tidak valid");
        setIsLoading(false);
        return;
      }

      // Login berhasil, arahkan ke dashboard
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error("Error during login:", error);
      setError("Terjadi kesalahan saat mencoba masuk");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            name="email" 
            placeholder="Email Anda" 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            name="password" 
            placeholder="Password Anda" 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>
      </div>
      <div className="mt-6">
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? "Memproses..." : "Masuk"}
        </Button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Masuk ke akun Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="text-center">
              <p>Memuat form login...</p>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
} 