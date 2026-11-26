'use client';

import React, { useId, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ImagePlus,
  Mail,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';

const LINKTREE_URL = 'https://linktr.ee/manacards_de';
const MAX_PHOTOS = 20;
const PHOTOS_PER_BATCH = 8;

const COLLECTION_TYPES = [
  { value: 'Einzelkarten / Hits', desc: 'Ausgewählte Karten, Alt-Arts & Chase-Cards' },
  { value: 'Ordner / Binder', desc: 'Sortierte Sammler-Binder & Mappen' },
  { value: 'Komplette Sammlung', desc: 'Größerer Bestand oder ganze Sammlung' },
  { value: 'Sealed / Displays', desc: 'Ungeöffnete Booster, Displays & ETBs' },
] as const;

const CONDITIONS = [
  { value: 'Packfrisch / Mint', desc: 'Direkt gesleeved, makellos' },
  { value: 'Near Mint', desc: 'Sehr gut, minimale Spuren' },
  { value: 'Gemischt', desc: 'Unterschiedliche Zustände' },
  { value: 'Bespielt', desc: 'Sichtbare Gebrauchsspuren' },
] as const;

const CONTACT_CHANNELS = [
  {
    value: 'WhatsApp',
    label: 'WhatsApp',
    inputLabel: 'Deine WhatsApp-Nummer',
    placeholder: 'z. B. 0170 1234567',
    helper: 'Wir schreiben dir direkt per WhatsApp – schnellster Weg.',
    type: 'tel' as const,
    autoComplete: 'tel',
    inputMode: 'tel' as const,
  },
  {
    value: 'E-Mail',
    label: 'E-Mail',
    inputLabel: 'Deine E-Mail-Adresse',
    placeholder: 'name@beispiel.de',
    helper: 'Du erhältst unser Angebot direkt per E-Mail.',
    type: 'email' as const,
    autoComplete: 'email',
    inputMode: 'email' as const,
  },
] as const;

interface CompressedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  sizeKb: number;
}

/**
 * Compresses mobile camera photos client-side to crisp JPEG (~180-300 KB)
 * so up to 20 binder/card photos upload quickly and reliably in batched requests.
 */
