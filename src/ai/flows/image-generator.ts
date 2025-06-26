'use server';
/**
 * @fileOverview Generates an illustrative image from a text prompt.
 *
 * - generateIllustrativeImage - A function that handles image generation.
 * - GenerateImageInput - The input type for the function.
 * - GenerateImageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageInputSchema = z.object({
  topic: z.string().describe('The topic or summary for which to generate an image.'),
  style: z.string().optional().default('Fotogerçekçi').describe('The visual style for the image.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageDataUri: z.string().describe('The generated image as a data URI.'),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

const imageGenerationFlow = ai.defineFlow(
  {
    name: 'imageGenerationFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async ({topic, style}) => {
    const illustrativePrompt = `Create a high-quality, professional, and visually compelling educational illustration that conceptually represents the following topic.

The desired visual style is: **${style}**.

The overall aesthetic should be modern and clean, suitable for a presentation or textbook. Focus on creating a powerful visual metaphor for the core idea.

Topic: ${topic}`;

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: illustrativePrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed to return an image.');
    }

    return {
      imageDataUri: media.url,
    };
  }
);


export async function generateIllustrativeImage(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  return await imageGenerationFlow(input);
}
