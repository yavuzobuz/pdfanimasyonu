"use client";

import { useState } from 'react';
import type { SimplifyTopicOutput } from '@/ai/flows/topic-simplifier';
import { simplifyTopic } from '@/ai/flows/topic-simplifier';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Sparkles, Wand2, FileText, PlayCircle } from 'lucide-react';
import Image from 'next/image';
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
  const [result, setResult] = useState<SimplifyTopicOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);
    try {
      const res = await simplifyTopic({ topic: values.topic });
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

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Wand2 className="text-accent" />
          Topic Simplifier
        </CardTitle>
        <CardDescription>
          Enter a complex topic, and our AI will generate a simplified summary and an animation scenario to explain it.
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
            <p>AI is thinking and creating a storyboard... this may take a moment.</p>
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText />
                  Simplified Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/80">{result.summary}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle />
                  Animation Storyboard
                </CardTitle>
                <CardDescription>
                    Here is a scene-by-scene storyboard for your animation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Carousel className="w-full">
                  <CarouselContent>
                    {result.animationScenario.map((scene, index) => (
                      <CarouselItem key={index}>
                        <div className="p-1">
                          <Card>
                            <CardContent className="flex flex-col md:flex-row items-center justify-center p-6 gap-6">
                              <div className="md:w-1/2 w-full aspect-video relative rounded-lg overflow-hidden">
                                <Image
                                  src={scene.imageDataUri}
                                  alt={scene.scene}
                                  fill
                                  className="object-cover"
                                  data-ai-hint="animation scene"
                                />
                              </div>
                              <div className="md:w-1/2 w-full space-y-2">
                                <h3 className="font-bold text-lg">{scene.scene}</h3>
                                <p className="text-sm text-muted-foreground">{scene.description}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden sm:flex" />
                  <CarouselNext className="hidden sm:flex" />
                </Carousel>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
