import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PHOTOS_PER_REQUEST = 8;
const MAX_TOTAL_PHOTOS = 20;
const MAX_SINGLE_FILE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB per compressed file
const MAX_REQUEST_BYTES = 4.0 * 1024 * 1024; // Safe headroom under Vercel's 4.5 MB limit
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const BATCH_SECRET = process.env.AUTH_SECRET ?? 'manacards-follower-special-v1';

// Lightweight in-memory rate limit (per serverless instance, only counts main submissions)
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 8;
const rateBuckets = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (rateBuckets.get(ip) ?? []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) {
    rateBuckets.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return false;
}

function cleanText(val: FormDataEntryValue | null, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().replace(/\r\n/g, '\n').slice(0, maxLen);
}

async function createBatchToken(ticketId: string): Promise<string> {
  const data = new TextEncoder().encode(`ankauf-batch:${ticketId}:${BATCH_SECRET}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function isValidBatchToken(ticketId: string, supplied: string): Promise<boolean> {
  if (!ticketId || !supplied) return false;
  const expected = await createBatchToken(ticketId);
  if (expected.length !== supplied.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  }
  return diff === 0;
}

function buildQuickContactLink(
  channel: string,
  rawValue: string,
  ctx: { name: string; ticketId: string; collectionType: string }
): string | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (channel === 'WhatsApp') {
    let digits = trimmed.replace(/[^\d+]/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    else if (digits.startsWith('+')) digits = digits.slice(1);
    else if (digits.startsWith('0')) digits = `49${digits.slice(1)}`;
    if (digits.length >= 8) {
      const firstName = ctx.name.trim().split(/\s+/)[0] || ctx.name.trim();
      const prefillText =
        `Hey ${firstName}, hier ist das Team von ManaCards!\n` +
        `Vielen Dank für deine Pokémon Ankauf-Anfrage (${ctx.ticketId} · ${ctx.collectionType}). ` +
        `Wir haben uns deine Bilder und Infos angeschaut und würden dir gerne folgendes Angebot machen: `;
      // Encode parentheses too so Discord's Markdown [label](url) never truncates the link
      const encoded = encodeURIComponent(prefillText)
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29');
      return `https://wa.me/${digits}?text=${encoded}`;
    }
  }

  return null;
}

function generateTicketId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `MC-${code}`;
}

function extractValidatedPhotos(formData: FormData): {
  photos: File[];
  error?: string;
} {
  const rawPhotos = formData.getAll('photos');
  const photos: File[] = [];
  let totalBytes = 0;

  for (const entry of rawPhotos) {
    if (entry instanceof File && entry.size > 0) {
      if (photos.length >= MAX_PHOTOS_PER_REQUEST) break;
      if (!ALLOWED_MIME.has(entry.type)) {
        return { photos: [], error: 'Bitte lade nur Bilder (JPG, PNG oder WebP) hoch.' };
      }
      if (entry.size > MAX_SINGLE_FILE_BYTES) {
        return {
          photos: [],
          error: `Das Foto „${entry.name}“ ist zu groß. Bitte wähle ein kleineres Bild.`,
        };
      }
      totalBytes += entry.size;
      if (totalBytes > MAX_REQUEST_BYTES) {
        return {
          photos: [],
          error: 'Ein Foto-Paket überschreitet das Upload-Limit. Bitte lade kleinere Bilder hoch.',
        };
      }
      photos.push(entry);
    }
  }

  return { photos };
}

