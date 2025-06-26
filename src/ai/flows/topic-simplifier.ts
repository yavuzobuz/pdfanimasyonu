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
          animatedSvgPrompt: z.string().describe("A detailed prompt in English for an AI that generates animated SVGs. Describe a simple, looping animation that visually represents the scene using a flat, colorful design style.")
      })
  ).describe('A scene-by-scene breakdown for an animation that explains the topic. Generate between 3 and 5 scenes.'),
});

const simplifyTopicPrompt = ai.definePrompt({
  name: 'simplifyTopicPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: SimplifyTopicPromptOutputSchema},
  prompt: `You are an expert educator and animator specializing in simplifying complex topics for students. Your responses for summary and description must be in Turkish.

Your task is to take a topic and break it down into a simplified summary and a multi-scene animation script. For each scene in the animation, you will provide a title (can be in English), a description of the action in Turkish, and a specific, detailed prompt for an AI model to generate a corresponding **animated SVG** (this prompt must be in English).

The animated SVG should be a simple, colorful, flat-design educational illustration with a looping animation, engaging and easy for students to understand.

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
                prompt: `You are an expert SVG animator. Create a self-contained, animated SVG using CSS animations. The SVG must not use any external scripts or assets. The animation should be a simple, continuous loop. Make it visually appealing, with a flat design style, and ensure it is responsive by using a viewBox attribute. The background should be transparent. The color palette should be calming and educational, using primary: #5DADE2, accent: #F5B041.
                
Only output the raw SVG code, starting with <svg> and ending with </svg>. Do not include any other text, explanations, or markdown code fences.
    
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
