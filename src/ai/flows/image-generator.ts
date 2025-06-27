'use server';
/**
 * @fileOverview Generates illustrative images from a series of text prompts (scenes).
 *
 * - generateSceneImages - A function that handles image generation for multiple scenes.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateSceneImagesInputSchema,
  GenerateSceneImagesOutputSchema,
  type GenerateSceneImagesInput,
  type GenerateSceneImagesOutput
} from '@/ai/schemas';

const generateSceneImagesFlow = ai.defineFlow(
  {
    name: 'generateSceneImagesFlow',
    inputSchema: GenerateSceneImagesInputSchema,
    outputSchema: GenerateSceneImagesOutputSchema,
  },
  async ({scenes, style}) => {
    const imagePromises = scenes.map(async (sceneDescription) => {
      const illustrativePrompt = `Create a high-quality, professional, and visually compelling educational image that conceptually represents the following scene. Focus on creating a powerful visual metaphor.

The desired visual style is: **${style}**.

Scene: ${sceneDescription}`;

      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: illustrativePrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!media?.url) {
        throw new Error(`Image generation failed for scene: "${sceneDescription}"`);
      }

      return media.url;
    });

    const images = await Promise.all(imagePromises);

    return {
      images,
    };
  }
);


export async function generateSceneImages(
  input: GenerateSceneImagesInput
): Promise<GenerateSceneImagesOutput> {
  return await generateSceneImagesFlow(input);
}
