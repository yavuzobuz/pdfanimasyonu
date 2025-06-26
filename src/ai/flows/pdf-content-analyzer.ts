'use server';

/**
 * @fileOverview This flow analyzes PDF content to extract key concepts and create a simplified summary and visual storyboard.
 *
 * - analyzePdfContent - A function that handles the PDF content analysis and summarization process.
 * - AnalyzePdfContentInput - The input type for the analyzePdfContent function.
 * - AnalyzePdfContentOutput - The return type for the analyzePdfContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePdfContentInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "The PDF document content as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzePdfContentInput = z.infer<typeof AnalyzePdfContentInputSchema>;

const AnalyzePdfContentOutputSchema = z.object({
  summary: z.string().describe('A simplified summary of the PDF content.'),
  animationScenario: z.array(
    z.object({
      scene: z.string().describe("A short title for the animation scene."),
      description: z.string().describe("A detailed description of what happens in this scene."),
      imageDataUri: z.string().describe("The generated image for the scene as a data URI.")
    })
  ).describe('A scene-by-scene breakdown for an animation that explains the PDF content, complete with generated visuals.'),
});
export type AnalyzePdfContentOutput = z.infer<typeof AnalyzePdfContentOutputSchema>;

export async function analyzePdfContent(input: AnalyzePdfContentInput): Promise<AnalyzePdfContentOutput> {
  return analyzePdfContentFlow(input);
}

const PdfContentAnalyzerPromptOutputSchema = z.object({
    summary: z.string().describe('A simplified summary of the PDF content.'),
    animationScenario: z.array(
        z.object({
            scene: z.string().describe("A short, descriptive title for the scene based on PDF content."),
            description: z.string().describe("A detailed description of what happens in this scene, based on the PDF content."),
            imagePrompt: z.string().describe("A detailed text-to-image prompt to generate a visual for this scene, based on the PDF. The style should be a simple, colorful, flat-design educational illustration.")
        })
    ).describe('A scene-by-scene breakdown for an animation that explains the key concepts from the PDF. Generate between 3 and 5 scenes.'),
});

const pdfContentAnalyzerPrompt = ai.definePrompt({
  name: 'pdfContentAnalyzerPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: PdfContentAnalyzerPromptOutputSchema},
  prompt: `You are an expert educator and animator skilled at simplifying complex topics from documents.

  Analyze the content of the following PDF document. Your task is to create:
  1.  A simplified summary of the key concepts.
  2.  A multi-scene animation storyboard to explain these concepts visually.
  
  For each scene in the storyboard, provide a title, a detailed description of the visuals and action, and a specific prompt for a text-to-image model to generate a corresponding visual.
  
  The visual style for the images should be a simple, colorful, flat-design educational illustration.
  
  PDF Content: {{media url=pdfDataUri}}`,
});

const analyzePdfContentFlow = ai.defineFlow(
  {
    name: 'analyzePdfContentFlow',
    inputSchema: AnalyzePdfContentInputSchema,
    outputSchema: AnalyzePdfContentOutputSchema,
  },
  async input => {
    const { output: promptOutput } = await pdfContentAnalyzerPrompt(input);

    if (!promptOutput) {
      throw new Error("Failed to analyze PDF content.");
    }

    const scenarioWithImages = await Promise.all(
        promptOutput.animationScenario.map(async (scene) => {
            const { media } = await ai.generate({
                model: 'googleai/gemini-2.0-flash-preview-image-generation',
                prompt: scene.imagePrompt,
                config: {
                    responseModalities: ['TEXT', 'IMAGE'],
                },
            });

            return {
                scene: scene.scene,
                description: scene.description,
                imageDataUri: media.url,
            };
        })
    );

    return {
      summary: promptOutput.summary,
      animationScenario: scenarioWithImages,
    };
  }
);
