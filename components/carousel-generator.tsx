"use client"

import { useState } from "react"
import { Sparkles, Download, Share2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CarouselPreview } from "@/components/carousel-preview"

export function CarouselGenerator() {
  const [content, setContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [slides, setSlides] = useState<string[]>([])

  const handleGenerate = async () => {
    setIsGenerating(true)
    // Simulate AI generation - Replace with actual AI integration
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Mock generated slides
    const mockSlides = [
      "Slide 1: " + (content || "Conteúdo gerado por IA"),
      "Slide 2: Visualização criativa",
      "Slide 3: Resultados impressionantes",
      "Slide 4: Powered by AI",
    ]
    setSlides(mockSlides)
    setIsGenerating(false)
  }

  const handleDownload = () => {
    // Download functionality placeholder
    console.log("[v0] Download carousel")
  }

  const handleShare = () => {
    // Share functionality placeholder
    console.log("[v0] Share carousel")
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground lg:text-2xl">Gerador de Carrossel IA</h1>
              <p className="text-sm text-muted-foreground">Crie carrosséis incríveis em segundos</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
          {/* Input Section */}
          <div className="space-y-6">
            <Card className="p-6 lg:p-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="content" className="text-base font-medium">
                    Descreva seu carrossel
                  </Label>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Conte-nos sobre o que você gostaria de criar. Nossa IA irá gerar um carrossel personalizado para
                    você.
                  </p>
                </div>

                <Textarea
                  id="content"
                  placeholder="Ex: Um carrossel sobre dicas de produtividade para desenvolvedores, com visual moderno e inspirador..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px] resize-none text-base"
                />

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Gerar Carrossel
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Actions */}
            {slides.length > 0 && (
              <Card className="p-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-base">Ações</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleDownload} variant="outline" className="flex-1 h-11 bg-transparent">
                      <Download className="mr-2 h-4 w-4" />
                      Baixar
                    </Button>
                    <Button onClick={handleShare} variant="outline" className="flex-1 h-11 bg-transparent">
                      <Share2 className="mr-2 h-4 w-4" />
                      Compartilhar
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Preview Section */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground lg:text-2xl">Visualização</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {slides.length > 0 ? "Navegue pelos slides gerados" : "Seus slides aparecerão aqui após a geração"}
              </p>
            </div>

            <CarouselPreview slides={slides} isGenerating={isGenerating} />
          </div>
        </div>
      </div>
    </div>
  )
}
