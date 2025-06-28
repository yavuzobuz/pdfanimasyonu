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
      // 3D Render için özel direktifler
      const is3DRender = style === '3D Render';
      
      let styleDirectives = '';
      if (is3DRender) {
        styleDirectives = `
**3D RENDER SPECIFICATIONS:**
- Create as a high-quality 3D rendered scene with realistic materials and lighting
- Use volumetric lighting with dramatic shadows and highlights
- Apply realistic textures: metal reflections, glass transparency, fabric weaves, wood grains
- Include ambient occlusion and global illumination for depth
- Add realistic particle effects: dust motes, lens flares, atmospheric fog
- Use depth of field with selective focus (foreground sharp, background bokeh)
- Apply professional rendering techniques: subsurface scattering, caustics, reflections
- Include environmental elements: realistic sky, ground surfaces, atmospheric perspective
- Use cinematic camera angles with perspective distortion
- Add subtle post-processing effects: color grading, slight bloom, contrast enhancement
- Ensure photorealistic quality with crisp details and smooth surfaces
`;
      } else {
        styleDirectives = `
**Animation Guidelines:**
- Add subtle motion blur effects to objects in movement
- Include flowing elements like gentle waves, floating particles, or soft gradients  
- Show directional arrows or paths with slight glow effects
- Use dynamic lighting that suggests movement (like sunbeams, spotlights)
- Create depth with layered elements that appear to be at different distances
- Add soft transitions between scene elements (fade effects, overlays)
- Include animated-style visual cues like progress indicators, timeline markers
- Suggest motion through object positioning and flow lines

**Visual Enhancement:**
- Include cinematic lighting and depth of field effects
- Add atmospheric elements (subtle mist, light rays, particles)
- Use dynamic compositions that suggest ongoing action
- Create visual rhythm through repeated elements or patterns
- Include gesture lines and movement indicators where appropriate
`;
      }

      const illustrativePrompt = `Create a high-quality, professional, and visually compelling educational image that conceptually represents the following scene. Focus on creating a powerful visual metaphor with SUBTLE MOTION AND ANIMATION ELEMENTS.

${styleDirectives}

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
