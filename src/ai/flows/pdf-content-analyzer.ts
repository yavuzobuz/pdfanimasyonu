'use server';

/**
 * @fileOverview This flow analyzes PDF content to create a simplified summary and either a visual animation or a diagram.
 *
 * - analyzePdfGetScript - Generates a multi-scene animation script from PDF content.
 * - analyzePdfContentAsDiagram - Generates a single diagram from PDF content.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { generateSvg } from '@/ai/actions/generate-svg';
import {
  AnalyzePdfContentInputSchema,
  PdfAnimationScriptSchema,
  type AnalyzePdfContentInput,
  type PdfAnimationScript,
  type AnalyzePdfContentDiagramOutput
} from '@/ai/schemas';


const pdfAnimationScriptPrompt = ai.definePrompt({
  name: 'pdfAnimationScriptPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: PdfAnimationScriptSchema},
  prompt: `You are an expert educator. Your responses must be in Turkish. Analyze the content of the following PDF. Your task is to create:
1.  A simplified summary of the PDF content.
2.  A list of 3 to 5 single-sentence scene descriptions for an educational animation. These descriptions should be literal and concrete, describing tangible scenes with recognizable people and objects that an illustrator can draw. For example, for "severance pay", describe "A smiling person receiving a bag of money from a business person in front of an office building." Avoid abstract concepts.

PDF Content: {{media url=pdfDataUri}}`,
});


const pdfDiagramDescriptionPrompt = ai.definePrompt({
  name: 'pdfDiagramDescriptionPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: z.string()},
  prompt: `You are an expert educator and visual designer skilled at simplifying complex topics from documents. Your responses must be in Turkish.

  Analyze the content of the following PDF document. Your task is to create a detailed description for a visual diagram that explains the key concepts and their relationships. This description will be used to generate an SVG. Be very specific about the elements. For example: "Draw a central circle with the text 'Main Idea'. From this circle, draw three arrows pointing to three separate rectangles. Label the first rectangle 'Concept A', the second 'Concept B', and the third 'Concept C'." The diagram should be structured like a flowchart or a mind map.

  PDF Content: {{media url=pdfDataUri}}`,
});


// EXPORTED FUNCTIONS
export async function analyzePdfGetScript(input: AnalyzePdfContentInput): Promise<PdfAnimationScript> {
  try {
    const { output: script } = await pdfAnimationScriptPrompt(input);
    if (!script || !script.scenes || script.scenes.length === 0) {
      console.error("Failed to generate animation script from PDF.");
      return {
          summary: "PDF içeriğinden animasyon oluşturulamadı. Lütfen farklı bir dosya ile tekrar deneyin.",
          scenes: []
      };
    }
    return script;
  } catch (error) {
    console.error("Crashed in analyzePdfGetScript flow:", error);
    return {
        summary: "PDF analiz edilirken beklenmedik bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        scenes: []
    };
  }
}

export async function analyzePdfContentAsDiagram(input: AnalyzePdfContentInput): Promise<AnalyzePdfContentDiagramOutput> {
  try {
    const { output: diagramDescription } = await pdfDiagramDescriptionPrompt(input);
    const svgCode = await generateSvg(diagramDescription || "");

    return { svg: svgCode };
  } catch(error) {
    console.error("Crashed in analyzePdfContentAsDiagram flow:", error);
    const fallbackSvg = await generateSvg("");
    return { svg: fallbackSvg };
  }
}
