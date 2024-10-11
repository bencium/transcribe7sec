import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const tempDir = path.join(process.cwd(), 'tmp', 'audio');

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get('audio') as File;

  if (!audio) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }

  // Create temporary directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const filePath = path.join(tempDir, audio.name);

  try {
    fs.writeFileSync(filePath, buffer);
    return NextResponse.json({ message: 'Audio file saved successfully' });
  } catch (error) {
    console.error('Error saving audio file:', error);
    return NextResponse.json({ error: 'Failed to save audio file' }, { status: 500 });
  }
}
