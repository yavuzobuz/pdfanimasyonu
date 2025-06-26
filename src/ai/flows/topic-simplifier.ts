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
  summary: z.string().describe('A simplified summary of the topic suitable for students.'),
  animationScenario: z.array(
    z.object({
      scene: z.string().describe("A short title for the animation scene."),
      description: z.string().describe("A detailed description of what happens in this scene."),
      imageDataUri: z.string().describe("The generated image for the scene as a data URI.")
    })
  ).describe('A scene-by-scene breakdown for an animation that explains the topic, complete with generated visuals.'),
});
export type SimplifyTopicOutput = z.infer<typeof SimplifyTopicOutputSchema>;

export async function simplifyTopic(input: SimplifyTopicInput): Promise<SimplifyTopicOutput> {
  return simplifyTopicFlow(input);
}

const SimplifyTopicPromptOutputSchema = z.object({
  summary: z.string().describe('A simplified summary of the topic suitable for students.'),
  animationScenario: z.array(
      z.object({
          scene: z.string().describe("A short, descriptive title for the scene (e.g., 'Scene 1: The Sun's Energy')."),
          description: z.string().describe("A detailed description of what happens in this scene, focusing on the visual elements."),
          imagePrompt: z.string().describe("A detailed text-to-image prompt to generate a visual for this scene. The style should be a simple, colorful, flat-design educational illustration suitable for children.")
      })
  ).describe('A scene-by-scene breakdown for an animation that explains the topic. Generate between 3 and 5 scenes.'),
});

const simplifyTopicPrompt = ai.definePrompt({
  name: 'simplifyTopicPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: SimplifyTopicPromptOutputSchema},
  prompt: `You are an expert educator and animator specializing in simplifying complex topics for students.

Your task is to take a topic and break it down into a simplified summary and a multi-scene animation script. For each scene in the animation, you will provide a title, a description of the action, and a specific, detailed prompt for a text-to-image model to generate a corresponding visual.

The visual style should be consistent across all scenes: a simple, colorful, flat-design educational illustration, engaging and easy for students to understand.

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

    const scenarioWithImages = await Promise.all(
        promptOutput.animationScenario.map(async (scene) => {
            const { media } = await ai.generate({
                model: 'googleai/gemini-2.0-flash-preview-image-generation',
                prompt: scene.imagePrompt,
                config: {
                    responseModalities: ['TEXT', 'IMAGE'],
                },
            });

            return {
                scene: scene.scene,
                description: scene.description,
                imageDataUri: media.url,
            };
        })
    );

    return {
      summary: promptOutput.summary,
      animationScenario: scenarioWithImages,
    };
  }
);
