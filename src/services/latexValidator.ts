import katex from 'katex';
import { ExamPackage, Question, QuestionBankItem, SpecRow, MatrixRow } from '../types';
import { autoWrapUnwrappedLatex, sanitizeLatexControlChars } from './exportDocx';

export interface LatexValidationIssue {
  type: 'unclosed_bracket' | 'invalid_sqrt' | 'invalid_fraction' | 'unclosed_dollar' | 'unclosed_environment' | 'corrupted_command' | 'other';
  original: string;
  repaired: string;
  description: string;
}

export interface LatexValidationResult {
  repairedText: string;
  isValid: boolean;
  issues: LatexValidationIssue[];
}

/**
 * Bộ kiểm tra và tự động sửa lỗi định dạng toán học (LaTeX Validator)
 * Chuyên trị:
 * - Sai định dạng căn bậc hai: \sqrt 2 -> \sqrt{2}, \sqrt(x+1) -> \sqrt{x+1}, thiếu đóng ngoặc nhọn...
 * - Thiếu dấu đóng ngoặc: {, (, [, $, $$, \begin{cases} mà không có \end{cases}
 * - Sai định dạng phân số: \frac 1 2 -> \frac{1}{2}, \frac(a)(b) -> \frac{a}{b}, thiếu đóng ngoặc mẫu số...
 * - Mất ngoặc nhọn tập hợp: A = {1; 2; 3} -> A = \{1; 2; 3\}
 * - Ký hiệu góc \widehat, vectơ \vec, số đo độ 60^\circ
 * - Tự động kiểm thử tính hợp lệ cú pháp qua KaTeX parser
 */
