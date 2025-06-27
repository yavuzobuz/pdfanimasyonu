/**
 * @fileOverview Shared Zod schemas and TypeScript types for AI flows.
 */
import {z} from 'genkit';

// Topic Simplifier Schemas
export const SimplifyTopicInputSchema = z.object({
  topic: z.string().describe('The complex topic to simplify.'),
});
export type SimplifyTopicInput = z.infer<typeof SimplifyTopicInputSchema>;

export const TopicAnimationScriptSchema = z.object({
  summary: z.string().describe('A simplified summary of the topic in Turkish.'),
  scenes: z.array(z.string()).min(3).max(5).describe("A list of 3 to 5 scene descriptions for a professional, educational animation explaining the topic."),
});
export type TopicAnimationScript = z.infer<typeof TopicAnimationScriptSchema>;

export const SimplifyTopicDiagramOutputSchema = z.object({
  svg: z.string().describe("A diagram explaining the topic, as an SVG.")
});
export type SimplifyTopicDiagramOutput = z.infer<typeof SimplifyTopicDiagramOutputSchema>;


// PDF Analyzer Schemas
export const AnalyzePdfContentInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "The PDF document content as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzePdfContentInput = z.infer<typeof AnalyzePdfContentInputSchema>;

export const PdfAnimationScriptSchema = z.object({
    summary: z.string().describe('A simplified summary of the PDF content in Turkish.'),
    scenes: z.array(z.string()).min(3).max(5).describe("A list of 3 to 5 scene descriptions for a professional, educational animation explaining the PDF content."),
});
export type PdfAnimationScript = z.infer<typeof PdfAnimationScriptSchema>;

export const AnalyzePdfContentDiagramOutputSchema = z.object({
  svg: z.string().describe("A diagram explaining the PDF content, as an SVG."),
});
export type AnalyzePdfContentDiagramOutput = z.infer<typeof AnalyzePdfContentDiagramOutputSchema>;


// Image Generator Schemas
export const GenerateSceneImagesInputSchema = z.object({
  scenes: z.array(z.string()).describe('An array of scene descriptions for which to generate images.'),
  style: z.string().optional().default('Fotogerçekçi').describe('The visual style for the images.'),
});
export type GenerateSceneImagesInput = z.infer<typeof GenerateSceneImagesInputSchema>;

export const GenerateSceneImagesOutputSchema = z.object({
  images: z.array(z.string().describe('The generated images as data URIs.')),
});
export type GenerateSceneImagesOutput = z.infer<typeof GenerateSceneImagesOutputSchema>;
