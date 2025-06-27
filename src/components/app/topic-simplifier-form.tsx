"use client";

import { useState } from 'react';
import { 
  simplifyTopicAsAnimation, 
  simplifyTopicAsDiagram, 
  type SimplifyTopicAnimationOutput, 
  type SimplifyTopicDiagramOutput 
} from '@/ai/flows/topic-simplifier';
import { generateSceneImages, type GenerateSceneImagesOutput } from '@/ai/flows/image-generator';
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

export function TopicSimplifierForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimplifyTopicAnimationOutput | null>(null);
  const { toast } = useToast();

  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramResult, setDiagramResult] = useState<SimplifyTopicDiagramOutput | null>(null);
  const [submittedTopic, setSubmittedTopic] = useState<string>('');

  const [imageLoading, setImageLoading] = useState(false);
  const [imageResults, setImageResults] = useState<GenerateSceneImagesOutput | null>(null);
  const [imageStyle, setImageStyle] = useState('Fotogerçekçi');
  const imageStyles = ['Fotogerçekçi', 'Dijital Sanat', 'Sulu Boya', 'Çizgi Roman', 'Düşük Poli'];


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);
    setDiagramResult(null);
    setImageResults(null);
    setSubmittedTopic(values.topic);
    try {
      const res = await simplifyTopicAsAnimation({ topic: values.topic });
      setResult(res);
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

  const handleGenerateDiagram = async () => {
    if (!submittedTopic) return;
    setDiagramLoading(true);
    setDiagramResult(null);
    try {
      const res = await simplifyTopicAsDiagram({ topic: submittedTopic });
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
    if (!result?.scenes?.length) return;
    setImageLoading(true);
    setImageResults(null);
    try {
      const sceneDescriptions = result.scenes.map(s => s.description);
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
                  Generating...
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
            <p>AI is thinking and creating an animation... this may take a moment.</p>
          </div>
        )}

        {result && (
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
                      <Carousel className="w-full max-w-xl mx-auto" opts={{ loop: true }}>
                          <CarouselContent>
                              {result.scenes.map((scene, index) => (
                                  <CarouselItem key={index} className="flex flex-col items-center text-center">
                                      <div className="p-1 border bg-muted rounded-lg shadow-inner w-full aspect-video flex items-center justify-center" dangerouslySetInnerHTML={{ __html: scene.svg }} />
                                      <p className="text-sm text-muted-foreground mt-2 h-10">{scene.description}</p>
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
                    <p className="text-sm text-muted-foreground">{result.summary}</p>
                  </div>

                  <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Network /> Diyagram Şeması</h3>
                    {!diagramResult && !diagramLoading && (
                        <div className="flex flex-col items-center text-center gap-4 p-4 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">Konuyu özetleyen bir diyagram da oluşturabilirsiniz.</p>
                            <Button onClick={handleGenerateDiagram} disabled={diagramLoading}>
                                <Sparkles className="mr-2 h-4 w-4" /> Diyagram Oluştur
                            </Button>
                        </div>
                    )}
                    {diagramLoading && (
                        <div className="flex justify-center items-center p-8 w-full">
                             <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                             <p>Diyagram oluşturuluyor...</p>
                        </div>
                    )}
                    {diagramResult && (
                        <div className="w-full p-1 border bg-background rounded-lg shadow-inner" dangerouslySetInnerHTML={{ __html: diagramResult.svg }} />
                    )}
                  </div>
                  <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ImageIcon /> Sahne Görselleri</h3>
                    {!imageResults && !imageLoading && (
                        <div className="flex flex-col items-center text-center gap-4 p-4 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">Animasyon sahnelerini temel alan görseller oluşturun. Lütfen bir tarz seçin:</p>
                             <RadioGroup defaultValue="Fotogerçekçi" value={imageStyle} onValueChange={setImageStyle} className="flex flex-wrap justify-center gap-x-6 gap-y-2 my-2">
                              {imageStyles.map((style) => (
                                <div key={style} className="flex items-center space-x-2">
                                  <RadioGroupItem value={style} id={`ts-style-${style}`} />
                                  <Label htmlFor={`ts-style-${style}`}>{style}</Label>
                                </div>
                              ))}
                            </RadioGroup>
                            <Button onClick={handleGenerateImage} disabled={imageLoading} className="mt-2">
                                <Sparkles className="mr-2 h-4 w-4" /> Görselleri Oluştur
                            </Button>
                        </div>
                    )}
                    {imageLoading && (
                        <div className="flex justify-center items-center p-8 w-full">
                             <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                             <p>Görseller oluşturuluyor... Bu işlem biraz uzun sürebilir.</p>
                        </div>
                    )}
                    {imageResults && (
                        <Carousel className="w-full max-w-xl mx-auto" opts={{ loop: true }}>
                          <CarouselContent>
                              {imageResults.images.map((imageDataUri, index) => (
                                  <CarouselItem key={index} className="flex flex-col items-center text-center">
                                      <div className="p-1 border bg-muted rounded-lg shadow-inner w-full">
                                          <img src={imageDataUri} alt={result.scenes[index]?.description || `Scene ${index + 1}`} className="w-full h-auto object-contain aspect-video" data-ai-hint="scene illustration"/>
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-2 h-10">{result.scenes[index]?.description}</p>
                                  </CarouselItem>
                              ))}
                          </CarouselContent>
                          <CarouselPrevious />
                          <CarouselNext />
                      </Carousel>
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
