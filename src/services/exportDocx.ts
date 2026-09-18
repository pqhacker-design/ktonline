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

  // Pattern nhận diện các từ Tiếng Việt thường gặp
  const vnWordRegex = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]|\\b(tam gi[aá]c|cho|bi[êế]t|t[ií]nh|v[ơớ]i|c[oó]|v[aà]|vu[oô]ng|đ[oộ] d[aà]i|đư[ơờ]ng cao|h[iì]nh chi[êế]u|chu vi|di[êệ]n t[ií]ch|t[iỉ] s[oố]|đ[oồ]ng d[aạ]ng|tr[eê]n|c[aạ]nh|g[oó]c|c[uù]ng l[uú]c đ[oó]|m[oộ]t|c[oộ]t|c[oọ]c|m[aạ]t đ[aấ]t|b[oó]ng|trư[ơờ]ng h[ơợ]p|đư[ơợ]c|sao cho|như|th[iì])\\b/i;

  return text.replace(/\$([^\$]+)\$/g, (fullMatch, mathContent) => {
    // Nếu khối $...$ chứa dấu xuống dòng hoặc là môi trường nhiều dòng thì giữ nguyên
    if (mathContent.includes('\n') || mathContent.includes('\\begin')) {
      return fullMatch;
    }

    // Tạm thời che (mask) tất cả các khối \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}, \ce{...}
    // để kiểm tra xem bên NGOÀI các khối \text{...} đó có từ tiếng Việt nào không.
    const textGroupRegex = /\\(text|mathrm|mathbf|mathit|ce)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
    const maskedContent = mathContent.replace(textGroupRegex, '___TEXT_PLACEHOLDER___');

    // Nếu bên ngoài các khối \text{...} KHÔNG chứa chữ tiếng Việt thì đây là công thức chuẩn -> GIỮ NGUYÊN 100%!
    if (!vnWordRegex.test(maskedContent)) {
      return fullMatch;
    }

    // Nếu bên ngoài thực sự chứa từ tiếng Việt (ví dụ: "$Cho tam giác ABC vuông tại A có AB = 3\text{ cm}$"):
    // Tiến hành tách rời các biểu thức toán con và đặt tiếng Việt ra ngoài $...$
    const mathTokenRegex = /(\\d?frac\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\sqrt\{[^{}]*\}|\\widehat\{[^{}]+\}|\\mathbb\{[^{}]+\}|\\vec\{[^{}]+\}|\\xrightleftharpoons(?:\[[^{}]*\])?(?:\{[^{}]*\})*|\\xrightarrow(?:\[[^{}]*\])?(?:\{[^{}]*\})*|\\xleftarrow(?:\[[^{}]*\])?(?:\{[^{}]*\})*|\\text\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\Delta\s*[A-Z0-9_\']+|[A-Z0-9_\'\.]+\s*[\=\<\>\+\-\*\/]\s*(?:[A-Za-z0-9_\'\.\^\+\-\*\/\{\}\\\text\^\circ]|\\text\{[^{}]*\}|\\mathrm\{[^{}]*\})+|\b\d+(?:\,\d+)?\s*\\text\{[^{}]*\}|[0-9]+\^\s*\\?circ|[0-9]+\\circ\b|[A-Z][A-Z]|\b[a-z]\s*=\s*\d+(?:\/\d+)?)/g;

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
      return tokens.join('');
    }

    return mathContent;
  });
}

