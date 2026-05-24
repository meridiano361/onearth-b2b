import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { authOptions } from '@/lib/auth';
import { getPreviewFromSession } from '@/lib/preview';
import { prisma } from '@/lib/prisma';
import Header from '@/components/layout/Header';
import CartSidebar from '@/components/cart/CartSidebar';
import MobileNav from '@/components/layout/MobileNav';
import PreviewBanner from '@/components/layout/PreviewBanner';
import { PreviewProvider } from '@/contexts/PreviewContext';
import { SettingsProvider, parseSettingsFromDb } from '@/contexts/SettingsContext';

const CATALOG_FONT_MAP: Record<string, string> = {
  inter: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  playfair: "'Playfair Display', Georgia, 'Times New Roman', serif",
  montserrat: "'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  lato: "'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif",
};

// Paths where the cart sidebar should not be shown
const SIDEBAR_HIDDEN_PATHS = ['/catalog/orders', '/orders', '/catalog/destinazioni'];

export default async function B2BLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Fetch all app settings
  let settingsRecords: { chiave: string; valore: string }[] = [];
  try {
    settingsRecords = await prisma.appSettings.findMany();
  } catch { /* fallback to defaults */ }

  const appSettings = parseSettingsFromDb(settingsRecords);

  // Catalog font for web interface
  const catalogFontKey = settingsRecords.find((r) => r.chiave === 'catalogo.font')?.valore ?? 'inter';
  const catalogFontFamily = CATALOG_FONT_MAP[catalogFontKey] ?? CATALOG_FONT_MAP.inter;

  const pathname = headers().get('x-pathname') ?? '';
  const hideSidebar = SIDEBAR_HIDDEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  const previewData = getPreviewFromSession(session);
  const previewInfo = previewData
    ? {
        organizationId: previewData.organizationId,
        operatorId: previewData.operatorId,
        orgName: previewData.orgName,
        operatorName: previewData.operatorName,
      }
    : null;

  const { colori } = appSettings;

  return (
    <PreviewProvider value={previewInfo}>
      <SettingsProvider value={appSettings}>
        <div
          className="min-h-screen bg-background flex flex-col"
          style={{
            fontFamily: catalogFontFamily,
            '--color-bg': colori.sfondo,
            '--color-btn': colori.pulsanti,
            '--color-btn-text': colori.testoPulsanti,
            '--color-text': colori.testo,
          } as React.CSSProperties}
        >
          {previewInfo && (
            <PreviewBanner orgName={previewInfo.orgName} operatorName={previewInfo.operatorName} />
          )}
          <Header session={session} />

          <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
              {children}
            </main>

            {/* Cart sidebar — desktop only, hidden on orders pages */}
            {!hideSidebar && (
              <aside className="hidden lg:block w-80 xl:w-[340px] border-l border-border flex-shrink-0 bg-white overflow-y-auto">
                <CartSidebar />
              </aside>
            )}
          </div>

          <MobileNav />
        </div>
      </SettingsProvider>
    </PreviewProvider>
  );
}
