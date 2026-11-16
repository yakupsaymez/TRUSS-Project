import React, { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, Mail, Loader2, ArrowLeft, ShieldAlert } from "lucide-react"
import useAuthStore from "@/store/useAuthStore"

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get("reason") === "expired"
  const login = useAuthStore((state) => state.login)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("E-posta ve şifre gereklidir.")
      return
    }
    setLoading(true)
    try {
      await login({ email, sifre: password })
      toast.success("Giriş başarılı! Yönlendiriliyorsunuz...")
      navigate("/dashboard")
    } catch (err) {
      const message = err?.response?.data?.message || "Giriş başarısız. Bilgilerinizi kontrol edin."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background p-4 font-sans text-foreground">
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center text-sm font-sans font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        TRUSS Ana Sayfa
      </Link>

      <div className="mb-8 flex items-center font-display font-bold text-2xl tracking-tight select-none">
        <span className="text-truss-text">TRU</span>
        <span className="text-truss-purple">SS</span>
      </div>

      {sessionExpired && (
        <div
          role="status"
          className="mb-4 flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-truss-purple bg-truss-surface px-3.5 py-3 text-xs text-truss-text"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-truss-purple" />
          <span>Güvenliğiniz için oturumunuz sonlandırıldı, lütfen tekrar giriş yapın.</span>
        </div>
      )}

      <Card className="w-full max-w-sm font-sans">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="font-sans">Login with your Apple or Google account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Button type="button" variant="outline" className="w-full" disabled>
                <Github className="mr-2 h-4 w-4" /> Login with GitHub
              </Button>
              <Button type="button" variant="outline" className="w-full" disabled>
                <Mail className="mr-2 h-4 w-4" /> Login with Google
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm font-medium text-primary hover:underline">
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </div>

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-xs text-muted-foreground max-w-[300px]">
        By clicking continue, you agree to our{" "}
        <a href="#" className="underline hover:text-primary">Terms of Service</a>
        {" "}and{" "}
        <a href="#" className="underline hover:text-primary">Privacy Policy</a>.
      </div>
    </div>
  )
}
