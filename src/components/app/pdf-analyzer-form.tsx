"use client";

import { useState, type ChangeEvent } from 'react';
import { analyzePdfContentAsAnimation, analyzePdfContentAsDiagram, type AnalyzePdfContentAnimationOutput, type AnalyzePdfContentDiagramOutput } from '@/ai/flows/pdf-content-analyzer';
import { generateSceneImages, type GenerateSceneImagesOutput } from '@/ai/flows/image-generator';
import { FileUp, Loader2, Sparkles, UploadCloud, X, FileText, Network, Film, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';


export function PdfAnalyzerForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzePdfContentAnimationOutput | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUri, setFileDataUri] = useState<string | null>(null);
  const { toast } = useToast();

  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramResult, setDiagramResult] = useState<AnalyzePdfContentDiagramOutput | null>(null);

  const [imageLoading, setImageLoading] = useState(false);
  const [imageResults, setImageResults] = useState<GenerateSceneImagesOutput | null>(null);
  const [imageStyle, setImageStyle] = useState('Fotogerçekçi');
  const imageStyles = ['Fotogerçekçi', 'Dijital Sanat', 'Sulu Boya', 'Çizgi Roman', 'Düşük Poli'];


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
    setDiagramResult(null);
    setImageResults(null);
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
    setDiagramResult(null);
    setImageResults(null);
    try {
      const res = await analyzePdfContentAsAnimation({ pdfDataUri: fileDataUri });
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

  const handleGenerateDiagram = async () => {
    if (!fileDataUri) return;
    setDiagramLoading(true);
    setDiagramResult(null);
    try {
      const res = await analyzePdfContentAsDiagram({ pdfDataUri: fileDataUri });
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
            <FileUp className="text-accent" />
            PDF Analyzer
        </CardTitle>
        <CardDescription>
          Upload a PDF document, and our AI will generate a simplified animation and diagram.
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
            <p>AI is reading your PDF and creating an animation... this might take a moment.</p>
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
                  <div className="mt-6 pt-6 border-t">
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
                                  <RadioGroupItem value={style} id={`pdf-style-${style}`} />
                                  <Label htmlFor={`pdf-style-${style}`}>{style}</Label>
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
