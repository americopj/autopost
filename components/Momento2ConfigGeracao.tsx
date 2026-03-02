"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Sparkles, Wand2, CheckCircle2, Settings2, Loader2, ChevronRight } from "lucide-react"
import { Drawer } from "vaul"
import { getUsername } from "@/lib/user"

interface Momento2Props {
  prompt: string
  template: any
  onBack: () => void
  onGenerate: (carouselData: any) => void
}

const MEUS_PRESETS = [
  { id: 1, name: "Marketing Edu", nicho: "Marketing Digital", persona: "Iniciantes em marketing", tom: "Didático e acessível", objetivo: "Educar e gerar salvamentos" },
  { id: 2, name: "Vendas", nicho: "Vendas", persona: "Empresários e vendedores", tom: "Persuasivo e direto", objetivo: "Converter e gerar comentários" },
]

const GENERATION_STEPS = [
  "Analisando o tema e template...",
  "Estruturando o gancho (Slide 1)...",
  "Desenvolvendo o conteúdo dos slides...",
  "Criando o Call to Action...",
  "Finalizando carrossel...",
]

export function Momento2ConfigGeracao({ prompt, template, onBack, onGenerate }: Momento2Props) {
  const [activePreset, setActivePreset] = useState<number | null>(null)
  // Começa fechado — o usuário vê a tela limpa primeiro
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [bgIndex, setBgIndex] = useState(0)

  const [config, setConfig] = useState({
    nicho: "",
    persona: "",
    tom: "",
    objetivo: "",
  })

  // Slideshow automático nos slides do template
  useEffect(() => {
    const slides = template?.slides
    if (!slides || slides.length <= 1) return
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % slides.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [template])

  const handlePresetClick = (preset: typeof MEUS_PRESETS[0]) => {
    setActivePreset(preset.id)
    setConfig({ nicho: preset.nicho, persona: preset.persona, tom: preset.tom, objetivo: preset.objetivo })
  }

  const handleStartGeneration = async () => {
    setIsConfigDrawerOpen(false)
    setIsGenerating(true)
    setGenerationStep(0)
    setErrorMsg(null)

    let step = 0
    const interval = setInterval(() => {
      step = Math.min(step + 1, GENERATION_STEPS.length - 1)
      setGenerationStep(step)
    }, 1800)

    try {
      const slidesStructure = template.slides.map((slide: any, index: number) => {
        let slideLayers: any[] = []
        try {
          if (slide.layers) {
            slideLayers = typeof slide.layers === "string"
              ? JSON.parse(slide.layers)
              : Array.isArray(slide.layers) ? slide.layers : []
          }
        } catch (e) {
          console.error(`[autopost] Erro ao parsear layers do slide ${index + 1}:`, e)
        }
        return {
          slideNumber: index + 1,
          slide_uuid: slide.uuid || String(slide.id) || "",
          slideName: slide.title,
          layers: slideLayers,
          totalLayers: slideLayers.length,
        }
      })

      const payload = {
        userInput: prompt,
        username: getUsername(),
        template: {
          name: template.name,
          totalSlides: template.totalSlides,
          category: template.category,
          slidesStructure,
        },
        additionalInfo: config,
        timestamp: new Date().toISOString(),
      }

      console.log("[autopost] Payload → geracopies:", JSON.stringify(payload, null, 2))

      const response = await fetch("https://primary-production-43a3.up.railway.app/webhook/geracopies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      clearInterval(interval)
      setGenerationStep(GENERATION_STEPS.length - 1)

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const responseData = await response.json()
      console.log("[autopost] Resposta ← geracopies:", JSON.stringify(responseData, null, 2))

      let webhookResult: any = Array.isArray(responseData) ? responseData[0] : responseData

      if (webhookResult?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = webhookResult.candidates[0].content.parts[0].text
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
        webhookResult = JSON.parse(cleaned)
        if (Array.isArray(webhookResult)) webhookResult = webhookResult[0]
      }

      const parsedSlides = (webhookResult?.slides || []).map((slide: any, index: number) => ({
        id: index + 1,
        slide_uuid: slide.slide_uuid || "",
        slide_number: slide.slide_number || index + 1,
        slide_name: slide.slide_name || `Slide ${index + 1}`,
        slide_type: slide.slide_type || "",
        content: slide.content || {},
        design_notes: slide.design_notes || "",
        has_picture: slide.has_picture || false,
        picture_layers: slide.picture_layers || [],
        generate_with_ai: slide.generate_with_ai || false,
        uploaded_image_url: slide.uploaded_image_url || null,
        ai_prompt: slide.ai_prompt || "",
        ai_style: slide.ai_style || "Realista",
      }))

      await new Promise((r) => setTimeout(r, 600))

      onGenerate({
        templateUsado: template,
        slides: parsedSlides,
        legenda: webhookResult?.legenda || "",
        metadata: webhookResult?.metadata || {},
        config,
      })
    } catch (error: any) {
      clearInterval(interval)
      console.error("[autopost] Erro webhook geracopies:", error)
      setErrorMsg(`Erro ao gerar: ${error.message}. Tente novamente.`)
      setIsGenerating(false)
    }
  }

  // Texto de resumo para o card de configuração
  const configSummary = config.nicho || config.tom
    ? [config.nicho, config.tom].filter(Boolean).join(" · ")
    : "Toque para configurar nicho e tom"

  const canGenerate = config.nicho.trim() !== "" && config.persona.trim() !== ""

  return (
    <div className="flex h-full flex-col bg-background relative overflow-hidden">

      {/* HEADER */}
      <header className="flex items-center justify-between px-5 pt-6 pb-4 z-10 relative bg-background/80 backdrop-blur-md border-b border-border/50">
        <button
          onClick={onBack}
          disabled={isGenerating}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ajuste Fino</p>
          <h2 className="text-sm font-semibold text-foreground line-clamp-1 max-w-[200px]">{prompt}</h2>
        </div>
        <button
          onClick={() => !isGenerating && setIsConfigDrawerOpen(true)}
          disabled={isGenerating}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40"
        >
          <Settings2 className="h-5 w-5" />
        </button>
      </header>

      {/* PRESETS — some suavemente durante a geração */}
      <AnimatePresence>
        {!isGenerating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="px-5 py-4 z-10 relative overflow-hidden"
          >
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {MEUS_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={`flex-shrink-0 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                    activePreset === preset.id
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <CheckCircle2 className={`h-4 w-4 ${activePreset === preset.id ? "opacity-100" : "opacity-0 w-0 hidden"}`} />
                  {preset.name}
                </button>
              ))}
              <button className="flex-shrink-0 flex items-center gap-2 rounded-xl border border-dashed border-border bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary">
                + Salvar Novo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PREVIEW CENTRAL */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative pb-40">
        {/*
          Container fixo — NÃO pulsa.
          O brilho mágico é aplicado via box-shadow ao entrar em geração.
        */}
        <div
          className={`relative w-full max-w-[280px] aspect-[4/5] rounded-2xl overflow-hidden border transition-shadow duration-700 ${
            isGenerating
              ? "border-primary/30 shadow-[0_0_48px_-8px_hsl(var(--primary)/0.45)]"
              : "border-border shadow-2xl shadow-black/10"
          }`}
        >
          {/*
            Camada de fundo que pulsa suavemente (scale + brightness/blur).
            Apenas esta layer tem a animação de breathing — textos ficam acima, imóveis.
          */}
          <motion.div
            className="absolute inset-0"
            animate={
              isGenerating
                ? { scale: [1, 1.04], filter: ["brightness(0.5) blur(2px)", "brightness(0.7) blur(4px)"] }
                : { scale: 1, filter: "brightness(1) blur(0px)" }
            }
            transition={
              isGenerating
                ? { duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
                : { duration: 0.6, ease: "easeOut" }
            }
          >
            {/* Crossfade slideshow entre os slides do template */}
            <AnimatePresence mode="sync">
              <motion.img
                key={bgIndex}
                src={
                  template?.slides?.[bgIndex]?.thumbnail ||
                  template?.slides?.[0]?.thumbnail ||
                  template?.thumbnail ||
                  "/placeholder.svg"
                }
                alt="Preview do template"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
              />
            </AnimatePresence>

            {/* Overlay escuro base — fica junto ao pulso para escurecer harmoniosamente */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 bg-black/30"
                />
              )}
            </AnimatePresence>
          </motion.div>

          {/*
            Camada de UI de progresso — z-20, absolutamente imóvel.
            Fica acima do motion.div que pulsa.
          */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center"
              >
                <Loader2 className="w-10 h-10 text-white/90 animate-spin mb-5 drop-shadow-lg" />
                <motion.p
                  key={generationStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="text-white font-semibold text-sm leading-tight drop-shadow-md"
                >
                  {GENERATION_STEPS[generationStep]}
                </motion.p>
                <div className="mt-5 flex gap-1.5">
                  {GENERATION_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-700 ${
                        i <= generationStep ? "w-5 bg-white" : "w-1.5 bg-white/25"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Erro */}
        {errorMsg && (
          <div className="mt-4 w-full max-w-[280px] rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-center">
            <p className="text-sm text-destructive">{errorMsg}</p>
            <button
              onClick={() => { setErrorMsg(null); setIsConfigDrawerOpen(true) }}
              className="mt-2 text-xs font-semibold text-destructive underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!isGenerating && !errorMsg && (
          <p className="mt-5 text-sm text-muted-foreground text-center">
            Template: <span className="font-medium text-foreground">{template?.name}</span>
            {" · "}
            <span>{template?.totalSlides} slides</span>
          </p>
        )}
      </div>

      {/* ======================================================= */}
      {/* RODAPÉ FIXO — Card de resumo + Botão CTA                */}
      {/* Some suavemente durante a geração                        */}
      {/* ======================================================= */}
      <AnimatePresence>
        {!isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-8 pt-6 bg-gradient-to-t from-background via-background/95 to-transparent"
          >
            {/* Card de resumo — abre o Drawer ao clicar */}
            <button
              onClick={() => setIsConfigDrawerOpen(true)}
              className="w-full flex items-center justify-between rounded-2xl border border-border bg-card/80 backdrop-blur-sm px-4 py-3 mb-3 text-left hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                  <Wand2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Configuração da IA
                  </p>
                  <p className="text-sm text-foreground truncate font-medium">{configSummary}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
            </button>

            {/* Botão principal de geração */}
            <button
              onClick={handleStartGeneration}
              disabled={!canGenerate}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
            >
              <Sparkles className="w-5 h-5" />
              {canGenerate ? "Gerar Textos com IA" : "Configure a IA antes de gerar"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================= */}
      {/* BOTTOM SHEET — apenas edição, sem botão de geração       */}
      {/* ======================================================= */}
      <Drawer.Root
        open={isConfigDrawerOpen}
        onOpenChange={(open) => { if (!isGenerating) setIsConfigDrawerOpen(open) }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[32px] bg-background border-t border-border shadow-2xl">
            <div className="p-5 pb-0">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-muted" />
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Drawer.Title className="text-lg font-bold text-foreground">Configurar IA</Drawer.Title>
                  <Drawer.Description className="text-xs text-muted-foreground">
                    Personalize o tom e o público do carrossel
                  </Drawer.Description>
                </div>
              </div>
            </div>

            <div className="px-5 pb-2 space-y-4 overflow-y-auto max-h-[50vh]">
              {[
                { key: "nicho", label: "Nicho", placeholder: "Ex: Marketing Digital, Fitness..." },
                { key: "persona", label: "Persona", placeholder: "Ex: Empreendedores 25-35 anos..." },
                { key: "tom", label: "Tom de Voz", placeholder: "Ex: Profissional, Informal, Inspirador..." },
                { key: "objetivo", label: "Objetivo", placeholder: "Ex: Gerar leads, Educar audiência..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={config[key as keyof typeof config]}
                    onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              ))}
            </div>

            {/* Botão de salvar — apenas fecha o drawer */}
            <div className="p-5 pt-4">
              <button
                onClick={() => setIsConfigDrawerOpen(false)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-base font-bold text-background transition-all hover:bg-foreground/90 active:scale-[0.98]"
              >
                <CheckCircle2 className="w-5 h-5" />
                Salvar Configurações
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