async function compressPhotoForUpload(file: File, maxDim = 1350): Promise<CompressedPhoto> {
  const id = `ph_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const blob: Blob = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((out) => resolve(out ?? file), 'image/jpeg', 0.8);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  const cleanName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  const compressedFile = new File([blob], cleanName, { type: 'image/jpeg' });
  const previewUrl = URL.createObjectURL(compressedFile);

  return {
    id,
    file: compressedFile,
    previewUrl,
    sizeKb: Math.max(1, Math.round(compressedFile.size / 1024)),
  };
}

export const AnkaufFormClient: React.FC = () => {
  const formHeadingId = useId();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const contactInputRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const [collectionType, setCollectionType] = useState<string>(COLLECTION_TYPES[0].value);
  const [condition, setCondition] = useState<string>(CONDITIONS[1].value);
  const [photos, setPhotos] = useState<CompressedPhoto[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const [notes, setNotes] = useState('');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [name, setName] = useState('');
  const [contactChannel, setContactChannel] = useState<string>(CONTACT_CHANNELS[0].value);
  const [contactValue, setContactValue] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    contactValue?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitProgress, setSubmitProgress] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  const activeChannelMeta =
    CONTACT_CHANNELS.find((c) => c.value === contactChannel) ?? CONTACT_CHANNELS[0];

  const handlePhotoFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    const picked = Array.from(fileList)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, remaining);
    if (picked.length === 0) return;

    setIsCompressing(true);
    setSubmitError(null);
    try {
      const compressed = await Promise.all(picked.map((f) => compressPhotoForUpload(f)));
      setPhotos((prev) => [...prev, ...compressed].slice(0, MAX_PHOTOS));
    } finally {
      setIsCompressing(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== photoId);
    });
  };

  const validateAndFocus = (): boolean => {
    const nextErrors: { name?: string; contactValue?: string } = {};
    if (!name.trim()) {
      nextErrors.name = 'Bitte gib deinen Namen an.';
    }
    if (!contactValue.trim()) {
      nextErrors.contactValue = `Bitte gib ${activeChannelMeta.inputLabel.toLowerCase()} an.`;
    }
    setFieldErrors(nextErrors);

    if (nextErrors.name) {
      nameInputRef.current?.focus();
      return false;
    }
    if (nextErrors.contactValue) {
      contactInputRef.current?.focus();
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);

    if (!validateAndFocus()) return;

    setIsSubmitting(true);
    const totalBatches = Math.max(1, Math.ceil(photos.length / PHOTOS_PER_BATCH));
    setSubmitProgress(
      totalBatches > 1 ? `Anfrage & Fotos werden gesendet (1/${totalBatches})…` : 'Anfrage wird gesendet…'
    );

    try {
      // 1. Primary request (form details + first batch of up to 8 photos)
      const firstBatch = photos.slice(0, PHOTOS_PER_BATCH);
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('contactChannel', contactChannel);
      fd.append('contactValue', contactValue.trim());
      fd.append('collectionType', collectionType);
      fd.append('condition', condition);
      fd.append('expectedPrice', expectedPrice.trim());
      fd.append('notes', notes.trim());
      fd.append('company_website', honeypot);
      fd.append('categories', 'Pokémon');
      fd.append('totalPhotos', String(photos.length));

      for (const p of firstBatch) {
        fd.append('photos', p.file, p.file.name);
      }

      const res = await fetch('/api/ankauf', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(
          typeof data?.error === 'string'
            ? data.error
            : 'Etwas hat nicht geklappt. Bitte versuche es erneut.'
        );
        return;
      }

      const ticketId = typeof data?.ticketId === 'string' ? data.ticketId : 'MC-OK';
      const batchToken = typeof data?.batchToken === 'string' ? data.batchToken : '';

      // 2. Remaining photos in crisp follow-up batches (up to 8 photos per batch → up to 20 total)
      if (photos.length > PHOTOS_PER_BATCH && batchToken) {
        for (let b = 1; b < totalBatches; b++) {
          const offset = b * PHOTOS_PER_BATCH;
          const chunk = photos.slice(offset, offset + PHOTOS_PER_BATCH);
          if (chunk.length === 0) continue;

          setSubmitProgress(`Weitere Fotos werden gesendet (${b + 1}/${totalBatches})…`);
          const batchFd = new FormData();
          batchFd.append('mode', 'photo-batch');
          batchFd.append('ticketId', ticketId);
          batchFd.append('batchToken', batchToken);
          batchFd.append('name', name.trim());
          batchFd.append('batchIndex', String(b + 1));
          batchFd.append('totalBatches', String(totalBatches));
          batchFd.append('photoOffset', String(offset));
          for (const p of chunk) {
            batchFd.append('photos', p.file, p.file.name);
          }

          const bRes = await fetch('/api/ankauf', {
            method: 'POST',
            body: batchFd,
          });
          if (!bRes.ok) {
            const bData = await bRes.json().catch(() => ({}));
            setSubmitError(
              typeof bData?.error === 'string'
                ? `${bData.error} (Deine Basis-Anfrage ${ticketId} ist bereits eingegangen.)`
                : `Einige Fotos konnten nicht gesendet werden (Basis-Anfrage ${ticketId} ist eingegangen).`
            );
            return;
          }
        }
      }

      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
      setSubmittedTicket(ticketId);
      requestAnimationFrame(() => {
        successRef.current?.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } catch {
      setSubmitError('Keine Verbindung zum Server. Bitte prüfe dein Internet und versuche es erneut.');
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(null);
    }
  };

  const resetForNewSubmission = () => {
    setSubmittedTicket(null);
    setNotes('');
    setExpectedPrice('');
    setSubmitError(null);
    setFieldErrors({});
  };

  const totalPhotoKb = photos.reduce((acc, p) => acc + p.sizeKb, 0);

  return (
    <div className="studio-shell min-h-screen min-h-[100dvh] w-full bg-[#090b11] text-white font-wn-sans relative overflow-x-hidden">
      {/* Subtle atmospheric mana-blue radial glow behind hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 -top-40 h-[420px] mx-auto max-w-2xl rounded-full blur-[130px] opacity-35"
        style={{
          background:
            'radial-gradient(circle, rgba(56, 189, 248, 0.42) 0%, rgba(30, 64, 175, 0.16) 55%, transparent 100%)',
        }}
      />

      <div className="relative z-10 max-w-xl mx-auto px-4 sm:px-6 pt-5 pb-16">
        {/* Top bar back to Linktree */}
        <nav aria-label="Navigation" className="flex items-center justify-between mb-6">
          <a
            href={LINKTREE_URL}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 -ml-3 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Alle Links</span>
          </a>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300/90">
            manacards.de/ankauf
          </span>
        </nav>

        {/* Hero Header */}
        <header className="mb-7">
          <div className="flex items-center gap-3.5 mb-4">
            <div
              className="relative w-14 h-14 shrink-0 overflow-hidden"
              style={{
                borderRadius: 15,
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.28), 0 8px 24px rgba(56, 189, 248, 0.25)',
              }}
            >
              <img
                src="/images/logos/mana-bottle.png"
                alt="ManaCards"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#FFE406]">
                ManaCards · Kartenankauf
              </p>
              <h1
                id={formHeadingId}
                className="text-2xl sm:text-3xl font-extrabold tracking-[-0.025em] text-white leading-tight mt-0.5"
              >
                Wir kaufen deine Sammlung
              </h1>
            </div>
          </div>

          <p className="text-[15px] text-slate-300 leading-relaxed">
            Schick uns kurz Fotos und Infos zu deinen Pokémon Einzelkarten, Bindern, Slabs oder
            kompletten Sammlungen. Wir schauen sie uns an und melden uns mit einem fairen Angebot.
          </p>

          {/* Compact Trust Strip */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { icon: ShieldCheck, label: 'Faire Bewertung' },
              { icon: Clock, label: 'Schnelle Antwort' },
              { icon: CheckCircle2, label: 'Unverbindlich' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11.5px] font-semibold text-slate-200"
              >
                <Icon className="w-3.5 h-3.5 text-sky-300 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>
        </header>

        {/* Success Confirmation View */}
        {submittedTicket ? (
          <div
            ref={successRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
            className="rounded-2xl bg-[#111521] border border-emerald-400/35 p-6 sm:p-8 space-y-5 shadow-[0_24px_60px_rgba(0,0,0,0.65)] focus:outline-none"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">
                Anfrage eingegangen · {submittedTicket}
              </p>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Danke, {name}!
              </h2>
              <p className="text-[15px] text-slate-300 leading-relaxed">
                Deine Ankauf-Anfrage ist direkt bei unserem Team gelandet. Wir prüfen deine
                Angaben und Fotos und melden uns schnellstmöglich per{' '}
                <strong className="text-white">{contactChannel}</strong> bei dir.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={resetForNewSubmission}
                className="min-h-[48px] flex-1 px-4 rounded-xl bg-[#FFE406] hover:bg-[#f5dc00] text-[#1a1718] font-extrabold text-sm transition-colors"
              >
                Weitere Karten einsenden
              </button>
              <a
                href={LINKTREE_URL}
                className="min-h-[48px] flex-1 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm flex items-center justify-center transition-colors"
              >
                Zu unseren Socials
              </a>
            </div>
          </div>
        ) : (
          /* Main Accessible Submission Form */
          <form
            action="/api/ankauf"
            method="POST"
            encType="multipart/form-data"
            aria-labelledby={formHeadingId}
            onSubmit={handleSubmit}
            noValidate
            className="space-y-6"
          >
            <input type="hidden" name="categories" value="Pokémon" />

            {/* Anti-spam honeypot hidden from users & assistive tech */}
            <div aria-hidden="true" className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden">
              <label htmlFor="company_website">Website</label>
              <input
                id="company_website"
                name="company_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* SECTION 1: POKÉMON CATEGORY (Logo instead of plain text) */}
            <fieldset className="rounded-2xl bg-[#111521] border border-white/10 p-4 sm:p-5 space-y-3">
              <legend className="text-sm font-extrabold text-white tracking-tight px-1">
                1. Kategorie
              </legend>

              <label
                htmlFor="cat_pokemon"
                className="relative flex items-center justify-between gap-4 min-h-[76px] px-4 py-3 rounded-xl border border-sky-400/65 bg-sky-400/12 cursor-pointer select-none"
              >
                <input
                  id="cat_pokemon"
                  type="radio"
                  name="categoryDisplay"
                  value="Pokémon"
                  checked
                  readOnly
                  aria-label="Pokémon"
                  className="sr-only"
                />
                <img
                  src="/images/logos/pokemon-logo.svg"
                  alt="Pokémon"
                  className="h-11 sm:h-12 w-auto object-contain select-none"
                />
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-sky-400/20 border border-sky-300/60 text-sky-200 shrink-0">
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                </span>
              </label>
            </fieldset>

            {/* SECTION 2: COLLECTION TYPE & CONDITION */}
            <div className="rounded-2xl bg-[#111521] border border-white/10 p-4 sm:p-5 space-y-5">
              <fieldset className="space-y-2.5">
                <legend className="text-sm font-extrabold text-white tracking-tight">
                  2. Was genau bietest du an?
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COLLECTION_TYPES.map((opt) => {
                    const checked = collectionType === opt.value;
                    const id = `ctype_${opt.value.replace(/[^a-zA-Z0-9]/g, '_')}`;
                    return (
                      <label
                        key={opt.value}
                        htmlFor={id}
                        className={`min-h-[52px] px-3.5 py-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors select-none ${
                          checked
                            ? 'bg-sky-400/15 border-sky-400/65 text-white'
                            : 'bg-[#171c2b] border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <input
                          id={id}
                          type="radio"
                          name="collectionType"
                          value={opt.value}
                          checked={checked}
                          onChange={() => setCollectionType(opt.value)}
                          className="mt-1 w-4 h-4 shrink-0 accent-[#FFE406] cursor-pointer"
                        />
                        <div>
                          <div className="text-[13.5px] font-bold leading-snug">{opt.value}</div>
                          <div className="text-[11.5px] text-slate-400 leading-snug mt-0.5">{opt.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-2.5 pt-3 border-t border-white/10">
                <legend className="text-sm font-extrabold text-white tracking-tight">
                  Geschätzter Zustand
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {CONDITIONS.map((opt) => {
                    const checked = condition === opt.value;
                    const id = `cond_${opt.value.replace(/[^a-zA-Z0-9]/g, '_')}`;
                    return (
                      <label
                        key={opt.value}
                        htmlFor={id}
                        className={`min-h-[50px] px-3 py-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors select-none ${
                          checked
                            ? 'bg-sky-400/15 border-sky-400/65 text-white'
                            : 'bg-[#171c2b] border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <input
                          id={id}
                          type="radio"
                          name="condition"
                          value={opt.value}
                          checked={checked}
                          onChange={() => setCondition(opt.value)}
                          className="mt-0.5 w-4 h-4 shrink-0 accent-[#FFE406] cursor-pointer"
                        />
                        <div>
                          <div className="text-[13px] font-bold leading-snug">{opt.value}</div>
                          <div className="text-[11px] text-slate-400 leading-snug">{opt.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            {/* SECTION 3: PHOTOS (up to 20 images) */}
            <div className="rounded-2xl bg-[#111521] border border-white/10 p-4 sm:p-5 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="ankauf-photos" className="text-sm font-extrabold text-white tracking-tight">
                  3. Fotos deiner Karten
                </label>
                <span className="text-xs font-semibold text-slate-400">
                  {photos.length} / {MAX_PHOTOS} Bilder
                  {totalPhotoKb > 0 ? ` · ${(totalPhotoKb / 1024).toFixed(1)} MB` : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lade bis zu {MAX_PHOTOS} Fotos von Binder-Seiten, Hits oder Rückseiten hoch – wir
                optimieren die Dateigröße automatisch für schnellen Upload.
              </p>

              <input
                ref={photoInputRef}
                id="ankauf-photos"
                name="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => void handlePhotoFiles(e.target.files)}
                className="sr-only"
              />

              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isCompressing}
                  className="w-full min-h-[112px] px-4 py-5 rounded-xl border-2 border-dashed border-sky-400/40 bg-[#171c2b]/80 hover:bg-[#1b2236] hover:border-sky-400/75 transition-colors flex flex-col items-center justify-center gap-2 text-center cursor-pointer disabled:opacity-60"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-400/15 text-sky-300 flex items-center justify-center">
                    <ImagePlus className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-bold text-white">
                    {isCompressing
                      ? 'Fotos werden optimiert…'
                      : 'Fotos auswählen oder aufnehmen'}
                  </div>
                  <div className="text-xs text-slate-400">
                    Bis zu {MAX_PHOTOS} Bilder · JPG, PNG, HEIC oder WebP
                  </div>
                </button>
              )}

              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-xl overflow-hidden border border-white/15 bg-black/50"
                    >
                      <img
                        src={photo.previewUrl}
                        alt={`Hochgeladenes Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        aria-label={`Foto ${index + 1} entfernen`}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/80 hover:bg-rose-500 text-white flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 4: NOTES & EXPECTED PRICE */}
            <div className="rounded-2xl bg-[#111521] border border-white/10 p-4 sm:p-5 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="ankauf-notes" className="block text-sm font-extrabold text-white">
                  4. Kurze Beschreibung (optional)
                </label>
                <textarea
                  id="ankauf-notes"
                  name="notes"
                  rows={3}
                  maxLength={1500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="z. B. Sprache (Deutsch/Englisch/Japanisch), besondere Highlights, grobe Kartenanzahl…"
                  className="w-full rounded-xl bg-[#171c2b] border border-white/15 px-3.5 py-3 text-[16px] text-white placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE406]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ankauf-price" className="block text-sm font-extrabold text-white">
                  Preisvorstellung in € (optional)
                </label>
                <input
                  id="ankauf-price"
                  name="expectedPrice"
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="next"
                  maxLength={60}
                  value={expectedPrice}
                  onChange={(e) => setExpectedPrice(e.target.value)}
                  placeholder="z. B. 350 € (oder leer lassen für unser Angebot)"
                  aria-describedby="ankauf-price-hint"
                  className="w-full min-h-[48px] rounded-xl bg-[#171c2b] border border-white/15 px-3.5 py-3 text-[16px] text-white placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE406]"
                />
                <p id="ankauf-price-hint" className="text-xs text-slate-400">
                  Lass das Feld einfach leer, wenn du zuerst unseren Preisvorschlag möchtest.
                </p>
              </div>
            </div>

            {/* SECTION 5: CONTACT DETAILS (WhatsApp & E-Mail only) */}
            <div className="rounded-2xl bg-[#111521] border border-white/10 p-4 sm:p-5 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="ankauf-name" className="block text-sm font-extrabold text-white">
                  5. Dein Name <span className="text-[#FFE406]" aria-hidden="true">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="ankauf-name"
                  name="name"
                  type="text"
                  required
                  maxLength={100}
                  autoComplete="name"
                  enterKeyHint="next"
                  value={name}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'err-name' : undefined}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name && e.target.value.trim()) {
                      setFieldErrors((errs) => ({ ...errs, name: undefined }));
                    }
                  }}
                  placeholder="Vorname oder Whatnot-Name"
                  className="w-full min-h-[48px] rounded-xl bg-[#171c2b] border border-white/15 px-3.5 py-3 text-[16px] text-white placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE406]"
                />
                {fieldErrors.name && (
                  <p id="err-name" role="alert" className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fieldErrors.name}</span>
                  </p>
                )}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-extrabold text-white">
                  Wie sollen wir dir antworten? <span className="text-[#FFE406]" aria-hidden="true">*</span>
                </legend>
                <div className="grid grid-cols-2 gap-2.5">
                  {CONTACT_CHANNELS.map((ch) => {
                    const checked = contactChannel === ch.value;
                    const id = `ch_${ch.value}`;
                    return (
                      <label
                        key={ch.value}
                        htmlFor={id}
                        className={`min-h-[52px] px-3.5 py-2.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-colors select-none ${
                          checked
                            ? 'bg-sky-400/15 border-sky-400/65 text-white'
                            : 'bg-[#171c2b] border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <input
                          id={id}
                          type="radio"
                          name="contactChannel"
                          value={ch.value}
                          checked={checked}
                          onChange={() => {
                            setContactChannel(ch.value);
                            setFieldErrors((errs) => ({ ...errs, contactValue: undefined }));
                          }}
                          className="w-4 h-4 shrink-0 accent-[#FFE406] cursor-pointer"
                        />
                        {ch.value === 'WhatsApp' ? (
                          <img
                            src="/images/logos/whatsapp.png"
                            alt=""
                            aria-hidden="true"
                            className="w-5 h-5 rounded-md object-cover shrink-0"
                          />
                        ) : (
                          <Mail className="w-4 h-4 text-sky-300 shrink-0" aria-hidden="true" />
                        )}
                        <span>{ch.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <label htmlFor="ankauf-contact" className="block text-sm font-extrabold text-white">
                  {activeChannelMeta.inputLabel}{' '}
                  <span className="text-[#FFE406]" aria-hidden="true">*</span>
                </label>
                <input
                  ref={contactInputRef}
                  id="ankauf-contact"
                  name="contactValue"
                  type={activeChannelMeta.type}
                  required
                  maxLength={140}
                  autoComplete={activeChannelMeta.autoComplete}
                  inputMode={activeChannelMeta.inputMode}
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="done"
                  value={contactValue}
                  aria-invalid={Boolean(fieldErrors.contactValue)}
                  aria-describedby="ankauf-contact-hint"
                  onChange={(e) => {
                    setContactValue(e.target.value);
                    if (fieldErrors.contactValue && e.target.value.trim()) {
                      setFieldErrors((errs) => ({ ...errs, contactValue: undefined }));
                    }
                  }}
                  placeholder={activeChannelMeta.placeholder}
                  className="w-full min-h-[48px] rounded-xl bg-[#171c2b] border border-white/15 px-3.5 py-3 text-[16px] text-white placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE406]"
                />
                <p id="ankauf-contact-hint" className="text-xs text-slate-400">
                  {activeChannelMeta.helper}
                </p>
                {fieldErrors.contactValue && (
                  <p role="alert" className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fieldErrors.contactValue}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Server Error Banner */}
            {submitError && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-xl bg-rose-500/15 border border-rose-400/45 p-3.5 text-sm font-semibold text-rose-200 flex items-start gap-2.5"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-300" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Primary Submit CTA */}
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="w-full min-h-[54px] px-6 rounded-xl bg-[#FFE406] hover:bg-[#f5dc00] active:scale-[0.99] text-[#1a1718] font-extrabold text-base flex items-center justify-center gap-2 shadow-[0_12px_30px_rgba(255,228,6,0.2)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>
                {submitProgress ?? 'Ankauf-Anfrage absenden'}
              </span>
            </button>

            <p className="text-center text-xs text-slate-500 leading-relaxed">
              Deine Angaben &amp; Fotos werden ausschließlich zur Bewertung deiner Kartenanfrage
              durch ManaCards genutzt.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
