import { Mistral } from '@mistralai/mistralai';

// Initialize Mistral client
const getMistralClient = () => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY environment variable is not set');
  }
  return new Mistral({ apiKey });
};

export interface MistralOCRResult {
  text: string;
  confidence: number;
  pageCount: number;
  hasImages: boolean;
}

export async function extractTextWithMistralOCR(file: File): Promise<MistralOCRResult> {
  try {
    console.log('Starting Mistral OCR processing for file:', file.name);
    
    const client = getMistralClient();
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload file to Mistral
    console.log('Uploading file to Mistral...');
    const uploadedFile = await client.files.upload({
      file: {
        fileName: file.name,
        content: buffer,
      },
      purpose: "ocr",
    });
    
    console.log('File uploaded, ID:', uploadedFile.id);
    
    // Get signed URL for processing
    const signedUrl = await client.files.getSignedUrl({
      fileId: uploadedFile.id,
      expiry: 3600 // 1 hour
    });
    
    console.log('Processing document with Mistral OCR...');
    
    // Process with OCR
    const ocrResponse = await client.ocr.process({
      document: {
        type: "document_url",
        documentUrl: signedUrl.url
      },
      model: "mistral-ocr-latest",
      includeImageBase64: false, // Set to true if you need images
      imageLimit: 10
    });
    
    console.log('OCR processing complete');
    
    // Extract text from all pages
    let combinedText = '';
    let hasImages = false;
    
    if (ocrResponse.pages && ocrResponse.pages.length > 0) {
      for (const page of ocrResponse.pages) {
        if (page.markdown) {
          // Clean up markdown formatting for plain text extraction
          const pageText = page.markdown
            .replace(/!\[.*?\]\(.*?\)/g, '') // Remove image references
            .replace(/#{1,6}\s/g, '') // Remove markdown headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
            .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links but keep text
            .replace(/\|.*?\|/g, '') // Remove table formatting
            .replace(/^-\s+/gm, '') // Remove bullet points
            .replace(/^\d+\.\s+/gm, '') // Remove numbered lists
            .replace(/\n{3,}/g, '\n\n') // Clean up excessive newlines
            .trim();
          
          if (pageText) {
            combinedText += pageText + '\n\n';
          }
        }
        
        // Check if page has images
        if (page.images && page.images.length > 0) {
          hasImages = true;
        }
      }
    }
    
    // Clean up the file from Mistral servers
    try {
      await client.files.delete({ fileId: uploadedFile.id });
      console.log('Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('Could not clean up temporary file:', cleanupError);
    }
    
    if (!combinedText.trim()) {
      throw new Error('No text could be extracted from the PDF');
    }
    
    console.log('Text extraction successful, length:', combinedText.length);
    
    return {
      text: combinedText.trim(),
      confidence: 0.95, // Mistral OCR typically has high confidence
      pageCount: ocrResponse.pages?.length || 0,
      hasImages
    };
    
  } catch (error) {
    console.error('Mistral OCR error:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('MISTRAL_API_KEY')) {
        throw new Error('PDF processing is not configured. Please contact support.');
      }
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        throw new Error('PDF processing is temporarily unavailable due to high demand. Please try again later.');
      }
      if (error.message.includes('file too large')) {
        throw new Error('PDF file is too large. Please ensure your file is under 50MB.');
      }
      throw new Error(`PDF processing failed: ${error.message}`);
    }
    
    throw new Error('PDF processing failed due to an unexpected error');
  }
}

export async function isMistralOCRAvailable(): Promise<boolean> {
  try {
    return !!process.env.MISTRAL_API_KEY;
  } catch {
    return false;
  }
} 