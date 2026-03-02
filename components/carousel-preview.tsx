"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CarouselPreviewProps {
  slides: string[]
  isGenerating: boolean
}

export function CarouselPreview({ slides, isGenerating }: CarouselPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  if (isGenerating) {
    return (
      <Card className="aspect-[4/5] sm:aspect-[3/4] lg:aspect-square flex items-center justify-center bg-muted/50">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Gerando carrossel...</p>
        </div>
      </Card>
    )
  }

  if (slides.length === 0) {
    return (
      <Card className="aspect-[4/5] sm:aspect-[3/4] lg:aspect-square flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-3 px-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <div className="h-8 w-8 rounded-lg bg-primary/20" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Nenhum slide ainda</p>
            <p className="text-sm text-muted-foreground leading-relaxed">Descreva seu conteúdo e clique em gerar</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Carousel Card */}
      <Card className="aspect-[4/5] sm:aspect-[3/4] lg:aspect-square relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center p-8 lg:p-12 bg-gradient-to-br from-primary/5 to-primary/10">
          <p className="text-lg lg:text-2xl font-medium text-center text-balance text-foreground">
            {slides[currentSlide]}
          </p>
        </div>

        {/* Navigation Buttons */}
        {slides.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Slide Counter */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border">
            <p className="text-sm font-medium">
              {currentSlide + 1} / {slides.length}
            </p>
          </div>
        </div>
      </Card>

      {/* Slide Indicators */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                "h-2 rounded-full transition-all",
                index === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
