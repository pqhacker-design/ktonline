import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem.js';
import { autoWrapUnwrappedLatex } from '../services/exportDocx';

interface MathTextProps {
  content?: string;
  text?: string;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ content, text, className = '' }) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const actualText = content ?? text ?? '';

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    el.innerHTML = '';

    if (!actualText) return;

    const formattedContent = autoWrapUnwrappedLatex(actualText);

    // Regex tách các thẻ $...$ hoặc $$...$$
    const mathRegex = /(\$\$.*?\$\$|\$.*?\$)/gs;
    const parts = formattedContent.split(mathRegex);

    const cleanMath = (input: string) => {
      let s = input.trim();
      s = s.replace(/\\rac(?=\{|\s|[0-9a-zA-Z])/g, '\\frac');
      s = s.replace(/\\egin\{/g, '\\begin{');
      s = s.replace(/\\riangle\b/g, '\\triangle');
      s = s.replace(/\\imes\b/g, '\\times');
      s = s.replace(/\\ext\{/g, '\\text{');
      s = s.replace(/\\heta\b/g, '\\theta');
      s = s.replace(/\\ight\b/g, '\\right');
      s = s.replace(/\\ightarrow\b/g, '\\rightarrow');
      s = s.replace(/([0-9a-zA-Z\)])\s*\*\s*([0-9a-zA-Z\(])/g, '$1 \\cdot $2');
      s = s.replace(/=\s*\{\s*([^{}]+?)\s*\}/g, '= \\{ $1 \\}');
      s = s.replace(/(\d+)\s*(?:°|\\\^?\{?circ\}?|\^\s*[0o]\b)/g, '$1^\\circ');
      s = s.replace(/\\vec\s+([A-Z]{1,2})\b/g, '\\vec{$1}');
      s = s.replace(/\\widehat\s+([A-Z]{2,4})\b/g, '\\widehat{$1}');
      return s;
    };

    parts.forEach((part) => {
      if (!part) return;

      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Display Math Block
        const mathStr = cleanMath(part.slice(2, -2));
        const span = document.createElement('span');
        span.className = 'my-2 block text-center overflow-x-auto py-1 font-sans';
        try {
          katex.render(mathStr, span, { displayMode: true, throwOnError: false });
        } catch (e) {
          span.textContent = part;
        }
        el.appendChild(span);
      } else if (part.startsWith('$') && part.endsWith('$')) {
        // Inline Math (Tự động chuyển sang displayMode nếu chứa môi trường nhiều dòng như hệ phương trình cases)
        const mathStr = cleanMath(part.slice(1, -1));
        const isMultiLineEnv = /\\begin\{(cases|aligned|array|matrix|pmatrix|bmatrix)\}/.test(mathStr);
        const span = document.createElement('span');
        span.className = isMultiLineEnv
          ? 'inline-block my-1 align-middle px-1 overflow-x-auto font-sans text-left'
          : 'inline-block px-0.5 align-middle';
        try {
          katex.render(mathStr, span, { displayMode: isMultiLineEnv ? true : false, throwOnError: false });
        } catch (e) {
          span.textContent = part;
        }
        el.appendChild(span);
      } else {
        // Text thường: Hỗ trợ ngắt dòng \n
        const lines = part.split('\n');
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
