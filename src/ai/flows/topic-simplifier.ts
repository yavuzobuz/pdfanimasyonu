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

const TopicAnimationSceneSchema = z.object({
    visualDescription: z.string().describe("A detailed visual description for a single animation scene, to be used for generating an SVG. This must be in Turkish and focus on clear, serious, educational visuals."),
    narrative: z.string().describe("The simple, one-sentence narrative for the scene that will be displayed to the user. This must be in Turkish."),
});

const TopicAnimationScriptSchema = z.object({
  summary: z.string().describe('A simplified summary of the topic suitable for students, in Turkish.'),
  scenes: z.array(TopicAnimationSceneSchema).min(3).max(5).describe("A list of 3 to 5 scenes for a professional, educational animation explaining the topic."),
});

const topicAnimationScriptPrompt = ai.definePrompt({
  name: 'topicAnimationScriptPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: TopicAnimationScriptSchema},
  prompt: `You are an expert educator. Your responses must be in Turkish. Take the following topic and create:
1.  A simplified summary of the topic.
2.  A script for an educational animation with 3 to 5 scenes. For each scene, provide:
    a. 'visualDescription': A literal, concrete description for an illustrator. Describe a tangible scene with people and objects. For example, for "severance pay", describe "A smiling person receiving a bag of money from a business person in front of an office building." Avoid abstract concepts.
    b. 'narrative': A simple, one-sentence narrative to be displayed to the user.
The animation's style must be serious, professional, and directly related to the subject matter.

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

Your task is to take a topic and create a detailed description for a visual diagram that explains the key concepts and their relationships. This description will be used to generate an SVG. Be very specific about the elements. For example: "Draw a central circle with the text 'Main Idea'. From this circle, draw three arrows pointing to three separate rectangles. Label the first rectangle 'Concept A', the second 'Concept B', and the third 'Concept C'." The diagram should be structured like a flowchart or a mind map.

Topic: {{{topic}}}
`,
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
export async function simplifyTopicAsAnimation(input: SimplifyTopicInput): Promise<SimplifyTopicAnimationOutput> {
  const { output: script } = await topicAnimationScriptPrompt(input);
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

export async function simplifyTopicAsDiagram(input: SimplifyTopicInput): Promise<SimplifyTopicDiagramOutput> {
  const { output: promptOutput } = await topicDiagramDescriptionPrompt(input);
  if (!promptOutput) throw new Error("Failed to generate diagram description.");
  
  const svgCode = await generateSvg(promptOutput.diagramDescription);

  return { diagramDataUri: toDataUri(svgCode) };
}
