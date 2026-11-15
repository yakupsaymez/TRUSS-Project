import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Save, Trash2, Bell, Globe, ShieldAlert, User } from 'lucide-react'
import api from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const defaultPrefs = {
  dil: 'TR',
  para_birimi: 'TRY',
  olcu_birimi: 'KM',
}
const defaultNotifs = {
  telefon: '',
  email_bildirim_aktif: true,
  sms_bildirim_aktif: false,
  bakim_uyarisi: true,
  evrak_uyarisi: true,
}

export default function Settings() {
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState(defaultPrefs)
  const [notifs, setNotifs] = useState(defaultNotifs)
  const [loading, setLoading] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savingNotifs, setSavingNotifs] = useState(false)

  const fetchSettings = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    try {
      setLoading(true)
      const [pRes, nRes] = await Promise.allSettled([
        api.get('/users/settings/preferences'),
        api.get('/users/settings/notifications'),
      ])
      if (pRes.status === 'fulfilled') {
        const prefData = pRes.value.data?.preferences || pRes.value.data || {}
        setPrefs(prev => ({
          ...prev,
          dil: String(prefData.dil || prev.dil).toUpperCase(),
          para_birimi: String(prefData.para_birimi || prev.para_birimi).toUpperCase(),
          olcu_birimi: String(prefData.olcu_birimi || prev.olcu_birimi).toUpperCase(),
        }))
      }
      if (nRes.status === 'fulfilled') {
        const userData = nRes.value.data?.user || nRes.value.data || {}
        setNotifs(prev => ({
          ...prev,
          telefon: userData.telefon ?? prev.telefon,
          email_bildirim_aktif: userData.email_bildirim_aktif !== undefined ? Boolean(userData.email_bildirim_aktif) : prev.email_bildirim_aktif,
          sms_bildirim_aktif: userData.sms_bildirim_aktif !== undefined ? Boolean(userData.sms_bildirim_aktif) : prev.sms_bildirim_aktif,
        }))
      }
    } catch {
      // silently ignore — defaults remain
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSavePrefs = async () => {
    try {
      setSavingPrefs(true)
      await api.put('/users/settings/preferences', {
        dil: String(prefs.dil || 'TR').toUpperCase(),
        para_birimi: String(prefs.para_birimi || 'TRY').toUpperCase(),
        olcu_birimi: String(prefs.olcu_birimi || 'KM').toUpperCase(),
      })
      toast.success('Tercihler kaydedildi.')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Tercihler kaydedilemedi.')
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleSaveNotifs = async () => {
    try {
      setSavingNotifs(true)
      await api.put('/users/settings/notifications', {
        telefon: notifs.telefon || null,
        email_bildirim_aktif: Boolean(notifs.email_bildirim_aktif),
        sms_bildirim_aktif: Boolean(notifs.sms_bildirim_aktif),
      })
      toast.success('Bildirim ayarları kaydedildi.')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bildirim ayarları kaydedilemedi.')
    } finally {
      setSavingNotifs(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/users/settings/account')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      navigate('/')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Hesap silinemedi.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-truss-muted text-sm">
        Ayarlar yükleniyor…
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Genel Tercihler */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-truss-muted" />
            <CardTitle className="text-base">Genel Tercihler</CardTitle>
          </div>
          <CardDescription>Dil, para birimi ve ölçü birimi ayarları.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="dil">Dil</Label>
              <Select value={prefs.dil} onValueChange={v => setPrefs(p => ({ ...p, dil: v }))}>
                <SelectTrigger id="dil">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TR">Türkçe (TR)</SelectItem>
                  <SelectItem value="EN">English (EN)</SelectItem>
                  <SelectItem value="RU">Русский (RU)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="para_birimi">Para Birimi</Label>
              <Select value={prefs.para_birimi} onValueChange={v => setPrefs(p => ({ ...p, para_birimi: v }))}>
                <SelectTrigger id="para_birimi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">₺ Türk Lirası</SelectItem>
                  <SelectItem value="USD">$ ABD Doları</SelectItem>
                  <SelectItem value="EUR">€ Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="olcu_birimi">Ölçü Birimi</Label>
              <Select value={prefs.olcu_birimi} onValueChange={v => setPrefs(p => ({ ...p, olcu_birimi: v }))}>
                <SelectTrigger id="olcu_birimi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KM">Kilometre (KM)</SelectItem>
                  <SelectItem value="MI">Mil (MI)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" className="gap-2" onClick={handleSavePrefs} disabled={savingPrefs}>
              <Save className="size-4" />
              {savingPrefs ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bildirim Ayarları */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Bildirim Ayarları</CardTitle>
          </div>
          <CardDescription>Hangi kanallardan ve konulardan bildirim alacağınızı seçin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Kanallar</p>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-switch" className="text-sm font-medium">E-posta Bildirimleri</Label>
                <p className="text-xs text-muted-foreground">Önemli güncellemeleri e-posta ile al.</p>
              </div>
              <Switch
                id="email-switch"
                checked={!!notifs.email_bildirim_aktif}
                onCheckedChange={v => setNotifs(p => ({ ...p, email_bildirim_aktif: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sms-switch" className="text-sm font-medium">SMS Bildirimleri</Label>
                <p className="text-xs text-muted-foreground">Acil durumlarda SMS al.</p>
              </div>
              <Switch
                id="sms-switch"
                checked={!!notifs.sms_bildirim_aktif}
                onCheckedChange={v => setNotifs(p => ({ ...p, sms_bildirim_aktif: v }))}
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Uyarı Türleri</p>
            <div className="flex items-center gap-3">
              <Checkbox
                id="bakim-uyarisi"
                checked={!!notifs.bakim_uyarisi}
                onCheckedChange={v => setNotifs(p => ({ ...p, bakim_uyarisi: !!v }))}
              />
              <Label htmlFor="bakim-uyarisi" className="text-sm cursor-pointer">Bakım zamanı uyarıları</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="evrak-uyarisi"
                checked={!!notifs.evrak_uyarisi}
                onCheckedChange={v => setNotifs(p => ({ ...p, evrak_uyarisi: !!v }))}
              />
              <Label htmlFor="evrak-uyarisi" className="text-sm cursor-pointer">Evrak süresi uyarıları (muayene, kasko, sigorta)</Label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" className="gap-2" onClick={handleSaveNotifs} disabled={savingNotifs}>
              <Save className="size-4" />
              {savingNotifs ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Güvenlik */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" />
            <CardTitle className="text-base text-destructive">Tehlikeli Bölge</CardTitle>
          </div>
          <CardDescription>Bu işlemler geri alınamaz. Dikkatli olun.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Hesabı Sil</p>
              <p className="text-xs text-muted-foreground">Tüm araç, bakım ve yakıt verileriniz kalıcı olarak silinir.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="size-4" />
                  Hesabı Sil
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hesabınızı silmek istediğinizden emin misiniz?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bu işlem geri alınamaz. Hesabınız ve buna bağlı tüm veriler (araçlar, bakım kayıtları, yakıt
                    kayıtları) kalıcı olarak silinecektir.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Evet, hesabı sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
