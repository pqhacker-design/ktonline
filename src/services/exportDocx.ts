import {
  AlignmentType,
  BorderStyle,
  BuilderElement,
  Document,
  ImageRun,
  Math as DocxMath,
  MathCurlyBrackets,
  MathFraction,
  MathRadical,
  MathRoundBrackets,
  MathRun,
  MathSquareBrackets,
  MathSubScript,
  MathSubSuperScript,
  MathSuperScript,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  XmlComponent,
} from 'docx';
import { ExamMetadata, ExamPackage, MatrixRow, Question, getCognitiveTag, getSpecRowQuestionDetails } from '../types';
import { DiagramEngine } from './diagramEngine';
import { normalizeNewlines } from '../utils/textUtils';

/**
 * Sinh khối tiêu đề bài thi / đáp án chuẩn bộ mẫu hành chính cho Word (.docx)
 */
function buildDocxHeaderBlock(
  metadata: ExamMetadata,
  code?: string,
  isAnswerKey: boolean = false
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // Bảng 2 cột không viền cho tiêu đề Sở/Trường & Kỳ thi/Năm học
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: (metadata.departmentName || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO').toUpperCase(),
                    bold: true,
                    size: 20,
                    font: 'Times New Roman',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: (metadata.schoolName || 'TRƯỜNG THCS/THPT').toUpperCase(),
                    bold: true,
                    size: 22,
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `KỲ THI ${metadata.examTitle ? metadata.examTitle.toUpperCase() : 'KIỂM TRA'}`,
                    bold: true,
                    size: 20,
                    font: 'Times New Roman',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `NĂM HỌC ${metadata.schoolYear || '2026 - 2027'}`,
                    bold: true,
                    size: 22,
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  elements.push(headerTable);

  // Mã đề thi
  if (code) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120, after: 100 },
        children: [
          new TextRun({
            text: `MÃ ĐỀ THI: ${code}`,
            bold: true,
            size: 26,
            color: '008080',
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  // Tiêu đề môn học & khối lớp
  const mainTitleText = isAnswerKey
    ? `ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM MÔN: ${metadata.subject.toUpperCase()} - LỚP ${metadata.grade}`
    : `ĐỀ KIỂM TRA MÔN: ${metadata.subject.toUpperCase()} - LỚP ${metadata.grade}`;

  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({
          text: mainTitleText,
          bold: true,
          size: 26,
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // Hiển thị Tên Bài / Tên Chương / Mạch Nội Dung Kiến Thức nếu có
  if (metadata.chapterTitle && metadata.chapterTitle.trim()) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `Nội dung / Chương: ${metadata.chapterTitle.trim()}`,
            bold: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  // Thời gian & Thang điểm
  if (!isAnswerKey) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 250 },
        children: [
          new TextRun({
            text: `(Thời gian làm bài: ${metadata.durationMinutes} phút | Thang điểm: ${metadata.totalPoints} điểm)`,
            italics: true,
            size: 20,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  } else {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `(Thang điểm tổng: ${metadata.totalPoints} điểm | Bám sát Công văn 7991/BGDĐT)`,
            italics: true,
            size: 20,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  return elements;
}

/**
 * Class tùy chỉnh tạo ký hiệu Hệ phương trình trong Office MathML (OMML) chuẩn Word
 * bao gồm dấu ngoặc nhọn mở bên trái ({) kéo dài theo chiều cao các phương trình xếp dọc (m:eqArr)
 */
class MathCases extends XmlComponent {
  constructor(linesChildren: any[][]) {
    super('m:d');

    // 1. Delimiter properties m:dPr với begChr = '{' và endChr = ''
    const dPr = new BuilderElement({
      name: 'm:dPr',
      children: [
        new BuilderElement({
          name: 'm:begChr',
          attributes: { character: { key: 'm:val', value: '{' } },
        }),
        new BuilderElement({
          name: 'm:endChr',
          attributes: { character: { key: 'm:val', value: '' } },
        }),
      ],
    });

    // 2. Các dòng phương trình nằm trong m:eqArr
    const eqArrChildren = linesChildren.map((line) => {
      return new BuilderElement({
        name: 'm:e',
        children: line,
      });
    });

    const eqArr = new BuilderElement({
      name: 'm:eqArr',
      children: eqArrChildren,
    });

    const outerE = new BuilderElement({
      name: 'm:e',
      children: [eqArr],
    });

    this.root.push(dPr);
    this.root.push(outerE);
  }
}

/**
 * Làm sạch chuỗi LaTeX thành văn bản thuần cho Excel / Plain Text Export
 */
export function cleanLatexForDocx(latex: string): string {
  if (!latex) return '';
  let str = latex;
  str = str.replace(/\\%/g, '%');
  str = str.replace(/\\begin\{cases\}/g, '{ ');
  str = str.replace(/\\end\{cases\}/g, ' }');
  str = str.replace(/\\\\|\\cr/g, '; ');
  str = str.replace(/&/g, ' ');
  str = str.replace(/\\\s+/g, ' ');
  str = str.replace(/\\\(|\\\)/g, '');
  str = str.replace(/\\(frac|dfrac)\{([^{}]+)\}\{([^{}]+)\}/g, '$2/$3');
  str = str.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');
  str = str.replace(/\$(.*?)\$/g, '$1');
  str = str.replace(/\\(text|mathrm|mathbf|mathit)\{([^{}]+)\}/g, '$2');
  str = str.replace(/\\(widehat|hat)\{([^{}]+)\}/g, '$2');
  str = str.replace(/\\mathbb\{R\}/g, 'ℝ').replace(/\\mathbb\{N\}/g, 'ℕ').replace(/\\mathbb\{Z\}/g, 'ℤ').replace(/\\mathbb\{Q\}/g, 'ℚ').replace(/\\mathbb\{C\}/g, 'ℂ');
  str = str.replace(/\\mathbb\{([A-Za-z])\}/g, '$1');
  str = str.replace(/\\setminus\b/g, '\\');
  str = str.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  str = str.replace(/\\left\s*/g, '').replace(/\\right\s*/g, '');
  str = str.replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ').replace(/\\Delta/g, 'Δ').replace(/\\pi/g, 'π');
  str = str.replace(/\\sim\b/g, '∼').replace(/\\perp\b/g, '⊥').replace(/\\parallel\b/g, '∥').replace(/\\angle\b/g, '∠');
  str = str.replace(/\\le(q)?\b/g, '≤').replace(/\\ge(q)?\b/g, '≥').replace(/\\neq\b/g, '≠').replace(/\\approx\b/g, '≈').replace(/\\infty\b/g, '∞');
  str = str.replace(/\\in\b/g, '∈').replace(/\\notin\b/g, '∉').replace(/\\times\b/g, '×').replace(/\\cdot\b/g, '·');
  str = str.replace(/\\vdots\b/g, '⋮').replace(/\\cdots\b/g, '⋯').replace(/\\ldots\b/g, '…').replace(/\\dots\b/g, '…').replace(/\\ddots\b/g, '⋱');
  str = str.replace(/\\mid\b/g, '|').replace(/\\nmid\b/g, '∤').replace(/\\div\b/g, '÷');
  str = str.replace(/\\triangle\b/g, '△').replace(/\\cong\b/g, '≅').replace(/\\equiv\b/g, '≡');
  str = str.replace(/\\(Leftrightarrow|Rightarrow|rightarrow|to)/g, '⇔');
  str = str.replace(/\\forall/g, '∀').replace(/\\exists/g, '∃');
  str = str.replace(/\\([a-zA-Z]+)/g, '$1');
  return str;
}

/**
 * Trích xuất khối ngoặc nhọn { ... } từ vị trí startIdx
 */
function extractBraceGroup(str: string, startIdx: number): { content: string; endIdx: number } | null {
  if (str[startIdx] !== '{') return null;
  let depth = 0;
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return { content: str.substring(startIdx + 1, i), endIdx: i };
      }
    }
  }
  return null;
}

/**
 * Chuyển đổi công thức hóa học \ce{...} hoặc biểu thức hóa học thuần sang LaTeX hỗ trợ chỉ số dưới/mũ
 * Ví dụ: "H2SO4" -> "H_2SO_4", "Fe2(SO4)3" -> "Fe_2(SO_4)_3", "2H2 + O2 -> 2H2O" -> "2H_2 + O_2 \rightarrow 2H_2O"
 */
export function formatCeToLatex(ceStr: string): string {
  if (!ceStr) return '';
  let str = ceStr.trim();

  // 1. Mũi tên phản ứng
  str = str.replace(/->|-->/g, ' \\rightarrow ');
  str = str.replace(/<->|<=>/g, ' \\rightleftharpoons ');

  // 2. Ký hiệu kết tủa & bay hơi
  str = str.replace(/\\?v\b/g, ' \\downarrow ');
  str = str.replace(/\\\^/g, ' \\uparrow ');

  // 3. Tự động bọc chỉ số dưới _cho các con số đứng sau nguyên tố hóa học hoặc ngoặc ) ]
  // Ví dụ: H2SO4 -> H_2SO_4, Fe2(SO4)3 -> Fe_2(SO_4)_3, Ca(OH)2 -> Ca(OH)_2
  str = str.replace(/([A-Z][a-z]?|[\)\]])(\d+)(?![_\^0-9])/g, '$1_$2');

  // 4. Điện tích ion: e.g. Fe^3+ -> Fe^{3+}, SO4^2- -> SO_4^{2-}, OH^- -> OH^-
  str = str.replace(/([A-Z][a-z]?|[\)\]]|_?\d+)\^([0-9]*[\+\-])/g, '$1^{$2}');

  return str;
}

/**
 * Phân tích chuỗi công thức LaTeX thành danh sách các nút phông chuẩn Microsoft Word Equation (OMML)
 */
