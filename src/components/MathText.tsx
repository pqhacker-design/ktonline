import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem.js';
import { autoWrapUnwrappedLatex } from '../services/exportDocx';
import { normalizeNewlines, cleanMathNewlines } from '../utils/textUtils';

interface MathTextProps {
  content?: string;
  text?: string;
  className?: string;
}

function cleanMathForKaTeX(str: string): string {
  let s = cleanMathNewlines(str);
  s = s.replace(/\\$/, '');
  s = s.replace(/°/g, '^\\circ');
  return s;
}

export const MathText: React.FC<MathTextProps> = ({ content, text, className = '' }) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const actualText = content ?? text ?? '';

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    el.innerHTML = '';

    if (!actualText) return;

    // Chuẩn hóa trước \[ ... \] thành $$ ... $$ và \( ... \) thành $ ... $
    let preparedText = normalizeNewlines(actualText);
    preparedText = preparedText.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner.trim()}$$`);
    preparedText = preparedText.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner.trim()}$`);

    const formattedContent = autoWrapUnwrappedLatex(preparedText);

    // Regex tách các thẻ $...$ hoặc $$...$$
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/gs;
    const parts = formattedContent.split(mathRegex);

    parts.forEach((part) => {
      if (!part) return;

      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Display Math Block
        let mathStr = cleanMathForKaTeX(part.slice(2, -2));
        const span = document.createElement('span');
        span.className = 'my-2 block text-center overflow-x-auto py-1 font-sans';
        try {
          katex.render(mathStr, span, { displayMode: true, throwOnError: false });
        } catch (e) {
          span.textContent = mathStr;
        }
        el.appendChild(span);
      } else if (part.startsWith('$') && part.endsWith('$')) {
        // Inline Math (Tự động chuyển sang displayMode nếu chứa môi trường nhiều dòng như hệ phương trình cases)
        let mathStr = cleanMathForKaTeX(part.slice(1, -1));
        const isMultiLineEnv = /\\begin\{(cases|aligned|array|matrix|pmatrix|bmatrix)\}/.test(mathStr);
        const span = document.createElement('span');
        span.className = isMultiLineEnv
          ? 'inline-block my-1 align-middle px-1 overflow-x-auto font-sans text-left'
          : 'inline-block px-0.5 align-middle';
        try {
          katex.render(mathStr, span, { displayMode: isMultiLineEnv ? true : false, throwOnError: false });
        } catch (e) {
          span.textContent = mathStr;
        }
        el.appendChild(span);
      } else {
        // Text thường: Hỗ trợ ngắt dòng \n và loại bỏ ký hiệu \n thoát
        const cleanPart = normalizeNewlines(part);
        const lines = cleanPart.split('\n');
        lines.forEach((line, index) => {
          if (line) {
            el.appendChild(document.createTextNode(line));
          }
          if (index < lines.length - 1) {
            el.appendChild(document.createElement('br'));
          }
        });
      }
    });
  }, [actualText]);

  return <span ref={containerRef} className={`math-rendered inline ${className}`} />;
};
