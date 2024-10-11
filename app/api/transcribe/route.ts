import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define temporary directory
const tempDir = path.join(process.cwd(), 'tmp', 'audio');

export async function POST(req: NextRequest) {
  try {
    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json({ error: 'No file name provided' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    // Create temporary directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, fileName);

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

    // Move processed file to a 'processed' folder within the temp directory
    const processedDir = path.join(tempDir, 'processed');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }
    const newPath = path.join(processedDir, fileName);
    fs.renameSync(filePath, newPath);
    console.log(`Moved ${fileName} to processed folder`);

    // Optional: Delete the processed file after a certain time
    setTimeout(() => {
      fs.unlink(newPath, (err) => {
        if (err) console.error(`Error deleting processed file: ${err}`);
        else console.log(`Deleted processed file: ${fileName}`);
      });
    }, 3600000); // Delete after 1 hour

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
