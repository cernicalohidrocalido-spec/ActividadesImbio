import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const bodySchema = z.object({
  descripcion: z.string().min(10).max(2000),
  tipos: z.array(z.string()).optional(),
  colonia: z.string().max(120).optional(),
  nombre: z.string().max(200).optional(),
});

function buildPrompt(input: z.infer<typeof bodySchema>): string {
  const tipos = input.tipos?.filter(Boolean).join(', ') || '';
  const extra = [
    tipos ? `Tipos de intervención: ${tipos}.` : '',
    input.colonia ? `Colonia/lugar: ${input.colonia}.` : '',
    input.nombre ? `Nombre de la actividad: ${input.nombre}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    'Eres Matlacho, el asistente ambiental del IMBIO (Instituto Municipal de Biodiversidad) ' +
    'de Pabellón de Arteaga, Aguascalientes. Reescribe la descripción de una actividad de ' +
    'mantenimiento de áreas verdes de forma clara, profesional y concisa (máximo 3 oraciones). ' +
    'Lenguaje institucional sencillo. Solo devuelve el texto mejorado, sin comillas ni prefijos.\n\n' +
    (extra ? `${extra}\n\n` : '') +
    `Texto original: ${input.descripcion.trim()}`
  );
}

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  'gemini-3.5-flash',
  'gemini-2.5-flash',
].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

type GeminiPart = { text?: string; thought?: boolean };
type GeminiResponse = {
  error?: { message?: string };
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
};

function extractGeminiText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text!.trim())
    .join('\n')
    .trim();
}

async function callGemini(prompt: string, key: string): Promise<string> {
  let lastErr = 'Gemini no disponible';
  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(18_000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.35 },
        }),
      }
    );
    const raw = await res.text();
    let data: GeminiResponse = {};
    try {
      data = JSON.parse(raw) as GeminiResponse;
    } catch {
      lastErr = `Gemini HTTP ${res.status}`;
      continue;
    }
    if (!res.ok) {
      lastErr = data.error?.message || `Gemini HTTP ${res.status}`;
      continue;
    }
    const text = extractGeminiText(data);
    if (!text) {
      lastErr = 'Matlacho no devolvió texto';
      continue;
    }
    return text.replace(/^["«]+|["»]+$/g, '').trim();
  }
  throw new Error(lastErr);
}

async function callAnthropic(prompt: string, key: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 280,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    content?: Array<{ text?: string }>;
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `Anthropic HTTP ${res.status}`);
  }
  const text = data.content?.[0]?.text?.trim();
  if (!text) throw new Error('Matlacho no devolvió texto');
  return text.replace(/^["«]+|["»]+$/g, '').trim();
}

export async function matlachoRoutes(app: FastifyInstance) {
  app.post('/api/ai/matlacho', async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Escribe al menos una oración en la descripción (mínimo 10 caracteres).',
      });
    }
    const gemini = process.env.GEMINI_API_KEY?.trim();
    const anthropic = process.env.ANTHROPIC_API_KEY?.trim();
    if (!gemini && !anthropic) {
      return reply.status(503).send({
        error:
          'Matlacho no está configurado. Agrega GEMINI_API_KEY (gratis) o ANTHROPIC_API_KEY en Render → Environment.',
      });
    }
    try {
      const prompt = buildPrompt(parsed.data);
      const texto = gemini
        ? await callGemini(prompt, gemini)
        : await callAnthropic(prompt, anthropic!);
      return { texto };
    } catch (err) {
      req.log.error(err);
      return reply.status(502).send({
        error: err instanceof Error ? err.message : 'No se pudo contactar a Matlacho',
      });
    }
  });
}
