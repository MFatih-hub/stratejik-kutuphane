'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import CharacterCount from '@tiptap/extension-character-count';

export interface RichTextEditorStats {
  words: number;
  characters: number;
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onStatsChange?: (stats: RichTextEditorStats) => void;
  onImageUpload: (file: File) => Promise<string | null>;
  placeholder?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  onStatsChange,
  onImageUpload,
  placeholder,
}: RichTextEditorProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkMenuRef = useRef<HTMLDivElement>(null);

  // Keep a stable ref to the latest upload handler so editorProps callbacks
  // (registered once when the editor is created) always call the current one.
  const onImageUploadRef = useRef(onImageUpload);
  onImageUploadRef.current = onImageUpload;

  const editor = useEditor({
    content,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      ImageExtension.configure({
        HTMLAttributes: { loading: 'lazy' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'Yazmaya başla…' }),
      CharacterCount,
    ],
    editorProps: {
      attributes: { class: 'rte-body' },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false;
        const file = event.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith('image/')) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        onImageUploadRef.current(file).then((url) => {
          if (!url) return;
          const insertPos = coords ? coords.pos : view.state.selection.from;
          const node = view.state.schema.nodes.image.create({ src: url });
          view.dispatch(view.state.tr.insert(insertPos, node));
        });
        return true;
      },
      handlePaste(view, event) {
        const file = event.clipboardData?.files?.[0];
        if (!file || !file.type.startsWith('image/')) return false;
        event.preventDefault();
        onImageUploadRef.current(file).then((url) => {
          if (!url) return;
          const node = view.state.schema.nodes.image.create({ src: url });
          view.dispatch(view.state.tr.replaceSelectionWith(node));
        });
        return true;
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
      onStatsChange?.({
        words: editor.storage.characterCount.words(),
        characters: editor.storage.characterCount.characters(),
      });
    },
  });

  useEffect(() => {
    if (editor && onStatsChange) {
      onStatsChange({
        words: editor.storage.characterCount.words(),
        characters: editor.storage.characterCount.characters(),
      });
    }
    // Only run once the editor instance is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    if (!linkMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (linkMenuRef.current && !linkMenuRef.current.contains(e.target as Node)) {
        setLinkMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [linkMenuOpen]);

  const openLinkMenu = useCallback(() => {
    if (!editor) return;
    setLinkUrl(editor.getAttributes('link').href || '');
    setLinkMenuOpen(true);
  }, [editor]);

  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const href = /^([a-z][a-z0-9+.-]*:|#|\/)/i.test(url) ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkMenuOpen(false);
  }

  function removeLink() {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkMenuOpen(false);
  }

  function triggerImagePick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      const url = await onImageUploadRef.current(file);
      if (url) editor.chain().focus().setImage({ src: url }).run();
    };
    input.click();
  }

  if (!editor) {
    return <div className="rte-wrap rte-loading">Editör yükleniyor…</div>;
  }

  return (
    <div className={`rte-wrap${fullscreen ? ' rte-fullscreen' : ''}`}>
      <div className="rte-toolbar">
        <div className="rte-toolbar-group">
          <ToolbarButton label="Geri al" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            ↶
          </ToolbarButton>
          <ToolbarButton label="Yinele" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            ↷
          </ToolbarButton>
        </div>

        <div className="rte-toolbar-group">
          <select
            className="rte-block-select"
            aria-label="Metin biçimi"
            value={
              editor.isActive('heading', { level: 1 })
                ? 'h1'
                : editor.isActive('heading', { level: 2 })
                ? 'h2'
                : editor.isActive('heading', { level: 3 })
                ? 'h3'
                : 'p'
            }
            onChange={(e) => {
              const v = e.target.value;
              const chain = editor.chain().focus();
              if (v === 'p') chain.setParagraph().run();
              else chain.setHeading({ level: Number(v.replace('h', '')) as 1 | 2 | 3 }).run();
            }}
          >
            <option value="p">Paragraf</option>
            <option value="h1">Başlık 1</option>
            <option value="h2">Başlık 2</option>
            <option value="h3">Başlık 3</option>
          </select>
        </div>

        <div className="rte-toolbar-group">
          <ToolbarButton label="Kalın (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <b>K</b>
          </ToolbarButton>
          <ToolbarButton label="İtalik (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <i>İ</i>
          </ToolbarButton>
          <ToolbarButton label="Altı çizili (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <u>A</u>
          </ToolbarButton>
          <ToolbarButton label="Üstü çizili" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <s>Ü</s>
          </ToolbarButton>
        </div>

        <div className="rte-toolbar-group">
          <ToolbarButton label="Madde işaretli liste" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <span className="rte-glyph">•</span>
          </ToolbarButton>
          <ToolbarButton label="Numaralı liste" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <span className="rte-glyph">1.</span>
          </ToolbarButton>
          <ToolbarButton label="Alıntı" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <span className="rte-glyph">&quot;</span>
          </ToolbarButton>
          <ToolbarButton label="Kod bloğu" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            <span className="rte-glyph rte-glyph-mono">{'</>'}</span>
          </ToolbarButton>
          <ToolbarButton label="Ayırıcı çizgi" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <span className="rte-glyph">—</span>
          </ToolbarButton>
        </div>

        <div className="rte-toolbar-group">
          <ToolbarButton label="Sola hizala" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            Sol
          </ToolbarButton>
          <ToolbarButton label="Ortala" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            Orta
          </ToolbarButton>
          <ToolbarButton label="Sağa hizala" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            Sağ
          </ToolbarButton>
        </div>

        <div className="rte-toolbar-group rte-toolbar-group-relative" ref={linkMenuRef}>
          <ToolbarButton label="Bağlantı ekle" active={editor.isActive('link')} onClick={openLinkMenu}>
            🔗
          </ToolbarButton>
          {linkMenuOpen && (
            <div className="rte-link-popover">
              <input
                type="text"
                className="input"
                placeholder="https://…"
                value={linkUrl}
                autoFocus
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setLinkMenuOpen(false);
                  }
                }}
              />
              <div className="rte-link-popover-actions">
                <button type="button" className="btn btn-sm btn-primary" onClick={applyLink}>
                  Ekle
                </button>
                {editor.isActive('link') && (
                  <button type="button" className="btn btn-sm btn-danger" onClick={removeLink}>
                    Kaldır
                  </button>
                )}
                <button type="button" className="btn btn-sm" onClick={() => setLinkMenuOpen(false)}>
                  İptal
                </button>
              </div>
            </div>
          )}
          <ToolbarButton label="Görsel ekle" onClick={triggerImagePick}>
            📷
          </ToolbarButton>
        </div>

        <div className="rte-toolbar-group rte-toolbar-group-push">
          <ToolbarButton label={fullscreen ? 'Tam ekrandan çık' : 'Tam ekran yaz'} onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? 'Daralt' : 'Tam ekran'}
          </ToolbarButton>
        </div>
      </div>

      <div className="rte-content" onClick={() => setLinkMenuOpen(false)}>
        <EditorContent editor={editor} />
      </div>

      <div className="rte-footer">
        <span>
          {editor.storage.characterCount.words()} kelime · {editor.storage.characterCount.characters()} karakter
        </span>
        {fullscreen && (
          <button type="button" className="btn btn-sm" onClick={() => setFullscreen(false)}>
            Daralt
          </button>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`rte-btn${active ? ' rte-btn-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={!!active}
    >
      {children}
    </button>
  );
}
