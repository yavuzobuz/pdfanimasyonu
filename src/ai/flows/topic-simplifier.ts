'use server';
/**
 * @fileOverview A topic simplification AI agent.
 *
 * - simplifyTopic - A function that handles the topic simplification process.
 * - SimplifyTopicInput - The input type for the simplifyTopic function.
 * - SimplifyTopicOutput - The return type for the simplifyTopic function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimplifyTopicInputSchema = z.object({
  topic: z.string().describe('The complex topic to simplify.'),
});
export type SimplifyTopicInput = z.infer<typeof SimplifyTopicInputSchema>;

const SimplifyTopicOutputSchema = z.object({
  summary: z.string().describe('A simplified summary of the topic suitable for students, in Turkish.'),
  diagramDataUri: z.string().describe("A diagram explaining the topic, as an SVG data URI.")
});
export type SimplifyTopicOutput = z.infer<typeof SimplifyTopicOutputSchema>;

export async function simplifyTopic(input: SimplifyTopicInput): Promise<SimplifyTopicOutput> {
  return simplifyTopicFlow(input);
}

const SimplifyTopicPromptOutputSchema = z.object({
  summary: z.string().describe('A simplified summary of the topic suitable for students, in Turkish.'),
  diagramDescription: z.string().describe("A detailed description of a diagram (flowchart, mind map, etc.) that explains the topic visually, in Turkish. This description will be used to generate an SVG diagram."),
});

const simplifyTopicPrompt = ai.definePrompt({
  name: 'simplifyTopicPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: SimplifyTopicPromptOutputSchema},
  prompt: `You are an expert educator and visual designer specializing in simplifying complex topics for students. Your responses must be in Turkish.

Your task is to take a topic and create:
1.  A simplified summary suitable for students.
2.  A detailed description for a visual diagram that explains the key concepts and their relationships. The diagram should be structured like a flowchart or a mind map.

Topic: {{{topic}}}
`,
});

const simplifyTopicFlow = ai.defineFlow(
  {
    name: 'simplifyTopicFlow',
    inputSchema: SimplifyTopicInputSchema,
    outputSchema: SimplifyTopicOutputSchema,
  },
  async (input) => {
    const { output: promptOutput } = await simplifyTopicPrompt(input);

    if (!promptOutput) {
      throw new Error("Failed to generate topic summary and diagram description.");
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
