'use server';

/**
 * @fileOverview This flow analyzes PDF content to create a simplified summary and either a visual animation or a diagram.
 *
 * - analyzePdfContentAsAnimation - Generates a multi-scene animation from PDF content.
 * - AnalyzePdfContentAnimationOutput - The return type for the animation function.
 * - analyzePdfContentAsDiagram - Generates a single diagram from PDF content.
 * - AnalyzePdfContentDiagramOutput - The return type for the diagram function.
 * - AnalyzePdfContentInput - The input type for both functions.
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


// ANIMATION-RELATED SCHEMAS AND FLOW
const AnalyzePdfContentAnimationOutputSchema = z.object({
  summary: z.string().describe('A simplified summary of the PDF content, in Turkish.'),
  scenes: z.array(z.object({
    description: z.string().describe('A short, single-sentence description of the animation scene in Turkish.'),
    svgDataUri: z.string().describe('An SVG data URI for the animation scene.'),
  })).describe('A list of scenes for the animation.')
});
export type AnalyzePdfContentAnimationOutput = z.infer<typeof AnalyzePdfContentAnimationOutputSchema>;

const PdfAnimationSceneSchema = z.object({
    visualDescription: z.string().describe("A detailed visual description for a single animation scene, to be used for generating an SVG. This must be in Turkish and focus on clear, serious, educational visuals."),
    narrative: z.string().describe("The simple, one-sentence narrative for the scene that will be displayed to the user. This must be in Turkish."),
});

const PdfAnimationScriptSchema = z.object({
    summary: z.string().describe('A simplified summary of the PDF content in Turkish.'),
    scenes: z.array(PdfAnimationSceneSchema).min(3).max(5).describe("A list of 3 to 5 scenes for a professional, educational animation explaining the PDF content."),
});

const pdfAnimationScriptPrompt = ai.definePrompt({
  name: 'pdfAnimationScriptPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: PdfAnimationScriptSchema},
  prompt: `You are an expert educator. Your responses must be in Turkish. Analyze the content of the following PDF. Your task is to create:
1.  A simplified summary of the PDF content.
2.  A script for an educational animation with 3 to 5 scenes. For each scene, provide:
    a. 'visualDescription': A literal, concrete description for an illustrator. Describe a tangible scene with people and objects. For example, for "severance pay", describe "A smiling person receiving a bag of money from a business person in front of an office building." Avoid abstract concepts.
    b. 'narrative': A simple, one-sentence narrative to be displayed to the user.
The animation's style must be serious, professional, and directly related to the subject matter.

PDF Content: {{media url=pdfDataUri}}`,
});


// DIAGRAM-RELATED SCHEMAS AND FLOW
const AnalyzePdfContentDiagramOutputSchema = z.object({
  diagramDataUri: z.string().describe("A diagram explaining the PDF content, as an SVG data URI."),
});
export type AnalyzePdfContentDiagramOutput = z.infer<typeof AnalyzePdfContentDiagramOutputSchema>;

const PdfDiagramDescriptionSchema = z.object({
    diagramDescription: z.string().describe("A detailed description of a diagram (flowchart, mind map, etc.) that explains the key concepts from the PDF and their relationships, in Turkish. This description will be used to generate an SVG diagram."),
});

const pdfDiagramDescriptionPrompt = ai.definePrompt({
  name: 'pdfDiagramDescriptionPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: PdfDiagramDescriptionSchema},
  prompt: `You are an expert educator and visual designer skilled at simplifying complex topics from documents. Your responses must be in Turkish.

  Analyze the content of the following PDF document. Your task is to create a detailed description for a visual diagram that explains the key concepts and their relationships. This description will be used to generate an SVG. Be very specific about the elements. For example: "Draw a central circle with the text 'Main Idea'. From this circle, draw three arrows pointing to three separate rectangles. Label the first rectangle 'Concept A', the second 'Concept B', and the third 'Concept C'." The diagram should be structured like a flowchart or a mind map.

  PDF Content: {{media url=pdfDataUri}}`,
});

// SHARED SVG GENERATION LOGIC
const generateSvg = async (description: string): Promise<string> => {
    const designerPrompt = `You are a master illustrator who creates clear, educational, and high-quality SVG graphics. Your style is clean, professional, and easily understandable, similar to visuals used in high-quality educational videos.

**Critically Important Task:**
Your main goal is to create an illustration that is **instantly recognizable and directly represents the scene description**.
- **LITERAL INTERPRETATION:** A person must look like a person, a house like a house, a tree like a tree. The drawing must be literal and concrete.
- **NO ABSTRACT ART:** Do NOT use abstract shapes, random geometric forms, or overly symbolic representations. Every element must be a recognizable object. If the description is about "a contract", draw a person signing a document at a desk, not abstract shapes representing a deal.
- **FOCUS ON CLARITY:** The illustration must be simple enough to be understood at a glance. Avoid clutter. Use fills and strokes to create solid, recognizable objects, not just wireframes.
- **HIGH-FIDELITY STYLE:** The style should be clean, modern, and high-fidelity, like icons you would see on a major tech company's website.

**Technical SVG Requirements:**
- **Self-Contained:** The SVG must be self-contained. No external scripts or assets.
- **Responsive:** Must use a 'viewBox' attribute to scale correctly.
- **Transparent Background:** The background must be transparent.
- **Harmonious Colors:** Use a professional and limited color palette that fits an educational theme.
- **Readable Text:** Any text must be clear and well-integrated.

**Output Format:**
- **SVG Code ONLY:** Your response must be ONLY the raw SVG code, starting with \`<svg ...>\` and ending with \`</svg>\`. Do NOT include any other text, explanations, or markdown fences like \`\`\`.

**Task:** Create a clear, recognizable, high-fidelity SVG illustration for the following scene description:
${description}`;

    const svgGenerationResponse = await ai.generate({ prompt: designerPrompt, model: 'googleai/gemini-1.5-pro-latest' });
    let svgCode = svgGenerationResponse.text;
    const svgMatch = svgCode.match(/<svg[\s\S]*?<\/svg>/s);
    return svgMatch ? svgMatch[0] : `<svg width="500" height="300" viewBox="0 0 500" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">Görselleştirme başarısız.</text></svg>`;
};

const toDataUri = (svg: string) => 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');


// EXPORTED FUNCTIONS
export async function analyzePdfContentAsAnimation(input: AnalyzePdfContentInput): Promise<AnalyzePdfContentAnimationOutput> {
  const { output: script } = await pdfAnimationScriptPrompt(input);
  if (!script) throw new Error("Failed to generate animation script.");

  const scenePromises = script.scenes.map(async (scene) => {
    try {
        const svg = await generateSvg(scene.visualDescription);
        return { description: scene.narrative, svgDataUri: toDataUri(svg) };
    } catch (error) {
        console.error(`Failed to generate SVG for scene: ${scene.visualDescription}`, error);
        const errorSvg = `<svg width="500" height="300" viewBox="0 0 500" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">Görselleştirme başarısız.</text></svg>`;
        return { description: scene.narrative, svgDataUri: toDataUri(errorSvg) };
    }
  });

  const scenes = await Promise.all(scenePromises);

  return { summary: script.summary, scenes };
}

export async function analyzePdfContentAsDiagram(input: AnalyzePdfContentInput): Promise<AnalyzePdfContentDiagramOutput> {
  const { output: promptOutput } = await pdfDiagramDescriptionPrompt(input);
  if (!promptOutput) throw new Error("Failed to generate diagram description.");
  
  const svgCode = await generateSvg(promptOutput.diagramDescription);

  return { diagramDataUri: toDataUri(svgCode) };
}
