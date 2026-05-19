// IMPORTANTE: aggiornare questa pagina ogni volta che vengono aggiunte, modificate o rimosse funzionalità nell'app cliente.

import { getTranslations } from 'next-intl/server';
import {
  LogIn, BookOpen, ShoppingBag, Package, Eye, Download,
  Globe, HelpCircle, MessageCircle,
} from 'lucide-react';

export async function generateMetadata() {
  const t = await getTranslations('assistance');
  return { title: t('title') };
}

interface Section {
  icon: React.ReactNode;
  title: string;
  items: (string | { label: string; sub: string[] })[];
}

export default async function AssistenzaPage() {
  const t = await getTranslations('assistance');

  const SECTIONS: Section[] = [
    {
      icon: <LogIn size={16} />,
      title: t('s1Title'),
      items: [
        t('s1i1'),
        t('s1i2'),
        { label: t('s1i3Label'), sub: [t('s1i3Sub1')] },
      ],
    },
    {
      icon: <BookOpen size={16} />,
      title: t('s2Title'),
      items: [
        t('s2i1'),
        t('s2i2'),
        t('s2i3'),
        t('s2i4'),
        t('s2i5'),
      ],
    },
    {
      icon: <ShoppingBag size={16} />,
      title: t('s3Title'),
      items: [
        t('s3i1'),
        t('s3i2'),
        t('s3i3'),
      ],
    },
    {
      icon: <Package size={16} />,
      title: t('s4Title'),
      items: [
        t('s4i1'),
        {
          label: t('s4i2Label'),
          sub: [
            t('s4i2Sub1'),
            t('s4i2Sub2'),
            t('s4i2Sub3'),
            t('s4i2Sub4'),
            t('s4i2Sub5'),
            t('s4i2Sub6'),
            t('s4i2Sub7'),
          ],
        },
      ],
    },
    {
      icon: <Eye size={16} />,
      title: t('s5Title'),
      items: [
        t('s5i1'),
        t('s5i2'),
        t('s5i3'),
      ],
    },
    {
      icon: <Download size={16} />,
      title: t('s6Title'),
      items: [
        t('s6i1'),
        t('s6i2'),
        t('s6i3'),
      ],
    },
    {
      icon: <Globe size={16} />,
      title: t('s7Title'),
      items: [
        t('s7i1'),
        t('s7i2'),
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="label-luxury text-accent mb-1">{t('guide')}</p>
        <h1 className="font-display text-2xl sm:text-3xl text-primary font-light tracking-wide">
          {t('title')}
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          {t('subtitle')}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-white border border-border rounded-lg p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-accent">{section.icon}</span>
              <h2 className="text-sm font-semibold text-primary tracking-wide">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.items.map((item, i) =>
                typeof item === 'string' ? (
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <span className="text-accent mt-1 flex-shrink-0">·</span>
                    <span>{item}</span>
                  </li>
                ) : (
                  <li key={i} className="text-sm text-gray-600">
                    <div className="flex gap-2">
                      <span className="text-accent mt-1 flex-shrink-0">·</span>
                      <span>{item.label}</span>
                    </div>
                    <ul className="mt-1.5 ml-4 space-y-1">
                      {item.sub.map((s, j) => (
                        <li key={j} className="flex gap-2 text-sm text-gray-500">
                          <span className="text-gray-300 mt-1 flex-shrink-0">–</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}

        {/* Assistenza */}
        <div className="bg-white border border-border rounded-lg p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-accent"><HelpCircle size={16} /></span>
            <h2 className="text-sm font-semibold text-primary tracking-wide">{t('s8Title')}</h2>
          </div>
          <ul className="space-y-2">
            <li className="flex gap-2 text-sm text-gray-600">
              <span className="text-accent mt-1 flex-shrink-0">·</span>
              <span>
                {t('s8i1')}{' '}
                <a
                  href="mailto:e.mazzolari@meridiano361.it"
                  className="text-accent hover:underline font-medium"
                >
                  assistenzatecnicaapp2b2@onearth.it
                </a>
              </span>
            </li>
            <li className="flex gap-2 text-sm text-gray-600">
              <span className="text-accent mt-1 flex-shrink-0">·</span>
              <span className="flex items-center gap-1.5">
                <MessageCircle size={13} className="text-green-500 flex-shrink-0" />
                {t('s8i2')}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