export function parseMathChildren(
  latex: string
): (
  | MathRun
  | MathFraction
  | MathRadical
  | MathSubScript
  | MathSuperScript
  | MathSubSuperScript
  | MathRoundBrackets
  | MathCurlyBrackets
  | MathSquareBrackets
)[] {
  let str = latex.trim();
  const elements: any[] = [];

  // 1. Tiền xử lý & làm sạch các lệnh LaTeX cấu trúc
  str = str.replace(/\\displaystyle\s*/g, '');
  str = str.replace(/\\limits\s*/g, '');
  str = str.replace(/\\nolimits\s*/g, '');
  str = str.replace(/\\(big|Big|bigg|Bigg)\b/g, '');
  str = str.replace(/\\left\./g, '');
  str = str.replace(/\\right\./g, '');

  // Xử lý tập hợp \mathbb{R}, \mathbb{N},... và \setminus, \{ \}
  str = str.replace(/\\mathbb\{R\}/g, 'ℝ');
  str = str.replace(/\\mathbb\{N\}/g, 'ℕ');
  str = str.replace(/\\mathbb\{Z\}/g, 'ℤ');
  str = str.replace(/\\mathbb\{Q\}/g, 'ℚ');
  str = str.replace(/\\mathbb\{C\}/g, 'ℂ');
  str = str.replace(/\\mathbb\{([A-Za-z])\}/g, '$1');
  str = str.replace(/\\setminus\b/g, '\\');
  str = str.replace(/\\\{/g, '{');
  str = str.replace(/\\\}/g, '}');

  // Khử lệnh \text{...}, \mathrm{...}
  while (/\\(text|mathrm|mathbf|mathit)\{([^{}]+)\}/.test(str)) {
    str = str.replace(/\\(text|mathrm|mathbf|mathit)\{([^{}]+)\}/g, '$2');
  }
  str = str.replace(/\\(wide(hat|tilde)|hat|tilde)\{([^{}]+)\}/g, '$3̂');
  str = str.replace(/\\(overrightarrow|vec)\{([^{}]+)\}/g, '$2⃗');
  str = str.replace(/\\(overline|bar)\{([^{}]+)\}/g, '$2̄');

  // Thay thế ký hiệu toán học & hóa học
  const symbolMap: [RegExp, string][] = [
    [/\\alpha(?![a-zA-Z])/g, 'α'], [/\\beta(?![a-zA-Z])/g, 'β'], [/\\gamma(?![a-zA-Z])/g, 'γ'], [/\\delta(?![a-zA-Z])/g, 'δ'],
    [/\\epsilon(?![a-zA-Z])/g, 'ε'], [/\\theta(?![a-zA-Z])/g, 'θ'], [/\\lambda(?![a-zA-Z])/g, 'λ'], [/\\pi(?![a-zA-Z])/g, 'π'],
    [/\\sigma(?![a-zA-Z])/g, 'σ'], [/\\phi(?![a-zA-Z])/g, 'φ'], [/\\omega(?![a-zA-Z])/g, 'ω'], [/\\Delta(?![a-zA-Z])/g, 'Δ'], [/\\Omega(?![a-zA-Z])/g, 'Ω'],
    [/\\le(q)?(?![a-zA-Z])/g, '≤'], [/\\ge(q)?(?![a-zA-Z])/g, '≥'], [/\\neq(?![a-zA-Z])/g, '≠'], [/\\approx(?![a-zA-Z])/g, '≈'],
    [/\\infty(?![a-zA-Z])/g, '∞'], [/\\in(?![a-zA-Z])/g, '∈'], [/\\notin(?![a-zA-Z])/g, '∉'], [/\\subset(?![a-zA-Z])/g, '⊂'], [/\\subseteq(?![a-zA-Z])/g, '⊆'],
    [/\\cup(?![a-zA-Z])/g, '∪'], [/\\cap(?![a-zA-Z])/g, '∩'], [/\\emptyset(?![a-zA-Z])/g, '∅'], [/\\times(?![a-zA-Z])/g, '×'],
    [/\\cdot(?![a-zA-Z])/g, '·'], [/\\pm(?![a-zA-Z])/g, '±'], [/\\to(?![a-zA-Z])/g, '→'], [/\\rightarrow(?![a-zA-Z])/g, '→'],
    [/\\uparrow(?![a-zA-Z])/g, '↑'], [/\\downarrow(?![a-zA-Z])/g, '↓'],
    [/\\rightleftharpoons(?![a-zA-Z])/g, '⇌'], [/\\leftarrow(?![a-zA-Z])/g, '←'], [/\\leftrightarrow(?![a-zA-Z])/g, '↔'],
    [/\\Leftarrow(?![a-zA-Z])/g, '⇐'], [/\\Rightarrow(?![a-zA-Z])/g, '⇒'], [/\\Leftrightarrow(?![a-zA-Z])/g, '⇔'],
    [/\\vdots(?![a-zA-Z])/g, '⋮'], [/\\cdots(?![a-zA-Z])/g, '⋯'], [/\\ldots(?![a-zA-Z])/g, '…'], [/\\dots(?![a-zA-Z])/g, '…'], [/\\ddots(?![a-zA-Z])/g, '⋱'],
    [/\\mid(?![a-zA-Z])/g, '|'], [/\\nmid(?![a-zA-Z])/g, '∤'], [/\\triangle(?![a-zA-Z])/g, '△'], [/\\div(?![a-zA-Z])/g, '÷'],
    [/\\cong(?![a-zA-Z])/g, '≅'], [/\\equiv(?![a-zA-Z])/g, '≡'], [/\\setminus(?![a-zA-Z])/g, '∖'],
    [/\\degree(?![a-zA-Z])/g, '°'], [/\^\{\\circ\}/g, '°'], [/\^\\circ(?![a-zA-Z])/g, '°'], [/\\circ(?![a-zA-Z])/g, '°'],
    [/\\forall(?![a-zA-Z])/g, '∀'], [/\\exists(?![a-zA-Z])/g, '∃'], [/\\angle(?![a-zA-Z])/g, '∠'],
    [/\\sim(?![a-zA-Z])/g, '∼'], [/\\perp(?![a-zA-Z])/g, '⊥'], [/\\parallel(?![a-zA-Z])/g, '∥'], [/\\%/g, '%'],
    [/\\quad/g, '  '], [/\\qquad/g, '    '],
    [/\\(sin|cos|tan|cot|ln|log|lim|max|min|det|gcd)(?![a-zA-Z])/g, '$1'],
    [/\\\,/g, ' '], [/\\;/g, ' '], [/\\:/g, ' '], [/\\!/g, '']
  ];

  for (const [pattern, val] of symbolMap) {
    str = str.replace(pattern, val);
  }

  let i = 0;
  let textBuffer = '';

  const flushText = () => {
    if (textBuffer.length > 0) {
      elements.push(new MathRun(textBuffer));
      textBuffer = '';
    }
  };

  while (i < str.length) {
    // 0. Xử lý môi trường LaTeX: \begin{cases}, \begin{aligned}, \begin{array}, \begin{matrix}, \begin{pmatrix}, \begin{bmatrix}
    if (str.startsWith('\\begin{', i)) {
      flushText();
      const envMatch = str.substring(i).match(/^\\begin\{(cases|aligned|array|matrix|pmatrix|bmatrix)\}/);
      if (envMatch) {
        const envType = envMatch[1];
        const startLen = envMatch[0].length;
        const endTag = `\\end{${envType}}`;
        const endIdx = str.indexOf(endTag, i + startLen);
        if (endIdx !== -1) {
          const innerBody = str.substring(i + startLen, endIdx);
          const lines = innerBody.split(/\\\\|\\cr/);
          const linesChildren: any[][] = [];

          lines.forEach((line) => {
            let cleanLine = line;
            cleanLine = cleanLine.replace(/&/g, ' ');
            cleanLine = cleanLine.replace(/\\\s+/g, ' ');
            cleanLine = cleanLine.replace(/\\\(|\\\)/g, '');
            cleanLine = cleanLine.replace(/\\(text|mathrm|mathbf|mathit)\{([^{}]+)\}/g, '$2');

            const lineChildren = parseMathChildren(cleanLine.trim());
            if (lineChildren.length > 0) {
              linesChildren.push(lineChildren);
            }
          });

          if (envType === 'cases') {
            elements.push(new MathCases(linesChildren.length > 0 ? linesChildren : [[new MathRun('')]]));
          } else if (envType === 'pmatrix') {
            const flatChildren = linesChildren.flat();
            elements.push(new MathRoundBrackets({ children: flatChildren }));
          } else if (envType === 'bmatrix') {
            const flatChildren = linesChildren.flat();
            elements.push(new MathSquareBrackets({ children: flatChildren }));
          } else {
            elements.push(...linesChildren.flat());
          }

          i = endIdx + endTag.length;
          continue;
        }
      }
    }

    // 0.1 Xử lý lệnh hóa học \ce{...}
    if (str.startsWith('\\ce{', i)) {
      flushText();
      const bg = extractBraceGroup(str, i + 3);
      if (bg) {
        const formattedCe = formatCeToLatex(bg.content);
        elements.push(...parseMathChildren(formattedCe));
        i = bg.endIdx + 1;
        continue;
      }
    }

    // 0.2 Xử lý mũi tên phản ứng hóa học: \xrightarrow, \xleftarrow, \xrightleftharpoons
    if (str.startsWith('\\xrightarrow', i) || str.startsWith('\\xleftarrow', i) || str.startsWith('\\xrightleftharpoons', i)) {
      flushText();
      let arrowSym = ' → ';
      let len = 11; // \xrightarrow
      if (str.startsWith('\\xleftarrow', i)) {
        arrowSym = ' ← ';
        len = 10;
      } else if (str.startsWith('\\xrightleftharpoons', i)) {
        arrowSym = ' ⇌ ';
        len = 19;
      }

      let cur = i + len;
      let belowContent: string | null = null;
      let aboveContent: string | null = null;

      if (str[cur] === '[') {
        const closeIdx = str.indexOf(']', cur);
        if (closeIdx !== -1) {
          belowContent = str.substring(cur + 1, closeIdx);
          cur = closeIdx + 1;
        }
      }

      while (cur < str.length && str[cur] === ' ') cur++;

      if (str[cur] === '{') {
        const bg = extractBraceGroup(str, cur);
        if (bg) {
          aboveContent = bg.content;
          cur = bg.endIdx + 1;
        }
      }

      const baseEl = new MathRun(arrowSym);
      if (aboveContent !== null && belowContent !== null) {
        elements.push(
          new MathSubSuperScript({
            children: [baseEl],
            subScript: parseMathChildren(belowContent),
            superScript: parseMathChildren(aboveContent),
          })
        );
      } else if (aboveContent !== null) {
        elements.push(
          new MathSuperScript({
            children: [baseEl],
            superScript: parseMathChildren(aboveContent),
          })
        );
      } else if (belowContent !== null) {
        elements.push(
          new MathSubScript({
            children: [baseEl],
            subScript: parseMathChildren(belowContent),
          })
        );
      } else {
        elements.push(baseEl);
      }

      i = cur;
      continue;
    }

    // 1. Ngoặc tự động co giãn \left( ... \right)
    if (str.startsWith('\\left(', i)) {
      flushText();
      let depth = 1;
      let cur = i + 6;
      let matchIdx = -1;
      while (cur < str.length) {
        if (str.startsWith('\\left(', cur) || str.startsWith('\\left[', cur) || str.startsWith('\\left\\{', cur)) {
          depth++;
          cur += 6;
        } else if (str.startsWith('\\right)', cur)) {
          depth--;
          if (depth === 0) {
            matchIdx = cur;
            break;
          }
          cur += 7;
        } else {
          cur++;
        }
      }
      if (matchIdx !== -1) {
        const inner = str.substring(i + 6, matchIdx);
        elements.push(
          new MathRoundBrackets({
            children: parseMathChildren(inner),
          })
        );
        i = matchIdx + 7;
        continue;
      }
    }

    // Ngoặc vuông \left[ ... \right]
    if (str.startsWith('\\left[', i)) {
      flushText();
      let depth = 1;
      let cur = i + 6;
      let matchIdx = -1;
      while (cur < str.length) {
        if (str.startsWith('\\left[', cur) || str.startsWith('\\left(', cur) || str.startsWith('\\left\\{', cur)) {
          depth++;
          cur += 6;
        } else if (str.startsWith('\\right]', cur)) {
          depth--;
          if (depth === 0) {
            matchIdx = cur;
            break;
          }
          cur += 7;
        } else {
          cur++;
        }
      }
      if (matchIdx !== -1) {
        const inner = str.substring(i + 6, matchIdx);
        elements.push(
          new MathSquareBrackets({
            children: parseMathChildren(inner),
          })
        );
        i = matchIdx + 7;
        continue;
      }
    }

    // Ngoặc nhọn \left\{ ... \right\}
    if (str.startsWith('\\left\\{', i)) {
      flushText();
      let depth = 1;
      let cur = i + 7;
      let matchIdx = -1;
      while (cur < str.length) {
        if (str.startsWith('\\left\\{', cur) || str.startsWith('\\left(', cur) || str.startsWith('\\left[', cur)) {
          depth++;
          cur += 7;
        } else if (str.startsWith('\\right\\}', cur)) {
          depth--;
          if (depth === 0) {
            matchIdx = cur;
            break;
          }
          cur += 8;
        } else {
          cur++;
        }
      }
      if (matchIdx !== -1) {
        const inner = str.substring(i + 7, matchIdx);
        elements.push(
          new MathCurlyBrackets({
            children: parseMathChildren(inner),
          })
        );
        i = matchIdx + 8;
        continue;
      }
    }

    // 2. Phân số \frac{A}{B} hoặc \dfrac{A}{B}
    if (str.startsWith('\\frac', i) || str.startsWith('\\dfrac', i)) {
      flushText();
      const len = str.startsWith('\\dfrac', i) ? 6 : 5;
      let cur = i + len;
      while (cur < str.length && str[cur] === ' ') cur++;
      const numGroup = extractBraceGroup(str, cur);
      if (numGroup) {
        cur = numGroup.endIdx + 1;
        while (cur < str.length && str[cur] === ' ') cur++;
        const denGroup = extractBraceGroup(str, cur);
        if (denGroup) {
          elements.push(
            new MathFraction({
              numerator: parseMathChildren(numGroup.content),
              denominator: parseMathChildren(denGroup.content),
            })
          );
          i = denGroup.endIdx + 1;
          continue;
        }
      }
    }

    // 3. Căn thức \sqrt{A} hoặc \sqrt[n]{A}
    if (str.startsWith('\\sqrt', i)) {
      flushText();
      let cur = i + 5;
      let degreeGroup: string | null = null;
      if (str[cur] === '[') {
        const closeIdx = str.indexOf(']', cur);
        if (closeIdx !== -1) {
          degreeGroup = str.substring(cur + 1, closeIdx);
          cur = closeIdx + 1;
        }
      }
      while (cur < str.length && str[cur] === ' ') cur++;
      const bodyGroup = extractBraceGroup(str, cur);
      if (bodyGroup) {
        elements.push(
          new MathRadical({
            children: parseMathChildren(bodyGroup.content),
            ...(degreeGroup ? { degree: parseMathChildren(degreeGroup) } : {}),
          })
        );
        i = bodyGroup.endIdx + 1;
        continue;
      }
    }

    // 4. Chỉ số trên ^ và chỉ số dưới _
    if (str[i] === '^' || str[i] === '_') {
      const isSuper = str[i] === '^';
      let nextCur = i + 1;
      while (nextCur < str.length && str[nextCur] === ' ') nextCur++;
      let argContent = '';
      let endIdx = nextCur;

      if (str[nextCur] === '{') {
        const bg = extractBraceGroup(str, nextCur);
        if (bg) {
          argContent = bg.content;
          endIdx = bg.endIdx + 1;
        }
      } else {
        argContent = str[nextCur] || '';
        endIdx = nextCur + 1;
      }

      let secondArgContent: string | null = null;
      let finalEndIdx = endIdx;
      let checkCur = endIdx;
      while (checkCur < str.length && str[checkCur] === ' ') checkCur++;

      if (checkCur < str.length && str[checkCur] === (isSuper ? '_' : '^')) {
        let secondNext = checkCur + 1;
        while (secondNext < str.length && str[secondNext] === ' ') secondNext++;
        if (str[secondNext] === '{') {
          const bg2 = extractBraceGroup(str, secondNext);
          if (bg2) {
            secondArgContent = bg2.content;
            finalEndIdx = bg2.endIdx + 1;
          }
        } else {
          secondArgContent = str[secondNext] || '';
          finalEndIdx = secondNext + 1;
        }
      }

      let baseElements: any[] = [];
      if (textBuffer.length > 0) {
        const lastChar = textBuffer[textBuffer.length - 1];
        textBuffer = textBuffer.slice(0, -1);
        flushText();
        baseElements = [new MathRun(lastChar)];
      } else if (elements.length > 0) {
        baseElements = [elements.pop()];
      } else {
        baseElements = [new MathRun(' ')];
      }

      if (secondArgContent !== null) {
        const subContent = isSuper ? secondArgContent : argContent;
        const superContent = isSuper ? argContent : secondArgContent;
        elements.push(
          new MathSubSuperScript({
            children: baseElements,
            subScript: parseMathChildren(subContent),
            superScript: parseMathChildren(superContent),
          })
        );
      } else if (isSuper) {
        elements.push(
          new MathSuperScript({
            children: baseElements,
            superScript: parseMathChildren(argContent),
          })
        );
      } else {
        elements.push(
          new MathSubScript({
            children: baseElements,
            subScript: parseMathChildren(argContent),
          })
        );
      }

      i = finalEndIdx;
      continue;
    }

    // Nếu gặp lệnh LaTeX gạch chéo ngược khác chưa xử lý (e.g., \left hoặc \right lẻ)
    if (str[i] === '\\') {
      // Bỏ qua \left hoặc \right lẻ
      if (str.startsWith('\\left', i)) {
        i += 5;
        continue;
      }
      if (str.startsWith('\\right', i)) {
        i += 6;
        continue;
      }
    }

    textBuffer += str[i];
    i++;
  }

  flushText();
  return elements;
}

