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
  animationScenario: z.array(
    z.object({
      scene: z.string().describe("A short title for the animation scene."),
      description: z.string().describe("A detailed description of what happens in this scene, in Turkish."),
      imageDataUri: z.string().describe("The generated image for the scene as a data URI.")
    })
  ).describe('A scene-by-scene breakdown for an animation that explains the topic, complete with generated visuals.'),
});
export type SimplifyTopicOutput = z.infer<typeof SimplifyTopicOutputSchema>;

export async function simplifyTopic(input: SimplifyTopicInput): Promise<SimplifyTopicOutput> {
  return simplifyTopicFlow(input);
}

const SimplifyTopicPromptOutputSchema = z.object({
  summary: z.string().describe('A simplified summary of the topic suitable for students, in Turkish.'),
  animationScenario: z.array(
      z.object({
          scene: z.string().describe("A short, descriptive title for the scene (e.g., 'Scene 1: The Sun's Energy')."),
          description: z.string().describe("A detailed description of what happens in this scene, focusing on the visual elements, in Turkish."),
          animatedSvgPrompt: z.string().describe("A highly detailed and descriptive prompt in English for an AI that generates professional, visually rich animated SVGs. The prompt should describe a scene that is both educational and aesthetically pleasing, avoiding over-simplification. Focus on clear actions and detailed objects.")
      })
  ).describe('A scene-by-scene breakdown for an animation that explains the topic. Generate between 3 and 5 scenes.'),
});

const simplifyTopicPrompt = ai.definePrompt({
  name: 'simplifyTopicPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: SimplifyTopicPromptOutputSchema},
  prompt: `You are an expert educator and animator specializing in simplifying complex topics for students. Your responses for summary and description must be in Turkish.

Your task is to take a topic and break it down into a simplified summary and a multi-scene animation script. For each scene in the animation, you will provide a title (can be in English), a description of the action in Turkish, and a specific, detailed prompt for an AI model to generate a corresponding **animated SVG** (this prompt must be in English).

The visual style for the animated SVGs should be a professional, visually rich, and detailed educational illustration with a smooth, looping animation. It should be engaging and clear, but not childish or overly simplistic. The drawing must accurately and literally represent the objects and concepts in the scene description.

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
      throw new Error("Failed to generate topic summary and scenario.");
    }

    const scenarioWithAnimations = await Promise.all(
        promptOutput.animationScenario.map(async (scene) => {
            const svgGenerationResponse = await ai.generate({
                prompt: `You are a world-class SVG animator and illustrator. Your task is to generate a high-quality, professional, and visually compelling animated SVG.

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
