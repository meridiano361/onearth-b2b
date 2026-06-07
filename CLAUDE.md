# Convenzioni progetto — ON EARTH B2B

## Regola OBBLIGATORIA: pagina Aiuto

**File:** `src/app/(b2b)/catalog/assistenza/page.tsx`

Ogni volta che aggiungi, modifichi o rimuovi una funzionalità visibile all'utente, **devi aggiornare questa pagina nello stesso commit**. È un requisito non negoziabile.

Checklist minima per ogni modifica alla pagina:
- Aggiornare la data in cima al file (`// AGGIORNATO: YYYY-MM-DD`)
- Aggiungere/modificare/rimuovere la sezione corrispondente
- Aggiornare l'array `SECTIONS` (indice) se si aggiunge o rimuove una sezione
- Rinumerare i commenti e gli `<SectionHeader n={…}` se il numero di sezioni cambia

## Funzionalità attualmente documentate (2026-06-07)

1. Installare l'app sul dispositivo
2. Come accedere
3. Il Catalogo
4. Preferiti
5. Creare un Ordine
6. Budget Ordine
7. Le Destinazioni
8. I miei Ordini — include: modifica, anteprima, PDF, Demetra, duplica, **unisci**, elimina, budget per ordine
9. **Unire due Ordini** — checkbox su 2 ordini → barra floating → modal scegli quale conservare
10. Anteprima e Raggruppamento — include: raggruppamento, **ricerca per nome/codice**, **filtro presenza (Tutti/Non ancora/Già presenti)** in Aggiungi prodotti, PDF, Excel
11. Esportare in Demetra — include istruzioni complete importazione in Demetra
12. Esposizioni
13. Risorse e Media
14. Le mie Destinazioni
15. Multilingua
16. Assistenza tecnica

## Stack tecnico

- Next.js 14 App Router, TypeScript, Tailwind CSS
- Prisma ORM su Supabase PostgreSQL
- NextAuth — ruoli: `OPERATOR`, `CUSTOMER`
- TanStack Query per data fetching
- next-intl per i18n (file in `/messages/*.json`) — aggiornare **tutti e 5** i file (it, en, de, fr, es) quando si aggiungono chiavi di traduzione
- Vercel auto-deploy su push a `main`

## Altre convenzioni

- Nessun commento ridondante nel codice — solo il "perché" quando non è ovvio
- `mondiEspositivi` = flag operator-only per Esposizione e Calendario
- API ownership: OPERATOR → `organizationId`, CUSTOMER → `customerId`