/**
 * Làm sạch và chuyển đổi các TeX accent code, từ dính / lỗi khoảng trắng về Unicode Tiếng Việt chuẩn
 */
export function cleanTexVietnameseAccents(text: string): string {
  if (!text) return text;
  let str = text;

  // 1. Loại bỏ các nhãn mã mức độ thừa như [NB_TL], [TH_TL], [VD_TL], [VDC_TL], [NB_TN], [NB],...
  str = str.replace(/\s*\[(NB|TH|VD|VDC|REMEMBER|UNDERSTAND|APPLY|ADVANCED)(_(TL|TN|TF|SA))?\]\s*/gi, ' ');

  // 2. Sửa các lỗi khoảng trắng và từ dính phổ biến
  str = str.replace(/\bth\s+ì\b/gi, 'thì');
  str = str.replace(/\bnh\s*\(/gi, 'nh (');
  str = str.replace(/\b(c|g)\s*\.\s*(g|c)\s*\.\s*(c|g)\b/gi, '$1.$2.$3');

  // 3. Chuyển đổi mã TeX accent / \text{} ký hiệu đặc biệt sang Unicode Tiếng Việt
  str = str.replace(/\\text\{\\dh\}/gi, 'đ');
  str = str.replace(/\\text\{\\DH\}/gi, 'Đ');
  str = str.replace(/\\text\{\\textquoteright\}/gi, "'");
  str = str.replace(/\\text\{\\underline\{u\}\}/gi, 'ư');
  str = str.replace(/\\text\{\\cdot\}/gi, 'ạ');
  str = str.replace(/\\text\{\\hat\{o\}\}/gi, 'ô');
  str = str.replace(/\\text\{\\hat\{e\}\}/gi, 'ê');
  str = str.replace(/\\text\{\\hat\{a\}\}/gi, 'â');

  // Xử lý các cụm từ ghép TeX accent xuất hiện từ AI hoặc export
  str = str.replace(/v\\grave\{?a\}?/gi, 'và');
  str = str.replace(/c\\'o/gi, 'có');
  str = str.replace(/c\\'a/gi, 'cá');
  str = str.replace(/b\\`ang/gi, 'bằng');
  str = str.replace(/b\\`i(?:\\text\{)?\\(?:hat\{e\}|\^e)(?:\})?t/gi, 'biết');
  str = str.replace(/m(?:\\text\{)?\\(?:hat\{o\}|\^o)(?:\})?t/gi, 'một');
  str = str.replace(/c(?:\\text\{)?\\(?:hat\{o\}|\^o)(?:\})?t/gi, 'cột');
  str = str.replace(/T\\'inh/gi, 'Tính');
  str = str.replace(/t\\'inh/gi, 'tính');
  str = str.replace(/Tr\\text\{\\hat\{e\}\}n/gi, 'Trên');
  str = str.replace(/tr\\text\{\\hat\{e\}\}n/gi, 'trên');
  str = str.replace(/C\\`ung/gi, 'Cùng');
  str = str.replace(/c\\`ung/gi, 'cùng');
  str = str.replace(/l\\'uc/gi, 'lúc');
  str = str.replace(/\\text\{\\dh\}\\`o/gi, 'đó');
  str = str.replace(/\\text\{\\dh\}\\text\{\\hat\{o\}\}/gi, 'độ');
  str = str.replace(/d\\`ai/gi, 'dài');
  str = str.replace(/\\text\{\\dh\}\\text\{\\underline\{u\}\}\\text\{\\cdot\}ng/gi, 'đường');
  str = str.replace(/h\\`inh/gi, 'hình');
  str = str.replace(/chi\\text\{\\hat\{e\}\}u/gi, 'chiếu');

  // Chuyển đổi dấu thanh TeX accent đơn lẻ
  str = str.replace(/\\'a/g, 'á').replace(/\\'e/g, 'é').replace(/\\'i/g, 'í').replace(/\\'o/g, 'ó').replace(/\\'u/g, 'ú').replace(/\\'y/g, 'ý');
  str = str.replace(/\\`a/g, 'à').replace(/\\`e/g, 'è').replace(/\\`i/g, 'ì').replace(/\\`o/g, 'ò').replace(/\\`u/g, 'ù');
  str = str.replace(/\\\^a/g, 'â').replace(/\\\^e/g, 'ê').replace(/\\\^o/g, 'ô');

  // 4. Khôi phục các vỡ vụn công thức phân số bị chèn dấu $ ngắt quãng (như \frac{AB}{A$ 'B' $})
  str = str.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\$\s*'([A-Za-z0-9']+)'\s*\$\}/g, '\\frac{$1}{$2\'$3\'}');
  str = str.replace(/\\frac\{([^{}]+)\$\s*'([A-Za-z0-9']+)'\s*\$\}\{([^{}]+)\}/g, '\\frac{$1\'$2\'}{$3}');
  str = str.replace(/\\widehat\{([^{}]+)\$\s*'([A-Za-z0-9']*)\s*\$\}/g, '\\widehat{$1\'$2\'}');
  str = str.replace(/\\widehat\{([^{}]+)\}\s*\$\s*'([A-Za-z0-9']*)\s*\$/g, '\\widehat{$1\'$2\'}');

  // 5. Xử lý khoảng trắng quanh prime quotes trong variables: A 'B' -> A'B', A ' -> A'
  str = str.replace(/([A-Z])\s+'\s*([A-Z])/g, "$1'$2");
  str = str.replace(/([A-Z])\s+'/g, "$1'");

  return str;
}

/**
 * Tách văn bản tiếng Việt ra KHỎI khối công thức $...$ nếu khối đó lỡ bọc cả câu tiếng Việt,
 * tránh để KaTeX render chữ tiếng Việt bị dính chùm lại với nhau.
 */
export function unwrapVietnameseFromMathBlocks(text: string): string {
  if (!text) return text;

  // Pattern nhận diện các từ Tiếng Việt thường gặp (sử dụng word boundary thực sự, không dùng \\b literal)
  const vnWordRegex = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]|\b(tam giác|cho|biết|tính|với|có|và|vuông|độ dài|đường cao|hình chiếu|chu vi|diện tích|tỉ số|đồng dạng|trên|cạnh|góc|cùng lúc|một|cột|cọc|mặt đất|bóng|trường hợp|được|sao cho|như|thì)\b/i;

  // Chỉ xử lý các khối $...$ (không đụng vào khối $$...$$ hoặc môi trường \begin)
  return text.replace(/(^|[^\$])\$([^\$]+)\$(?!\$)/g, (fullMatch, prefix, mathContent) => {
    // Nếu khối $...$ chứa dấu xuống dòng hoặc là môi trường nhiều dòng thì giữ nguyên
    if (mathContent.includes('\n') || mathContent.includes('\\begin')) {
      return fullMatch;
    }

    // Tạm thời che (mask) tất cả các khối \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}, \ce{...}
    const textGroupRegex = /\\(text|mathrm|mathbf|mathit|ce)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
    const maskedContent = mathContent.replace(textGroupRegex, '___TEXT_PLACEHOLDER___');

    // Nếu bên ngoài các khối \text{...} KHÔNG chứa chữ tiếng Việt thì đây là công thức chuẩn -> GIỮ NGUYÊN 100%!
    if (!vnWordRegex.test(maskedContent)) {
      return fullMatch;
    }

    // Nếu bên ngoài thực sự chứa từ tiếng Việt: tách rời các biểu thức toán con và đặt tiếng Việt ra ngoài $...$
    const mathTokenRegex = /(\\d?frac\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\sqrt(?:\[[^\]]*\])?\{[^{}]*\}|\\widehat\{[^{}]+\}|\\mathbb\{[^{}]+\}|\\vec\{[^{}]+\}|\\xrightleftharpoons(?:\[[^{}]*\])?(?:\{[^{}]*\})*|\\xrightarrow(?:\[[^{}]*\])?(?:\{[^{}]*\})*|\\xleftarrow(?:\[[^{}]*\])?(?:\{[^{}]*\})*|\\text\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\Delta\s*[A-Z0-9_\']+|[A-Z0-9_\'\.]+\s*[\=\<\>\+\-\*\/]\s*(?:[A-Za-z0-9_\'\.\^\+\-\*\/\{\}\\\text\^\circ]|\\text\{[^{}]*\}|\\mathrm\{[^{}]*\})+|\b\d+(?:\,\d+)?\s*\\text\{[^{}]*\}|[0-9]+\^\s*\\?circ|[0-9]+\\circ\b|[A-Z][A-Z]|\b[a-z]\s*=\s*\d+(?:\/\d+)?)/g;

    let lastIdx = 0;
    let match: RegExpExecArray | null;
    const tokens: string[] = [];

    while ((match = mathTokenRegex.exec(mathContent)) !== null) {
      if (match.index > lastIdx) {
        const plainBetween = mathContent.substring(lastIdx, match.index);
        if (plainBetween) tokens.push(plainBetween);
      }
      tokens.push(` $${match[0].trim()}$ `);
      lastIdx = mathTokenRegex.lastIndex;
    }

    if (lastIdx < mathContent.length) {
      const remainingPlain = mathContent.substring(lastIdx);
      if (remainingPlain) tokens.push(remainingPlain);
    }

    if (tokens.length > 0) {
      return prefix + tokens.join('');
    }

    return fullMatch;
  });
}

function processPlainPart(plain: string): string {
  if (!plain) return plain;
  let str = plain;

  // 1. Loại bỏ các nhãn mã mức độ thừa như [NB_TL], [TH_TL], [VD_TL], [VDC_TL], [NB_TN], [NB],...
  str = str.replace(/\s*\[(NB|TH|VD|VDC|REMEMBER|UNDERSTAND|APPLY|ADVANCED)(_(TL|TN|TF|SA))?\]\s*/gi, ' ');

  // 1a. Sửa triệt để các lỗi backslash AI sinh trước chữ tiếng Việt và lỗi TeX Greek letter nhầm tiếng Việt
  str = str.replace(/\\Chi\s*ều\b/gi, 'Chiều');
  str = str.replace(/\\chi\s*ều\b/gi, 'chiều');
  str = str.replace(/X\s*ều\b/g, 'Chiều');
  str = str.replace(/\\Di\s*ện\b/gi, 'Diện');
  str = str.replace(/\\di\s*ện\b/gi, 'diện');

  // Chuyển ".\ \" hoặc ".\ \" thành ".\n"
  str = str.replace(/\.[ \t]*\\[ \t]*\\*[ \t]*/g, '.\n');
  str = str.replace(/([?!:;])\s*\\+\s*(?=[A-Za-z0-9àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ])/g, '$1\n');

  // Chuyển '\\' trước số thứ tự ý con: \\1), \\2), \\a), \\b)... thành \n1), \n2)...
  str = str.replace(/\\+([0-9]+[.)])/g, '\n$1');
  str = str.replace(/\\+([a-zA-Z][.)])/g, '\n$1');
  str = str.replace(/\\+([-*•])/g, '\n$1');
  str = str.replace(/\\\\+/g, '\n');

  // Loại bỏ dấu '\' thừa dính trước từ tiếng Việt (ví dụ: \Diện tích -> Diện tích, \Chiều rộng -> Chiều rộng)
  str = str.replace(/\\([A-Za-z]*[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ][A-Za-zàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]*)/g, '$1');

  // Dọn dẹp dấu '\' đơn độc trước từ viết hoa
  str = str.replace(/([.?!])\s*\\\s*([A-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ])/g, '$1\n$2');
  str = str.replace(/(^|\n)\s*\\\s*/g, '$1');
  str = str.replace(/\s*\\\s*$/g, '');

  // 2. Dọn dẹp dấu $ bị lẻ/mồ côi dán trực tiếp vào lệnh LaTeX (e.g., \cdot$ -> \cdot)
  str = str.replace(/(\\[a-zA-Z]+(\{[^{}]*\})*)\$/g, '$1');

  // 3. Loại bỏ dấu $ lẻ đơn độc không có cặp trong phần plain text
  const dollarMatches = str.match(/\$/g);
  if (dollarMatches && dollarMatches.length % 2 !== 0) {
    str = str.replace(/([^$]*)\$([^$]*)$/, '$1$2');
  }

  // 4. Sửa khoảng trắng dính quanh prime quotes: A 'B' -> A'B', A ' -> A'
  str = str.replace(/([A-Z])\s+'\s*([A-Z])/g, "$1'$2");
  str = str.replace(/([A-Z])\s+'/g, "$1'");

  // 5. Làm sạch \text{ cm} hoặc \text{cm} ở văn bản thường
  str = str.replace(/(\d+)\s*\\text\{\s*cm\s*\}/g, '$1 cm');
  str = str.replace(/\\text\{\s*cm\s*\}/g, 'cm');

  // 6. Tách từ tiếng Việt dính vào biến số toán học (sử dụng a-z chuẩn ASCII, không dùng a-à vì a-à chứa cả dấu ngoặc {})
  str = str.replace(/([a-zàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ])([A-Z]{1,4}\b)/g, '$1 $2');
  str = str.replace(/([a-zàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ])(\d+)/g, '$1 $2');
  str = str.replace(/(\d+)\s*cm([a-zàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ])/g, '$1 cm $2');

  // 7. Chuẩn hóa góc 60\circ, 50\circ -> 50^\circ
  str = str.replace(/(\d+)\s*\\\^?\{?circ\}?/g, '$1^\\circ');

  // 8. Tự động bọc $...$ cho các phương trình hóa học, công thức và biểu thức toán/hóa học chưa bọc $...$
  // 8a. Phương trình hóa học chứa mũi tên phản ứng
  str = str.replace(
    /(?:[A-Za-z0-9_\{\}\(\)\+\-\*\/\=\,\.\:\%\^\circ\s]|\\text\{[^{}]*\}|\\mathrm\{[^{}]*\})*\s*\\(xrightleftharpoons|xrightarrow|xleftarrow|rightarrow|Rightarrow|leftrightarrow|rightleftharpoons)(?:\[[^{}]*\])?(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*\s*(?:[A-Za-z0-9_\{\}\(\)\+\-\*\/\=\,\.\:\%\^\circ\s\\uparrow\\downarrow]|\\text\{[^{}]*\}|\\mathrm\{[^{}]*\})*/g,
    (match) => {
      const trimmed = match.trim();
      if (!trimmed || trimmed.startsWith('$')) return match;
      return ` $${trimmed}$ `;
    }
  );

  // 8b. Nhận diện và bọc $...$ cho các công thức chứa lệnh LaTeX: \frac, \sqrt, \vec, \Delta, \alpha, v.v.
  const validMathCommands =
    '(?:d?frac\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}|sqrt(?:\\[[^\\]]*\\])?\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}|(?:vec|overrightarrow|widehat|overline|underline|mathbb|mathbf|mathrm|text|ce)\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}|(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|sin|cos|tan|cot|ln|log|exp|lim|sum|prod|int|iint|iiint|oint|pm|mp|times|div|cdot|ast|star|circ|bullet|cap|cup|subset|supset|subseteq|supseteq|in|notin|ni|le|ge|leq|geq|neq|approx|equiv|sim|cong|propto|perp|parallel|angle|triangle|degree|infty|partial|nabla|forall|exists|emptyset|varnothing|to|gets|dots|cdots|vdots|ddots|rightarrow|leftarrow|Rightarrow|Leftarrow|Leftrightarrow|leftrightarrow|mapsto)\\b(?![àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]))';

  const cmdRegex = new RegExp(
    '(?:(?<=\\s|^|[([{:;])([a-zA-Z](?:\'|\\d+|\\([a-zA-Z0-9]+\\))?\\s*[\\=\\<\\>\\le\\ge\\neq\\approx\\in]\\s*))?(\\\\' +
      validMathCommands +
      ')((?:\\s*[\\+\\-\\*/\\=\\<\\>\\le\\ge\\neq\\approx]\\s*(?:\\\\(?:d?frac\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}|sqrt(?:\\[[^\\]]*\\])?\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}|[a-zA-Z]+(?:\\{[^{}]*\\})*)|[a-zA-Z0-9_\'\\.\\^]+|\\d+(?:\\,\\d+)?))*)',
    'g'
  );

  str = str.replace(cmdRegex, (match, lhs, cmd, rhs) => {
    if (/^\\(begin|end|n|t|r)$/.test(cmd)) return match;
    if (/[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(match)) {
      return match.replace(/^\\/, '');
    }
    let formula = (lhs || '') + cmd + (rhs || '');
    let trimmed = formula.trim();
    if (trimmed.startsWith('$')) return match;

    let trailingPunct = '';
    const mPunct = trimmed.match(/([.,;?!]+)$/);
    if (mPunct) {
      trailingPunct = mPunct[1];
      trimmed = trimmed.slice(0, -trailingPunct.length).trim();
    }

    return ` $${trimmed}$ ` + trailingPunct;
  });

  // 8c. Tự động bọc $...$ cho các lệnh \ce{...} chưa bọc $
  str = str.replace(/(^|[^\$])\\ce\{([^{}]+)\}([^\$]|$)/g, '$1 $\\ce{$2}$ $3');

  return str;
}

/**
 * Phục hồi và làm sạch công thức LaTeX (sửa lỗi mất backslash, ASCII control characters \x08, \x0C,...)
 */
export function sanitizeLatexControlChars(text: string): string {
  if (!text) return text;
  let str = text;

  // 1. Khôi phục các ký tự điều khiển ASCII do JSON.parse lỡ chuyển đổi từ \b, \f, \t, \r
  str = str.replace(/\x08(egin|ar|eta|ox|ullet|inom|old|box)/g, '\\$1');
  str = str.replace(/\x08([a-zA-Z]+)/g, '\\$1');
  str = str.replace(/\x08/g, ' ');

  str = str.replace(/\x0C(rac|lat|rown|forall)/g, '\\$1');
  str = str.replace(/\x0C([a-zA-Z]+)/g, '\\$1');
  str = str.replace(/\x0C/g, '');

  str = str.replace(/\t(ext|heta|imes|an|au|ilde|riangle)\b/g, '\\$1');
  str = str.replace(/\r(ight|ho|eal|ightarrow)\b/g, '\\$1');

  // 2. Làm sạch TeX accent và chuyển đổi sang Unicode tiếng Việt chuẩn
  str = cleanTexVietnameseAccents(str);

  // 3. Sửa các môi trường LaTeX bị mất dấu \ phía trước
  str = str.replace(/(^|[^\\])\b(begin|end)\{(cases|aligned|array|matrix|pmatrix|bmatrix)\}/g, '$1\\$2{$3}');

  // 4. Sửa các lệnh LaTeX phổ biến bị mất dấu \ phía trước
  str = str.replace(/(^|[^\\a-zA-Z])\b(mathbb|sqrt|d?frac|widehat|overline|vec|Delta|alpha|beta|gamma|delta|epsilon|theta|lambda|pi|sigma|phi|omega|Omega|angle|triangle|cong|equiv|approx|degree|Leftrightarrow|Rightarrow|rightarrow|forall|exists|notin|xrightleftharpoons|xrightarrow|xleftarrow|rightleftharpoons|uparrow|downarrow)\b/g, '$1\\$2');

  return str;
}

export function fixCasesLatex(rawText: string): string {
  if (!rawText) return rawText;
  let str = sanitizeLatexControlChars(rawText);

  // 1. Chuyển các ký hiệu hệ phương trình gõ dạng { eq1 ; eq2 } hoặc \{ eq1 ; eq2 \} hoặc { eq1 \\ eq2 } thành \begin{cases} eq1 \\ eq2 \end{cases}
  str = str.replace(/\\?\{\s*([^{}]+?)\s*\\?\}/g, (m, inner) => {
    const trimmed = inner.trim();
    if (/^(text|frac|dfrac|sqrt|widehat|hat|vec|mathbb|mathrm|mathbf|mathit)\b/.test(trimmed)) {
      return m;
    }

    const hasEq = /=|>|<|\\le|\\ge|\\neq/.test(trimmed);
    if (!hasEq) return m;

    if (/;|\\\\|\n/.test(trimmed) || (trimmed.split('=').length - 1 >= 2 && /,/.test(trimmed))) {
      let cleanedInner = trimmed;
      cleanedInner = cleanedInner.replace(/\\\\/g, ' \\\\ ');
      cleanedInner = cleanedInner.replace(/[\n\r]+/g, ' \\\\ ');
      cleanedInner = cleanedInner.replace(/;/g, ' \\\\ ');
      if (!cleanedInner.includes('\\\\') && /,/.test(cleanedInner)) {
        cleanedInner = cleanedInner.replace(/,/g, ' \\\\ ');
      }
      return `\\begin{cases} ${cleanedInner} \\end{cases}`;
    }

    return m;
  });

  // 2. Chuẩn hóa môi trường \begin{cases} ... \end{cases}
  str = str.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (match, inner) => {
    let cleanedInner = inner.trim();
    if (!cleanedInner.includes('\\\\')) {
      if (/;/.test(cleanedInner)) {
        cleanedInner = cleanedInner.replace(/;\s*/g, ' \\\\ ');
      }
    }
    const lines = cleanedInner.split(/\\\\/).map((s) => s.trim()).filter(Boolean);
    return `\\begin{cases} ${lines.join(' \\\\ ')} \\end{cases}`;
  });

  return str;
}

export function autoWrapUnwrappedLatex(text: string): string {
  if (!text) return text;

  // 0. Phục hồi và làm sạch các ký tự điều khiển ASCII, TeX accents và backslash bị thiếu
  let cleanedText = sanitizeLatexControlChars(text);

  // 0.1 Chuẩn hóa \[ ... \] thành $$ ... $$ và \( ... \) thành $ ... $
  cleanedText = cleanedText.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner.trim()}$$`);
  cleanedText = cleanedText.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner.trim()}$`);

  // 1. Tự động sửa và chuẩn hóa cú pháp hệ phương trình
  cleanedText = fixCasesLatex(cleanedText);

  // 2. Tự động bọc $$...$$ cho các môi trường LaTeX nhiều dòng như \begin{cases} ... \end{cases} chưa bọc $ hoặc $$
  cleanedText = cleanedText.replace(
    /(^|[^\$])(\\begin\{(cases|aligned|array|matrix|pmatrix|bmatrix)\}[\s\S]*?\\end\{\3\})([^\$]|$)/g,
    (_, p1, p2, p3, p4) => `${p1} $$${p2}$$ ${p4}`
  );

  // 3. Nếu toàn bộ chuỗi là một công thức toán thuần (ví dụ đáp án ngắn "\frac{1}{2}", "x = 2", "\sqrt{3}", "S = [2; 3]") chưa bọc $
  const trimmed = cleanedText.trim();
  if (!trimmed.startsWith('$') && !trimmed.startsWith('$$')) {
    // Nếu chuỗi bắt đầu bằng tiền tố phương án A. B. C. D.
    const optPrefixMatch = trimmed.match(/^([A-D]\.\s*)(.*)$/);
    if (optPrefixMatch) {
      const optLabel = optPrefixMatch[1];
      const optContent = optPrefixMatch[2].trim();
      const isContentMath =
        /^(\\d?frac|\\sqrt|\\vec|\\widehat|\\mathbb|\\ce|\\Delta|\\alpha|\\beta|\\gamma|\\pi|\\lim|\\int)\b/.test(optContent) ||
        (/^[a-zA-Z0-9_\'\^\+\-\*\/\=\(\)\{\}\\\s\.\,\;\:\<\>\le\ge\neq\approx\sqrt\frac\[\]\(\)\|\-]+$/.test(optContent) &&
          /[\=\<\>\+\-\*\/\\_\^]/.test(optContent) &&
          !/[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(optContent));
      if (isContentMath && !optContent.startsWith('$')) {
        return `${optLabel}$${optContent}$`;
      }
    } else {
      const isStandaloneLatex =
        /^(\\d?frac|\\sqrt|\\vec|\\widehat|\\mathbb|\\ce|\\Delta|\\alpha|\\beta|\\gamma|\\pi|\\lim|\\int)\b/.test(trimmed) ||
        (/^[a-zA-Z0-9_\'\^\+\-\*\/\=\(\)\{\}\\\s\.\,\;\:\<\>\le\ge\neq\approx\sqrt\frac\[\]\(\)\|\-]+$/.test(trimmed) &&
          /[\=\<\>\+\-\*\/\\_\^]/.test(trimmed) &&
          !/[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(trimmed));

      if (isStandaloneLatex) {
        return `$${trimmed}$`;
      }
    }
  }

  // 4. Tách bóc các từ tiếng Việt ra khỏi những khối $...$ bị bọc nhầm
  cleanedText = unwrapVietnameseFromMathBlocks(cleanedText);

  // 5. Tách text thành các khối đã bọc sẵn ($...$, $$...$$, \(...\), \[...\]) và phần text thường
  const mathBlockRegex = /(\$\$.*?\$\$|\$.*?\$|\\\[.*?\\\]|\\\([^\)]*\\\))/gs;
  const parts: string[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = mathBlockRegex.exec(cleanedText)) !== null) {
    if (match.index > lastIdx) {
      parts.push(processPlainPart(cleanedText.substring(lastIdx, match.index)));
    }
    parts.push(match[0]);
    lastIdx = mathBlockRegex.lastIndex;
  }
  if (lastIdx < cleanedText.length) {
    parts.push(processPlainPart(cleanedText.substring(lastIdx)));
  }

  return parts.join('');
}

/**
 * Tạo danh sách TextRun hỗ trợ định dạng Markdown (**bold**, *italic*) cho văn bản thường
 */
export function createDocxTextRunsWithMarkdown(plainText: string, baseOptions: any = {}): TextRun[] {
  if (!plainText) return [];

  let cleaned = plainText;
  cleaned = cleaned.replace(/\\%/g, '%');
  cleaned = cleaned.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  cleaned = cleaned.replace(/\\_/g, '_');
  cleaned = cleaned.replace(/\\&/g, '&');
  cleaned = cleaned.replace(/\\#/g, '#');

  const runs: TextRun[] = [];
  // Tách Markdown bold (**text** or __text__) và italic (*text* or _text_)
  const mdRegex = /(\*\*\*|___)(.*?)\1|(\*\*|__)(.*?)\3|(\*|_)(.*?)\5/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = mdRegex.exec(cleaned)) !== null) {
    if (match.index > lastIdx) {
      const normalStr = cleaned.substring(lastIdx, match.index);
      if (normalStr) {
        runs.push(new TextRun({ font: 'Times New Roman', ...baseOptions, text: normalStr }));
      }
    }

    if (match[1]) {
      runs.push(new TextRun({ font: 'Times New Roman', ...baseOptions, text: match[2], bold: true, italics: true }));
    } else if (match[3]) {
      runs.push(new TextRun({ font: 'Times New Roman', ...baseOptions, text: match[4], bold: true }));
    } else if (match[5]) {
      runs.push(new TextRun({ font: 'Times New Roman', ...baseOptions, text: match[6], italics: true }));
    }

    lastIdx = mdRegex.lastIndex;
  }

  if (lastIdx < cleaned.length) {
    const remain = cleaned.substring(lastIdx);
    if (remain) {
      runs.push(new TextRun({ font: 'Times New Roman', ...baseOptions, text: remain }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ font: 'Times New Roman', ...baseOptions, text: cleaned })];
}

/**
 * Phân tách chuỗi văn bản hòa trộn LaTeX ($...$ hoặc $$...$$ hoặc \(...\) hoặc \[...\]) thành các phần tử TextRun và DocxMath chuẩn Word Equation
 */
export function createDocxInlineRuns(text: string, baseOptions: any = {}): (TextRun | DocxMath)[] {
  if (!text) return [new TextRun({ text: '', font: 'Times New Roman', ...baseOptions })];

  // Tiền xử lý: chuẩn hóa xuống dòng \n và dọn dẹp các dòng xuống dòng không hợp lệ trong khối math $...$ hoặc $$...$$
  let cleanInput = normalizeNewlines(text);
  cleanInput = cleanInput.replace(/\$([^$]+)\$/g, (m, p1) => '$' + p1.replace(/[\r\n]+/g, ' ').trim() + '$');
  cleanInput = cleanInput.replace(/\$\$([^$]+)\$\$/g, (m, p1) => '$$' + p1.replace(/[\r\n]+/g, ' ').trim() + '$$');

  // Tự động tìm & bọc $...$ cho các chuỗi / môi trường LaTeX chưa bọc $
  const formattedText = autoWrapUnwrappedLatex(cleanInput);

  const runs: (TextRun | DocxMath)[] = [];
  const mathRegex = /\$\$([\s\S]*?)\$\$|\$([\s\S]*?)\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(formattedText)) !== null) {
    if (match.index > lastIndex) {
      const plainText = formattedText.substring(lastIndex, match.index);
      if (plainText) {
        runs.push(...createDocxTextRunsWithMarkdown(plainText, baseOptions));
      }
    }

    const latex = match[1] || match[2] || match[3] || match[4] || '';
    if (latex.trim()) {
      runs.push(
        new DocxMath({
          children: parseMathChildren(latex),
        })
      );
    }

    lastIndex = mathRegex.lastIndex;
  }

  if (lastIndex < formattedText.length) {
    const remaining = formattedText.substring(lastIndex);
    if (remaining) {
      runs.push(...createDocxTextRunsWithMarkdown(remaining, baseOptions));
    }
  }

  return runs.length > 0 ? runs : createDocxTextRunsWithMarkdown(text, baseOptions);
}

/**
 * Chuyển đổi mã SVG thành PNG Uint8Array Buffer cho Word ImageRun
 */
async function svgToPngBuffer(svgStr: string, width = 450, height = 280): Promise<Uint8Array | null> {
  if (!svgStr || svgStr.trim().length < 10) return null;
  return new Promise((resolve) => {
    try {
      let cleanSvg = svgStr.trim();
      if (!cleanSvg.includes('xmlns=')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const img = new Image();
      const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
            } else {
              resolve(null);
            }
          }, 'image/png');
        } catch (e) {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Tạo Bảng Rubric Chấm Điểm Chuẩn Word
 */
function buildDocxRubricTable(rubric: { criteria: string; points: number; description: string }[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { fill: 'F2F4F7' },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '008080' },
          left: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
          right: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: 'Tiêu chí', bold: true, size: 19, font: 'Times New Roman' })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        shading: { fill: 'F2F4F7' },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '008080' },
          left: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
          right: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: 'Điểm', bold: true, size: 19, font: 'Times New Roman' })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 60, type: WidthType.PERCENTAGE },
        shading: { fill: 'F2F4F7' },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '008080' },
          left: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
          right: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: 'Mô tả yêu cầu', bold: true, size: 19, font: 'Times New Roman' })],
          }),
        ],
      }),
    ],
  });

  const dataRows = rubric.map((r) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 50, after: 50 },
              children: createDocxInlineRuns(r.criteria, { bold: true, size: 19, font: 'Times New Roman' }),
            }),
          ],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 50, after: 50 },
              children: [new TextRun({ text: `${r.points}đ`, bold: true, size: 19, font: 'Times New Roman' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 60, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 50, after: 50 },
              children: createDocxInlineRuns(r.description, { size: 19, font: 'Times New Roman' }),
            }),
          ],
        }),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

