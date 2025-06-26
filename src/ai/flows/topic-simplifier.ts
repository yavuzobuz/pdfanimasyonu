'use server';
/**
 * @fileOverview A topic simplification AI agent that can generate animations or diagrams.
 *
 * - simplifyTopicAsAnimation - Generates a multi-scene animation for a topic.
 * - SimplifyTopicAnimationOutput - The return type for the animation function.
 * - simplifyTopicAsDiagram - Generates a single diagram for a topic.
 * - SimplifyTopicDiagramOutput - The return type for the diagram function.
 * - SimplifyTopicInput - The input type for both functions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimplifyTopicInputSchema = z.object({
  topic: z.string().describe('The complex topic to simplify.'),
});
export type SimplifyTopicInput = z.infer<typeof SimplifyTopicInputSchema>;


// ANIMATION-RELATED SCHEMAS AND FLOW
const SimplifyTopicAnimationOutputSchema = z.object({
  summary: z.string().describe('A simplified summary of the topic suitable for students, in Turkish.'),
  scenes: z.array(z.object({
    description: z.string().describe('A short, single-sentence description of the animation scene in Turkish.'),
    svgDataUri: z.string().describe('An SVG data URI for the animation scene.'),
  })).describe('A list of scenes for the animation.')
});
export type SimplifyTopicAnimationOutput = z.infer<typeof SimplifyTopicAnimationOutputSchema>;

const TopicAnimationScriptSchema = z.object({
  summary: z.string().describe('A simplified summary of the topic suitable for students, in Turkish.'),
  sceneDescriptions: z.array(z.string()).describe("A list of 3 to 5 scene descriptions for a professional, educational animation explaining the topic. Each description should detail a single, clear visual concept."),
});

const topicAnimationScriptPrompt = ai.definePrompt({
  name: 'topicAnimationScriptPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: TopicAnimationScriptSchema},
  prompt: `You are an expert educator. Your responses must be in Turkish. Take the following topic and create:
1.  A simplified summary.
2.  A script for an educational animation with 3 to 5 scenes. For each scene, provide a detailed visual description. The animation's style must be serious, professional, and directly related to the subject matter.

Topic: {{{topic}}}
`,
});


// DIAGRAM-RELATED SCHEMAS AND FLOW
const SimplifyTopicDiagramOutputSchema = z.object({
  diagramDataUri: z.string().describe("A diagram explaining the topic, as an SVG data URI.")
});
export type SimplifyTopicDiagramOutput = z.infer<typeof SimplifyTopicDiagramOutputSchema>;

const TopicDiagramDescriptionSchema = z.object({
    diagramDescription: z.string().describe("A detailed description of a diagram (flowchart, mind map, etc.) that explains the topic visually, in Turkish. This description will be used to generate an SVG diagram."),
});

const topicDiagramDescriptionPrompt = ai.definePrompt({
  name: 'topicDiagramDescriptionPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: TopicDiagramDescriptionSchema},
  prompt: `You are an expert educator and visual designer specializing in simplifying complex topics for students. Your responses must be in Turkish.

Your task is to take a topic and create a detailed description for a visual diagram that explains the key concepts and their relationships. The diagram should be structured like a flowchart or a mind map.

Topic: {{{topic}}}
`,
});


// SHARED SVG GENERATION LOGIC
const generateSvg = async (description: string): Promise<string> => {
    const designerPrompt = `You are a world-class illustrator. Your task is to generate a high-quality, professional, and visually compelling SVG based on the provided description.

**Style requirements:**
- **Clarity and Readability:** The diagram must be easy to read and understand. Use clear fonts and a logical layout.
- **Self-Contained:** The SVG must be self-contained. No external scripts or assets.
- **Aesthetics:** Use a modern, clean, flat-iconography style. The illustration must be detailed, serious, and professional, suitable for an educational context. AVOID cartoonish or overly simplistic styles.
- **Responsive:** The SVG must be responsive and scale correctly by using a 'viewBox' attribute.
- **Background:** The background must be transparent.
- **Colors:** Use a harmonious and professional color palette.

**Output format:**
- Only output the raw SVG code. Start with '<svg ...>' and end with '</svg>'.
- Do NOT include any other text, explanations, or markdown code fences like \`\`\`.

**Task:** Create an SVG for the following description:
${description}`;

    const svgGenerationResponse = await ai.generate({ prompt: designerPrompt, model: 'googleai/gemini-1.5-pro-latest' });
    let svgCode = svgGenerationResponse.text;
    const svgMatch = svgCode.match(/<svg[\s\S]*?<\/svg>/s);
    return svgMatch ? svgMatch[0] : `<svg width="500" height="300" viewBox="0 0 500" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">İçerik oluşturulamadı.</text></svg>`;
};

const toDataUri = (svg: string) => 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');


// EXPORTED FUNCTIONS
export async function simplifyTopicAsAnimation(input: SimplifyTopicInput): Promise<SimplifyTopicAnimationOutput> {
  const { output: script } = await topicAnimationScriptPrompt(input);
  if (!script) throw new Error("Failed to generate animation script.");

  const scenePromises = script.sceneDescriptions.map(async (desc) => {
    try {
        const svg = await generateSvg(desc);
        return { description: desc, svgDataUri: toDataUri(svg) };
    } catch (error) {
        console.error(`Failed to generate SVG for scene: ${desc}`, error);
        const errorSvg = `<svg width="500" height="300" viewBox="0 0 500" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">Sahne oluşturulamadı.</text></svg>`;
        return { description: desc, svgDataUri: toDataUri(errorSvg) };
    }
  });

  const scenes = await Promise.all(scenePromises);

  return { summary: script.summary, scenes };
}

export async function simplifyTopicAsDiagram(input: SimplifyTopicInput): Promise<SimplifyTopicDiagramOutput> {
  const { output: promptOutput } = await topicDiagramDescriptionPrompt(input);
  if (!promptOutput) throw new Error("Failed to generate diagram description.");
  
  const svgCode = await generateSvg(promptOutput.diagramDescription);

  return { diagramDataUri: toDataUri(svgCode) };
}
