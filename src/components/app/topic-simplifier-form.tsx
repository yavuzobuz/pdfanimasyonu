"use client";

import { useState } from 'react';
import { 
  simplifyTopicAsAnimation, 
  simplifyTopicAsDiagram, 
  type SimplifyTopicAnimationOutput, 
  type SimplifyTopicDiagramOutput 
} from '@/ai/flows/topic-simplifier';
import { generateIllustrativeImage, type GenerateImageOutput } from '@/ai/flows/image-generator';
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
  const [imageResult, setImageResult] = useState<GenerateImageOutput | null>(null);


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
    setImageResult(null);
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
    if (!submittedTopic) return;
    setImageLoading(true);
    setImageResult(null);
    try {
      const res = await generateIllustrativeImage({ topic: submittedTopic });
      setImageResult(res);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'An error occurred.',
        description: 'Failed to generate the image. Please try again.',
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
                                      <div className="p-1 border bg-muted rounded-lg shadow-inner w-full">
                                          <img src={scene.svgDataUri} alt={scene.description} className="w-full h-auto object-contain aspect-video" data-ai-hint="animation scene" />
                                      </div>
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
                        <div className="w-full p-1 border bg-background rounded-lg shadow-inner">
                            <img src={diagramResult.diagramDataUri} alt="Diyagram Şeması" className="w-full h-auto object-contain" data-ai-hint="diagram flowchart"/>
                        </div>
                    )}
                  </div>
                  <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ImageIcon /> Kavramsal Görsel</h3>
                    {!imageResult && !imageLoading && (
                        <div className="flex flex-col items-center text-center gap-4 p-4 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">Konuyu temsil eden kavramsal bir görsel oluşturun.</p>
                            <Button onClick={handleGenerateImage} disabled={imageLoading}>
                                <Sparkles className="mr-2 h-4 w-4" /> Görsel Oluştur
                            </Button>
                        </div>
                    )}
                    {imageLoading && (
                        <div className="flex justify-center items-center p-8 w-full">
                             <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                             <p>Görsel oluşturuluyor... Bu işlem biraz uzun sürebilir.</p>
                        </div>
                    )}
                    {imageResult && (
                        <div className="w-full p-1 border bg-background rounded-lg shadow-inner">
                            <img src={imageResult.imageDataUri} alt="Kavramsal Görsel" className="w-full h-auto object-contain" data-ai-hint="illustration concept"/>
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