/**
 * Loại bỏ mã SVG / XML / markdown code block khỏi nội dung văn bản để tránh lộ mã SVG thô
 */
function stripSvgCode(text: string): string {
  if (!text) return '';
  let clean = text.replace(/```(?:xml|svg|html)?[\s\S]*?```/gi, '');
  clean = clean.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  const lines = clean.split('\n').filter((line) => {
    const t = line.trim().toLowerCase();
    if (
      t.startsWith('<svg') ||
      t.startsWith('</svg>') ||
      t.startsWith('<path') ||
      t.startsWith('<circle') ||
      t.startsWith('<rect') ||
      t.startsWith('<g') ||
      t.startsWith('</g>')
    ) {
      return false;
    }
    return true;
  });
  return lines.join('\n');
}

/**
 * Tạo danh sách đoạn văn (Paragraphs) bao gồm công thức Word Equation và Hình vẽ / Đồ thị nếu có
 */
async function buildContentParagraphs(
  text: string,
  prefix: string,
  prefixBold = true,
  baseOptions: any = {},
  svgDiagramStr?: string | null
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];
  const cleanText = normalizeNewlines(stripSvgCode(text || ''));
  const lines = cleanText.split('\n');

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const children: (TextRun | DocxMath)[] = [];

    if (idx === 0 && prefix) {
      children.push(
        new TextRun({
          text: prefix,
          bold: prefixBold,
          size: baseOptions.size || 22,
          font: 'Times New Roman',
        })
      );
    }

    const inlineRuns = createDocxInlineRuns(line, { size: 22, font: 'Times New Roman', ...baseOptions });
    children.push(...inlineRuns);

    paragraphs.push(
      new Paragraph({
        spacing: { before: idx === 0 ? 100 : 40, after: 40 },
        indent: idx > 0 && prefix ? { left: 400 } : undefined,
        children,
      })
    );
  }

  // Chèn Hình vẽ / Đồ thị dưới câu hỏi hoặc lời giải nếu có
  if (svgDiagramStr) {
    const pngBuf = await svgToPngBuffer(svgDiagramStr);
    if (pngBuf) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
          children: [
            new ImageRun({
              data: pngBuf,
              type: 'png',
              transformation: {
                width: 360,
                height: 230,
              },
            }),
          ],
        })
      );
    }
  }

  return paragraphs;
}

