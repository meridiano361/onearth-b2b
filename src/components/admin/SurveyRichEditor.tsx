'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

const COLORS = [
  { hex: '#000000', label: 'Nero' },
  { hex: '#374151', label: 'Grigio scuro' },
  { hex: '#6b7280', label: 'Grigio' },
  { hex: '#dc2626', label: 'Rosso' },
  { hex: '#ea580c', label: 'Arancione' },
  { hex: '#d97706', label: 'Ambra' },
  { hex: '#16a34a', label: 'Verde' },
  { hex: '#2563eb', label: 'Blu' },
  { hex: '#7c3aed', label: 'Viola' },
];

const STYLES = `
  .srte { outline: none; padding: 8px 12px; min-height: 2.5rem; font-size: 0.875rem; color: #111; }
  .srte p { margin: 0; }
  .srte p + p { margin-top: 3px; }
  .srte strong { font-weight: 700; }
  .srte em { font-style: italic; }
  .srte u { text-decoration: underline; }
  .srte s { text-decoration: line-through; }
  .srte ul { list-style: disc; padding-left: 1.5em; margin: 4px 0; }
  .srte ol { list-style: decimal; padding-left: 1.5em; margin: 4px 0; }
  .srte li { margin: 2px 0; }
  .srte h2 { font-size: 1.25rem; font-weight: 600; line-height: 1.3; margin: 2px 0; }
  .srte h3 { font-size: 1.1rem; font-weight: 600; line-height: 1.3; margin: 2px 0; }
`;

function Btn({ active, onClick, title, disabled = false, children }: {
  active?: boolean; onClick: () => void; title: string; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors text-xs disabled:opacity-30 ${active ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
    >
      {children}
    </button>
  );
}

interface Props {
  content: string;
  onChange: (html: string) => void;
  variant?: 'full' | 'inline';
}

export default function SurveyRichEditor({ content, onChange, variant = 'full' }: Props) {
  const lastSynced = useRef(content);
  const suppress = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure(
        variant === 'inline'
          ? { heading: false, bulletList: false, orderedList: false, blockquote: false, codeBlock: false, horizontalRule: false, code: false }
          : {}
      ),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
    ],
    content: content || '',
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      if (suppress.current) return;
      const html = e.getHTML();
      lastSynced.current = html;
      onChange(html);
    },
    editorProps: { attributes: { class: 'srte' } },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (content !== lastSynced.current) {
      lastSynced.current = content;
      suppress.current = true;
      editor.commands.setContent(content || '');
      suppress.current = false;
    }
  }, [editor, content]);

  if (!editor) return <div className="border border-border rounded h-10 bg-white" />;

  return (
    <div className="border border-border rounded overflow-hidden bg-white focus-within:ring-1 focus-within:ring-black/20">
      <style>{STYLES}</style>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1.5 border-b border-border bg-gray-50 flex-wrap gap-y-1">
        {variant === 'full' && (
          <select
            value={
              editor.isActive('heading', { level: 2 }) ? 'h2'
              : editor.isActive('heading', { level: 3 }) ? 'h3'
              : 'p'
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
              else if (v === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
              else editor.chain().focus().setParagraph().run();
            }}
            className="h-6 border border-border rounded text-2xs px-1 bg-white mr-0.5 focus:outline-none"
          >
            <option value="p">Normale</option>
            <option value="h2">Titolo grande</option>
            <option value="h3">Titolo medio</option>
          </select>
        )}

        <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Grassetto">
          <span className="font-bold">B</span>
        </Btn>
        <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Corsivo">
          <span className="italic">I</span>
        </Btn>
        <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sottolineato">
          <span className="underline">U</span>
        </Btn>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Btn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Sinistra">
          <AlignLeft size={12} />
        </Btn>
        <Btn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Centra">
          <AlignCenter size={12} />
        </Btn>
        <Btn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Destra">
          <AlignRight size={12} />
        </Btn>

        {variant === 'full' && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Elenco puntato">•≡</Btn>
            <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Elenco numerato">1≡</Btn>
          </>
        )}

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Color swatches */}
        <div className="flex items-center gap-0.5">
          {COLORS.map(({ hex, label }) => (
            <button
              key={hex}
              type="button"
              title={label}
              onClick={() => editor.chain().focus().setColor(hex).run()}
              className="w-4 h-4 rounded-sm border border-black/10 hover:scale-125 transition-transform flex-shrink-0"
              style={{ backgroundColor: hex }}
            />
          ))}
          <button
            type="button"
            title="Rimuovi colore"
            onClick={() => editor.chain().focus().unsetColor().run()}
            className="w-4 h-4 rounded-sm border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 text-2xs flex-shrink-0 flex items-center justify-center leading-none"
          >
            ×
          </button>
        </div>

        <div className="w-px h-4 bg-border mx-0.5" />
        <Btn active={false} onClick={() => editor.chain().focus().undo().run()} title="Annulla" disabled={!editor.can().undo()}>↩</Btn>
        <Btn active={false} onClick={() => editor.chain().focus().redo().run()} title="Ripristina" disabled={!editor.can().redo()}>↪</Btn>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
