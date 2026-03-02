"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence, MotionConfig } from "framer-motion"
import { Sparkles, FolderOpen, User, Settings, Loader2 } from "lucide-react"

import { Momento1InputTemplates } from "@/components/Momento1InputTemplates"
import { Momento2ConfigGeracao } from "@/components/Momento2ConfigGeracao"
import { Momento3EdicaoExportacao } from "@/components/Momento3EdicaoExportacao"
import { SettingsProfileScreen } from "@/components/settings-profile-screen"
import { LoginScreen } from "@/components/login-screen"
import { getSession, onAuthStateChange, isSupabaseConfigured } from "@/lib/supabase"
import { setUserId } from "@/lib/user"

export type Tab = "criar" | "projetos" | "perfil" | "config"
export type Screen = Tab | "home"
export type CreationMoment = "input" | "config" | "review"

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    getSession().then(({ data }) => {
      setSession(data?.session ?? null)
      if (data?.session?.user?.id) setUserId(data.session.user.id)
      setLoading(false)
    })
    const unsubscribe = onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null)
      if (newSession?.user?.id) setUserId(newSession.user.id)
      else setUserId("")
    })
    return () => unsubscribe()
  }, [])

  if (!isSupabaseConfigured()) return <>{children}</>
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!session) return <LoginScreen onSuccess={() => {}} />
  return <>{children}</>
}

export default function Page() {
  return (
    <AuthGuard>
      <AppOrchestrator />
    </AuthGuard>
  )
}

function AppOrchestrator() {
  // Navegação
  const [activeTab, setActiveTab] = useState<Tab>("criar")
  const [currentMoment, setCurrentMoment] = useState<CreationMoment>("input")
  const [direction, setDirection] = useState(1)

  // Dados que viajam entre os Momentos
  const [userInput, setUserInput] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [carouselData, setCarouselData] = useState<any>(null)

  const navigateMoment = (newMoment: CreationMoment, dir: number) => {
    setDirection(dir)
    setCurrentMoment(newMoment)
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0, scale: 0.95 }),
    center: { zIndex: 1, x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ zIndex: 0, x: dir < 0 ? "100%" : "-100%", opacity: 0, scale: 0.95 }),
  }

  return (
    <MotionConfig transition={{ type: "spring", stiffness: 300, damping: 30 }}>
      <div className="flex h-screen w-full flex-col bg-background overflow-hidden relative">

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <div className="flex-1 relative overflow-hidden">

          {/* ABA CRIAR */}
          {activeTab === "criar" && (
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentMoment}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="absolute inset-0 h-full w-full bg-background"
              >
                {currentMoment === "input" && (
                  <Momento1InputTemplates
                    userInput={userInput}
                    setUserInput={setUserInput}
                    onTemplateSelect={(template) => {
                      setSelectedTemplate(template)
                      navigateMoment("config", 1)
                    }}
                  />
                )}

                {currentMoment === "config" && selectedTemplate && (
                  <Momento2ConfigGeracao
                    prompt={userInput}
                    template={selectedTemplate}
                    onBack={() => navigateMoment("input", -1)}
                    onGenerate={(data) => {
                      setCarouselData(data)
                      navigateMoment("review", 1)
                    }}
                  />
                )}

                {currentMoment === "review" && carouselData && (
                  <Momento3EdicaoExportacao
                    data={carouselData}
                    onBack={() => navigateMoment("config", -1)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* ABA PROJETOS */}
          {activeTab === "projetos" && (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <FolderOpen className="w-12 h-12 mx-auto opacity-20 mb-4" />
              <p className="font-medium text-foreground">Meus Carrosséis</p>
              <p className="text-sm mt-1">Seus projetos salvos aparecerão aqui em breve.</p>
            </div>
          )}

          {/* ABA PERFIL */}
          {activeTab === "perfil" && (
            <div className="h-full overflow-y-auto">
              <SettingsProfileScreen onNavigate={(s) => setActiveTab(s === "home" ? "criar" : s)} />
            </div>
          )}

          {/* ABA CONFIG */}
          {activeTab === "config" && (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <Settings className="w-12 h-12 mx-auto opacity-20 mb-4" />
              <p className="font-medium text-foreground">Configurações</p>
              <p className="text-sm mt-1">Ajustes do aplicativo.</p>
            </div>
          )}
        </div>

        {/* BOTTOM TAB BAR */}
        <nav className="border-t border-border bg-card px-6 py-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <TabButton
              active={activeTab === "criar"}
              icon={<Sparkles />}
              label="Criar"
              onClick={() => {
                setActiveTab("criar")
                if (currentMoment !== "input") {
                  setUserInput("")
                  setSelectedTemplate(null)
                  setCarouselData(null)
                  navigateMoment("input", -1)
                }
              }}
            />
            <TabButton
              active={activeTab === "projetos"}
              icon={<FolderOpen />}
              label="Projetos"
              onClick={() => setActiveTab("projetos")}
            />
            <TabButton
              active={activeTab === "perfil"}
              icon={<User />}
              label="Perfil"
              onClick={() => setActiveTab("perfil")}
            />
            <TabButton
              active={activeTab === "config"}
              icon={<Settings />}
              label="Ajustes"
              onClick={() => setActiveTab("config")}
            />
          </div>
        </nav>
      </div>
    </MotionConfig>
  )
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 relative w-16 group outline-none"
    >
      <div
        className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
          active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground group-active:scale-95"
        }`}
      >
        {icon}
      </div>
      {active && (
        <motion.div
          layoutId="active-tab-bg"
          className="absolute top-0 w-10 h-10 bg-primary rounded-2xl z-0 shadow-lg shadow-primary/30"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        />
      )}
      <span
        className={`text-[10px] font-bold z-10 transition-colors duration-300 ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </button>
  )
}
