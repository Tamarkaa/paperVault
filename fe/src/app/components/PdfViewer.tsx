import React, { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { renderTextLayer } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.js',
  import.meta.url
).toString();

interface PdfViewerProps {
  url: string;
  onSelection?: (text: string) => void;
  height?: string;
}

export function PdfViewer({ url, onSelection, height = '81.5dvh' }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cleanupFns: (() => void)[] = [];

    async function load() {
      setLoading(true);
      const pdf = await getDocument(url).promise;
      if (cancelled) return;

      const container = containerRef.current!;
      container.innerHTML = '';

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        if (cancelled) return;

        const scale = 1.2;
        const viewport = page.getViewport({ scale });

        const w = Math.floor(viewport.width);
        const h = Math.floor(viewport.height);

        // --- wrapper ---
        const pageWrap = document.createElement('div');
        pageWrap.className = 'pdf-page';
        pageWrap.style.cssText = `
          position: relative;
          width: ${w}px;
          height: ${h}px;
          margin-bottom: 24px;
          flex-shrink: 0;
        `;

        // --- canvas ---
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.style.cssText = `
          display: block;
          position: absolute;
          top: 0; left: 0;
          width: ${w}px; height: ${h}px;
        `;
        pageWrap.appendChild(canvas);

        // --- text layer ---
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.cssText = `
          position: absolute;
          top: 0; left: 0;
          width: ${w}px;
          height: ${h}px;
          overflow: hidden;
        `;
        textLayerDiv.style.setProperty('--scale-factor', String(scale));

        pageWrap.appendChild(textLayerDiv);
        container.appendChild(pageWrap);

        // --- render canvas ---
        await page.render({
          canvasContext: canvas.getContext('2d')!,
          viewport,
        }).promise;
        if (cancelled) return;

        // --- render text layer ---
        const textContent = await page.getTextContent();
        await renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
        });

        // --- selection handler ---
        const onMouseUp = () => {
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed) return;
          const txt = sel.toString().trim();
          if (!txt) return;
          const range = sel.getRangeAt(0);
          if (!textLayerDiv.contains(range.commonAncestorContainer)) return;
          if (onSelection) onSelection(txt);
        };

        document.addEventListener('mouseup', onMouseUp);
        cleanupFns.push(() => document.removeEventListener('mouseup', onMouseUp));

        if (cancelled) return;
      }

      const spacer = document.createElement('div');
      spacer.style.cssText = 'width: 1px; height: 24px; flex-shrink: 0;';
      container.appendChild(spacer);

      setLoading(false);
    }

    load().catch((e) => console.error('PDF load error', e));

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
    };
  }, [url, onSelection]);

  return (
    <div
      style={{
        height,
        overflowY: 'auto',
        overflowX: 'auto',
        boxSizing: 'border-box',
      }}
      className="p-3"
    >
      {loading && <div className="text-sm text-gray-500 mb-2">Loading PDF...</div>}
      <div
        ref={containerRef}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
      />
    </div>
  );
}