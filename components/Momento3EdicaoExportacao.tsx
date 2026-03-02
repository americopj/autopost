"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Edit3, CheckCircle2, Download, Check, Sparkles, Loader2, Upload, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react"
import useEmblaCarousel from "embla-carousel-react"
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures"
import { Drawer } from "vaul"
import { getUsername, getSelectedLogoIndex, getUserId } from "@/lib/user"
import { loadLogos } from "@/lib/supabase"
import { uploadImageToSupabase } from "@/app/actions/upload-image"

interface Momento3Props {
  data: {
    templateUsado: any
    slides: any[]
    legenda: string
    metadata: any
    config: any
  }
  onBack: () => void
}

type ImageSource = "none" | "ai" | "upload"

interface SlideState {
  // Dados do webhook 1
  id: number
  slide_uuid: string
  slide_number: number
  slide_name: string
  slide_type: string
  content: Record<string, string>
  design_notes: string
  has_picture: boolean
  picture_layers: string[]
  // Estado local de edição/aprovação
  aprovado: boolean
  imagemFinal: string | null
  // Estado de imagem (apenas para slides com has_picture)
  imageSource: ImageSource
  uploadedImageUrl: string | null
  aiPrompt: string
  aiStyle: string
}

export function Momento3EdicaoExportacao({ data, onBack }: Momento3Props) {
  const [slides, setSlides] = useState<SlideState[]>(
    (data?.slides || []).map((s: any) => ({
      id: s.id,
      slide_uuid: s.slide_uuid || "",
      slide_number: s.slide_number,
      slide_name: s.slide_name,
      slide_type: s.slide_type,
      content: s.content || {},
      design_notes: s.design_notes || "",
      has_picture: s.has_picture || false,
      picture_layers: s.picture_layers || [],
      aprovado: false,
      imagemFinal: null,
      imageSource: s.generate_with_ai ? "ai" : "none",
      uploadedImageUrl: s.uploaded_image_url || null,
      aiPrompt: s.ai_prompt || "",
      aiStyle: s.ai_style || "Realista",
    }))
  )

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { dragFree: false, align: "center", containScroll: "keepSnaps" },
    [WheelGesturesPlugin()]
  )
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(true)

  // Edit drawer
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [editingContent, setEditingContent] = useState<Record<string, string>>({})

  // Image drawer (para slides com has_picture)
  const [isImageDrawerOpen, setIsImageDrawerOpen] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Generation state
  const [isGeneratingPlacid, setIsGeneratingPlacid] = useState(false)
  const [carrosselFinalizado, setCarrosselFinalizado] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const updateScrollState = useCallback(() => {
    if (!emblaApi) return
    setCurrentSlideIndex(emblaApi.selectedScrollSnap())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on("select", updateScrollState)
    emblaApi.on("reInit", updateScrollState)
    // Inicializa o estado das setas
    updateScrollState()
    return () => {
      emblaApi.off("select", updateScrollState)
      emblaApi.off("reInit", updateScrollState)
    }
  }, [emblaApi, updateScrollState])

  // -------------------------------------------------------
  // EDIÇÃO DE TEXTO
  // -------------------------------------------------------
  const openEditDrawer = () => {
    setEditingContent({ ...slides[currentSlideIndex].content })
    setIsEditDrawerOpen(true)
  }

  const saveEditedContent = () => {
    setSlides((prev) => prev.map((s, i) =>
      i === currentSlideIndex
        ? { ...s, content: editingContent, aprovado: true }
        : s
    ))
    setIsEditDrawerOpen(false)
    // Avança automaticamente para o próximo slide
    if (currentSlideIndex < slides.length - 1) {
      setTimeout(() => emblaApi?.scrollNext(), 300)
    }
  }

  const handleApproveSlide = () => {
    setSlides((prev) => prev.map((s, i) =>
      i === currentSlideIndex ? { ...s, aprovado: !s.aprovado } : s
    ))
    if (!slides[currentSlideIndex].aprovado && currentSlideIndex < slides.length - 1) {
      setTimeout(() => emblaApi?.scrollNext(), 300)
    }
  }

  // -------------------------------------------------------
  // UPLOAD DE IMAGEM
  // -------------------------------------------------------
  const handleImageUpload = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await uploadImageToSupabase(formData)
      if (result.error || !result.url) throw new Error(result.error || "Upload falhou")

      setSlides((prev) => prev.map((s, i) =>
        i === currentSlideIndex
          ? { ...s, imageSource: "upload", uploadedImageUrl: result.url }
          : s
      ))
    } catch (error: any) {
      alert(`Erro no upload: ${error.message}`)
    } finally {
      setUploadingImage(false)
    }
  }

  // -------------------------------------------------------
  // GERAÇÃO FINAL — WEBHOOK 2 (criacarrossel)
  // -------------------------------------------------------
  const handleGerarImagensPlacid = async () => {
    setIsGeneratingPlacid(true)
    setGenerationError(null)

    try {
      // Carrega a logo selecionada pelo usuário
      const userId = getUserId()
      const selectedLogoIndex = getSelectedLogoIndex()
      const { data: logosData } = await loadLogos(userId)
      let selectedLogoUrl: string | null = null
      if (logosData && selectedLogoIndex >= 1 && selectedLogoIndex <= 3) {
        const logoKey = `logo_${selectedLogoIndex}_url` as "logo_1_url" | "logo_2_url" | "logo_3_url"
        selectedLogoUrl = logosData[logoKey] || null
      }

      // Monta os slides com layers completas do template
      const completeSlides = slides.map((slide, index) => {
        // Busca o slide original do template pelo título ou pelo índice como fallback.
        // Nunca confiamos em slide.slide_uuid aqui porque o webhook geracopies
        // pode devolver o UUID do template (não do slide individual).
        const templateSlide =
          data?.templateUsado?.slides?.find((ts: any) => ts.title === slide.slide_name) ||
          data?.templateUsado?.slides?.[index]

        let allLayers: any[] = []
        try {
          if (templateSlide?.layers) {
            allLayers = typeof templateSlide.layers === "string"
              ? JSON.parse(templateSlide.layers)
              : Array.isArray(templateSlide.layers) ? templateSlide.layers : []
          }
        } catch (e) {
          console.error(`[autopost] Erro ao parsear layers: ${slide.slide_name}`, e)
        }

        return {
          // UUID sempre vem do template original — fonte de verdade
          slide_uuid: templateSlide?.uuid || String(templateSlide?.id) || null,
          slide_number: slide.slide_number,
          slide_name: slide.slide_name,
          slide_type: slide.slide_type,
          content: slide.content,
          design_notes: slide.design_notes || "",
          layers: allLayers,
          generate_with_ai: slide.imageSource === "ai",
          uploaded_image_url: slide.uploadedImageUrl || null,
          ai_prompt: slide.aiPrompt || "",
          ai_style: slide.aiStyle || "Realista",
        }
      })

      const payload = {
        slides: completeSlides,
        legenda: data?.legenda || "",
        metadata: {
          ...(data?.metadata || {}),
          username: getUsername(),
          logo_url: selectedLogoUrl,
          template_name: data?.templateUsado?.name || "",
        },
        timestamp: new Date().toISOString(),
      }

      console.log("[autopost] Payload → criacarrossel:", JSON.stringify(payload, null, 2))

      const response = await fetch("https://primary-production-43a3.up.railway.app/webhook/criacarrossel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "cors",
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errText}`)
      }

      const responseData = await response.json()
      console.log("[autopost] Resposta ← criacarrossel:", JSON.stringify(responseData, null, 2))

      // Extrai as URLs das imagens geradas
      let imageUrls: string[] = []
      if (Array.isArray(responseData) && responseData.length > 0) {
        if (responseData[0]?.img) {
          imageUrls = responseData.map((item: any) => item.img)
        } else if (responseData[0]?.all_images && Array.isArray(responseData[0].all_images)) {
          imageUrls = responseData[0].all_images
        } else {
          let i = 1
          while (responseData[0]?.[`img${i}`]) {
            imageUrls.push(responseData[0][`img${i}`])
            i++
          }
        }
      }

      console.log("[autopost] URLs de imagens extraídas:", imageUrls.length)

      setSlides((prev) =>
        prev.map((s, i) => ({ ...s, imagemFinal: imageUrls[i] || null }))
      )
      setCarrosselFinalizado(true)

      // Volta para o primeiro slide para visualizar
      emblaApi?.scrollTo(0)
    } catch (error: any) {
      console.error("[autopost] Erro webhook criacarrossel:", error)
      setGenerationError(`Erro ao gerar imagens: ${error.message}`)
    } finally {
      setIsGeneratingPlacid(false)
    }
  }

  // -------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------
  const getContentPreview = (content: Record<string, string>) => {
    return Object.values(content).filter(Boolean).join("\n\n")
  }

  const getTemplateThumbnail = (index: number) => {
    return (
      data?.templateUsado?.slides?.[index]?.thumbnail ||
      data?.templateUsado?.slides?.[0]?.thumbnail ||
      "/placeholder.svg"
    )
  }

  const aprovadosCount = slides.filter((s) => s.aprovado).length
  const todosAprovados = aprovadosCount === slides.length && slides.length > 0
  const currentSlide = slides[currentSlideIndex]

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------
  return (
    <div className="flex h-full flex-col bg-background relative">

      {/* HEADER */}
      <header className="flex items-center justify-between px-5 pt-6 pb-4 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
        <button
          onClick={onBack}
          disabled={isGeneratingPlacid}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-40"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-semibold text-foreground">
            {carrosselFinalizado ? "Carrossel Pronto! 🎉" : "Revise os Textos"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {currentSlideIndex + 1} de {slides.length} slides · {aprovadosCount} aprovados
          </p>
        </div>
        <div className="w-10" />
      </header>

      {/* CARROSSEL */}
      <div className="flex-1 flex flex-col justify-center relative overflow-hidden pb-4">
        {/* Seta esquerda */}
        <button
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canScrollPrev}
          className="hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md text-foreground hover:bg-secondary transition-all disabled:opacity-0 disabled:pointer-events-none"
          aria-label="Slide anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Seta direita */}
        <button
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canScrollNext}
          className="hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md text-foreground hover:bg-secondary transition-all disabled:opacity-0 disabled:pointer-events-none"
          aria-label="Próximo slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="overflow-hidden w-full" ref={emblaRef}>
          {/* Sem gap aqui: Embla não tolera gap no track. Espaçamento via pl nos slides. */}
          <div className="flex items-center h-[60vh]">
            {slides.map((slide, index) => (
              <div key={index} className="flex-[0_0_85%] sm:flex-[0_0_50%] md:flex-[0_0_35%] lg:flex-[0_0_26%] min-w-0 h-full flex items-center justify-center pl-3 first:pl-6 md:first:pl-12 lg:first:pl-20 last:pr-6 md:last:pr-12 lg:last:pr-20">
                <motion.div
                  className={`relative w-full max-w-[320px] mx-auto aspect-[4/5] rounded-2xl overflow-hidden shadow-xl transition-all ${
                    slide.aprovado ? "ring-4 ring-primary" : "border-2 border-border"
                  }`}
                  animate={
                    isGeneratingPlacid
                      ? { scale: [1, 1.03, 1] }
                      : { scale: currentSlideIndex === index ? 1 : 0.88, opacity: currentSlideIndex === index ? 1 : 0.5 }
                  }
                  transition={isGeneratingPlacid ? { repeat: Infinity, duration: 2 } : { duration: 0.3 }}
                >
                  {/* Imagem final do Placid */}
                  {carrosselFinalizado && slide.imagemFinal ? (
                    <img src={slide.imagemFinal} alt={`Slide ${index + 1} final`} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      {/* Preview: thumbnail do template + texto sobreposto */}
                      <img
                        src={getTemplateThumbnail(index)}
                        className="w-full h-full object-cover brightness-50"
                        alt="Template preview"
                      />
                      <button
                        className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-black/40 hover:bg-black/60 transition-colors w-full"
                        onClick={currentSlideIndex === index ? openEditDrawer : undefined}
                        tabIndex={currentSlideIndex === index ? 0 : -1}
                      >
                        <p className="text-white font-bold text-base drop-shadow-lg break-words w-full line-clamp-8 leading-snug">
                          {getContentPreview(slide.content) || slide.slide_name}
                        </p>
                        {currentSlideIndex === index && (
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-1.5 opacity-70">
                            <Edit3 className="w-3 h-3 text-white" />
                            <span className="text-[10px] text-white font-medium uppercase tracking-widest">Toque para editar</span>
                          </div>
                        )}
                      </button>
                    </>
                  )}

                  {/* Badge de aprovado */}
                  {slide.aprovado && !carrosselFinalizado && (
                    <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary shadow-md">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}

                  {/* Overlay de geração */}
                  <AnimatePresence>
                    {isGeneratingPlacid && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center"
                      >
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        {/* DOTS */}
        <div className="flex justify-center gap-2 mt-4">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-2 rounded-full transition-all ${i === currentSlideIndex ? "w-6 bg-primary" : s.aprovado ? "w-2 bg-primary/40" : "w-2 bg-border"}`}
            />
          ))}
        </div>

        {/* CONTROLES INLINE */}
        {!carrosselFinalizado && !isGeneratingPlacid && currentSlide && (
          <div className="w-full max-w-md mx-auto flex justify-center gap-3 mt-5 px-6">
            <button
              onClick={openEditDrawer}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium active:scale-95 transition-all"
            >
              <Edit3 className="w-4 h-4" />
              Editar Texto
            </button>

            {currentSlide.has_picture && (
              <button
                onClick={() => setIsImageDrawerOpen(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium active:scale-95 transition-all ${
                  currentSlide.imageSource !== "none"
                    ? "bg-primary/10 border border-primary text-primary"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                {currentSlide.imageSource === "none" ? "Imagem" : currentSlide.imageSource === "ai" ? "IA ✓" : "Upload ✓"}
              </button>
            )}

            <button
              onClick={handleApproveSlide}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium active:scale-95 transition-all ${
                currentSlide.aprovado
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-card border-2 border-border text-foreground"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {currentSlide.aprovado ? "Aprovado" : "Aprovar"}
            </button>
          </div>
        )}

        {/* Erro de geração */}
        {generationError && (
          <div className="mx-6 mt-4 rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-center">
            <p className="text-sm text-destructive">{generationError}</p>
            <button onClick={() => setGenerationError(null)} className="mt-1 text-xs font-semibold text-destructive underline">
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* CTA FIXO NO BOTTOM */}
      <div className="p-5 bg-card border-t border-border z-20 flex justify-center">
        {!carrosselFinalizado ? (
          <button
            onClick={handleGerarImagensPlacid}
            disabled={!todosAprovados || isGeneratingPlacid}
            className="w-full max-w-md flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
          >
            {isGeneratingPlacid ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Gerando Imagens...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Gerar Carrossel ({aprovadosCount}/{slides.length})</>
            )}
          </button>
        ) : (
          <button
            onClick={() => {
              const urls = slides.map((s) => s.imagemFinal).filter(Boolean) as string[]
              console.log("[autopost] Imagens finais:", urls)
              // TODO: implementar download ZIP
            }}
            className="w-full max-w-md flex items-center justify-center gap-2 rounded-2xl bg-foreground text-background py-4 text-base font-bold shadow-xl transition-all active:scale-[0.98]"
          >
            <Download className="w-5 h-5" />
            Baixar Carrossel
          </button>
        )}
      </div>

      {/* ================================================= */}
      {/* GAVETA DE EDIÇÃO DE TEXTO */}
      {/* ================================================= */}
      <Drawer.Root open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[32px] bg-background border-t border-border p-5 pb-10 max-h-[85vh] overflow-y-auto">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-muted flex-shrink-0" />
            <h3 className="text-lg font-bold mb-4 flex-shrink-0">
              Editar — {currentSlide?.slide_name || `Slide ${currentSlideIndex + 1}`}
            </h3>

            <div className="space-y-4">
              {Object.entries(editingContent).map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                    {key}
                  </label>
                  <textarea
                    value={value}
                    onChange={(e) => setEditingContent((prev) => ({ ...prev, [key]: e.target.value }))}
                    rows={key === "corpo" || key === "texto" ? 4 : 2}
                    className="w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={saveEditedContent}
              className="w-full mt-6 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Check className="w-5 h-5" />
              Salvar e Aprovar
            </button>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ================================================= */}
      {/* GAVETA DE IMAGEM (para slides com has_picture) */}
      {/* ================================================= */}
      <Drawer.Root open={isImageDrawerOpen} onOpenChange={setIsImageDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[32px] bg-background border-t border-border p-5 pb-10">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-muted" />
            <h3 className="text-lg font-bold mb-1">
              Imagem — {currentSlide?.slide_name || `Slide ${currentSlideIndex + 1}`}
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              Layers de imagem: {currentSlide?.picture_layers?.join(", ")}
            </p>

            <div className="space-y-3">
              {/* Opção: Gerar com IA */}
              <button
                onClick={() => {
                  setSlides((prev) => prev.map((s, i) => i === currentSlideIndex ? { ...s, imageSource: "ai" } : s))
                }}
                className={`w-full flex items-center gap-4 rounded-2xl border-2 p-4 transition-all ${
                  currentSlide?.imageSource === "ai" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground text-sm">Gerar com IA</p>
                  <p className="text-xs text-muted-foreground">A IA cria a imagem automaticamente</p>
                </div>
                {currentSlide?.imageSource === "ai" && <Check className="h-5 w-5 text-primary ml-auto" />}
              </button>

              {/* Prompt da IA (se AI selecionado) */}
              {currentSlide?.imageSource === "ai" && (
                <div className="space-y-2 pl-2">
                  <input
                    type="text"
                    value={currentSlide.aiPrompt}
                    onChange={(e) => setSlides((prev) => prev.map((s, i) => i === currentSlideIndex ? { ...s, aiPrompt: e.target.value } : s))}
                    placeholder="Descreva a imagem (opcional)..."
                    className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <select
                    value={currentSlide.aiStyle}
                    onChange={(e) => setSlides((prev) => prev.map((s, i) => i === currentSlideIndex ? { ...s, aiStyle: e.target.value } : s))}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="Realista">Realista</option>
                    <option value="3D">3D</option>
                    <option value="Ilustração">Ilustração</option>
                    <option value="Minimalista">Minimalista</option>
                  </select>
                </div>
              )}

              {/* Opção: Upload */}
              <label className={`w-full flex items-center gap-4 rounded-2xl border-2 p-4 transition-all cursor-pointer ${
                currentSlide?.imageSource === "upload" ? "border-primary bg-primary/5" : "border-border"
              }`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-foreground text-sm">Fazer Upload</p>
                  <p className="text-xs text-muted-foreground">
                    {currentSlide?.uploadedImageUrl ? "Imagem enviada ✓" : "Enviar imagem do dispositivo"}
                  </p>
                </div>
                {currentSlide?.imageSource === "upload" && <Check className="h-5 w-5 text-primary ml-auto" />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <button
              onClick={() => setIsImageDrawerOpen(false)}
              className="w-full mt-5 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg active:scale-95 transition-all"
            >
              Confirmar
            </button>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}