/**
 * Tạo Bảng Ma Trận Đề Kiểm Tra chuẩn định dạng Công văn 7991/BGDĐT
 * (19 cột: TT, Chủ đề, Đơn vị kiến thức, 12 cột cho 4 dạng thức Nhiều lựa chọn / Đúng-Sai / Trả lời ngắn / Tự luận theo 3 mức độ Biết-Hiểu-Vận dụng, 3 cột Tổng Biết-Hiểu-VD, Tỷ lệ %)
 */
export function buildMatrixDocxTable(matrix: MatrixRow[], metadata?: ExamMetadata): Table {
  const getCellDisplay = (part: any, field: string): string => {
    if (!part) return '-';
    const val = part[field];
    if (val === undefined || val === null || val === '' || val === 0) return '-';
    return String(val);
  };

  const countQuestionsInCell = (val: string): number => {
    if (!val || val === '-') return 0;
    if (!isNaN(Number(val))) return Number(val);
    const items = val.split(',').map((s) => s.trim()).filter(Boolean);
    return items.length;
  };

  const headerFontSize = 15;
  const contentFontSize = 15;
  const headerFont = 'Times New Roman';

  // Hàng Tiêu Đề 1
  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        rowSpan: 4,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'EBF4F6' },
        children: [new Paragraph({ children: [new TextRun({ text: 'TT', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        rowSpan: 4,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'EBF4F6' },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Chủ đề /', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: 'Mạch nội dung', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER }),
        ],
      }),
      new TableCell({
        rowSpan: 4,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'EBF4F6' },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Nội dung /', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: 'Đơn vị kiến thức', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER }),
        ],
      }),
      new TableCell({
        columnSpan: 12,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'E0EFEF' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Mức độ đánh giá', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'EBF4F6' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Tổng số câu', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        rowSpan: 4,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'EBF4F6' },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Tỉ lệ', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: '% điểm', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER }),
        ],
      }),
    ],
  });

  // Hàng Tiêu Đề 2: Trắc nghiệm khách quan vs Tự luận
  const headerRow2 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        columnSpan: 9,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'D8EEEE' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Trắc nghiệm khách quan', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'E6F4EA' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Tự luận', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        rowSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F0F4F8' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Biết', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        rowSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F0F4F8' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Hiểu', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        rowSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F0F4F8' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Vận dụng', bold: true, size: headerFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
    ],
  });

  // Hàng Tiêu Đề 3: 4 Dạng bài (Nhiều lựa chọn, Đúng-Sai, Trả lời ngắn, Tự luận)
  const headerRow3 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'E6F7F7' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Nhiều lựa chọn', bold: true, size: 14, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'E6F7F7' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Đúng – Sai', bold: true, size: 14, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'E6F7F7' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Trả lời ngắn', bold: true, size: 14, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F0F9F4' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Tự luận', bold: true, size: 14, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
    ],
  });

  // Hàng Tiêu Đề 4: Biết - Hiểu - Vận dụng
  const makeSubHeaderCell = (text: string, fill: string = 'F7FAFA') =>
    new TableCell({
      verticalAlign: VerticalAlign.CENTER,
      shading: { fill },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 13, font: headerFont })], alignment: AlignmentType.CENTER })],
    });

  const headerRow4 = new TableRow({
    tableHeader: true,
    children: [
      // Nhiều lựa chọn
      makeSubHeaderCell('Biết'),
      makeSubHeaderCell('Hiểu'),
      makeSubHeaderCell('VD'),
      // Đúng - Sai
      makeSubHeaderCell('Biết'),
      makeSubHeaderCell('Hiểu'),
      makeSubHeaderCell('VD'),
      // Trả lời ngắn
      makeSubHeaderCell('Biết'),
      makeSubHeaderCell('Hiểu'),
      makeSubHeaderCell('VD'),
      // Tự luận
      makeSubHeaderCell('Biết', 'F4FAF6'),
      makeSubHeaderCell('Hiểu', 'F4FAF6'),
      makeSubHeaderCell('VD', 'F4FAF6'),
    ],
  });

  // Tích lũy tổng
  let sum_p1_rem = 0, sum_p1_und = 0, sum_p1_app = 0;
  let sum_p2_rem = 0, sum_p2_und = 0, sum_p2_app = 0;
  let sum_p3_rem = 0, sum_p3_und = 0, sum_p3_app = 0;
  let sum_p4_rem = 0, sum_p4_und = 0, sum_p4_app = 0;

  let sum_total_rem = 0, sum_total_und = 0, sum_total_app = 0;
  let totalPercentageSum = 0;

  const dataRows = matrix.map((row) => {
    const p1_rem = getCellDisplay(row.part1, 'remember');
    const p1_und = getCellDisplay(row.part1, 'understand');
    const p1_app = getCellDisplay(row.part1, 'apply') !== '-' ? getCellDisplay(row.part1, 'apply') : getCellDisplay(row.part1, 'advanced');

    const p2_rem = getCellDisplay(row.part2, 'remember');
    const p2_und = getCellDisplay(row.part2, 'understand');
    const p2_app = getCellDisplay(row.part2, 'apply') !== '-' ? getCellDisplay(row.part2, 'apply') : getCellDisplay(row.part2, 'advanced');

    const p3_rem = getCellDisplay(row.part3, 'remember');
    const p3_und = getCellDisplay(row.part3, 'understand');
    const p3_app = getCellDisplay(row.part3, 'apply') !== '-' ? getCellDisplay(row.part3, 'apply') : getCellDisplay(row.part3, 'advanced');

    const p4_rem = getCellDisplay(row.part4, 'remember');
    const p4_und = getCellDisplay(row.part4, 'understand');
    const p4_app = getCellDisplay(row.part4, 'apply') !== '-' ? getCellDisplay(row.part4, 'apply') : getCellDisplay(row.part4, 'advanced');

    sum_p1_rem += countQuestionsInCell(p1_rem);
    sum_p1_und += countQuestionsInCell(p1_und);
    sum_p1_app += countQuestionsInCell(p1_app);

    sum_p2_rem += countQuestionsInCell(p2_rem);
    sum_p2_und += countQuestionsInCell(p2_und);
    sum_p2_app += countQuestionsInCell(p2_app);

    sum_p3_rem += countQuestionsInCell(p3_rem);
    sum_p3_und += countQuestionsInCell(p3_und);
    sum_p3_app += countQuestionsInCell(p3_app);

    sum_p4_rem += countQuestionsInCell(p4_rem);
    sum_p4_und += countQuestionsInCell(p4_und);
    sum_p4_app += countQuestionsInCell(p4_app);

    const row_rem =
      row.totalRemember !== undefined
        ? row.totalRemember
        : countQuestionsInCell(p1_rem) + countQuestionsInCell(p2_rem) + countQuestionsInCell(p3_rem) + countQuestionsInCell(p4_rem);

    const row_und =
      row.totalUnderstand !== undefined
        ? row.totalUnderstand
        : countQuestionsInCell(p1_und) + countQuestionsInCell(p2_und) + countQuestionsInCell(p3_und) + countQuestionsInCell(p4_und);

    const row_app =
      row.totalApply !== undefined
        ? row.totalApply
        : countQuestionsInCell(p1_app) + countQuestionsInCell(p2_app) + countQuestionsInCell(p3_app) + countQuestionsInCell(p4_app);

    sum_total_rem += row_rem;
    sum_total_und += row_und;
    sum_total_app += row_app;
    totalPercentageSum += Number(row.percentage || 0);

    const makeValCell = (valStr: string, isTotal: boolean = false) => {
      const isDash = !valStr || valStr === '-';
      return new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        shading: isTotal ? { fill: 'F9FAFB' } : undefined,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: valStr || '-',
                bold: !isDash,
                size: contentFontSize,
                font: headerFont,
                color: isDash ? '9CA3AF' : '111827',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      });
    };

    return new TableRow({
      children: [
        // TT
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: row.stt.toString(), bold: true, size: contentFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
        }),
        // Chủ đề / Mạch nội dung
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: createDocxInlineRuns(row.topic, { size: contentFontSize, font: headerFont }) })],
        }),
        // Nội dung / Đơn vị kiến thức
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: createDocxInlineRuns(row.subTopic, { size: contentFontSize, font: headerFont }) })],
        }),
        // Phần I (Nhiều lựa chọn): Biết, Hiểu, Vận dụng
        makeValCell(p1_rem),
        makeValCell(p1_und),
        makeValCell(p1_app),
        // Phần II (Đúng - Sai): Biết, Hiểu, Vận dụng
        makeValCell(p2_rem),
        makeValCell(p2_und),
        makeValCell(p2_app),
        // Phần III (Trả lời ngắn): Biết, Hiểu, Vận dụng
        makeValCell(p3_rem),
        makeValCell(p3_und),
        makeValCell(p3_app),
        // Phần IV (Tự luận): Biết, Hiểu, Vận dụng
        makeValCell(p4_rem),
        makeValCell(p4_und),
        makeValCell(p4_app),
        // Tổng: Biết, Hiểu, Vận dụng
        makeValCell(row_rem > 0 ? row_rem.toString() : '-', true),
        makeValCell(row_und > 0 ? row_und.toString() : '-', true),
        makeValCell(row_app > 0 ? row_app.toString() : '-', true),
        // Tỷ lệ % điểm
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: `${row.percentage || 0}%`, bold: true, size: contentFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
        }),
      ],
    });
  });

  const totalQuestionsAll = sum_total_rem + sum_total_und + sum_total_app;
  const makeFooterCell = (text: string, bold: boolean = true) =>
    new TableCell({
      verticalAlign: VerticalAlign.CENTER,
      shading: { fill: 'F3F4F6' },
      children: [new Paragraph({ children: [new TextRun({ text, bold, size: contentFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
    });

  // Hàng Tổng 1: Tổng số câu
  const footerRow1 = new TableRow({
    children: [
      new TableCell({
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'EBF4F6' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Tổng số câu', bold: true, size: contentFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
      // P1
      makeFooterCell(sum_p1_rem > 0 ? sum_p1_rem.toString() : '-'),
      makeFooterCell(sum_p1_und > 0 ? sum_p1_und.toString() : '-'),
      makeFooterCell(sum_p1_app > 0 ? sum_p1_app.toString() : '-'),
      // P2
      makeFooterCell(sum_p2_rem > 0 ? sum_p2_rem.toString() : '-'),
      makeFooterCell(sum_p2_und > 0 ? sum_p2_und.toString() : '-'),
      makeFooterCell(sum_p2_app > 0 ? sum_p2_app.toString() : '-'),
      // P3
      makeFooterCell(sum_p3_rem > 0 ? sum_p3_rem.toString() : '-'),
      makeFooterCell(sum_p3_und > 0 ? sum_p3_und.toString() : '-'),
      makeFooterCell(sum_p3_app > 0 ? sum_p3_app.toString() : '-'),
      // P4
      makeFooterCell(sum_p4_rem > 0 ? sum_p4_rem.toString() : '-'),
      makeFooterCell(sum_p4_und > 0 ? sum_p4_und.toString() : '-'),
      makeFooterCell(sum_p4_app > 0 ? sum_p4_app.toString() : '-'),
      // Tổng Biết, Hiểu, Vận dụng
      makeFooterCell(sum_total_rem > 0 ? sum_total_rem.toString() : '-', true),
      makeFooterCell(sum_total_und > 0 ? sum_total_und.toString() : '-', true),
      makeFooterCell(sum_total_app > 0 ? sum_total_app.toString() : '-', true),
      // Tổng số câu toàn đề
      makeFooterCell(`${totalQuestionsAll} câu`, true),
    ],
  });

  // Hàng Tổng 2: Tỉ lệ % điểm
  const remPct = totalQuestionsAll > 0 ? Math.round((sum_total_rem / totalQuestionsAll) * 100) : 40;
  const undPct = totalQuestionsAll > 0 ? Math.round((sum_total_und / totalQuestionsAll) * 100) : 30;
  const appPct = 100 - remPct - undPct;

  const footerRow2 = new TableRow({
    children: [
      new TableCell({
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'EBF4F6' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Tỉ lệ % điểm', bold: true, size: contentFontSize, font: headerFont })], alignment: AlignmentType.CENTER })],
      }),
      makeFooterCell('-'),
      makeFooterCell('-'),
      makeFooterCell('-'),
      makeFooterCell('-'),
      makeFooterCell('-'),
      makeFooterCell('-'),
      makeFooterCell('-'),
      makeFooterCell('-'),
      makeFooterCell('-'),
      makeFooterCell('-'),
      makeFooterCell('-'),
      makeFooterCell('-'),
      makeFooterCell(`${remPct}%`, true),
      makeFooterCell(`${undPct}%`, true),
      makeFooterCell(`${appPct}%`, true),
      makeFooterCell('100%', true),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow1, headerRow2, headerRow3, headerRow4, ...dataRows, footerRow1, footerRow2],
  });
}

export class ExportDocx {
  /**
   * Xuất toàn bộ Gói Đề Thi (Ma trận, Bảng đặc tả, Đề thi các mã, Đáp án, Rubric) ra 1 file Word (.docx)
   */
  static async exportExamPackageToDocx(examPack: ExamPackage): Promise<void> {
    const { metadata, matrix, specification, exams, answerKeys } = examPack;

    const docChildren: any[] = [];

    // --- TRANG PHỦ / TIÊU ĐỀ HÀNH CHÍNH ---
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: metadata.departmentName.toUpperCase(),
            bold: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: metadata.schoolName.toUpperCase(),
            bold: true,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `BỘ ĐỀ KIỂM TRA CHUẨN CÔNG VĂN 7991/BGDĐT`,
            bold: true,
            size: 28,
            color: '008080',
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: `Môn: ${metadata.subject} - Lớp: ${metadata.grade} (${metadata.curriculum})`,
            italics: true,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // --- 1. MA TRẬN ĐỀ KIỂM TRA ---
    docChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: `I. MA TRẬN ĐỀ KIỂM TRA (${metadata.examTitle.toUpperCase()})`,
            bold: true,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      buildMatrixDocxTable(matrix),
      new Paragraph({ text: '', spacing: { after: 300 } })
    );

    // --- 2. BẢNG ĐẶC TẢ ---
    docChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: `II. BẢNG ĐẶC TẢ ĐỀ KIỂM TRA CHUẨN ĐÁNH GIÁ NĂNG LỰC`,
            bold: true,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    const primaryQuestions = exams[0]?.questions || [];

    const specHeaderRow = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: 'F2F4F7' },
          children: [new Paragraph({ children: [new TextRun({ text: 'STT', bold: true, font: 'Times New Roman', size: 19 })], alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: 'F2F4F7' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Chủ đề / Đơn vị kiến thức', bold: true, font: 'Times New Roman', size: 19 })], alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { fill: 'F2F4F7' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Yêu cầu cần đạt', bold: true, font: 'Times New Roman', size: 19 })], alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: { fill: 'F2F4F7' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Số câu / Dạng câu', bold: true, font: 'Times New Roman', size: 19 })], alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: 9, type: WidthType.PERCENTAGE },
          shading: { fill: 'F2F4F7' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Điểm tổng', bold: true, font: 'Times New Roman', size: 19 })], alignment: AlignmentType.CENTER })],
        }),
      ],
    });

    const specRows = specification.map((row, rowIdx) => {
      const details = getSpecRowQuestionDetails(row, rowIdx, specification, primaryQuestions);
      const detailParagraphs = details.map(
        (d) =>
          new Paragraph({
            children: [new TextRun({ text: d, font: 'Times New Roman', size: 18 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 20, after: 20 },
          })
      );

      return new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: row.stt.toString(), font: 'Times New Roman', size: 18 })], alignment: AlignmentType.CENTER })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: createDocxInlineRuns(row.topic, { font: 'Times New Roman', size: 18 }) })],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: createDocxInlineRuns(row.requirements, { font: 'Times New Roman', size: 18 }) })],
          }),
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            children:
              detailParagraphs.length > 0
                ? detailParagraphs
                : [new Paragraph({ children: [new TextRun({ text: '-', font: 'Times New Roman', size: 18 })], alignment: AlignmentType.CENTER })],
          }),
          new TableCell({
            width: { size: 9, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: `${row.totalPoints} đ`, font: 'Times New Roman', bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
          }),
        ],
      });
    });

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [specHeaderRow, ...specRows],
      }),
      new Paragraph({ text: '', spacing: { after: 400 } })
    );

    // --- 3. ĐỀ THI CÁC MÃ ĐỀ ---
    docChildren.push(new Paragraph({ children: [new PageBreak()] }));

    for (let idx = 0; idx < exams.length; idx++) {
      const examCodeObj = exams[idx];
      if (idx > 0) {
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
      }

      docChildren.push(...buildDocxHeaderBlock(metadata, examCodeObj.code, false));

      const part1Questions = examCodeObj.questions.filter((q) => q.partType === 'PART1');
      const part2Questions = examCodeObj.questions.filter((q) => q.partType === 'PART2');
      const part3Questions = examCodeObj.questions.filter((q) => q.partType === 'PART3');
      const part4Questions = examCodeObj.questions.filter((q) => q.partType === 'PART4');

      // Part I
      if (part1Questions.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'PHẦN I. Câu hỏi trắc nghiệm nhiều phương án lựa chọn (Thí sinh chọn 1 đáp án đúng nhất)',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        for (const q of part1Questions) {
          const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART1');
          const qPars = await buildContentParagraphs(q.content, `Câu ${q.number} ${tag}: `, true, { size: 22 });
          docChildren.push(...qPars);

          if (q.options) {
            for (const opt of q.options) {
              const optPars = await buildContentParagraphs(opt.content, `${opt.key}. `, true, { size: 22 });
              docChildren.push(...optPars);
            }
          }
        }
      }

      // Part II
      if (part2Questions.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 250, after: 100 },
            children: [
              new TextRun({
                text: 'PHẦN II. Câu hỏi trắc nghiệm Đúng/Sai (Trong mỗi ý ở mỗi câu, thí sinh chọn Đúng hoặc Sai)',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        for (const q of part2Questions) {
          const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART2');
          const qPars = await buildContentParagraphs(q.content, `Câu ${q.number} ${tag}: `, true, { size: 22 });
          docChildren.push(...qPars);

          if (q.trueFalseStatements) {
            for (const st of q.trueFalseStatements) {
              const stPars = await buildContentParagraphs(st.content, `${st.key}) `, true, { size: 22 });
              docChildren.push(...stPars);
            }
          }
        }
      }

      // Part III
      if (part3Questions.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 250, after: 100 },
            children: [
              new TextRun({
                text: 'PHẦN III. Câu hỏi trắc nghiệm trả lời ngắn (Thí sinh điền kết quả ngắn gọn)',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        for (const q of part3Questions) {
          const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART3');
          const qPars = await buildContentParagraphs(q.content, `Câu ${q.number} ${tag}: `, true, { size: 22 });
          docChildren.push(...qPars);
        }
      }

      // Part IV
      if (part4Questions.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 250, after: 100 },
            children: [
              new TextRun({
                text: 'PHẦN IV. Tự luận (Thí sinh trình bày chi tiết bài làm)',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        for (const q of part4Questions) {
          const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART4');
          const qPars = await buildContentParagraphs(q.content, `Câu ${q.number} ${tag} (${q.points} điểm): `, true, { size: 22 });
          docChildren.push(...qPars);
        }
      }
    }

    // --- 4. ĐÁP ÁN & HƯỚNG DẪN CHẤM ---
    docChildren.push(new Paragraph({ children: [new PageBreak()] }));

    for (let idx = 0; idx < answerKeys.length; idx++) {
      const ak = answerKeys[idx];
      if (idx > 0) {
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
      }

      docChildren.push(...buildDocxHeaderBlock(metadata, ak.code, true));

      // Bảng đáp án Phần I
      if (ak.part1Answers && ak.part1Answers.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 100, after: 50 },
            children: [
              new TextRun({
                text: 'PHẦN I. Đáp án Trắc nghiệm Nhiều phương án lựa chọn:',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        const rowsP1: TableRow[] = [
          new TableRow({
            children: ak.part1Answers.map((ans) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `C${ans.questionNumber}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] })),
          }),
          new TableRow({
            children: ak.part1Answers.map((ans) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ans.correctOption, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] })),
          }),
        ];

        docChildren.push(new Table({ rows: rowsP1 }), new Paragraph({ text: '', spacing: { after: 150 } }));
      }

      // Bảng đáp án Phần II (Đúng/Sai)
      if (ak.part2Answers && ak.part2Answers.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 150, after: 50 },
            children: [
              new TextRun({
                text: 'PHẦN II. Đáp án Trắc nghiệm Đúng / Sai:',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        const headerRowP2 = new TableRow({
          tableHeader: true,
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Câu hỏi', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ý a)', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ý b)', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ý c)', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ý d)', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
          ],
        });

        const rowsP2 = ak.part2Answers.map((p2) => {
          const getVal = (k: string) => {
            const st = p2.statements.find((s) => s.key === k);
            return st ? (st.isCorrect ? 'ĐÚNG' : 'SAI') : '-';
          };
          return new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Câu ${p2.questionNumber}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getVal('a'), size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getVal('b'), size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getVal('c'), size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getVal('d'), size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
            ],
          });
        });

        docChildren.push(new Table({ rows: [headerRowP2, ...rowsP2] }), new Paragraph({ text: '', spacing: { after: 150 } }));
      }

      // Bảng đáp án Phần III (Trả lời ngắn)
      if (ak.part3Answers && ak.part3Answers.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 150, after: 50 },
            children: [
              new TextRun({
                text: 'PHẦN III. Đáp án Trắc nghiệm Trả lời ngắn:',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        const rowsP3: TableRow[] = [
          new TableRow({
            children: ak.part3Answers.map((ans) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `C${ans.questionNumber}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] })),
          }),
          new TableRow({
            children: ak.part3Answers.map((ans) => new TableCell({ children: [new Paragraph({ children: createDocxInlineRuns(ans.shortAnswer, { bold: true, size: 18, font: 'Times New Roman' }), alignment: AlignmentType.CENTER })] })),
          }),
        ];

        docChildren.push(new Table({ rows: rowsP3 }), new Paragraph({ text: '', spacing: { after: 150 } }));
      }

      // Đáp án & Hướng dẫn giải chi tiết cho tất cả các phần (I, II, III, IV)
      const targetExam = exams.find((e) => e.code === ak.code) || exams[0];
      if (targetExam) {
        const p1WithExp = targetExam.questions.filter((q) => q.partType === 'PART1' && q.explanation);
        const p2WithExp = targetExam.questions.filter((q) => q.partType === 'PART2' && q.explanation);
        const p3WithExp = targetExam.questions.filter((q) => q.partType === 'PART3' && (q.explanation || q.shortAnswer));
        const p4Questions = targetExam.questions.filter((q) => q.partType === 'PART4');

        if (p1WithExp.length > 0 || p2WithExp.length > 0 || p3WithExp.length > 0) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 200, after: 100 },
              children: [
                new TextRun({
                  text: 'HƯỚNG DẪN GIẢI CHI TIẾT CÂU HỎI TRẮC NGHIỆM (PHẦN I, II, III):',
                  bold: true,
                  size: 22,
                  font: 'Times New Roman',
                  color: '008080',
                }),
              ],
            })
          );

          if (p1WithExp.length > 0) {
            docChildren.push(
              new Paragraph({
                spacing: { before: 100, after: 60 },
                children: [
                  new TextRun({
                    text: '1. Giải thích chi tiết Phần I (Trắc nghiệm nhiều lựa chọn):',
                    bold: true,
                    size: 20,
                    font: 'Times New Roman',
                  }),
                ],
              })
            );
            for (const q of p1WithExp) {
              const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART1');
              const title = `Câu ${q.number} ${tag} (Đáp án đúng: ${q.correctOption}): `;
              const pars = await buildContentParagraphs(q.explanation || '', title, true, { size: 21 });
              docChildren.push(...pars);
            }
          }

          if (p2WithExp.length > 0) {
            docChildren.push(
              new Paragraph({
                spacing: { before: 120, after: 60 },
                children: [
                  new TextRun({
                    text: '2. Giải thích chi tiết Phần II (Trắc nghiệm Đúng/Sai):',
                    bold: true,
                    size: 20,
                    font: 'Times New Roman',
                  }),
                ],
              })
            );
            for (const q of p2WithExp) {
              const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART2');
              const title = `Câu ${q.number} ${tag}: `;
              const pars = await buildContentParagraphs(q.explanation || '', title, true, { size: 21 });
              docChildren.push(...pars);
            }
          }

          if (p3WithExp.length > 0) {
            docChildren.push(
              new Paragraph({
                spacing: { before: 120, after: 60 },
                children: [
                  new TextRun({
                    text: '3. Giải thích chi tiết Phần III (Trắc nghiệm trả lời ngắn):',
                    bold: true,
                    size: 20,
                    font: 'Times New Roman',
                  }),
                ],
              })
            );
            for (const q of p3WithExp) {
              const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART3');
              const title = `Câu ${q.number} ${tag} (Đáp số: ${q.shortAnswer || ''}): `;
              const solText = q.explanation || `Đáp số chính xác: ${q.shortAnswer || ''}`;
              const pars = await buildContentParagraphs(solText, title, true, { size: 21 });
              docChildren.push(...pars);
            }
          }
        }

        if (p4Questions.length > 0) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 200, after: 100 },
              children: [
                new TextRun({
                  text: 'PHẦN IV. Hướng dẫn giải chi tiết Tự luận & Rubric chấm điểm:',
                  bold: true,
                  size: 22,
                  font: 'Times New Roman',
                  color: '008080',
                }),
              ],
            })
          );

          for (const q of p4Questions) {
            const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART4');
            const title = `Câu ${q.number} ${tag} (${q.points} điểm): `;
            const textContent = q.essayAnswerGuide || q.explanation || q.content;
            const solPars = await buildContentParagraphs(textContent, title, true, { size: 21 });
            docChildren.push(...solPars);

            if (q.rubric && q.rubric.length > 0) {
              docChildren.push(
                new Paragraph({
                  spacing: { before: 100, after: 60 },
                  children: [
                    new TextRun({
                      text: 'Bảng Rubric chấm điểm:',
                      bold: true,
                      size: 20,
                      font: 'Times New Roman',
                      color: '008080',
                    }),
                  ],
                }),
                buildDocxRubricTable(q.rubric),
                new Paragraph({ text: '', spacing: { after: 120 } })
              );
            }
          }
        }
      }
    }

    const doc = new Document({
      sections: [{ children: docChildren }],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `De_Thi_Va_Dap_An_${metadata.subject}_${metadata.grade}.docx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  /**
   * Xuất CHỈ phần Đề Thi các mã đề ra file Word riêng
   */
  static async exportExamsOnlyToDocx(examPack: ExamPackage): Promise<void> {
    const { metadata, exams } = examPack;
    const docChildren: any[] = [];

    for (let idx = 0; idx < exams.length; idx++) {
      const examCodeObj = exams[idx];
      if (idx > 0) {
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
      }

      docChildren.push(...buildDocxHeaderBlock(metadata, examCodeObj.code, false));

      const part1Questions = examCodeObj.questions.filter((q) => q.partType === 'PART1');
      const part2Questions = examCodeObj.questions.filter((q) => q.partType === 'PART2');
      const part3Questions = examCodeObj.questions.filter((q) => q.partType === 'PART3');
      const part4Questions = examCodeObj.questions.filter((q) => q.partType === 'PART4');

      if (part1Questions.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'PHẦN I. Câu hỏi trắc nghiệm nhiều phương án lựa chọn (Thí sinh chọn 1 đáp án đúng nhất)',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        for (const q of part1Questions) {
          const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART1');
          const qPars = await buildContentParagraphs(q.content, `Câu ${q.number} ${tag}: `, true, { size: 22 });
          docChildren.push(...qPars);

          if (q.options) {
            for (const opt of q.options) {
              const optPars = await buildContentParagraphs(opt.content, `${opt.key}. `, true, { size: 22 });
              docChildren.push(...optPars);
            }
          }
        }
      }

      if (part2Questions.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 250, after: 100 },
            children: [
              new TextRun({
                text: 'PHẦN II. Câu hỏi trắc nghiệm Đúng/Sai (Trong mỗi ý ở mỗi câu, thí sinh chọn Đúng hoặc Sai)',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        for (const q of part2Questions) {
          const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART2');
          const qPars = await buildContentParagraphs(q.content, `Câu ${q.number} ${tag}: `, true, { size: 22 });
          docChildren.push(...qPars);

          if (q.trueFalseStatements) {
            for (const st of q.trueFalseStatements) {
              const stPars = await buildContentParagraphs(st.content, `${st.key}) `, true, { size: 22 });
              docChildren.push(...stPars);
            }
          }
        }
      }

      if (part3Questions.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 250, after: 100 },
            children: [
              new TextRun({
                text: 'PHẦN III. Câu hỏi trắc nghiệm trả lời ngắn (Thí sinh điền kết quả ngắn gọn)',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        for (const q of part3Questions) {
          const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART3');
          const qPars = await buildContentParagraphs(q.content, `Câu ${q.number} ${tag}: `, true, { size: 22 });
          docChildren.push(...qPars);
        }
      }

      if (part4Questions.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 250, after: 100 },
            children: [
              new TextRun({
                text: 'PHẦN IV. Tự luận (Thí sinh trình bày chi tiết bài làm)',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        for (const q of part4Questions) {
          const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART4');
          const qPars = await buildContentParagraphs(q.content, `Câu ${q.number} ${tag} (${q.points} điểm): `, true, { size: 22 });
          docChildren.push(...qPars);
        }
      }
    }

    const doc = new Document({
      sections: [{ children: docChildren }],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `De_Thi_Cac_Ma_De_${metadata.subject}_${metadata.grade}.docx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  /**
   * Xuất CHỈ phần Đáp Án & HƯỚNG DẪN CHẤM ra file Word riêng
   */
  static async exportAnswerKeysOnlyToDocx(examPack: ExamPackage): Promise<void> {
    const { metadata, answerKeys, exams } = examPack;
    const docChildren: any[] = [];

    for (let idx = 0; idx < answerKeys.length; idx++) {
      const ak = answerKeys[idx];
      if (idx > 0) {
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
      }

      docChildren.push(...buildDocxHeaderBlock(metadata, ak.code, true));

      // Bảng đáp án Phần I
      if (ak.part1Answers && ak.part1Answers.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 100, after: 50 },
            children: [
              new TextRun({
                text: 'PHẦN I. Đáp án Trắc nghiệm Nhiều phương án lựa chọn:',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        const rowsP1: TableRow[] = [
          new TableRow({
            children: ak.part1Answers.map((ans) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `C${ans.questionNumber}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] })),
          }),
          new TableRow({
            children: ak.part1Answers.map((ans) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ans.correctOption, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] })),
          }),
        ];

        docChildren.push(new Table({ rows: rowsP1 }), new Paragraph({ text: '', spacing: { after: 150 } }));
      }

      // Bảng đáp án Phần II (Đúng/Sai)
      if (ak.part2Answers && ak.part2Answers.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 150, after: 50 },
            children: [
              new TextRun({
                text: 'PHẦN II. Đáp án Trắc nghiệm Đúng / Sai:',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        const headerRowP2 = new TableRow({
          tableHeader: true,
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Câu hỏi', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ý a)', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ý b)', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ý c)', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ý d)', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
          ],
        });

        const rowsP2 = ak.part2Answers.map((p2) => {
          const getVal = (k: string) => {
            const st = p2.statements.find((s) => s.key === k);
            return st ? (st.isCorrect ? 'ĐÚNG' : 'SAI') : '-';
          };
          return new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Câu ${p2.questionNumber}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getVal('a'), size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getVal('b'), size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getVal('c'), size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getVal('d'), size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
            ],
          });
        });

        docChildren.push(new Table({ rows: [headerRowP2, ...rowsP2] }), new Paragraph({ text: '', spacing: { after: 150 } }));
      }

      // Bảng đáp án Phần III (Trả lời ngắn)
      if (ak.part3Answers && ak.part3Answers.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 150, after: 50 },
            children: [
              new TextRun({
                text: 'PHẦN III. Đáp án Trắc nghiệm Trả lời ngắn:',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          })
        );

        const rowsP3: TableRow[] = [
          new TableRow({
            children: ak.part3Answers.map((ans) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `C${ans.questionNumber}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] })),
          }),
          new TableRow({
            children: ak.part3Answers.map((ans) => new TableCell({ children: [new Paragraph({ children: createDocxInlineRuns(ans.shortAnswer, { bold: true, size: 18, font: 'Times New Roman' }), alignment: AlignmentType.CENTER })] })),
          }),
        ];

        docChildren.push(new Table({ rows: rowsP3 }), new Paragraph({ text: '', spacing: { after: 150 } }));
      }

      // Đáp án & Hướng dẫn giải chi tiết cho tất cả các phần (I, II, III, IV)
      const targetExam = exams.find((e) => e.code === ak.code) || exams[0];
      if (targetExam) {
        const p1WithExp = targetExam.questions.filter((q) => q.partType === 'PART1' && q.explanation);
        const p2WithExp = targetExam.questions.filter((q) => q.partType === 'PART2' && q.explanation);
        const p3WithExp = targetExam.questions.filter((q) => q.partType === 'PART3' && (q.explanation || q.shortAnswer));
        const p4Questions = targetExam.questions.filter((q) => q.partType === 'PART4');

        if (p1WithExp.length > 0 || p2WithExp.length > 0 || p3WithExp.length > 0) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 200, after: 100 },
              children: [
                new TextRun({
                  text: 'HƯỚNG DẪN GIẢI CHI TIẾT CÂU HỎI TRẮC NGHIỆM (PHẦN I, II, III):',
                  bold: true,
                  size: 22,
                  font: 'Times New Roman',
                  color: '008080',
                }),
              ],
            })
          );

          if (p1WithExp.length > 0) {
            docChildren.push(
              new Paragraph({
                spacing: { before: 100, after: 60 },
                children: [
                  new TextRun({
                    text: '1. Giải thích chi tiết Phần I (Trắc nghiệm nhiều lựa chọn):',
                    bold: true,
                    size: 20,
                    font: 'Times New Roman',
                  }),
                ],
              })
            );
            for (const q of p1WithExp) {
              const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART1');
              const title = `Câu ${q.number} ${tag} (Đáp án đúng: ${q.correctOption}): `;
              const pars = await buildContentParagraphs(q.explanation || '', title, true, { size: 21 });
              docChildren.push(...pars);
            }
          }

          if (p2WithExp.length > 0) {
            docChildren.push(
              new Paragraph({
                spacing: { before: 120, after: 60 },
                children: [
                  new TextRun({
                    text: '2. Giải thích chi tiết Phần II (Trắc nghiệm Đúng/Sai):',
                    bold: true,
                    size: 20,
                    font: 'Times New Roman',
                  }),
                ],
              })
            );
            for (const q of p2WithExp) {
              const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART2');
              const title = `Câu ${q.number} ${tag}: `;
              const pars = await buildContentParagraphs(q.explanation || '', title, true, { size: 21 });
              docChildren.push(...pars);
            }
          }

          if (p3WithExp.length > 0) {
            docChildren.push(
              new Paragraph({
                spacing: { before: 120, after: 60 },
                children: [
                  new TextRun({
                    text: '3. Giải thích chi tiết Phần III (Trắc nghiệm trả lời ngắn):',
                    bold: true,
                    size: 20,
                    font: 'Times New Roman',
                  }),
                ],
              })
            );
            for (const q of p3WithExp) {
              const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART3');
              const title = `Câu ${q.number} ${tag} (Đáp số: ${q.shortAnswer || ''}): `;
              const solText = q.explanation || `Đáp số chính xác: ${q.shortAnswer || ''}`;
              const pars = await buildContentParagraphs(solText, title, true, { size: 21 });
              docChildren.push(...pars);
            }
          }
        }

        if (p4Questions.length > 0) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 200, after: 100 },
              children: [
                new TextRun({
                  text: 'PHẦN IV. Hướng dẫn giải chi tiết Tự luận & Rubric chấm điểm:',
                  bold: true,
                  size: 22,
                  font: 'Times New Roman',
                  color: '008080',
                }),
              ],
            })
          );

          for (const q of p4Questions) {
            const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART4');
            const title = `Câu ${q.number} ${tag} (${q.points} điểm): `;
            const textContent = q.essayAnswerGuide || q.explanation || q.content;
            const solPars = await buildContentParagraphs(textContent, title, true, { size: 21 });
            docChildren.push(...solPars);

            if (q.rubric && q.rubric.length > 0) {
              docChildren.push(
                new Paragraph({
                  spacing: { before: 100, after: 60 },
                  children: [
                    new TextRun({
                      text: 'Bảng Rubric chấm điểm:',
                      bold: true,
                      size: 20,
                      font: 'Times New Roman',
                      color: '008080',
                    }),
                  ],
                }),
                buildDocxRubricTable(q.rubric),
                new Paragraph({ text: '', spacing: { after: 120 } })
              );
            }
          }
        }
      }
    }

    const doc = new Document({
      sections: [{ children: docChildren }],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `Dap_An_Va_Huong_Dan_Cham_${metadata.subject}_${metadata.grade}.docx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  /**
   * Xuất riêng Ma trận Đề kiểm tra ra 1 file Word (.docx)
   */
  static async exportMatrixOnlyToDocx(examPack: ExamPackage): Promise<void> {
    const { metadata, matrix } = examPack;

    const docChildren: any[] = [];

    // Header thông tin hành chính
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: metadata.departmentName.toUpperCase(),
            bold: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: metadata.schoolName.toUpperCase(),
            bold: true,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 150 },
        children: [
          new TextRun({
            text: `KHUNG MA TRẬN ĐỀ KIỂM TRA CHUẨN CÔNG VĂN 7991/BGDĐT`,
            bold: true,
            size: 26,
            color: '008080',
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [
          new TextRun({
            text: `Môn: ${metadata.subject} - Lớp: ${metadata.grade} (${metadata.curriculum}) | Thời gian: ${metadata.durationMinutes} phút | Tổng điểm: ${metadata.totalPoints}đ`,
            italics: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    docChildren.push(buildMatrixDocxTable(matrix));

    const doc = new Document({
      sections: [{ children: docChildren }],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `Ma_Tran_De_Thi_${metadata.subject}_${metadata.grade}.docx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  /**
   * Alias method cho exportExamPackageToDocx
   */
  static async exportPackageToWord(examPack: ExamPackage): Promise<void> {
    return this.exportExamPackageToDocx(examPack);
  }
}
