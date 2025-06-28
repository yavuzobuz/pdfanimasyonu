"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  simplifyTopicGetScript,
  simplifyTopicSummaryAsDiagram,
  simplifyTopicSummaryAsThemedDiagram,
} from '@/ai/flows/topic-simplifier';
import { generateSvg } from '@/ai/actions/generate-svg';
import { generateSceneImages } from '@/ai/flows/image-generator';
import type { 
  TopicAnimationScript, 
  SimplifyTopicDiagramOutput,
  GenerateSceneImagesOutput
} from '@/ai/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Sparkles, Wand2, FileText, Network, Film, Image as ImageIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  topic: z
    .string()
    .min(10, {
      message: 'Please enter a more descriptive topic (at least 10 characters).',
    })
    .max(200, {
      message: 'Topic must not be longer than 200 characters.',
    }),
});

type Visual = {
  description: string;
  svg: string;
};

// Bilimsel yükleme animasyonu komponenti
const ScientificLoadingAnimation = ({ message = "Oluşturuluyor..." }: { message?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative w-24 h-24">
        {/* Ana daire - DNA sarmalı gibi dönen */}
        <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500"></div>
        
        {/* İç molekül */}
        <div className="absolute inset-2 border-2 border-green-200 rounded-full animate-pulse border-t-green-500"></div>
        
        {/* Merkez atom */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
        </div>
        
        {/* Yörünge elektronları */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute top-0 left-1/2 w-2 h-2 bg-yellow-400 rounded-full transform -translate-x-1/2"></div>
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>
          <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-red-400 rounded-full transform -translate-x-1/2"></div>
        </div>
        
        {/* Yan elektronlar */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
          <div className="absolute top-1/2 right-0 w-2 h-2 bg-cyan-400 rounded-full transform -translate-y-1/2"></div>
        </div>
      </div>
      
      {/* Bilimsel ikonlar etrafında */}
      <div className="flex space-x-2 opacity-60">
        <div className="w-6 h-6 animate-bounce" style={{ animationDelay: '0s' }}>🧬</div>
        <div className="w-6 h-6 animate-bounce" style={{ animationDelay: '0.2s' }}>⚛️</div>
        <div className="w-6 h-6 animate-bounce" style={{ animationDelay: '0.4s' }}>🔬</div>
        <div className="w-6 h-6 animate-bounce" style={{ animationDelay: '0.6s' }}>⚗️</div>
        <div className="w-6 h-6 animate-bounce" style={{ animationDelay: '0.8s' }}>🧪</div>
      </div>
      
      <p className="text-sm text-muted-foreground animate-pulse font-medium">{message}</p>
    </div>
  );
};

// Diyagram yükleme animasyonu
const DiagramLoadingAnimation = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative w-20 h-20">
        {/* Şema ağ yapısı */}
        <div className="absolute inset-0 grid grid-cols-3 gap-1">
          {[...Array(9)].map((_, i) => (
            <div 
              key={i} 
              className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}
            ></div>
          ))}
        </div>
        
        {/* Bağlantı çizgileri efekti */}
        <div className="absolute inset-0 border-2 border-dashed border-orange-300 rounded-lg animate-ping"></div>
      </div>
      
      <div className="flex space-x-2">
        <div className="animate-bounce" style={{ animationDelay: '0s' }}>📊</div>
        <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>📋</div>
        <div className="animate-bounce" style={{ animationDelay: '0.4s' }}>🗂️</div>
      </div>
      
      <p className="text-sm text-muted-foreground animate-pulse font-medium">Diyagram şeması oluşturuluyor...</p>
    </div>
  );
};

