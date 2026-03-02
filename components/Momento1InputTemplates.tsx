"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Sparkles, X, RefreshCw, ArrowLeft, Check } from "lucide-react"
import { Drawer } from "vaul"
import useEmblaCarousel from "embla-carousel-react"
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures"
import { supabase } from "@/lib/supabase"

interface TemplateRow {
  id: number
  name: string
  tag?: string
  tags?: string
  image_url?: string
  uuid?: string
  title?: string
  thumbnail?: string
  layers?: any
  created_at: string
  [key: string]: any
}

interface GroupedTemplate {
  tag: string
  name: string
  thumbnail: string
  slides: TemplateRow[]
  totalSlides: number
}

interface Momento1Props {
  userInput: string
  setUserInput: (val: string) => void
  onTemplateSelect: (templateData: any) => void
}

export function Momento1InputTemplates({ userInput, setUserInput, onTemplateSelect }: Momento1Props) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState("Todos")
  const [previewingTemplate, setPreviewingTemplate] = useState<GroupedTemplate | null>(null)
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0)

  const [groupedTemplates, setGroupedTemplates] = useState<GroupedTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Carrossel da lista principal
  const [listEmblaRef] = useEmblaCarousel(
    { dragFree: true, containScroll: "trimSnaps" },
    [WheelGesturesPlugin()]
  )

  // Carrossel do preview de detalhe
  const [previewEmblaRef, previewEmblaApi] = useEmblaCarousel(
    { dragFree: false, loop: false, containScroll: "trimSnaps" },
    [WheelGesturesPlugin()]
  )

  // Sincroniza o index do preview com o Embla
  const onPreviewSelect = useCallback(() => {
    if (!previewEmblaApi) return
    setPreviewSlideIndex(previewEmblaApi.selectedScrollSnap())
  }, [previewEmblaApi])

  useEffect(() => {
    if (!previewEmblaApi) return
    previewEmblaApi.on("select", onPreviewSelect)
    return () => { previewEmblaApi.off("select", onPreviewSelect) }
  }, [previewEmblaApi, onPreviewSelect])

  // Reseta o index do preview quando o template muda
  useEffect(() => {
    if (previewingTemplate) {
      setPreviewSlideIndex(0)
      previewEmblaApi?.scrollTo(0, true)
    }
  }, [previewingTemplate])

  // Pré-carrega os templates ao montar
  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    if (!supabase) {
      setErrorMessage("Supabase não configurado. Verifique as variáveis de ambiente.")
      return
    }
    setLoading(true)
    setErrorMessage(null)
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      console.log("[autopost] Templates recebidos:", data?.length, "registros")
      console.log("[autopost] Primeiro template (raw):", data?.[0])

      if (data && data.length > 0) {
        const grouped = groupTemplatesByTag(data)
        console.log("[autopost] Grupos:", grouped.map(g => `${g.name} (${g.totalSlides} slides)`))
        setGroupedTemplates(grouped)
      } else {
        console.warn("[autopost] Nenhum template retornado do Supabase")
      }
    } catch (err: any) {
      console.error("[autopost] Erro ao buscar templates:", err)
      setErrorMessage(err.message || "Erro ao carregar templates")
    } finally {
      setLoading(false)
    }
  }

  const groupTemplatesByTag = (rows: TemplateRow[]): GroupedTemplate[] => {
    const grouped = new Map<string, TemplateRow[]>()
    rows.forEach((t) => {
      const rawTag = t.tag ?? t.tags ?? ""
      let tagName = rawTag
      try {
        if (rawTag.startsWith("[") || rawTag.startsWith('"')) {
          const parsed = JSON.parse(rawTag)
          tagName = Array.isArray(parsed) ? parsed[0] : parsed
        }
      } catch (e) {}
      tagName = String(tagName).trim()
      if (!tagName || tagName === "[]" || tagName === "") {
        tagName = t.name || `Template ${t.id}`
      }
      if (!grouped.has(tagName)) grouped.set(tagName, [])
      grouped.get(tagName)!.push(t)
    })

    return Array.from(grouped.entries()).map(([tag, slides]) => {
      const sortedSlides = [...slides].sort((a, b) => {
        const aTitle = (a.title || "").toUpperCase()
        const bTitle = (b.title || "").toUpperCase()

        const aIsCapa = aTitle.includes("CAPA") || aTitle.includes("COVER")
        const bIsCapa = bTitle.includes("CAPA") || bTitle.includes("COVER")
        if (aIsCapa && !bIsCapa) return -1
        if (bIsCapa && !aIsCapa) return 1

        const aIsFinal = aTitle.includes("FINAL")
        const bIsFinal = bTitle.includes("FINAL")
        if (aIsFinal && !bIsFinal) return 1
        if (bIsFinal && !aIsFinal) return -1

        const aMatch = aTitle.match(/\d+/)
        const bMatch = bTitle.match(/\d+/)
        if (aMatch && bMatch) return parseInt(aMatch[0]) - parseInt(bMatch[0])

        return aTitle.localeCompare(bTitle)
      })

      const thumbnail =
        sortedSlides.find((s) => s.title?.toUpperCase().includes("CAPA"))?.thumbnail ||
        sortedSlides[0]?.thumbnail ||
        sortedSlides[0]?.image_url ||
        ""
      return { tag, name: tag, thumbnail, slides: sortedSlides, totalSlides: sortedSlides.length }
    })
  }

  const handleStart = () => {
    if (userInput.trim() === "") return
    setIsDrawerOpen(true)
  }

  const handleDrawerClose = (open: boolean) => {
    setIsDrawerOpen(open)
    if (!open) setPreviewingTemplate(null)
  }

  // Ao clicar num card da lista → abre o preview de detalhe
  const openPreview = (template: GroupedTemplate) => {
    setPreviewingTemplate(template)
  }

  // Ao clicar em "Usar este Estilo" → confirma a seleção e fecha
  const confirmSelect = () => {
    if (!previewingTemplate) return
    setIsDrawerOpen(false)
    setPreviewingTemplate(null)
    onTemplateSelect({
      // O template não tem UUID próprio — é identificado pelo nome/tag do grupo
      name: previewingTemplate.name,
      totalSlides: previewingTemplate.totalSlides,
      category: previewingTemplate.tag,
      slides: previewingTemplate.slides.map((s) => ({
        uuid: s.uuid || String(s.id),
        title: s.title || s.name,
        thumbnail: s.thumbnail || s.image_url || "",
        layers: s.layers,
      })),
    })
  }

  const dynamicFilters = [
    "Todos",
    ...Array.from(new Set(groupedTemplates.map((t) => t.tag))).slice(0, 6),
  ]

  const filteredTemplates =
    activeFilter === "Todos"
      ? groupedTemplates
      : groupedTemplates.filter((t) => t.tag === activeFilter || t.name === activeFilter)

  return (
    <div className="flex h-full flex-col px-6 pb-24 relative">

      {/* HEADER */}
      <header className="flex items-center justify-between pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight text-foreground">AutoPost</span>
        </div>
        <div className="rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-foreground">
          42/50 Créditos
        </div>
      </header>

      {/* INPUT CENTRAL */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          <h1 className="text-balance text-center text-3xl font-semibold tracking-tight text-foreground">
            Qual o carrossel de hoje?
          </h1>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Ex: 5 dicas de marketing digital..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              className="w-full rounded-2xl border border-border bg-card/50 px-12 py-5 text-base text-foreground placeholder:text-muted-foreground shadow-sm backdrop-blur-sm transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={handleStart}
            disabled={!userInput.trim()}
            className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            Escolher Estilo
          </button>
        </div>
      </div>

      {/* ======================================================= */}
      {/* BOTTOM SHEET DE TEMPLATES */}
      {/* ======================================================= */}
      <Drawer.Root open={isDrawerOpen} onOpenChange={handleDrawerClose}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-[88vh] flex-col rounded-t-[32px] bg-background border-t border-border shadow-2xl overflow-hidden">

            {/* Handle sempre visível */}
            <div className="flex-none pt-4 px-4">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-muted" />
            </div>

            {/* ---- AnimatePresence entre LISTA e DETALHE ---- */}
            <AnimatePresence mode="wait" initial={false}>

              {/* ======= VISTA DE LISTA ======= */}
              {!previewingTemplate && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex flex-col flex-1 overflow-hidden"
                >
                  {/* Header da lista */}
                  <div className="flex items-center justify-between px-6 pt-5 pb-2">
                    <div>
                      <Drawer.Title className="text-2xl font-bold tracking-tight text-foreground">
                        Estilo Visual
                      </Drawer.Title>
                      <Drawer.Description className="text-sm text-muted-foreground mt-0.5">
                        Deslize e escolha o design
                      </Drawer.Description>
                    </div>
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="rounded-full p-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Filtros dinâmicos */}
                  {!loading && groupedTemplates.length > 0 && (
                    <div className="flex-none px-6 py-3">
                      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                        {dynamicFilters.map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-all ${
                              activeFilter === filter
                                ? "bg-foreground text-background shadow-md"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading */}
                  {loading && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                      <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <p className="text-sm text-muted-foreground">Carregando templates...</p>
                    </div>
                  )}

                  {/* Erro */}
                  {errorMessage && !loading && (
                    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
                      <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-6 w-full">
                        <p className="text-sm text-destructive font-medium mb-1">Erro ao carregar</p>
                        <p className="text-xs text-muted-foreground">{errorMessage}</p>
                      </div>
                      <button
                        onClick={fetchTemplates}
                        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                      >
                        <RefreshCw className="h-4 w-4" /> Tentar novamente
                      </button>
                    </div>
                  )}

                  {/* Carrossel de templates (lista) */}
                  {!loading && !errorMessage && filteredTemplates.length > 0 && (
                    <div className="flex-1 overflow-hidden py-3" ref={listEmblaRef}>
                      <div className="flex h-full items-center px-4 gap-3">
                        {filteredTemplates.map((template) => (
                          <div
                            key={template.tag}
                            className="flex-[0_0_72%] sm:flex-[0_0_42%] md:flex-[0_0_28%] lg:flex-[0_0_22%] min-w-0 px-1"
                          >
                            <button
                              onClick={() => openPreview(template)}
                              className="group relative w-full aspect-[4/5] overflow-hidden rounded-3xl border border-border bg-card transition-all hover:border-primary active:scale-[0.98] shadow-sm hover:shadow-xl hover:shadow-primary/10"
                            >
                              <img
                                src={template.thumbnail || "/placeholder.svg"}
                                alt={template.name}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => { e.currentTarget.src = "/placeholder.svg?height=1350&width=1080" }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
                                <h3 className="text-lg font-bold text-white mb-2 drop-shadow-md">{template.name}</h3>
                                <div className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/10">
                                  {template.totalSlides} Slides
                                </div>
                              </div>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filtro sem resultados */}
                  {!loading && !errorMessage && filteredTemplates.length === 0 && groupedTemplates.length > 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
                      <p className="text-base font-medium text-foreground">Nenhum template aqui</p>
                      <p className="text-sm text-muted-foreground">Tente o filtro "Todos"</p>
                      <button onClick={() => setActiveFilter("Todos")} className="mt-2 rounded-xl bg-secondary px-5 py-2 text-sm font-medium">
                        Ver todos
                      </button>
                    </div>
                  )}

                  {/* Banco vazio */}
                  {!loading && !errorMessage && groupedTemplates.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
                      <p className="text-base font-medium text-foreground">Nenhum template cadastrado</p>
                      <p className="text-sm text-muted-foreground">Adicione templates na tabela "templates" do Supabase</p>
                      <button onClick={fetchTemplates} className="flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold">
                        <RefreshCw className="h-4 w-4" /> Recarregar
                      </button>
                    </div>
                  )}

                  <div className="flex-none h-4" />
                </motion.div>
              )}

              {/* ======= VISTA DE DETALHE (PREVIEW) ======= */}
              {previewingTemplate && (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex flex-col flex-1 overflow-hidden"
                >
                  {/* Header do detalhe */}
                  <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                    <button
                      onClick={() => setPreviewingTemplate(null)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex-shrink-0"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      {/* Precisamos do Title/Description para acessibilidade do Drawer */}
                      <Drawer.Title className="text-lg font-bold text-foreground truncate">
                        {previewingTemplate.name}
                      </Drawer.Title>
                      <Drawer.Description className="text-xs text-muted-foreground">
                        {previewingTemplate.totalSlides} slides · Deslize para visualizar
                      </Drawer.Description>
                    </div>
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="rounded-full p-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex-shrink-0"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Carrossel de slides do template selecionado */}
                  <div className="flex-1 overflow-hidden py-2" ref={previewEmblaRef}>
                    <div className="flex h-full items-center px-6 gap-4">
                      {previewingTemplate.slides.map((slide, index) => (
                        <div
                          key={slide.id || index}
                          className="flex-[0_0_80%] sm:flex-[0_0_55%] md:flex-[0_0_38%] lg:flex-[0_0_28%] min-w-0"
                        >
                          <div className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl border border-border shadow-lg">
                            <img
                              src={slide.thumbnail || slide.image_url || "/placeholder.svg"}
                              alt={slide.title || `Slide ${index + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.src = "/placeholder.svg?height=1350&width=1080" }}
                            />
                            {/* Badge com nome do slide */}
                            <div className="absolute bottom-3 left-3">
                              <div className="inline-flex items-center rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white">
                                {slide.title || `Slide ${index + 1}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dots de navegação */}
                  <div className="flex justify-center gap-1.5 py-3">
                    {previewingTemplate.slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => previewEmblaApi?.scrollTo(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === previewSlideIndex ? "w-5 bg-primary" : "w-1.5 bg-border"
                        }`}
                      />
                    ))}
                  </div>

                  {/* CTA: Usar este Estilo */}
                  <div className="flex-none px-5 pb-6 pt-2">
                    <button
                      onClick={confirmSelect}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
                    >
                      <Check className="w-5 h-5" />
                      Usar este Estilo
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