export class LatexValidator {
  /**
   * Sửa lỗi cú pháp căn bậc hai (\sqrt)
   */
  static repairSqrtSyntax(text: string): { text: string; issues: LatexValidationIssue[] } {
    let str = text;
    const issues: LatexValidationIssue[] = [];

    // 1. \sqrt thiếu dấu backslash: sqrt{...} hoặc sqrt(...)
    const missingBackslashSqrt = /(?<!\\)\bsqrt\s*(\{([^}]+)\}|\(([^)]+)\))/g;
    if (missingBackslashSqrt.test(str)) {
      str = str.replace(missingBackslashSqrt, (match, p1) => {
        const inner = p1.startsWith('(') ? p1.slice(1, -1) : p1.slice(1, -1);
        const rep = `\\sqrt{${inner.trim()}}`;
        issues.push({
          type: 'invalid_sqrt',
          original: match,
          repaired: rep,
          description: `Thêm dấu gạch chéo \\ vào căn bậc hai: ${match} -> ${rep}`,
        });
        return rep;
      });
    }

    // 2. \sqrt dùng ngoặc tròn thay vì ngoặc nhọn: \sqrt(x + 1) -> \sqrt{x + 1}
    const parenSqrtRegex = /\\sqrt\s*\(([^()]+)\)/g;
    if (parenSqrtRegex.test(str)) {
      str = str.replace(parenSqrtRegex, (match, inner) => {
        const rep = `\\sqrt{${inner.trim()}}`;
        issues.push({
          type: 'invalid_sqrt',
          original: match,
          repaired: rep,
          description: `Chuyển ngoặc tròn sang ngoặc nhọn cho căn thức: ${match} -> ${rep}`,
        });
        return rep;
      });
    }

    // 3. \sqrt có bậc n dùng ngoặc tròn: \sqrt[n](x + 1) -> \sqrt[n]{x + 1}
    const parenNthSqrtRegex = /\\sqrt\s*\[([^\]]+)\]\s*\(([^()]+)\)/g;
    if (parenNthSqrtRegex.test(str)) {
      str = str.replace(parenNthSqrtRegex, (match, degree, inner) => {
        const rep = `\\sqrt[${degree.trim()}]{${inner.trim()}}`;
        issues.push({
          type: 'invalid_sqrt',
          original: match,
          repaired: rep,
          description: `Chuẩn hóa căn bậc n ngoặc tròn: ${match} -> ${rep}`,
        });
        return rep;
      });
    }

    // 4. \sqrt không có ngoặc nhọn theo sau: \sqrt 2 -> \sqrt{2}, \sqrt x -> \sqrt{x}, \sqrt 123 -> \sqrt{123}
    const bareSqrtRegex = /\\sqrt\s+([0-9a-zA-Z]{1,4})(?=[^a-zA-Z0-9{[(]|$)/g;
    if (bareSqrtRegex.test(str)) {
      str = str.replace(bareSqrtRegex, (match, arg) => {
        const rep = `\\sqrt{${arg}}`;
        issues.push({
          type: 'invalid_sqrt',
          original: match,
          repaired: rep,
          description: `Bọc ngoặc nhọn cho căn bậc hai trần: ${match} -> ${rep}`,
        });
        return rep;
      });
    }

    // 5. \sqrt[n] không có ngoặc nhọn cho biểu thức: \sqrt[3] x -> \sqrt[3]{x}
    const bareNthSqrtRegex = /\\sqrt\s*\[([^\]]+)\]\s+([0-9a-zA-Z]{1,4})(?=[^a-zA-Z0-9{[(]|$)/g;
    if (bareNthSqrtRegex.test(str)) {
      str = str.replace(bareNthSqrtRegex, (match, degree, arg) => {
        const rep = `\\sqrt[${degree.trim()}]{${arg}}`;
        issues.push({
          type: 'invalid_sqrt',
          original: match,
          repaired: rep,
          description: `Bọc ngoặc nhọn cho căn bậc n trần: ${match} -> ${rep}`,
        });
        return rep;
      });
    }

    // 6. Căn bậc hai bị thiếu dấu đóng ngoặc nhọn trước ký tự kết thúc math hoặc toán tử: \sqrt{x + 1$ hoặc \sqrt{2x + 1 =
    const unclosedSqrtRegex = /\\sqrt\{([^{}$\n\r]+?)(?=(\$|\\\]|\\\)|[=><+*/\-\n\r]|$))/g;
    str = str.replace(unclosedSqrtRegex, (match, inner, lookahead) => {
      if (!inner.includes('}')) {
        const rep = `\\sqrt{${inner.trim()}}`;
        issues.push({
          type: 'unclosed_bracket',
          original: match,
          repaired: rep,
          description: `Bổ sung dấu đóng ngoặc nhọn } cho căn thức: ${match} -> ${rep}`,
        });
        return rep;
      }
      return match;
    });

    return { text: str, issues };
  }

  /**
   * Sửa lỗi cú pháp phân số (\frac, \dfrac)
   */
  static repairFractionSyntax(text: string): { text: string; issues: LatexValidationIssue[] } {
    let str = text;
    const issues: LatexValidationIssue[] = [];

    // 1. Phân số dùng ngoặc tròn: \frac(a)(b) hoặc \frac(a){b} hoặc \frac{a}(b)
    const parenFracRegex = /\\(frac|dfrac)\s*\(([^()]+)\)\s*\(([^()]+)\)/g;
    if (parenFracRegex.test(str)) {
      str = str.replace(parenFracRegex, (match, cmd, num, den) => {
        const rep = `\\${cmd}{${num.trim()}}{${den.trim()}}`;
        issues.push({
          type: 'invalid_fraction',
          original: match,
          repaired: rep,
          description: `Chuẩn hóa ngoặc tròn sang ngoặc nhọn cho phân số: ${match} -> ${rep}`,
        });
        return rep;
      });
    }

    const mixedFrac1 = /\\(frac|dfrac)\s*\{([^{}]+)\}\s*\(([^()]+)\)/g;
    if (mixedFrac1.test(str)) {
      str = str.replace(mixedFrac1, (match, cmd, num, den) => {
        const rep = `\\${cmd}{${num.trim()}}{${den.trim()}}`;
        issues.push({
          type: 'invalid_fraction',
          original: match,
          repaired: rep,
          description: `Sửa ngoặc mẫu số phân số: ${match} -> ${rep}`,
        });
        return rep;
      });
    }

    const mixedFrac2 = /\\(frac|dfrac)\s*\(([^()]+)\)\s*\{([^{}]+)\}/g;
    if (mixedFrac2.test(str)) {
      str = str.replace(mixedFrac2, (match, cmd, num, den) => {
        const rep = `\\${cmd}{${num.trim()}}{${den.trim()}}`;
        issues.push({
          type: 'invalid_fraction',
          original: match,
          repaired: rep,
          description: `Sửa ngoặc tử số phân số: ${match} -> ${rep}`,
        });
        return rep;
      });
    }

    // 2. Phân số trần không ngoặc: \frac 1 2 -> \frac{1}{2}
    const bareFracRegex = /\\(frac|dfrac)\s+([0-9a-zA-Z])\s+([0-9a-zA-Z])/g;
    if (bareFracRegex.test(str)) {
      str = str.replace(bareFracRegex, (match, cmd, num, den) => {
        const rep = `\\${cmd}{${num}}{${den}}`;
        issues.push({
          type: 'invalid_fraction',
          original: match,
          repaired: rep,
          description: `Thêm ngoặc nhọn cho phân số trần: ${match} -> ${rep}`,
        });
        return rep;
      });
    }

    // 3. Phân số bị thiếu đóng ngoặc mẫu số trước $: \frac{x+1}{x-1$ -> \frac{x+1}{x-1}$
    const unclosedFracDenom = /\\(frac|dfrac)\{([^{}]+)\}\{([^{}$\n\r]+?)(?=(\$|\\\]|\\\)|$))/g;
    str = str.replace(unclosedFracDenom, (match, cmd, num, den) => {
      if (!den.includes('}')) {
        const rep = `\\${cmd}{${num}}{${den.trim()}}`;
        issues.push({
          type: 'unclosed_bracket',
          original: match,
          repaired: rep,
          description: `Đóng ngoặc mẫu số phân số: ${match} -> ${rep}`,
        });
        return rep;
      }
      return match;
    });

    return { text: str, issues };
  }

  /**
   * Cân bằng và tự đóng các dấu ngoặc nhọn {}, môi trường \begin{}...\end{} và dấu $
   */
  static balanceBracketsAndEnvironments(text: string): { text: string; issues: LatexValidationIssue[] } {
    let str = text;
    const issues: LatexValidationIssue[] = [];

    // 1. Kiểm tra môi trường đa dòng (cases, pmatrix, bmatrix, aligned, matrix)
    const envs = ['cases', 'pmatrix', 'bmatrix', 'aligned', 'matrix', 'array'];
    for (const env of envs) {
      const beginRegex = new RegExp(`\\\\begin\\{${env}\\}`, 'g');
      const endRegex = new RegExp(`\\\\end\\{${env}\\}`, 'g');
      const beginCount = (str.match(beginRegex) || []).length;
      const endCount = (str.match(endRegex) || []).length;

      if (beginCount > endCount) {
        const diff = beginCount - endCount;
        for (let i = 0; i < diff; i++) {
          // Bổ sung \end{env} trước dấu $ đóng gần nhất hoặc cuối chuỗi
          if (str.includes('$')) {
            str = str.replace(/(\$\$?)(?![\s\S]*\$\$?)/, ` \\end{${env}} $1`);
          } else {
            str += ` \\end{${env}}`;
          }
        }
        issues.push({
          type: 'unclosed_environment',
          original: `\\begin{${env}}`,
          repaired: `\\end{${env}}`,
          description: `Bổ sung ${diff} thẻ đóng \\end{${env}} bị thiếu`,
        });
      }
    }

    // 2. Cân bằng dấu ngoặc nhọn bên trong từng khối công thức toán $...$ hoặc $$...$$
    str = str.replace(/\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g, (fullMatch, displayMath, inlineMath) => {
      const isDisplay = typeof displayMath === 'string';
      const mathInner = isDisplay ? displayMath : inlineMath;
      let repairedInner = mathInner;

      // Đếm số lượng dấu ngoặc nhọn không escape
      let openBraces = 0;
      let closeBraces = 0;
      for (let i = 0; i < repairedInner.length; i++) {
        const char = repairedInner[i];
        const prev = i > 0 ? repairedInner[i - 1] : '';
        if (prev !== '\\') {
          if (char === '{') openBraces++;
          else if (char === '}') closeBraces++;
        }
      }

      if (openBraces > closeBraces) {
        const missing = openBraces - closeBraces;
        repairedInner += '}'.repeat(missing);
        issues.push({
          type: 'unclosed_bracket',
          original: fullMatch,
          repaired: (isDisplay ? `$$${repairedInner}$$` : `$${repairedInner}$`),
          description: `Bổ sung ${missing} dấu đóng ngoặc nhọn '}' cho khối toán`,
        });
      } else if (closeBraces > openBraces) {
        // Thừa dấu đóng ngoặc: loại bỏ bớt dấu } thừa ở cuối
        let diff = closeBraces - openBraces;
        while (diff > 0 && repairedInner.endsWith('}')) {
          repairedInner = repairedInner.slice(0, -1).trimEnd();
          diff--;
        }
      }

      return isDisplay ? `$$${repairedInner}$$` : `$${repairedInner}$`;
    });

    // 3. Sửa dấu $ lẻ/đơn độc không có cặp trong văn bản
    const dollarMatches = str.match(/\$/g);
    if (dollarMatches && dollarMatches.length % 2 !== 0) {
      // Có số lẻ dấu $, tìm dấu $ cuối cùng
      const lastDollarIdx = str.lastIndexOf('$');
      // Nếu dấu $ lẻ ở cuối một biểu thức toán, bổ sung $ đóng vào cuối câu/dòng
      const sub = str.substring(lastDollarIdx);
      if (/[0-9a-zA-Z\-_=+\\^]/.test(sub)) {
        str += '$';
        issues.push({
          type: 'unclosed_dollar',
          original: sub,
          repaired: sub + '$',
          description: 'Bổ sung dấu đóng $ bị thiếu cho biểu thức toán học',
        });
      } else {
        // Dấu $ mồ côi không có nội dung toán, xóa bỏ
        str = str.substring(0, lastDollarIdx) + str.substring(lastDollarIdx + 1);
        issues.push({
          type: 'unclosed_dollar',
          original: '$',
          repaired: '',
          description: 'Xóa dấu $ lẻ đơn độc không có cặp',
        });
      }
    }

    return { text: str, issues };
  }

  /**
   * Chuẩn hóa và kiểm tra sâu một chuỗi văn bản toán học bất kỳ
   */
  static validateAndRepairString(text: string): LatexValidationResult {
    if (!text || typeof text !== 'string') {
      return { repairedText: text || '', isValid: true, issues: [] };
    }

    const allIssues: LatexValidationIssue[] = [];
    let current = text;

    // 1. Phục hồi các ký tự điều khiển ASCII và TeX accents
    current = sanitizeLatexControlChars(current);

    // 2. Sửa lỗi căn bậc hai (\sqrt)
    const sqrtRes = this.repairSqrtSyntax(current);
    current = sqrtRes.text;
    allIssues.push(...sqrtRes.issues);

    // 3. Sửa lỗi phân số (\frac, \dfrac)
    const fracRes = this.repairFractionSyntax(current);
    current = fracRes.text;
    allIssues.push(...fracRes.issues);

    // 4. Cân bằng ngoặc và môi trường đa dòng
    const bracketRes = this.balanceBracketsAndEnvironments(current);
    current = bracketRes.text;
    allIssues.push(...bracketRes.issues);

    // 5. Chuẩn hóa góc, độ, vectơ, tập hợp và tự động bọc toán
    current = autoWrapUnwrappedLatex(current);

    // 6. Kiểm tra tính hợp lệ cú pháp bằng KaTeX parser cho từng khối math
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g;
    let match: RegExpExecArray | null;

    while ((match = mathRegex.exec(current)) !== null) {
      const fullMath = match[0];
      const isDisplay = fullMath.startsWith('$$');
      const mathStr = isDisplay ? fullMath.slice(2, -2).trim() : fullMath.slice(1, -1).trim();

      if (mathStr) {
        try {
          // KaTeX validation test
          katex.renderToString(mathStr, {
            displayMode: isDisplay,
            throwOnError: true,
          });
        } catch (err: any) {
          // Thử tự động chữa lành khối công thức KaTeX bị lỗi
          let healedMath = mathStr;

          // Chữa lành lỗi thiếu ngoặc nhọn
          if (err.message && err.message.includes('Expected \'}\'')) {
            healedMath += '}';
          }

          // Chữa lành dấu % chưa escape
          healedMath = healedMath.replace(/(?<!\\)%/g, '\\%');

          // Chữa lành dấu & bên ngoài môi trường bảng
          if (!/\\begin\{(cases|aligned|array|matrix|pmatrix|bmatrix)\}/.test(healedMath)) {
            healedMath = healedMath.replace(/&/g, ' ');
          }

          try {
            katex.renderToString(healedMath, {
              displayMode: isDisplay,
              throwOnError: true,
            });

            // Nếu sửa thành công, thay thế vào văn bản
            const newBlock = isDisplay ? `$$${healedMath}$$` : `$${healedMath}$`;
            current = current.replace(fullMath, newBlock);
            allIssues.push({
              type: 'other',
              original: fullMath,
              repaired: newBlock,
              description: `Tự động sửa lỗi cú pháp KaTeX: ${err.message}`,
            });
          } catch {
            // KaTeX vẫn không parse được -> bọc an toàn để không sập giao diện
            allIssues.push({
              type: 'other',
              original: fullMath,
              repaired: fullMath,
              description: `Cảnh báo KaTeX: ${err.message}`,
            });
          }
        }
      }
    }

    return {
      repairedText: current,
      isValid: allIssues.length === 0,
      issues: allIssues,
    };
  }

  /**
   * Kiểm tra và làm sạch toàn bộ câu hỏi (nội dung, phương án, lời giải, rubric)
   */
  static validateAndRepairQuestion(q: Question): Question {
    const contentRes = this.validateAndRepairString(q.content || '');

    const options = q.options?.map((opt) => ({
      ...opt,
      content: this.validateAndRepairString(opt.content || '').repairedText,
    }));

    const trueFalseStatements = q.trueFalseStatements?.map((tf) => ({
      ...tf,
      content: this.validateAndRepairString(tf.content || '').repairedText,
    }));

    const shortAnswerRes = q.shortAnswer
      ? this.validateAndRepairString(q.shortAnswer).repairedText
      : q.shortAnswer;

    const essayAnswerGuideRes = q.essayAnswerGuide
      ? this.validateAndRepairString(q.essayAnswerGuide).repairedText
      : q.essayAnswerGuide;

    const rubricRes = q.rubric?.map((r) => ({
      ...r,
      criteria: this.validateAndRepairString(r.criteria || '').repairedText,
      description: this.validateAndRepairString(r.description || '').repairedText,
    }));

    const explanationRes = q.explanation
      ? this.validateAndRepairString(q.explanation).repairedText
      : q.explanation;

    return {
      ...q,
      content: contentRes.repairedText,
      options: options || q.options,
      trueFalseStatements: trueFalseStatements || q.trueFalseStatements,
      shortAnswer: shortAnswerRes,
      essayAnswerGuide: essayAnswerGuideRes,
      rubric: rubricRes || q.rubric,
      explanation: explanationRes,
    };
  }

  /**
   * Rà soát và tự động sửa toàn bộ gói đề thi (ExamPackage) trước khi lưu trữ
   */
  static validateAndRepairExamPackage(pkg: ExamPackage): {
    repairedPackage: ExamPackage;
    totalIssuesFixed: number;
  } {
    let totalIssuesFixed = 0;

    // 1. Rà soát danh sách câu hỏi trong tất cả các mã đề thi
    const repairedExams = (pkg.exams || []).map((exam) => {
      const repairedQuestions = (exam.questions || []).map((q) => {
        const check = this.validateAndRepairString(q.content || '');
        totalIssuesFixed += check.issues.length;
        return this.validateAndRepairQuestion(q);
      });

      return {
        ...exam,
        questions: repairedQuestions,
      };
    });

    // 2. Rà soát bảng đặc tả (specification)
    const repairedSpecification: SpecRow[] = (pkg.specification || []).map((spec) => {
      const reqRes = this.validateAndRepairString(spec.requirements || '');
      totalIssuesFixed += reqRes.issues.length;

      let repairedCellTexts = spec.cellTexts;
      if (spec.cellTexts) {
        repairedCellTexts = {};
        for (const [key, val] of Object.entries(spec.cellTexts)) {
          if (val) {
            const vRes = this.validateAndRepairString(val);
            repairedCellTexts[key] = vRes.repairedText;
            totalIssuesFixed += vRes.issues.length;
          }
        }
      }

      return {
        ...spec,
        requirements: reqRes.repairedText,
        cellTexts: repairedCellTexts,
      };
    });

    // 3. Rà soát ma trận (matrix)
    const repairedMatrix: MatrixRow[] = (pkg.matrix || []).map((row) => {
      let repairedCellTexts = row.cellTexts;
      if (row.cellTexts) {
        repairedCellTexts = {};
        for (const [key, val] of Object.entries(row.cellTexts)) {
          if (val) {
            const vRes = this.validateAndRepairString(val);
            repairedCellTexts[key] = vRes.repairedText;
            totalIssuesFixed += vRes.issues.length;
          }
        }
      }

      return {
        ...row,
        cellTexts: repairedCellTexts,
      };
    });

    return {
      repairedPackage: {
        ...pkg,
        exams: repairedExams,
        specification: repairedSpecification,
        matrix: repairedMatrix,
      },
      totalIssuesFixed,
    };
  }
}
