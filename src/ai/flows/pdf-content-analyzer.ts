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
    svg: z.string().describe('An SVG for the animation scene.'),
  })).describe('A list of scenes for the animation.')
});
export type AnalyzePdfContentAnimationOutput = z.infer<typeof AnalyzePdfContentAnimationOutputSchema>;


const PdfAnimationScriptSchema = z.object({
    summary: z.string().describe('A simplified summary of the PDF content in Turkish.'),
    scenes: z.array(z.string()).min(3).max(5).describe("A list of 3 to 5 scene descriptions for a professional, educational animation explaining the PDF content."),
});

const pdfAnimationScriptPrompt = ai.definePrompt({
  name: 'pdfAnimationScriptPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: PdfAnimationScriptSchema},
  prompt: `You are an expert educator. Your responses must be in Turkish. Analyze the content of the following PDF. Your task is to create:
1.  A simplified summary of the PDF content.
2.  A list of 3 to 5 single-sentence scene descriptions for an educational animation. These descriptions should be literal and concrete, describing tangible scenes with recognizable people and objects that an illustrator can draw. For example, for "severance pay", describe "A smiling person receiving a bag of money from a business person in front of an office building." Avoid abstract concepts.

PDF Content: {{media url=pdfDataUri}}`,
});


// DIAGRAM-RELATED SCHEMAS AND FLOW
const AnalyzePdfContentDiagramOutputSchema = z.object({
  svg: z.string().describe("A diagram explaining the PDF content, as an SVG."),
});
export type AnalyzePdfContentDiagramOutput = z.infer<typeof AnalyzePdfContentDiagramOutputSchema>;


const pdfDiagramDescriptionPrompt = ai.definePrompt({
  name: 'pdfDiagramDescriptionPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: z.string()},
  prompt: `You are an expert educator and visual designer skilled at simplifying complex topics from documents. Your responses must be in Turkish.

  Analyze the content of the following PDF document. Your task is to create a detailed description for a visual diagram that explains the key concepts and their relationships. This description will be used to generate an SVG. Be very specific about the elements. For example: "Draw a central circle with the text 'Main Idea'. From this circle, draw three arrows pointing to three separate rectangles. Label the first rectangle 'Concept A', the second 'Concept B', and the third 'Concept C'." The diagram should be structured like a flowchart or a mind map.

  PDF Content: {{media url=pdfDataUri}}`,
});

// SHARED SVG GENERATION LOGIC
const generateSvg = async (description: string): Promise<string> => {
    const designerPrompt = `You are an expert SVG illustrator who creates clear, professional, and visually appealing educational graphics. Your primary goal is to create an SVG that makes a concept easy to understand.

**Critical Rule: Objects must be recognizable.** A person must look like a person, not a stick figure. A car must look like a car, not a box with circles. An office building should be detailed, not a simple rectangle. Your drawings must be literal and tangible. **AVOID abstract shapes, symbolic representations, and overly simplistic icons.** The user wants visuals that resemble real-world objects.

**Style Guide:**
*   **Modern & Clean:** Use a flat design aesthetic.
*   **Color:** Use a professional and harmonious color palette. Use \`hsl(var(--...))\` CSS variables for colors, like \`fill="hsl(var(--primary))"\` or \`stroke="hsl(var(--foreground))"\`. Use colors to add clarity and emphasis.
*   **Background:** The SVG background must be transparent. Do not add a background color to the root svg element.

**Example Task:**
*   **Scene Description:** "A manager gives a bonus to an employee for their hard work."
*   **Your Output (SVG):** An SVG showing a person in a suit (the manager) smiling and handing a check or a bag with a money symbol to another person (the employee) who looks happy. The setting could be a simple office background. An arrow could point from the manager to the employee, labeled "Bonus".

**Technical Requirements:**
*   **Output SVG Only:** Your entire response must be ONLY the raw SVG code. Start with \`<svg ...>\` and end with \`</svg>\`. Do not include explanations, notes, or markdown formatting like \`\`\`svg.
*   **VALIDATION:** The SVG MUST contain visible, tangible shape elements like \`<path>\`, \`<rect>\`, or \`<circle>\`. An empty SVG or one with only text is an invalid failure.
*   **Valid & Self-Contained:** The SVG must be well-formed XML with no external dependencies.
*   **Responsive:** The SVG must have a \`viewBox\` attribute.

**Now, create an SVG for the following scene:**
${description}`;

    const svgGenerationResponse = await ai.generate({ prompt: designerPrompt, model: 'googleai/gemini-1.5-pro-latest' });
    const svgCode = svgGenerationResponse.text;

    const svgMatch = svgCode.match(/<svg[\s\S]*?<\/svg>/s);
    if (!svgMatch) {
      console.error("SVG generation failed: No SVG tag found in response for description:", description);
      return `<svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">Görselleştirme başarısız.</text></svg>`;
    }

    const extractedSvg = svgMatch[0];
    const hasDrawingElements = /<path|<rect|<circle|<ellipse|<polygon|<polyline|<line/i.test(extractedSvg);
    const hasThemeColors = extractedSvg.includes('hsl(var');

    if (hasDrawingElements && hasThemeColors) {
        return extractedSvg;
    }
    
    console.error("SVG generation failed: Validation checks failed for description:", description);
    return `<svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">Görselleştirme başarısız.</text></svg>`;
};


// EXPORTED FUNCTIONS
export async function analyzePdfContentAsAnimation(input: AnalyzePdfContentInput): Promise<AnalyzePdfContentAnimationOutput> {
  const { output: script } = await pdfAnimationScriptPrompt(input);
  if (!script) throw new Error("Failed to generate animation script.");

  const scenePromises = script.scenes.map(async (sceneDescription) => {
    const svg = await generateSvg(sceneDescription);
    return { description: sceneDescription, svg: svg };
  });

  const scenes = await Promise.all(scenePromises);

  return { summary: script.summary, scenes };
}

export async function analyzePdfContentAsDiagram(input: AnalyzePdfContentInput): Promise<AnalyzePdfContentDiagramOutput> {
  const { output: diagramDescription } = await pdfDiagramDescriptionPrompt(input);
  if (!diagramDescription) throw new Error("Failed to generate diagram description.");
  
  const svgCode = await generateSvg(diagramDescription);

  return { svg: svgCode };
}
