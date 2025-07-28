import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { parseResumeFromPdf } from '@/lib/parser/parseResumeFromPdf';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file type and size (FR-B3: ≤ 2 MB, single-column, English-language PDFs)
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      return NextResponse.json({ error: 'File size must be less than 2MB' }, { status: 400 });
    }

    // Parse resume using our OpenResume-based engine
    const parserResult = await parseResumeFromPdf(file);
    
    return NextResponse.json({
      success: true,
      data: {
        atsScore: parserResult.atsScore,
        parsedJson: parserResult.parsedResume,
        warnings: parserResult.warnings,
        suggestions: parserResult.suggestions
      }
    });
  } catch (error) {
    console.error('Resume parsing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse resume',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 