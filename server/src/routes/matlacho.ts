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
    'de Pabellón de Arteaga, Aguascalientes. Reescribe la descripción de una actividad de la ' +
    'bitácora ambiental de forma clara, profesional y concisa (máximo 3 oraciones). ' +
    'Lenguaje institucional sencillo. Solo devuelve el texto mejorado, sin comillas ni prefijos.\n\n' +
    (extra ? `${extra}\n\n` : '') +
    `Texto original: ${input.descripcion.trim()}`
  );
}

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  process.env.GEMINI_MODEL?.trim(),
  'gemini-3.5-flash',
  'gemini-flash-latest',
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

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) ||
    (typeof err === 'object' && err !== null && 'name' in err && (err as { name: string }).name === 'TimeoutError')
  );
}

async function generateWithGemini(
  model: string,
  key: string,
  prompt: string,
  disableThinking: boolean
): Promise<string> {
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: 400,
    temperature: 0.3,
  };
  if (disableThinking) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    }
  );
  const raw = await res.text();
  let data: GeminiResponse = {};
  try {
    data = JSON.parse(raw) as GeminiResponse;
  } catch {
    throw new Error(`Gemini HTTP ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini HTTP ${res.status}`);
  }
  const text = extractGeminiText(data);
  if (!text) throw new Error('Matlacho no devolvió texto');
  return text.replace(/^["«]+|["»]+$/g, '').trim();
}

async function callGemini(prompt: string, key: string): Promise<string> {
  let lastErr = 'Gemini no disponible';
  for (const model of GEMINI_MODELS) {
    for (const disableThinking of [true, false]) {
      try {
        return await generateWithGemini(model, key, prompt, disableThinking);
      } catch (err) {
        if (isAbortError(err)) {
          lastErr = `El modelo ${model} tardó demasiado`;
          break;
        }
        lastErr = err instanceof Error ? err.message : 'Gemini no disponible';
        const retryWithoutThinking =
          disableThinking && /thinkingConfig|unknown|invalid argument|not supported/i.test(lastErr);
        if (retryWithoutThinking) continue;
        break;
      }
    }
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
    signal: AbortSignal.timeout(10_000),
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

async function runMatlacho(prompt: string, gemini?: string, anthropic?: string): Promise<string> {
  const errors: string[] = [];
  if (gemini) {
    try {
      return await callGemini(prompt, gemini);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Gemini falló');
    }
  }
  if (anthropic) {
    try {
      return await callAnthropic(prompt, anthropic);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Anthropic falló');
    }
  }
  throw new Error(errors[0] || 'Matlacho no está disponible');
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
      const texto = await Promise.race([
        runMatlacho(prompt, gemini, anthropic),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT_OVERALL')), 24_000);
        }),
      ]);
      return { texto };
    } catch (err) {
      req.log.error(err);
      if (err instanceof Error && err.message === 'TIMEOUT_OVERALL') {
        return reply.status(504).send({
          error: 'Matlacho tardó demasiado. Intenta de nuevo en unos segundos.',
        });
      }
      return reply.status(502).send({
        error: err instanceof Error ? err.message : 'No se pudo contactar a Matlacho',
      });
    }
  });
}
