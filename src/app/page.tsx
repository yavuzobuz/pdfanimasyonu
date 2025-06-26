import { BookOpen, FileUp } from 'lucide-react';

import { AppFooter } from '@/components/app/footer';
import { AppHeader } from '@/components/app/header';
import { PdfAnalyzerForm } from '@/components/app/pdf-analyzer-form';
import { TopicSimplifierForm } from '@/components/app/topic-simplifier-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <AppHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground tracking-tight">
              AI-Powered Learning Animations
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Transform complex topics and PDF documents into simple, engaging
              animations. Perfect for educators and students alike.
            </p>
          </div>

          <Tabs defaultValue="topic" className="w-full max-w-3xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="topic" className="h-full text-base gap-2">
                <BookOpen className="w-5 h-5" />
                Simplify a Topic
              </TabsTrigger>
              <TabsTrigger value="pdf" className="h-full text-base gap-2">
                <FileUp className="w-5" />
                Analyze a PDF
              </TabsTrigger>
            </TabsList>
            <TabsContent value="topic" className="mt-6">
              <TopicSimplifierForm />
            </TabsContent>
            <TabsContent value="pdf" className="mt-6">
              <PdfAnalyzerForm />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
