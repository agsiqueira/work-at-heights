export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Use POST.' }, 405, corsHeaders);
    }

    try {
      const body = await request.json();
      const action = body.action || 'chat';

      if (action === 'transcribe') {
        return await transcribeAudio(body, env, corsHeaders);
      }

      if (action === 'tts') {
        return await synthesizeSpeech(body, env, corsHeaders);
      }

      return await chatCompletion(body, env, corsHeaders);
    } catch (err) {
      return json({ error: err.message || String(err) }, 500, corsHeaders);
    }
  }
};

async function chatCompletion(body, env, corsHeaders) {
  if (!env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY Worker secret.');
  const messages = body.messages || [];
  if (!messages.length) throw new Error('Missing messages array.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: body.maxTokens || 1200,
      temperature: body.temperature ?? 0.2
    })
  });

  const text = await response.text();
  if (!response.ok) {
    return new Response(text, { status: response.status, headers: corsHeaders });
  }

  const data = JSON.parse(text);
  return json({ content: data.choices?.[0]?.message?.content || '' }, 200, corsHeaders);
}

async function transcribeAudio(body, env, corsHeaders) {
  if (!env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY Worker secret.');
  if (!body.audioBase64) throw new Error('Missing audioBase64.');

  const mimeType = body.mimeType || 'audio/webm';
  const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
  const fileName = body.fileName || `interview-answer.${extension}`;

  const bytes = base64ToUint8Array(body.audioBase64);
  const blob = new Blob([bytes], { type: mimeType });

  const form = new FormData();
  form.append('file', blob, fileName);
  form.append('model', env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1');
  form.append('language', 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form
  });

  const text = await response.text();
  if (!response.ok) {
    return new Response(text, { status: response.status, headers: corsHeaders });
  }

  const data = JSON.parse(text);
  return json({ text: data.text || '' }, 200, corsHeaders);
}


async function synthesizeSpeech(body, env, corsHeaders) {
  if (!env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY Worker secret.');
  const input = String(body.text || '').trim();
  if (!input) throw new Error('Missing text for TTS.');

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: body.model || env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: body.voice || env.OPENAI_TTS_VOICE || 'cedar',
      input,
      instructions: body.instructions || env.OPENAI_TTS_INSTRUCTIONS || 'Speak naturally as a warm, experienced senior safety instructor. Use a clear professional tone, moderate pace, supportive intonation, and avoid sounding robotic.',
      response_format: 'mp3'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(errorText, { status: response.status, headers: corsHeaders });
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBase64 = arrayBufferToBase64(arrayBuffer);
  return json({ audioBase64, mimeType: 'audio/mpeg' }, 200, corsHeaders);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}
