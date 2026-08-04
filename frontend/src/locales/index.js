import en from './en.json';
import es from './es.json';
import de from './de.json';
import fr from './fr.json';
import it from './it.json';
import pt from './pt.json';
import ro from './ro.json';

export const dictionaries = {
  en,
  es,
  de,
  fr,
  it,
  pt,
  ro
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' }
];
