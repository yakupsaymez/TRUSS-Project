import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, Mail, Facebook, Image as ImageIcon, Loader2, ArrowLeft } from "lucide-react"
import authService from "@/services/authService"
import useAuthStore from "@/store/useAuthStore"

export default function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName || !email || !password || !confirmPassword) {
      toast.error("Tüm alanları doldurun.")
      return
    }
    if (fullName.trim().length < 3) {
      toast.error("Ad soyad en az 3 karakter olmalıdır.")
      return
    }
    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır.")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Şifreler eşleşmiyor.")
      return
    }
    setLoading(true)
    try {
      await authService.register({ ad_soyad: fullName.trim(), email, sifre: password })
      toast.success("Hesap oluşturuldu! Giriş yapılıyor...")
      await useAuthStore.getState().login({ email, sifre: password })
      navigate("/dashboard")
    } catch (err) {
      const message = err?.response?.data?.message || "Kayıt başarısız. Lütfen tekrar deneyin."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4 font-sans text-foreground">
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center text-sm font-sans font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        TRUSS Ana Sayfa
      </Link>

      <Card className="w-full max-w-4xl overflow-hidden flex flex-col md:flex-row p-0 gap-0 border-border/50 shadow-xs font-sans">
        <div className="flex-1 p-6 md:p-10">
          <CardHeader className="p-0 mb-6">
            <div className="mb-2 flex items-center font-display font-bold text-2xl tracking-tight select-none">
              <span className="text-truss-text">TRU</span>
              <span className="text-truss-purple">SS</span>
            </div>
            <CardTitle className="font-display text-2xl font-bold tracking-tight">Create your account</CardTitle>
            <CardDescription className="font-sans">Enter your details below to create your account</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullname">Ad Soyad</Label>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="Ahmet Yılmaz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
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
                  <p className="text-[13px] text-muted-foreground">
                    We&apos;ll use this to contact you. We will not share your email with anyone else.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground">Must be at least 6 characters long.</p>
                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Hesap oluşturuluyor...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button type="button" variant="outline" disabled><Github className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" disabled><Mail className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" disabled><Facebook className="h-4 w-4" /></Button>
                </div>
              </div>
            </form>
            <div className="mt-6 text-center text-sm">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </div>

        <div className="hidden md:flex flex-1 bg-muted items-center justify-center border-l border-border/50">
          <div className="flex flex-col items-center text-muted-foreground/50">
            <ImageIcon className="h-16 w-16 mb-2 opacity-50" />
            <span className="text-sm">Image Placeholder</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
