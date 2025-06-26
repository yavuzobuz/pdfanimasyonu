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
  summary: z.string().describe('A simplified summary of the PDF content, in Turkish.'),
  animationScenario: z.array(
    z.object({
      scene: z.string().describe("A short title for the animation scene."),
      description: z.string().describe("A detailed description of what happens in this scene, in Turkish."),
      imageDataUri: z.string().describe("The generated image for the scene as a data URI.")
    })
  ).describe('A scene-by-scene breakdown for an animation that explains the PDF content, complete with generated visuals.'),
});
export type AnalyzePdfContentOutput = z.infer<typeof AnalyzePdfContentOutputSchema>;

export async function analyzePdfContent(input: AnalyzePdfContentInput): Promise<AnalyzePdfContentOutput> {
  return analyzePdfContentFlow(input);
}

const PdfContentAnalyzerPromptOutputSchema = z.object({
    summary: z.string().describe('A simplified summary of the PDF content in Turkish.'),
    animationScenario: z.array(
        z.object({
            scene: z.string().describe("A short, descriptive title for the scene based on PDF content."),
            description: z.string().describe("A detailed description of what happens in this scene, in Turkish."),
            animatedSvgPrompt: z.string().describe("A detailed prompt in English for an AI that generates animated SVGs. Describe a simple, looping animation that visually represents the scene using a flat, colorful design style.")
        })
    ).describe('A scene-by-scene breakdown for an animation that explains the key concepts from the PDF. Generate between 3 and 5 scenes.'),
});

const pdfContentAnalyzerPrompt = ai.definePrompt({
  name: 'pdfContentAnalyzerPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: PdfContentAnalyzerPromptOutputSchema},
  prompt: `You are an expert educator and animator skilled at simplifying complex topics from documents. Your responses for summary and description must be in Turkish.

  Analyze the content of the following PDF document. Your task is to create:
  1.  A simplified summary of the key concepts, in Turkish.
  2.  A multi-scene animation storyboard to explain these concepts visually.
  
  For each scene in the storyboard, provide a title (can be in English), a detailed description of the visuals and action in Turkish, and a specific prompt for an AI model to generate a corresponding **animated SVG** (this prompt must be in English).
  
  The visual style for the animated SVGs should be a simple, colorful, flat-design educational illustration with a looping animation.
  
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

    const scenarioWithAnimations = await Promise.all(
        promptOutput.animationScenario.map(async (scene) => {
            const svgGenerationResponse = await ai.generate({
                prompt: `You are a world-class SVG animator and illustrator. Your task is to generate a high-quality, professional, and visually compelling animated SVG.

**Style requirements:**
- **Animation:** The animation must be a smooth, continuous, and seamless loop.
- **Self-Contained:** The SVG must be self-contained using CSS animations. No external scripts or assets are allowed.
- **Aesthetics:** Use a modern, clean, flat-iconography style. The illustration must be detailed and sophisticated.
- **NO Simple Shapes:** Avoid overly simplistic, abstract, or childish geometric shapes. The output must be a professional-grade illustration that accurately represents the scene.
- **Responsive:** The SVG must be responsive and scale correctly by using a 'viewBox' attribute.
- **Background:** The background must be transparent.
- **Colors:** Use a harmonious and professional color palette. You have creative freedom.

**Output format:**
- Only output the raw SVG code.
- Start with '<svg ...>' and end with '</svg>'.
- Do NOT include any other text, explanations, or markdown code fences like \`\`\`.

**Task:**
Create an animated SVG for the following scene:
${scene.animatedSvgPrompt}`
            });
    
            let svgCode = svgGenerationResponse.text;
            const svgMatch = svgCode.match(/<svg[\s\S]*?<\/svg>/s);
            if (svgMatch) {
                svgCode = svgMatch[0];
            }
    
            const svgDataUri = 'data:image/svg+xml;base64,' + Buffer.from(svgCode).toString('base64');
    
            return {
                scene: scene.scene,
                description: scene.description,
                imageDataUri: svgDataUri,
            };
        })
    );

    return {
      summary: promptOutput.summary,
      animationScenario: scenarioWithAnimations,
    };
  }
);
