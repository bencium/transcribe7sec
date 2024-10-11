import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get('audio') as File;

  if (!audio) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const filePath = path.join(process.cwd(), 'public', 'audio', audio.name);

  try {
    fs.writeFileSync(filePath, buffer);
    return NextResponse.json({ message: 'Audio file saved successfully' });
  } catch (error) {
    console.error('Error saving audio file:', error);
    return NextResponse.json({ error: 'Failed to save audio file' }, { status: 500 });
  }
}
