'use client'

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
// import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, dangerouslyAllowBrowser: true });

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsRecording(true);
      recordChunk();

      intervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
          recordChunk();
        }
      }, 7000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const recordChunk = () => {
    if (!streamRef.current) return;

    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;
    const audioChunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
      console.log('Data available, chunk size:', event.data.size);
    };

    mediaRecorder.onstop = async () => {
      console.log('MediaRecorder stopped');
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      console.log('Audio blob created, size:', audioBlob.size);
      const fileName = `audio_${Date.now()}.wav`;
      await saveAudio(audioBlob, fileName);
      await transcribeAudio(fileName);
    };

    mediaRecorder.start();
    console.log('Started new 7-second chunk');
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        console.log('Stopped 7-second chunk');
      }
    }, 7000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const saveAudio = async (audioBlob: Blob, fileName: string) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, fileName);

    try {
      const response = await fetch('/api/save-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save audio file');
      }
    } catch (error) {
      console.error('Error saving audio:', error);
    }
  };

  const transcribeAudio = async (fileName: string) => {
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to transcribe audio');
      }

      const transcriptionText = await response.text();
      setTranscription(prev => prev + ' ' + transcriptionText.trim());
    } catch (error: unknown) {
      console.error('Error transcribing audio:', error);
      if (error instanceof Error) {
        setTranscription(prev => prev + ` Error: ${error.message}`);
      } else {
        setTranscription(prev => prev + ' An unknown error occurred');
      }
    }
  };

  return (
    <div className="container">
      <div className="responsive-width">
        <h1 className="text-2xl font-bold mb-4">Audio Transcription</h1>
        <Button 
          onClick={isRecording ? stopRecording : startRecording} 
          className="mb-4"
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
        {transcription && (
          <div className="bg-gray-100 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Transcription:</h2>
            <p>{transcription}</p>
          </div>
        )}
      </div>
    </div>
  );
}
