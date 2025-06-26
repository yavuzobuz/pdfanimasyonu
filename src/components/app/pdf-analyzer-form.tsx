"use client";

import { useState, type ChangeEvent } from 'react';
import { analyzePdfContent, type AnalyzePdfContentOutput } from '@/ai/flows/pdf-content-analyzer';
import { FileUp, Loader2, Sparkles, UploadCloud, X, FileText, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';


export function PdfAnalyzerForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzePdfContentOutput | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUri, setFileDataUri] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload a PDF file.',
        });
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setFileDataUri(loadEvent.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileDataUri(null);
    setResult(null);
  };
  
  const handleSubmit = async () => {
    if (!fileDataUri) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please upload a PDF file to analyze.',
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await analyzePdfContent({ pdfDataUri: fileDataUri });
      setResult(res);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'An error occurred.',
        description: 'Failed to analyze the PDF. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <FileUp className="text-accent" />
            PDF Analyzer
        </CardTitle>
        <CardDescription>
          Upload a PDF document, and our AI will extract key concepts and generate a simplified summary for an animation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!file ? (
          <div className="relative">
            <label htmlFor="pdf-upload" className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF (MAX. 5MB)</p>
              </div>
            </label>
            <Input id="pdf-upload" type="file" className="absolute w-0 h-0 opacity-0" accept="application/pdf" onChange={handleFileChange} />
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <span className="font-medium text-sm">{file.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={removeFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <Button onClick={handleSubmit} className="w-full mt-6" disabled={loading || !file}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Animation
            </>
          )}
        </Button>
        
        {loading && (
          <div className="mt-6 text-center text-muted-foreground">
            <p>AI is reading your PDF and creating a storyboard... this might take a moment.</p>
          </div>
        )}

        {result && (
            <div className="mt-8 space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                      <FileText />
                      Basitleştirilmiş Özet
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
                    Animasyon Senaryosu
                  </CardTitle>
                  <CardDescription>
                      PDF'inize dayalı sahne sahne storyboard aşağıdadır.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Carousel className="w-full">
                    <CarouselContent>
                      {result.animationScenario.map((scene, index) => (
                        <CarouselItem key={index}>
                          <div className="p-1">
                          <Card className="bg-card/50">
                              <CardContent className="flex flex-col items-center justify-center p-4 gap-4">
                                <div className="w-full aspect-video relative rounded-lg overflow-hidden bg-background shadow-inner">
                                  <img
                                    src={scene.imageDataUri}
                                    alt={scene.scene}
                                    className="w-full h-full object-contain"
                                    data-ai-hint="animation scene"
                                  />
                                </div>
                                <div className="w-full space-y-2 text-center pt-2">
                                  <h3 className="font-bold text-xl">{scene.scene}</h3>
                                  <p className="text-muted-foreground">{scene.description}</p>
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
