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
      scene: z.string().describe("A short title for the animation scene, in Turkish."),
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
            scene: z.string().describe("A short, descriptive title for the scene in Turkish, based on PDF content."),
            description: z.string().describe("A detailed description of what happens in this scene, in Turkish. This description will be used to generate an animated SVG."),
        })
    ).describe('A scene-by-scene breakdown for an animation that explains the key concepts from the PDF. Generate between 3 and 5 scenes.'),
});

const pdfContentAnalyzerPrompt = ai.definePrompt({
  name: 'pdfContentAnalyzerPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: PdfContentAnalyzerPromptOutputSchema},
  prompt: `You are an expert educator and animator skilled at simplifying complex topics from documents. Your responses must be in Turkish.

  Analyze the content of the following PDF document. Your task is to create:
  1.  A simplified summary of the key concepts, in Turkish.
  2.  A multi-scene animation storyboard to explain these concepts visually.

  The animation storyboard must be very clear, logically structured, and directly faithful to the key concepts extracted from the PDF. Each scene should build upon the previous one to tell a coherent and easy-to-follow story for a student.
  
  For each scene, provide:
  -   **scene:** A short, descriptive title (in Turkish).
  -   **description:** A detailed, visually rich description of the scene (in Turkish). This description must be highly descriptive and provide clear instructions on the objects, characters, and actions in the scene, as it will be directly used by an AI to generate an animated SVG. The description must ensure the generated animation is professional, detailed, and literally represents the concepts. For example, if the concept is a legal document about property, the description should include visuals like the property, people involved, and a courthouse scene to represent the legal process. Avoid generic descriptions.
  
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
          try {
            const designerPrompt = `You are a world-class SVG animator and illustrator. Your task is to generate a high-quality, professional, and visually compelling animated SVG.

**Style requirements:**
- **Animation:** The animation must be a smooth, continuous, and seamless loop.
- **Self-Contained:** The SVG must be self-contained using CSS animations. No external scripts or assets are allowed.
- **Aesthetics:** Use a modern, clean, flat-iconography style. The illustration must be detailed and sophisticated.
- **NO Simple Shapes:** Avoid overly simplistic, abstract, or childish geometric shapes. The output must be a professional-grade illustration.
- **NO Raster Images:** Do not use \`<image>\` tags or embed any raster graphics (like PNGs or JPEGs) within the SVG. The entire illustration must be composed of vector elements (\`<path>\`, \`<circle>\`, \`<rect>\`, etc.).
- **Responsive:** The SVG must be responsive and scale correctly by using a 'viewBox' attribute.
- **Background:** The background must be transparent.
- **Colors:** Use a harmonious and professional color palette. You have creative freedom.

**Content Requirements:**
- **Literal Representation:** The generated SVG must accurately and literally represent the objects, characters, and concepts described in the scene prompt. For example, if the prompt mentions a 'person', the SVG must clearly depict a human figure. If it mentions a 'house', it must look like a house. If it mentions a 'courthouse', it must resemble a courthouse building. The drawing must be a faithful visual translation of the text.

**Output format:**
- Only output the raw SVG code.
- Start with '<svg ...>' and end with '</svg>'.
- Do NOT include any other text, explanations, or markdown code fences like \`\`\`.

**Task:**
Create an animated SVG for the following scene:
${scene.description}`;

            const svgGenerationResponse = await ai.generate({ prompt: designerPrompt });
            let svgCode = svgGenerationResponse.text;

            const svgMatch = svgCode.match(/<svg[\s\S]*?<\/svg>/s);
            if (svgMatch) {
                svgCode = svgMatch[0];
            } else {
                svgCode = `<svg width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">Animasyon oluşturulamadı.</text></svg>`;
            }
    
            const svgDataUri = 'data:image/svg+xml;base64,' + Buffer.from(svgCode).toString('base64');
    
            return {
                scene: scene.scene,
                description: scene.description,
                imageDataUri: svgDataUri,
            };
          } catch (error) {
            console.error(`Error generating animation for scene "${scene.scene}":`, error);
            const fallbackSvg = `<svg width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">Animasyon hatası.</text></svg>`;
            const svgDataUri = 'data:image/svg+xml;base64,' + Buffer.from(fallbackSvg).toString('base64');
            return {
              scene: scene.scene,
              description: "Bu sahne için animasyon oluşturulurken bir hata oluştu.",
              imageDataUri: svgDataUri,
            };
          }
        })
    );

    return {
      summary: promptOutput.summary,
      animationScenario: scenarioWithAnimations,
    };
  }
);
