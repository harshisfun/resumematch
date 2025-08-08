import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { extractTextWithMistralOCR, isMistralOCRAvailable } from '@/lib/mistralOCR';

export async function POST(request: NextRequest) {
  try {
    console.log('Extract-text API called');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('File received:', {
      name: file?.name,
      type: file?.type,
      size: file?.size
    });

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('Buffer created, size:', buffer.length);
    
    let extractedText = '';

    try {
      console.log('Processing file type:', file.type);
      
      switch (file.type) {
        case 'application/pdf':
          console.log('Processing PDF file');
          
          // Check if Mistral OCR is available
          if (await isMistralOCRAvailable()) {
            try {
              console.log('Using Mistral OCR for PDF processing');
              const result = await extractTextWithMistralOCR(file);
              
              return NextResponse.json({ 
                text: result.text,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                ocrInfo: {
                  confidence: result.confidence,
                  pageCount: result.pageCount,
                  hasImages: result.hasImages,
                  processingMethod: 'Mistral OCR'
                }
              });
            } catch (ocrError) {
              console.error('Mistral OCR failed:', ocrError);
              return NextResponse.json({ 
                error: ocrError instanceof Error ? ocrError.message : 'Failed to process PDF with AI OCR'
              }, { status: 400 });
            }
          } else {
            return NextResponse.json({ 
              error: 'PDF processing requires AI OCR configuration. Please convert your PDF to DOCX or TXT format using Google Docs, Microsoft Word, or any online converter, then try again.'
            }, { status: 400 });
          }

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          console.log('Processing DOCX file');
          const docxResult = await mammoth.extractRawText({ buffer });
          extractedText = docxResult.value;
          console.log('DOCX text extracted, length:', extractedText.length);
          break;

        case 'application/msword':
          // For .doc files, we'll need a different library
          // For now, return an error suggesting to convert to PDF or DOCX
          return NextResponse.json({ 
            error: 'DOC files are not supported. Please convert to PDF or DOCX format.' 
          }, { status: 400 });

        case 'text/plain':
          extractedText = buffer.toString('utf-8');
          break;

        default:
          return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
      }

      if (!extractedText.trim()) {
        return NextResponse.json({ error: 'No text could be extracted from the file' }, { status: 400 });
      }

      return NextResponse.json({ 
        text: extractedText,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

    } catch (extractionError) {
      console.error('Text extraction error:', extractionError);
      return NextResponse.json({ 
        error: 'Failed to extract text from file. Please ensure the file is not corrupted.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 