export async function POST(request: NextRequest) {
  const webhookUrl = process.env.DISCORD_ANKAUF_WEBHOOK_URL?.trim();
  if (!webhookUrl || !webhookUrl.startsWith('https://')) {
    return NextResponse.json(
      {
        error:
          'Discord-Webhook ist noch nicht eingerichtet. Bitte hinterlege DISCORD_ANKAUF_WEBHOOK_URL in den Vercel Environment Variables.',
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          'Die Anfrage konnte nicht gelesen werden. Bitte verkleinere die Fotos oder versuche es erneut.',
      },
      { status: 400 }
    );
  }

  const batchMode = cleanText(formData.get('mode'), 20) === 'photo-batch';

  // =========================================================================
  // FOLLOW-UP PHOTO BATCH (for submissions with 9–20 photos)
  // Splits cleanly under Vercel's 4.5 MB body limit & Discord's 10-file limit
  // =========================================================================
  if (batchMode) {
    const ticketId = cleanText(formData.get('ticketId'), 24);
    const batchToken = cleanText(formData.get('batchToken'), 64);
    const senderName = cleanText(formData.get('name'), 100);
    const batchIndex = Math.max(2, Number(cleanText(formData.get('batchIndex'), 5)) || 2);
    const totalBatches = Math.max(batchIndex, Number(cleanText(formData.get('totalBatches'), 5)) || batchIndex);
    const photoOffset = Math.max(0, Number(cleanText(formData.get('photoOffset'), 5)) || 0);

    if (!(await isValidBatchToken(ticketId, batchToken))) {
      return NextResponse.json({ error: 'Ungültiges Foto-Paket.' }, { status: 403 });
    }

    const { photos, error: photoErr } = extractValidatedPhotos(formData);
    if (photoErr) {
      return NextResponse.json({ error: photoErr }, { status: 400 });
    }
    if (photos.length === 0) {
      return NextResponse.json({ ok: true, ticketId });
    }

    const discordForm = new FormData();
    const attachmentsMeta = photos.map((file, idx) => {
      const ext =
        file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const photoNum = photoOffset + idx + 1;
      const safeName = `${ticketId.toLowerCase()}_foto_${photoNum}.${ext}`;
      discordForm.append(`files[${idx}]`, file, safeName);
      return { id: idx, filename: safeName };
    });

    const payloadJson = {
      username: 'ManaCards Ankauf',
      content: `**Weitere Fotos zu \`${ticketId}\`** (${senderName || 'Verkäufer'} · Paket ${batchIndex}/${totalBatches}, Fotos ${photoOffset + 1}–${photoOffset + photos.length})`,
      attachments: attachmentsMeta,
    };
    discordForm.append('payload_json', JSON.stringify(payloadJson));

    try {
      const discordRes = await fetch(webhookUrl, { method: 'POST', body: discordForm });
      if (!discordRes.ok) {
        const errText = await discordRes.text().catch(() => '');
        console.error('Discord photo batch failed:', discordRes.status, errText);
        return NextResponse.json(
          { error: 'Ein Teil der Fotos konnte nicht an Discord gesendet werden.' },
          { status: 502 }
        );
      }
      return NextResponse.json(
        { ok: true, ticketId },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    } catch (err) {
      console.error('Discord photo batch network error:', err);
      return NextResponse.json(
        { error: 'Verbindungsfehler beim Senden der Fotos.' },
        { status: 502 }
      );
    }
  }

  // =========================================================================
  // PRIMARY SUBMISSION (Embed + Batch 1 of photos)
  // =========================================================================
  const forwarded = request.headers.get('x-forwarded-for');
  const clientIp = forwarded?.split(',')[0]?.trim() || 'unknown';

  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen in kurzer Zeit. Bitte warte ein paar Minuten.' },
      { status: 429 }
    );
  }

  // Honeypot anti-spam check
  const honeypot = cleanText(formData.get('company_website'), 120);
  if (honeypot.length > 0) {
    return NextResponse.json({ ok: true, ticketId: 'MC-0000' });
  }

  const name = cleanText(formData.get('name'), 100);
  const contactChannel = cleanText(formData.get('contactChannel'), 40);
  const contactValue = cleanText(formData.get('contactValue'), 140);
  const collectionType = cleanText(formData.get('collectionType'), 80);
  const condition = cleanText(formData.get('condition'), 80);
  const expectedPrice = cleanText(formData.get('expectedPrice'), 60);
  const notes = cleanText(formData.get('notes'), 1500);
  const declaredTotalPhotos = Math.min(
    MAX_TOTAL_PHOTOS,
    Math.max(0, Number(cleanText(formData.get('totalPhotos'), 5)) || 0)
  );

  const categories = formData
    .getAll('categories')
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().slice(0, 50))
    .slice(0, 4);
  const effectiveCategories = categories.length > 0 ? categories : ['Pokémon'];

  if (!name) {
    return NextResponse.json({ error: 'Bitte gib deinen Namen an.' }, { status: 400 });
  }
  if (!collectionType) {
    return NextResponse.json(
      { error: 'Bitte wähle die Art deiner Karten/Sammlung aus.' },
      { status: 400 }
    );
  }
  if (!contactChannel || !contactValue) {
    return NextResponse.json(
      { error: 'Bitte gib an, über welchen Kontaktweg wir dir schreiben sollen.' },
      { status: 400 }
    );
  }

  const { photos, error: photoErr } = extractValidatedPhotos(formData);
  if (photoErr) {
    return NextResponse.json({ error: photoErr }, { status: 400 });
  }

  const totalPhotoCount = Math.max(photos.length, declaredTotalPhotos);
  const ticketId = generateTicketId();
  const batchToken = await createBatchToken(ticketId);
  const quickLink = buildQuickContactLink(contactChannel, contactValue, {
    name,
    ticketId,
    collectionType,
  });
  const contactDisplay = quickLink
    ? `${contactChannel}: **${contactValue}**\n[Direkt in WhatsApp öffnen](${quickLink})`
    : `${contactChannel}: **${contactValue}**`;

  const fields = [
    { name: 'Verkäufer', value: name, inline: true },
    { name: 'Kontakt', value: contactDisplay, inline: true },
    {
      name: 'Preisvorstellung',
      value: expectedPrice ? `${expectedPrice}` : 'Bitte um Angebot',
      inline: true,
    },
    { name: 'Kategorie', value: effectiveCategories.join(' · '), inline: true },
    { name: 'Art', value: collectionType, inline: true },
    { name: 'Zustand', value: condition || 'Nicht angegeben', inline: true },
    {
      name: 'Fotos',
      value:
        totalPhotoCount > 0
          ? `${totalPhotoCount} Bild${totalPhotoCount === 1 ? '' : 'er'}${
              totalPhotoCount > photos.length ? ' (folgen in Paketen)' : ' angehängt'
            }`
          : 'Keine Fotos hochgeladen',
      inline: false,
    },
  ];

  if (notes) {
    fields.push({
      name: 'Beschreibung / Hinweise',
      value: notes.slice(0, 1000),
      inline: false,
    });
  }

  const discordForm = new FormData();
  const attachmentsMeta = photos.map((file, idx) => {
    const ext =
      file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const safeName = `${ticketId.toLowerCase()}_foto_${idx + 1}.${ext}`;
    discordForm.append(`files[${idx}]`, file, safeName);
    return { id: idx, filename: safeName };
  });

  const payloadJson = {
    username: 'ManaCards Ankauf',
    content: `**Neue Pokémon Ankauf-Anfrage \`${ticketId}\`** von **${name}**`,
    embeds: [
      {
        title: `Pokémon Kartenankauf · ${ticketId}`,
        color: 0x3fb6ff,
        fields,
        footer: {
          text: 'manacards.de/ankauf',
        },
        timestamp: new Date().toISOString(),
        ...(attachmentsMeta.length > 0
          ? { image: { url: `attachment://${attachmentsMeta[0].filename}` } }
          : {}),
      },
    ],
    attachments: attachmentsMeta,
  };

  discordForm.append('payload_json', JSON.stringify(payloadJson));

  try {
    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      body: discordForm,
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text().catch(() => '');
      console.error('Discord webhook rejected request:', discordRes.status, errText);
      return NextResponse.json(
        {
          error:
            'Übermittlung an Discord fehlgeschlagen. Bitte versuche es in einem Moment erneut.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { ok: true, ticketId, batchToken },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err) {
    console.error('Discord webhook network error:', err);
    return NextResponse.json(
      {
        error:
          'Verbindungsfehler beim Senden. Bitte prüfe deine Internetverbindung und versuche es erneut.',
      },
      { status: 502 }
    );
  }
}
