export async function translateText(
  text: string,
  targetLang: 'en' | 'de' | 'fr' | 'es'
): Promise<string> {
  if (!text || text.trim() === '') return '';
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=it|${targetLang}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    }
    return text;
  } catch {
    return text;
  }
}

export async function translateProduct(descrizione: string) {
  const [en, de, fr, es] = await Promise.all([
    translateText(descrizione, 'en'),
    translateText(descrizione, 'de'),
    translateText(descrizione, 'fr'),
    translateText(descrizione, 'es'),
  ]);
  return { descrizioneEn: en, descrizioneDe: de, descrizioneFr: fr, descrizioneEs: es };
}
