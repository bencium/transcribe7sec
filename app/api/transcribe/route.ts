import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json({ error: 'No file name provided' }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    const filePath = path.join(process.cwd(), 'public', 'audio', fileName);

    if (!fs.existsSync(filePath)) {
      console.error(`Audio file not found: ${filePath}`);
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
    }

    console.log(`Transcribing file: ${fileName}`);
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      response_format: "text",
    });
    console.log(`Transcription completed for: ${fileName}`);

    // Instead of deleting, we'll move the file to a 'processed' folder
    const processedDir = path.join(process.cwd(), 'public', 'audio', 'processed');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }
    const newPath = path.join(processedDir, fileName);
    fs.renameSync(filePath, newPath);
    console.log(`Moved ${fileName} to processed folder`);

    return new NextResponse(transcription, { status: 200 });
  } catch (error: unknown) {
    console.error('Error transcribing audio:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to transcribe audio', details: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
  }
}
