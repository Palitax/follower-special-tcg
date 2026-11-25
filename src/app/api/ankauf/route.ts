import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PHOTOS = 8;
const MAX_SINGLE_FILE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB per compressed file
const MAX_TOTAL_BYTES = 4.2 * 1024 * 1024; // Safe headroom under Vercel's 4.5 MB limit
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Lightweight in-memory rate limit (per serverless instance)
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 6;
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

function buildQuickContactLink(channel: string, rawValue: string): string | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (channel === 'WhatsApp') {
    let digits = trimmed.replace(/[^\d+]/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    else if (digits.startsWith('+')) digits = digits.slice(1);
    else if (digits.startsWith('0')) digits = `49${digits.slice(1)}`;
    if (digits.length >= 8) {
      return `https://wa.me/${digits}`;
    }
  }

  if (channel === 'Instagram') {
    const handle = trimmed
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/^@+/, '')
      .split(/[/?#]/)[0];
    if (handle && /^[a-zA-Z0-9._]+$/.test(handle)) {
      return `https://instagram.com/${handle}`;
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

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const clientIp = forwarded?.split(',')[0]?.trim() || 'unknown';

  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen in kurzer Zeit. Bitte warte ein paar Minuten.' },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Die Anfrage konnte nicht gelesen werden. Bitte verkleinere die Fotos oder versuche es erneut.' },
      { status: 400 }
    );
  }

  // Honeypot anti-spam check: silently accept bots without posting to Discord
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

  const categories = formData
    .getAll('categories')
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().slice(0, 50))
    .slice(0, 12);

  if (!name) {
    return NextResponse.json({ error: 'Bitte gib deinen Namen an.' }, { status: 400 });
  }
  if (categories.length === 0) {
    return NextResponse.json(
      { error: 'Bitte wähle mindestens eine TCG-Kategorie aus.' },
      { status: 400 }
    );
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

  // Collect & validate uploaded photos
  const rawPhotos = formData.getAll('photos');
  const photos: File[] = [];
  let totalBytes = 0;

  for (const entry of rawPhotos) {
    if (entry instanceof File && entry.size > 0) {
      if (photos.length >= MAX_PHOTOS) break;
      if (!ALLOWED_MIME.has(entry.type)) {
        return NextResponse.json(
          { error: 'Bitte lade nur Bilder (JPG, PNG oder WebP) hoch.' },
          { status: 400 }
        );
      }
      if (entry.size > MAX_SINGLE_FILE_BYTES) {
        return NextResponse.json(
          { error: `Das Foto „${entry.name}“ ist zu groß. Bitte wähle ein kleineres Bild.` },
          { status: 400 }
        );
      }
      totalBytes += entry.size;
      if (totalBytes > MAX_TOTAL_BYTES) {
        return NextResponse.json(
          { error: 'Die Fotos sind insgesamt zu groß. Bitte sende maximal 8 Bilder.' },
          { status: 400 }
        );
      }
      photos.push(entry);
    }
  }

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

  const ticketId = generateTicketId();
  const quickLink = buildQuickContactLink(contactChannel, contactValue);
  const contactDisplay = quickLink
    ? `${contactChannel}: **${contactValue}**\n[Direkt öffnen](${quickLink})`
    : `${contactChannel}: **${contactValue}**`;

  const fields = [
    { name: 'Verkäufer', value: name, inline: true },
    { name: 'Kontakt', value: contactDisplay, inline: true },
    {
      name: 'Preisvorstellung',
      value: expectedPrice ? `${expectedPrice}` : 'Bitte um Angebot',
      inline: true,
    },
    { name: 'Kategorien', value: categories.join(' · '), inline: false },
    { name: 'Art', value: collectionType, inline: true },
    { name: 'Zustand', value: condition || 'Nicht angegeben', inline: true },
    {
      name: 'Fotos',
      value: photos.length > 0 ? `${photos.length} Bild${photos.length === 1 ? '' : 'er'} angehängt` : 'Keine Fotos hochgeladen',
      inline: true,
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
    content: `**Neue Ankauf-Anfrage \`${ticketId}\`** von **${name}** (${categories.join(', ')})`,
    embeds: [
      {
        title: `Kartenankauf · ${ticketId}`,
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
        { error: 'Übermittlung an Discord fehlgeschlagen. Bitte versuche es in einem Moment erneut.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { ok: true, ticketId },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err) {
    console.error('Discord webhook network error:', err);
    return NextResponse.json(
      { error: 'Verbindungsfehler beim Senden. Bitte prüfe deine Internetverbindung und versuche es erneut.' },
      { status: 502 }
    );
  }
}
