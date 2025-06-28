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
  scenes: z.array(z.string()).min(5).max(10).describe("A list of 5 to 10 scene descriptions for a professional, educational animation explaining the topic, with count based on topic complexity."),
});
export type TopicAnimationScript = z.infer<typeof TopicAnimationScriptSchema>;

export const SimplifyTopicDiagramOutputSchema = z.object({
  svg: z.string().describe("A diagram explaining the topic, as an SVG.")
});
export type SimplifyTopicDiagramOutput = z.infer<typeof SimplifyTopicDiagramOutputSchema>;

// Updated schema: topic & summary for diagram generation with flexible concept count
export const TopicDiagramFromSummaryInputSchema = z.object({
  topic: z.string().describe('The topic title.'),
  summary: z.string().describe('The detailed summary/analysis of the topic.'),
  theme: z.string().optional().describe('The diagram theme/style to use.')
});
export type TopicDiagramFromSummaryInput = z.infer<typeof TopicDiagramFromSummaryInputSchema>;

// Updated concepts output schema with flexible count
export const TopicConceptsOutputSchema = z.object({
  concepts: z.array(z.object({
    name: z.string().describe('The key concept name (2-3 words)'),
    description: z.string().describe('Compelling description of the concept (4-8 words)')
  })).min(5).max(15).describe('Key concepts with compelling descriptions, count determined by topic complexity')
});
export type TopicConceptsOutput = z.infer<typeof TopicConceptsOutputSchema>;

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
    scenes: z.array(z.string()).min(5).max(10).describe("A list of 5 to 10 scene descriptions for a professional, educational animation explaining the PDF content, with count based on content complexity."),
});
export type PdfAnimationScript = z.infer<typeof PdfAnimationScriptSchema>;

export const AnalyzePdfContentDiagramOutputSchema = z.object({
  svg: z.string().describe("A diagram explaining the PDF content, as an SVG."),
});
export type AnalyzePdfContentDiagramOutput = z.infer<typeof AnalyzePdfContentDiagramOutputSchema>;

// Updated schema: PDF summary for diagram generation with flexible concept count
export const PdfDiagramFromSummaryInputSchema = z.object({
  summary: z.string().describe('The detailed summary/analysis of the PDF content.'),
  theme: z.string().optional().describe('The diagram theme/style to use.')
});
export type PdfDiagramFromSummaryInput = z.infer<typeof PdfDiagramFromSummaryInputSchema>;

// Updated PDF concepts output schema with flexible count
export const PdfConceptsOutputSchema = z.object({
  concepts: z.array(z.object({
    name: z.string().describe('The key concept name (2-3 words)'),
    description: z.string().describe('Compelling description of the concept (4-8 words)')
  })).min(5).max(15).describe('Key concepts with compelling descriptions, count determined by content complexity')
});
export type PdfConceptsOutput = z.infer<typeof PdfConceptsOutputSchema>;

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