export function TopicSimplifierForm() {
  const [loading, setLoading] = useState(false); // For script generation
  const [script, setScript] = useState<TopicAnimationScript | null>(null);
  const [visuals, setVisuals] = useState<Visual[]>([]);
  const [visualsLoading, setVisualsLoading] = useState(false);
  const { toast } = useToast();

  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramResult, setDiagramResult] = useState<SimplifyTopicDiagramOutput | null>(null);
  const [submittedTopic, setSubmittedTopic] = useState<string>('');

  const [imageLoading, setImageLoading] = useState(false);
  const [imageResults, setImageResults] = useState<GenerateSceneImagesOutput | null>(null);
  const [imageStyle, setImageStyle] = useState('Fotogerçekçi');
  const imageStyles = ['Fotogerçekçi', 'Dijital Sanat', 'Sulu Boya', 'Çizgi Roman', 'Düşük Poli', '3D Render'];

  // Diyagram tema state'leri
  const [diagramTheme, setDiagramTheme] = useState('Klasik');
  const diagramThemes = [
    { id: 'Klasik', name: 'Klasik', description: 'Geleneksel dikdörtgen ve oklar' },
    { id: 'Modern', name: 'Modern', description: 'Yuvarlak köşeler ve gradyanlar' },
    { id: 'Minimalist', name: 'Minimalist', description: 'Sade çizgiler ve az renk' },
    { id: 'Renkli', name: 'Renkli', description: 'Canlı renkler ve gölgeler' },
    { id: 'Akış', name: 'Akış Diyagramı', description: 'Süreç odaklı akış şeması' },
    { id: 'Ağ', name: 'Ağ Şeması', description: 'Bağlantılı ağ yapısı' },
    { id: 'Süreç', name: 'Süreç Akışı', description: 'Detaylı süreç adımları ve dallanmalar' }
  ];

  // Diagram zoom and pan state
  const [diagramTransform, setDiagramTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const diagramRef = useRef<HTMLDivElement>(null);

  // Diagram interaction handlers
  const handleDiagramWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
    setDiagramTransform(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale * scaleChange))
    }));
  };

  const handleDiagramMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleDiagramMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    setDiagramTransform(prev => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleDiagramMouseUp = () => {
    setIsDragging(false);
  };

  const resetDiagramView = () => {
    setDiagramTransform({ scale: 1, x: 0, y: 0 });
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setScript(null);
    setVisuals([]);
    setDiagramResult(null);
    setImageResults(null);
    setSubmittedTopic(values.topic);
    try {
      const res = await simplifyTopicGetScript({ topic: values.topic });
      setScript(res);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'An error occurred.',
        description:
          'Failed to simplify the topic. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => {
    if (!script?.scenes?.length) return;

    const generateVisuals = async () => {
      setVisualsLoading(true);
      // Set initial placeholders with loading state
      setVisuals(script.scenes.map(desc => ({ description: desc, svg: 'loading' })));

      const generatedVisuals: Visual[] = [];
      for (const sceneDescription of script.scenes) {
        const svg = await generateSvg(sceneDescription);
        const newVisual = { description: sceneDescription, svg };
        generatedVisuals.push(newVisual);
        
        // Update state incrementally to show progress
        setVisuals(currentVisuals => {
            const updatedVisuals = [...currentVisuals];
            const index = updatedVisuals.findIndex(v => v.description === sceneDescription);
            if (index !== -1) {
                updatedVisuals[index] = newVisual;
            }
            return updatedVisuals;
        });
      }
      setVisualsLoading(false);
    };

    generateVisuals();
  }, [script]);

  const handleGenerateDiagram = async () => {
    if (!submittedTopic || !script?.summary) return;
    setDiagramLoading(true);
    setDiagramResult(null);
    try {
      const res = await simplifyTopicSummaryAsThemedDiagram({ 
        topic: submittedTopic, 
        summary: script.summary, 
        theme: diagramTheme 
      });
      setDiagramResult(res);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'An error occurred.',
        description: 'Failed to generate the diagram. Please try again.',
      });
    } finally {
      setDiagramLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    // Görsel oluşturma için animasyon sahneleri veya özet metni kullanılabilir
    if (!visuals?.length && !script?.summary) return;
    
    setImageLoading(true);
    setImageResults(null);
    try {
      let sceneDescriptions: string[];
      
      if (visuals?.length > 0) {
        // Animasyon sahneleri varsa onları kullan
        sceneDescriptions = visuals.map(s => s.description);
      } else if (script?.summary) {
        // Animasyon sahneleri yoksa özet metninden sahneler oluştur
        const summaryParts = script.summary.split('\n\n').filter(part => part.trim().length > 0);
        sceneDescriptions = summaryParts.slice(0, 4).map((part, index) => {
          const title = part.split(':')[0] || part.split('.')[0] || `Sahne ${index + 1}`;
          return `${submittedTopic} konusunda: ${title.trim()}`;
        });
      } else {
        return;
      }
      
      const res = await generateSceneImages({ scenes: sceneDescriptions, style: imageStyle });
      setImageResults(res);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'An error occurred.',
        description: 'Failed to generate the images. Please try again.',
      });
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Wand2 className="text-accent" />
          Topic Simplifier
        </CardTitle>
        <CardDescription>
          Enter a complex topic, and our AI will generate a simplified animation and diagram to explain it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Explain photosynthesis to a 5th grader"
                      className="resize-none h-28"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Script...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Animation
                </>
              )}
            </Button>
          </form>
        </Form>

        {loading && (
          <div className="mt-6 text-center text-muted-foreground">
            <p>AI is thinking and creating a script... this may take a moment.</p>
          </div>
        )}

        {script && (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film />
                  Eğitici Animasyon ve Diyagram
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div>
                      <h3 className="text-lg font-semibold mb-4">Animasyon Sahneleri</h3>
                      <Carousel className="w-full max-w-4xl mx-auto" opts={{ loop: true }}>
                          <CarouselContent>
                              {visuals.map((scene, index) => (
                                  <CarouselItem key={index} className="flex flex-col items-center text-center">
                                      <div className="p-2 border bg-muted rounded-lg shadow-inner w-full h-[500px] flex items-center justify-center overflow-hidden">
                                        {scene.svg === 'loading' ? (
                                           <ScientificLoadingAnimation message={`Sahne ${index + 1} oluşturuluyor...`} />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center scale-95" dangerouslySetInnerHTML={{ __html: scene.svg }} />
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-2 px-2 text-center leading-tight">{scene.description}</p>
                                  </CarouselItem>
                              ))}
                          </CarouselContent>
                          <CarouselPrevious />
                          <CarouselNext />
                      </Carousel>
                  </div>

                  <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <FileText />
                      Konu Özeti
                    </h3>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      {script.summary.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="mb-3 text-sm leading-relaxed">{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t">
                    {/* Diyagram Tema Seçimi */}
                    <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Network className="h-4 w-4" />
                        Diyagram Teması Seçin
                      </h4>
                      <RadioGroup value={diagramTheme} onValueChange={setDiagramTheme} className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {diagramThemes.map((theme) => (
                          <div key={theme.id} className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-background transition-colors">
                            <RadioGroupItem value={theme.id} id={`theme-${theme.id}`} className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor={`theme-${theme.id}`} className="text-sm font-medium cursor-pointer">
                                {theme.name}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">{theme.description}</p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div className="flex justify-center gap-4 mb-6">
                      <Button onClick={handleGenerateDiagram} disabled={diagramLoading || !submittedTopic || !script?.summary} variant="outline">
                        <Network className="mr-2 h-4 w-4" /> {diagramTheme} Diyagram Oluştur
                      </Button>
                      <Button onClick={handleGenerateImage} disabled={imageLoading || (!visuals?.length && !script?.summary)} variant="outline">
                        <ImageIcon className="mr-2 h-4 w-4" /> Görsel Oluştur
                      </Button>
                    </div>
                    
                    {diagramLoading && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Network /> Diyagram Şeması</h3>
                          <DiagramLoadingAnimation />
                        </div>
                    )}
                    {diagramResult && (
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Network /> Diyagram Şeması
                            </h3>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={resetDiagramView}
                                title="Görünümü sıfırla"
                              >
                                🔄 Sıfırla
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                Zoom: {Math.round(diagramTransform.scale * 100)}%
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted/30 rounded">
                            💡 İpucu: Fare tekerleği ile yakınlaştır/uzaklaştır, sürükleyerek hareket ettir
                          </div>
                          <div 
                            ref={diagramRef}
                            className="w-full max-w-4xl mx-auto h-[600px] p-4 border bg-background rounded-lg shadow-inner overflow-hidden cursor-grab"
                            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                            onWheel={handleDiagramWheel}
                            onMouseDown={handleDiagramMouseDown}
                            onMouseMove={handleDiagramMouseMove}
                            onMouseUp={handleDiagramMouseUp}
                            onMouseLeave={handleDiagramMouseUp}
                          >
                            <div 
                              className="w-full h-full flex items-center justify-center transition-transform duration-75"
                              style={{
                                transform: `translate(${diagramTransform.x}px, ${diagramTransform.y}px) scale(${diagramTransform.scale})`,
                                transformOrigin: 'center center'
                              }}
                              dangerouslySetInnerHTML={{ __html: diagramResult.svg }} 
                            />
                          </div>
                        </div>
                    )}
                    
                    {imageLoading && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ImageIcon /> Sahne Görselleri</h3>
                          <div className="flex flex-col items-center text-center gap-4 p-4 border-2 border-dashed rounded-lg mb-4">
                            <p className="text-muted-foreground">Animasyon sahnelerini temel alan görseller oluşturun. Lütfen bir tarz seçin:</p>
                            <RadioGroup defaultValue="Fotogerçekçi" value={imageStyle} onValueChange={setImageStyle} className="flex flex-wrap justify-center gap-x-6 gap-y-2 my-2">
                              {imageStyles.map((style) => (
                                <div key={style} className="flex items-center space-x-2">
                                  <RadioGroupItem value={style} id={`ts-style-${style}`} />
                                  <Label htmlFor={`ts-style-${style}`}>{style}</Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                          <div className="flex justify-center items-center p-8 w-full">
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            <p>Görseller oluşturuluyor... Bu işlem biraz uzun sürebilir.</p>
                          </div>
                        </div>
                    )}
                    {imageResults && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ImageIcon /> Sahne Görselleri</h3>
                          <Carousel className="w-full max-w-4xl mx-auto" opts={{ loop: true }}>
                            <CarouselContent>
                                {imageResults.images.map((imageDataUri, index) => (
                                    <CarouselItem key={index} className="flex flex-col items-center text-center">
                                        <div className="p-2 border bg-muted rounded-lg shadow-inner w-full h-[500px] flex items-center justify-center overflow-hidden">
                                            <img src={imageDataUri} alt={visuals[index]?.description || `Scene ${index + 1}`} className="w-full h-full object-contain" data-ai-hint="scene illustration"/>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-2 px-2 text-center leading-tight">{visuals[index]?.description}</p>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious />
                            <CarouselNext />
                        </Carousel>
                        </div>
                    )}
                    
                    {!imageResults && !imageLoading && !diagramResult && !diagramLoading && (
                        <div className="flex flex-col items-center text-center gap-4 p-4 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">Yukarıdaki butonları kullanarak diyagram şeması ve görseller oluşturabilirsiniz.</p>
                            <div className="text-sm text-muted-foreground">
                              <p>• <strong>Diyagram Şeması:</strong> Konuyu özetleyen basit şema</p>
                              <p>• <strong>Görsel Oluştur:</strong> Animasyon sahnelerini temel alan görseller</p>
                            </div>
                            <div className="mt-4">
                              <p className="text-sm text-muted-foreground mb-2">Görsel tarzını seçin:</p>
                              <RadioGroup defaultValue="Fotogerçekçi" value={imageStyle} onValueChange={setImageStyle} className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                                {imageStyles.map((style) => (
                                  <div key={style} className="flex items-center space-x-2">
                                    <RadioGroupItem value={style} id={`ts-style-${style}`} />
                                    <Label htmlFor={`ts-style-${style}`}>{style}</Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </div>
                        </div>
                    )}
                  </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
