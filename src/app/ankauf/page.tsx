import type { Metadata } from 'next';
import { AnkaufFormClient } from '../../components/AnkaufFormClient';

export const metadata: Metadata = {
  title: 'ManaCards · Kartenankauf',
  description:
    'Verkaufe deine Pokémon-, One-Piece-, Yu-Gi-Oh!- oder TCG-Sammlung direkt an ManaCards. Fotos hochladen und faires Angebot erhalten.',
};

export default function AnkaufPage() {
  return <AnkaufFormClient />;
}
