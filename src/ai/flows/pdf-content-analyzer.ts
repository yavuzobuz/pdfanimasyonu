'use server';

/**
 * @fileOverview This flow analyzes PDF content to extract key concepts and create a simplified summary and a visual diagram.
 *
 * - analyzePdfContent - A function that handles the PDF content analysis and diagram generation process.
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
  diagramDataUri: z.string().describe("A diagram explaining the PDF content, as an SVG data URI."),
});
export type AnalyzePdfContentOutput = z.infer<typeof AnalyzePdfContentOutputSchema>;

export async function analyzePdfContent(input: AnalyzePdfContentInput): Promise<AnalyzePdfContentOutput> {
  return analyzePdfContentFlow(input);
}

const PdfContentAnalyzerPromptOutputSchema = z.object({
    summary: z.string().describe('A simplified summary of the PDF content in Turkish.'),
    diagramDescription: z.string().describe("A detailed description of a diagram (flowchart, mind map, etc.) that explains the key concepts from the PDF and their relationships, in Turkish. This description will be used to generate an SVG diagram."),
});

const pdfContentAnalyzerPrompt = ai.definePrompt({
  name: 'pdfContentAnalyzerPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: PdfContentAnalyzerPromptOutputSchema},
  prompt: `You are an expert educator and visual designer skilled at simplifying complex topics from documents. Your responses must be in Turkish.

  Analyze the content of the following PDF document. Your task is to create:
  1.  A simplified summary of the key concepts, in Turkish.
  2.  A detailed description for a visual diagram (like a flowchart or mind map) that explains these concepts and their relationships. This description must be very clear and provide instructions on the shapes, text, and connections needed.

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
    
    const designerPrompt = `You are a world-class diagram illustrator. Your task is to generate a high-quality, professional, and visually compelling SVG diagram suitable for an educational context.

**Style requirements:**
- **Clarity and Readability:** The diagram must be easy to read and understand. Use clear fonts and a logical layout.
- **Self-Contained:** The SVG must be self-contained. No external scripts or assets.
- **Aesthetics:** Use a modern, clean, flat-iconography style. The illustration must be detailed and sophisticated.
- **Responsive:** The SVG must be responsive and scale correctly by using a 'viewBox' attribute.
- **Background:** The background must be transparent.
- **Colors:** Use a harmonious and professional color palette.

**Content Requirements:**
- The generated SVG must accurately represent the concepts and relationships described in the diagram prompt. Use text labels, shapes (rectangles, circles, diamonds), and connecting arrows to build the diagram.

**Output format:**
- Only output the raw SVG code.
- Start with '<svg ...>' and end with '</svg>'.
- Do NOT include any other text, explanations, or markdown code fences like \`\`\`.

**Task:**
Create an SVG diagram for the following description:
${promptOutput.diagramDescription}`;

    const svgGenerationResponse = await ai.generate({ prompt: designerPrompt });
    let svgCode = svgGenerationResponse.text;

    const svgMatch = svgCode.match(/<svg[\s\S]*?<\/svg>/s);
    if (svgMatch) {
        svgCode = svgMatch[0];
    } else {
        svgCode = `<svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">Diyagram oluşturulamadı.</text></svg>`;
    }

    const diagramDataUri = 'data:image/svg+xml;base64,' + Buffer.from(svgCode).toString('base64');

    return {
      summary: promptOutput.summary,
      diagramDataUri: diagramDataUri,
    };
  }
);