function processPlainPart(plain: string): string {
  if (!plain) return plain;
  let str = plain;

  // 1. Loại bỏ các nhãn mã mức độ thừa như [NB_TL], [TH_TL], [VD_TL], [VDC_TL], [NB_TN], [NB],...
  str = str.replace(/\s*\[(NB|TH|VD|VDC|REMEMBER|UNDERSTAND|APPLY|ADVANCED)(_(TL|TN|TF|SA))?\]\s*/gi, ' ');

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

  // 6. Tách từ tiếng Việt dính vào biến số toán học (BiếtAB -> Biết AB, và8 -> và 8, cmvà -> cm và)
  str = str.replace(/([a-àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ])([A-Z]{1,4}\b)/g, '$1 $2');
  str = str.replace(/([a-àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ])(\d+)/g, '$1 $2');
  str = str.replace(/(\d+)\s*cm([a-àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ])/g, '$1 cm $2');

  // 7. Chuẩn hóa góc 60\circ, 50\circ -> 50^\circ
  str = str.replace(/(\d+)\s*\\\^?\{?circ\}?/g, '$1^\\circ');

  // 8. Tự động bọc $...$ cho các phương trình hóa học, công thức và biểu thức toán/hóa học chưa bọc $...$
  // 8a. Phương trình hóa học chứa mũi tên phản ứng (\xrightleftharpoons, \xrightarrow, \xleftarrow, \rightarrow,...)
  str = str.replace(
    /(?:[A-Za-z0-9_\{\}\(\)\+\-\*\/\=\,\.\:\s\%\^\circ\\]|\\text\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\mathrm\{[^{}]*\})*\s*\\(xrightleftharpoons|xrightarrow|xleftarrow|rightarrow|Rightarrow|leftrightarrow|rightleftharpoons)(?:\[[^{}]*\])?(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*\s*(?:[A-Za-z0-9_\{\}\(\)\+\-\*\/\=\,\.\:\s\%\^\circ\\]|\\text\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\mathrm\{[^{}]*\}|\\uparrow|\\downarrow)*/g,
    (match) => {
      const trimmed = match.trim();
      if (!trimmed || trimmed.startsWith('$')) return match;
      return ` $${trimmed}$ `;
    }
  );

  // 8b. Các công thức toán/hóa & đại lượng nguyên vẹn có chỉ số/mũ/phân số/lệnh KaTeX:
  // Ví dụ: n_{\text{ester lý thuyết}} = 0,1\text{ mol}, m_{\text{ester lý thuyết}} = 0,1 \cdot 88 = 8,8\text{ g}, H = \frac{...}{...} \cdot 100\% = 60\%
  const fullEquationRegex = /(?:[A-Za-z0-9_\'\.\(\)]|\\text\{[^{}]*\}|\\mathrm\{[^{}]*\})*(?:_\{[^{}]+\}|_\d+|\^\{[^{}]+\}|\^\d+|\\d?frac\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\sqrt\{[^{}]*\}|\\uparrow|\\downarrow)(?:[A-Za-z0-9_\'\.\=\+\-\*\/\,\:\s\%\^\circ\\]|\\text\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\mathrm\{[^{}]*\}|\\cdot|\\times|\\pm|\\div|\\d?frac\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\uparrow|\\downarrow)*/g;

  str = str.replace(fullEquationRegex, (match) => {
    const trimmed = match.trim();
    if (!trimmed || trimmed.startsWith('$')) return match;
    return ` $${trimmed}$ `;
  });

  // 8c. Bọc độc lập các biểu thức/lệnh LaTeX còn sót lại chưa được bọc $...$
  const discreteLatexRegex = /(\\d?frac\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\sqrt\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\widehat\{[^{}]+\}|\\vec\{[^{}]+\}|\\mathbb\{[^{}]+\}|\\Delta\s*[A-Z0-9_\']+|\\(alpha|beta|gamma|delta|epsilon|theta|lambda|pi|sigma|phi|omega|Omega|angle|triangle|sim|perp|parallel|cong|equiv|le|geq|leq|ge|neq|approx|degree|cdot|times|pm|div|xrightleftharpoons|xrightarrow|xleftarrow|rightleftharpoons|uparrow|downarrow|Rightarrow|Leftarrow|Leftrightarrow)\b)/g;

  str = str.replace(discreteLatexRegex, (match) => {
    const trimmed = match.trim();
    if (!trimmed || trimmed.startsWith('$')) return match;
    return ` $${trimmed}$ `;
  });

  // 8d. Tự động bọc $...$ cho các lệnh \ce{...} chưa bọc $
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

  // 2. Xử lý chuẩn hóa môi trường \begin{cases} ... \end{cases}
  str = str.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (match, inner) => {
    let cleanedInner = inner.trim();
    cleanedInner = cleanedInner.replace(/\\\s+(?=[0-9a-zA-Z\-\+\(\)\{])/g, ' \\\\ ');

    if (!cleanedInner.includes('\\\\')) {
      if (/;|,/.test(cleanedInner)) {
        cleanedInner = cleanedInner.replace(/[;,]\s*/g, ' \\\\ ');
      }
    }

    if (!cleanedInner.includes('\\\\')) {
      cleanedInner = cleanedInner.replace(
        /(=|>|<|\\le|\\ge|\\neq)\s*([\-\+]?\s*[a-zA-Z0-9\(\)\{\}\^\.\/]+(?:\s*[\+\-\*\/]\s*[a-zA-Z0-9\(\)\{\}\^\.\/]+)*)\s+((?:[\-\+]?\s*)?[0-9a-zA-Z\(\)\{\}\\\|\vec]+(?:\s*[\+\-\*\/]\s*[0-9a-zA-Z]+)*\s*(?:=|\\le|\\ge|<|>|\\neq))/g,
        '$1 $2 \\\\ $3'
      );
    }

    cleanedInner = cleanedInner.split(/\\\\/).map((s) => s.trim()).filter(Boolean).join(' \\\\ ');

    return `\\begin{cases} ${cleanedInner} \\end{cases}`;
  });

  return str;
}

export function autoWrapUnwrappedLatex(text: string): string {
  if (!text) return text;

  // 0. Phục hồi và làm sạch các ký tự điều khiển ASCII, TeX accents và backslash bị thiếu
  let cleanedText = sanitizeLatexControlChars(text);

  // 1. Tự động sửa và chuẩn hóa cú pháp hệ phương trình
  cleanedText = fixCasesLatex(cleanedText);

  // 2. Tự động bọc $$...$$ cho các môi trường LaTeX nhiều dòng như \begin{cases} ... \end{cases} chưa bọc $ hoặc $$
  cleanedText = cleanedText.replace(
    /(^|[^\$])(\\begin\{(cases|aligned|array|matrix|pmatrix|bmatrix)\}[\s\S]*?\\end\{\3\})([^\$]|$)/g,
    (m, p1, p2, p3, p4) => `${p1} $$${p2}$$ ${p4}`
  );

  // 3. Tách bóc các từ tiếng Việt ra khỏi những khối $...$ bị bọc nhầm
  cleanedText = unwrapVietnameseFromMathBlocks(cleanedText);

  // 4. Tách text thành các khối đã bọc sẵn ($...$, $$...$$, \(...\), \[...\]) và phần text thường
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

  let result = parts.join('');

  // Làm sạch các vỡ vụn dán ghép $: ví dụ "$x$ $ \vdots $ $12$" -> "$x \vdots 12$"
  result = result.replace(/\$\s*\$/g, '');
  result = result.replace(/\$\s+\$/g, ' ');

  return result;
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

  // Tiền xử lý: dọn dẹp các dòng xuống dòng không hợp lệ trong khối math $...$ hoặc $$...$$
  let cleanInput = text;
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
  const cleanText = stripSvgCode(text || '');
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
 * Tạo Bảng Ma Trận Đề Kiểm Tra chuẩn định dạng Công văn 7991 (14 cột: T, Chủ đề, Đơn vị kiến thức, 8 cột Mức độ nhận thức TN/TL, Tổng câu, Tổng điểm, Tỷ lệ %)
 */
export function buildMatrixDocxTable(matrix: MatrixRow[]): Table {
  const getNum = (part: any, field: string): number => (part && part[field] ? Number(part[field]) : 0);

  // Hàng Tiêu Đề 1
  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        rowSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: 'T', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        rowSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Chủ đề /', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: 'Mạch nội dung', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER }),
        ],
      }),
      new TableCell({
        rowSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: 'Đơn vị kiến thức', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        columnSpan: 8,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: 'Mức độ nhận thức (Số câu hỏi)', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        rowSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: 'Tổng câu', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        rowSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: 'Tổng điểm', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        rowSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Tỷ lệ', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: '%', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER }),
        ],
      }),
    ],
  });

  // Hàng Tiêu Đề 2
  const headerRow2 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        columnSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: 'Nhận biết', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        columnSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: 'Thông hiểu', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        columnSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: 'Vận dụng', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        columnSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: 'Vận dụng cao', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
      }),
    ],
  });

  // Hàng Tiêu Đề 3
  const headerRow3 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TN', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TL', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TN', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TL', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TN', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TL', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TN', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TL', bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
    ],
  });

  // Tích lũy tổng
  let totalQuestionsSum = 0;
  let totalPointsSum = 0;
  let totalPercentageSum = 0;

  let sum_rem_TN = 0, sum_rem_TL = 0;
  let sum_und_TN = 0, sum_und_TL = 0;
  let sum_app_TN = 0, sum_app_TL = 0;
  let sum_adv_TN = 0, sum_adv_TL = 0;

  const dataRows = matrix.map((row) => {
    const rem_TN = getNum(row.part1, 'remember') + getNum(row.part2, 'remember') + getNum(row.part3, 'remember');
    const rem_TL = getNum(row.part4, 'remember');

    const und_TN = getNum(row.part1, 'understand') + getNum(row.part2, 'understand') + getNum(row.part3, 'understand');
    const und_TL = getNum(row.part4, 'understand');

    const app_TN = getNum(row.part1, 'apply') + getNum(row.part2, 'apply') + getNum(row.part3, 'apply');
    const app_TL = getNum(row.part4, 'apply');

    const adv_TN = getNum(row.part1, 'advanced') + getNum(row.part2, 'advanced') + getNum(row.part3, 'advanced');
    const adv_TL = getNum(row.part4, 'advanced');

    sum_rem_TN += rem_TN;
    sum_rem_TL += rem_TL;
    sum_und_TN += und_TN;
    sum_und_TL += und_TL;
    sum_app_TN += app_TN;
    sum_app_TL += app_TL;
    sum_adv_TN += adv_TN;
    sum_adv_TL += adv_TL;

    totalQuestionsSum += Number(row.totalQuestions || 0);
    totalPointsSum += Number(row.totalPoints || 0);
    totalPercentageSum += Number(row.percentage || 0);

    const fmtVal = (val: number) =>
      val > 0
        ? [new TextRun({ text: val.toString(), bold: true, size: 18, font: 'Times New Roman' })]
        : [new TextRun({ text: '-', size: 18, font: 'Times New Roman' })];

    return new TableRow({
      children: [
        // T (STT)
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: row.stt.toString(), bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
        }),
        // Chủ đề / Mạch nội dung
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: createDocxInlineRuns(row.topic, { size: 18, font: 'Times New Roman' }) })],
        }),
        // Đơn vị kiến thức
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: createDocxInlineRuns(row.subTopic, { size: 18, font: 'Times New Roman' }) })],
        }),
        // Nhận biết TN / TL
        new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: fmtVal(rem_TN), alignment: AlignmentType.CENTER })] }),
        new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: fmtVal(rem_TL), alignment: AlignmentType.CENTER })] }),
        // Thông hiểu TN / TL
        new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: fmtVal(und_TN), alignment: AlignmentType.CENTER })] }),
        new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: fmtVal(und_TL), alignment: AlignmentType.CENTER })] }),
        // Vận dụng TN / TL
        new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: fmtVal(app_TN), alignment: AlignmentType.CENTER })] }),
        new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: fmtVal(app_TL), alignment: AlignmentType.CENTER })] }),
        // Vận dụng cao TN / TL
        new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: fmtVal(adv_TN), alignment: AlignmentType.CENTER })] }),
        new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: fmtVal(adv_TL), alignment: AlignmentType.CENTER })] }),
        // Tổng câu
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: `${row.totalQuestions}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
        }),
        // Tổng điểm
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: `${row.totalPoints}đ`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
        }),
        // Tỷ lệ %
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: `${row.percentage}%`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
        }),
      ],
    });
  });

  // Hàng Tổng Cộng
  const footerRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: 'TỔNG CỘNG:', bold: true, size: 18, font: 'Times New Roman' })] })],
      }),
      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: `${sum_rem_TN}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: `${sum_rem_TL}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: `${sum_und_TN}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: `${sum_und_TL}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: `${sum_app_TN}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: `${sum_app_TL}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: `${sum_adv_TN}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: `${sum_adv_TL}`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })] }),
      new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: `${totalQuestionsSum} câu`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: `${totalPointsSum}đ`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: `${totalPercentageSum > 0 ? totalPercentageSum : 100}%`, bold: true, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })],
      }),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow1, headerRow2, headerRow3, ...dataRows, footerRow],
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

      // Đáp án Phần IV Tự luận / Hướng dẫn giải chi tiết kèm Hình vẽ & Đồ thị
      const targetExam = exams.find((e) => e.code === ak.code) || exams[0];
      if (targetExam) {
        const p4Questions = targetExam.questions.filter((q) => q.partType === 'PART4');
        if (p4Questions.length > 0) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 150, after: 100 },
              children: [
                new TextRun({
                  text: 'PHẦN IV. Hướng dẫn giải chi tiết Tự luận & Rubric chấm điểm:',
                  bold: true,
                  size: 22,
                  font: 'Times New Roman',
                }),
              ],
            })
          );

          for (const q of p4Questions) {
            const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART4');
            const title = `Câu ${q.number} ${tag} (${q.points} điểm): `;
            const textContent = q.essayAnswerGuide || q.explanation || q.content;
            const solPars = await buildContentParagraphs(textContent, title, true, { size: 22 });
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

      const targetExam = exams.find((e) => e.code === ak.code) || exams[0];
      if (targetExam) {
        const p4Questions = targetExam.questions.filter((q) => q.partType === 'PART4');
        if (p4Questions.length > 0) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 150, after: 100 },
              children: [
                new TextRun({
                  text: 'PHẦN IV. Hướng dẫn giải chi tiết Tự luận & Rubric chấm điểm:',
                  bold: true,
                  size: 22,
                  font: 'Times New Roman',
                }),
              ],
            })
          );

          for (const q of p4Questions) {
            const tag = getCognitiveTag(q.cognitiveLevel, q.partType || 'PART4');
            const title = `Câu ${q.number} ${tag} (${q.points} điểm): `;
            const textContent = q.essayAnswerGuide || q.explanation || q.content;
            const solPars = await buildContentParagraphs(textContent, title, true, { size: 22 });
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
