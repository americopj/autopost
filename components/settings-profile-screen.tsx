"use client"

import { useState, useEffect } from "react"
import { Sparkles, FolderOpen, User, ChevronRight, ArrowLeft, Save, Loader2, Upload, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Screen } from "@/app/page"
import { getUserId, getUsername, setUsername, getSelectedLogoIndex, setSelectedLogoIndex } from "@/lib/user"
import { saveUsername, loadUsername, saveLogos, loadLogos, uploadLogo, signOut } from "@/lib/supabase"

interface SettingsProfileScreenProps {
  onNavigate: (screen: Screen) => void
}

export function SettingsProfileScreen({ onNavigate }: SettingsProfileScreenProps) {
  const [instagramUsername, setInstagramUsername] = useState("")
  const [logos, setLogos] = useState<{ [key: number]: string | null }>({ 1: null, 2: null, 3: null })
  const [selectedLogo, setSelectedLogo] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState<number | null>(null)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    // Carregar dados do usuário
    const loadUserData = async () => {
      const userId = getUserId()
      
      // Carregar username
      const localUsername = getUsername()
      if (localUsername) {
        // Remover @ para exibir no input
        setInstagramUsername(localUsername.replace('@', ''))
      } else {
        const { data } = await loadUsername(userId)
        if (data) {
          // Remover @ para exibir no input
          setInstagramUsername(data.replace('@', ''))
          setUsername(data)
        }
      }

      // Carregar logos
      const { data: logosData } = await loadLogos(userId)
      if (logosData) {
        setLogos({
          1: logosData.logo_1_url || null,
          2: logosData.logo_2_url || null,
          3: logosData.logo_3_url || null,
        })
        if (logosData.selected_logo_index) {
          setSelectedLogo(logosData.selected_logo_index)
          setSelectedLogoIndex(logosData.selected_logo_index)
        }
      }
    }
    loadUserData()
  }, [])

  const handleSaveUsername = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const userId = getUserId()
      // Remover @ se o usuário digitou, depois adicionar sempre
      const cleanUsername = instagramUsername.replace('@', '')
      const usernameWithAt = `@${cleanUsername}`
      
      const { error } = await saveUsername(userId, usernameWithAt)

      if (error) {
        setSaveMessage({ type: 'error', text: 'Erro ao salvar. Tente novamente.' })
      } else {
        setUsername(usernameWithAt)
        setSaveMessage({ type: 'success', text: 'Username salvo com sucesso!' })
        setTimeout(() => setSaveMessage(null), 3000)
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (logoIndex: number, file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return

    setUploadingLogo(logoIndex)

    try {
      const userId = getUserId()
      const { url, error } = await uploadLogo(userId, file, logoIndex)

      if (error || !url) {
        alert(`Erro ao fazer upload da logo ${logoIndex}: ${error}`)
        return
      }

      // Atualizar estado local
      setLogos((prev) => ({ ...prev, [logoIndex]: url }))

      // Salvar no Supabase
      const logoKey = `logo_${logoIndex}_url` as 'logo_1_url' | 'logo_2_url' | 'logo_3_url'
      await saveLogos(userId, { [logoKey]: url })

      setSaveMessage({ type: 'success', text: `Logo ${logoIndex} salva com sucesso!` })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error: any) {
      alert(`Erro ao fazer upload: ${error.message}`)
    } finally {
      setUploadingLogo(null)
    }
  }

  const handleSelectLogo = async (logoIndex: number) => {
    setSelectedLogo(logoIndex)
    setSelectedLogoIndex(logoIndex)

    const userId = getUserId()
    await saveLogos(userId, { selected_logo_index: logoIndex })
  }

  const handleRemoveLogo = async (logoIndex: number) => {
    const userId = getUserId()
    const logoKey = `logo_${logoIndex}_url` as 'logo_1_url' | 'logo_2_url' | 'logo_3_url'
    
    setLogos((prev) => ({ ...prev, [logoIndex]: null }))
    await saveLogos(userId, { [logoKey]: null })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-secondary"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Perfil</h1>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* User Info Section */}
        <div className="border-b border-border bg-card px-6 py-8">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <span className="text-xl font-semibold text-primary-foreground">JD</span>
            </div>

            {/* Name and Email */}
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">João da Silva</h2>
              <p className="text-sm text-muted-foreground">joao.silva@email.com</p>
            </div>
          </div>
        </div>

        {/* Credits Section */}
        <div className="border-b border-border bg-card px-6 py-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Gerações usadas este mês</span>
              <span className="text-sm font-semibold text-primary">42/50</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: "84%" }} />
            </div>

            <p className="text-xs text-muted-foreground">8 gerações restantes</p>
          </div>
        </div>

        {/* Settings Groups */}
        <div className="space-y-6 px-6 py-6">
          {/* Integration Section */}
          <div className="space-y-1">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Integração</h3>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <button className="flex w-full items-center justify-between px-4 py-4 transition-colors hover:bg-secondary">
                <span className="text-base font-medium text-foreground">Google Drive</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    Conectado
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            </div>
          </div>

          {/* Personal Data Section */}
          <div className="space-y-1">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dados Pessoais
            </h3>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {/* Instagram Username Field */}
              <div className="border-b border-border px-4 py-4">
                <label htmlFor="instagram" className="block text-sm font-medium text-foreground mb-2">
                  Instagram
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                    <span className="text-sm text-muted-foreground">@</span>
                    <input
                      id="instagram"
                      type="text"
                      value={instagramUsername}
                      onChange={(e) => {
                        // Remover @ se o usuário digitar
                        const value = e.target.value.replace('@', '')
                        setInstagramUsername(value)
                      }}
                      placeholder="seu_username"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                  <Button
                    onClick={handleSaveUsername}
                    disabled={isSaving || !instagramUsername.trim()}
                    size="sm"
                    className="gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Salvar
                      </>
                    )}
                  </Button>
                </div>
                {saveMessage && (
                  <p className={`mt-2 text-xs ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {saveMessage.text}
                  </p>
                )}
              </div>

              {/* Logos Section */}
              <div className="border-b border-border px-4 py-4">
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-foreground mb-1">Logos da Empresa</h4>
                  <p className="text-xs text-muted-foreground">Adicione até 3 logos e selecione qual usar nos carrosséis</p>
                </div>
                
                <div className="space-y-3">
                  {[1, 2, 3].map((index) => (
                    <div key={index} className="flex items-center gap-3">
                      {/* Radio Button */}
                      <button
                        onClick={() => handleSelectLogo(index)}
                        disabled={!logos[index]}
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                          selectedLogo === index && logos[index]
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/30 bg-background'
                        } ${!logos[index] ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {selectedLogo === index && logos[index] && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </button>

                      {/* Logo Preview or Upload */}
                      <div className="flex-1 flex items-center gap-3">
                        {logos[index] ? (
                          <>
                            <img
                              src={logos[index]!}
                              alt={`Logo ${index}`}
                              className="h-12 w-12 rounded-lg border border-border object-contain bg-white"
                            />
                            <span className="text-sm text-foreground flex-1">Logo {index}</span>
                            <Button
                              onClick={() => handleRemoveLogo(index)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="h-12 w-12 rounded-lg border-2 border-dashed border-border bg-secondary flex items-center justify-center">
                              <Upload className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <label
                              htmlFor={`logo-${index}`}
                              className="flex-1 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                            >
                              {uploadingLogo === index ? 'Enviando...' : `Adicionar Logo ${index}`}
                            </label>
                            <input
                              id={`logo-${index}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingLogo === index}
                              onChange={(e) => handleLogoUpload(index, e.target.files?.[0] || null)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedLogo && logos[selectedLogo] && (
                  <p className="mt-3 text-xs text-green-600">
                    ✓ Logo {selectedLogo} será usada nos próximos carrosséis
                  </p>
                )}
              </div>
              
              <button className="flex w-full items-center justify-between border-b border-border px-4 py-4 transition-colors hover:bg-secondary">
                <span className="text-base font-medium text-foreground">WhatsApp</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <button className="flex w-full items-center justify-between px-4 py-4 transition-colors hover:bg-secondary">
                <span className="text-base font-medium text-foreground">Alterar Senha</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Subscription Section */}
          <div className="space-y-1">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assinatura</h3>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <button className="flex w-full items-center justify-between px-4 py-4 transition-colors hover:bg-secondary">
                <span className="text-base font-medium text-foreground">Gerenciar Plano</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Conta / Sair */}
          <div className="space-y-1">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conta</h3>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <button
                onClick={() => signOut()}
                className="flex w-full items-center justify-center px-4 py-4 text-base font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card px-6 py-4">
        <div className="flex items-center justify-around">
          {/* Criar */}
          <button className="flex flex-col items-center gap-1" onClick={() => onNavigate("home")}>
            <div className="rounded-lg p-2">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Criar</span>
          </button>

          {/* Meus Projetos */}
          <button className="flex flex-col items-center gap-1" onClick={() => onNavigate("home")}>
            <div className="rounded-lg p-2">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Meus Projetos</span>
          </button>

          {/* Perfil (Active) */}
          <button className="flex flex-col items-center gap-1">
            <div className="rounded-lg bg-primary p-2">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xs font-medium text-primary">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
