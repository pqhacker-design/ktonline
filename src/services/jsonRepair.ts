/**
 * Bộ công cụ chẩn đoán & tự động sửa chữa chuỗi JSON trả về từ AI Gemini
 * Tự chủ 100%, chống mọi lỗi escape LaTeX, ký tự điều khiển, ngắt dòng và ngoặc nhọn.
 */

// Danh sách các lệnh LaTeX phổ biến thường bắt đầu bằng các chữ cái escape của JSON (b, f, n, r, t, u)
const LATEX_COMMAND_STARTS_WITH_ESCAPE_CHAR = /^(?:frac|dfrac|cfrac|text|textbf|textit|textrm|texttt|times|theta|tau|to|tan|cot|cos|sec|csc|bar|beta|begin|bold|bullet|right|rho|rangle|rfloor|rceil|ne|neq|nabla|notin|ni|nu|underline|uparrow|Uparrow|union|upsilon|Upsilon|underbrace|overbrace|overline)\b/i;

/**
 * Chuẩn hóa và làm sạch chuỗi JSON thô từ AI
 */
export function repairJsonString(rawText: string): string {
  if (!rawText || !rawText.trim()) return '';

  let str = rawText.trim();

  // 1. Loại bỏ Markdown code block wrappers ```json ... ``` hoặc ``` ... ```
  str = str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // 2. Tìm vị trí khối JSON chính (chứa dấu { hoặc [ đầu tiên đến } hoặc ] cuối cùng)
  const firstBrace = str.indexOf('{');
  const firstBracket = str.indexOf('[');
  let startIdx = -1;

  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  const lastBrace = str.lastIndexOf('}');
  const lastBracket = str.lastIndexOf(']');
  let endIdx = -1;
  if (lastBrace !== -1 && lastBracket !== -1) {
    endIdx = Math.max(lastBrace, lastBracket);
  } else if (lastBrace !== -1) {
    endIdx = lastBrace;
  } else if (lastBracket !== -1) {
    endIdx = lastBracket;
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    str = str.substring(startIdx, endIdx + 1);
  }

  // Thử parse nhanh
  try {
    JSON.parse(str);
    return str;
  } catch {
    // Tiếp tục tiến trình sửa chữa chi tiết
  }

  // 3. State-Machine Lexer để xử lý escape LaTeX và chuỗi string an toàn
  let result = '';
  let inString = false;
  let len = str.length;
  let i = 0;

  while (i < len) {
    const char = str[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
        result += '"';
        i++;
      } else if (char === '“' || char === '”') {
        inString = true;
        result += '"';
        i++;
      } else {
        result += char;
        i++;
      }
    } else {
      // Đang ở bên trong chuỗi string literal
      if (char === '"') {
        // Kiểm tra xem đây là dấu đóng string hay là dấu ngoặc kép chưa escape bên trong nội dung câu hỏi
        // Dấu đóng string hợp lệ thường theo sau bởi khoảng trắng và các ký tự: , } ] :
        const remaining = str.substring(i + 1).trimStart();
        const nextChar = remaining[0];
        const isClosingQuote =
          !nextChar ||
          nextChar === ',' ||
          nextChar === '}' ||
          nextChar === ']' ||
          nextChar === ':';

        if (isClosingQuote) {
          inString = false;
          result += '"';
          i++;
        } else {
          // Là dấu ngoặc kép lồng bên trong câu hỏi -> escape thành \"
          result += '\\"';
          i++;
        }
      } else if (char === '\\') {
        // Kiểm tra chuỗi theo sau dấu backslash
        const nextChar = str[i + 1];
        if (!nextChar) {
          // Backslash ở cuối cùng
          result += '\\\\';
          i++;
          continue;
        }

        // Nếu đã là dấu gạch chéo kép \\
        if (nextChar === '\\') {
          result += '\\\\';
          i += 2;
          continue;
        }

        // Nếu là escape dấu ngoặc kép \"
        if (nextChar === '"') {
          result += '\\"';
          i += 2;
          continue;
        }

        // Nếu là escape dấu gạch chéo \/
        if (nextChar === '/') {
          result += '\\/';
          i += 2;
          continue;
        }

        // Kiểm tra unicode escape \uXXXX
        if (nextChar === 'u' || nextChar === 'U') {
          const hexPart = str.substring(i + 2, i + 6);
          if (/^[0-9a-fA-F]{4}$/.test(hexPart)) {
            result += '\\u' + hexPart;
            i += 6;
            continue;
          }
        }

        // Kiểm tra xem đây có phải là lệnh LaTeX (như \frac, \text, \times, \begin...) hay escape hợp lệ (như \n)
        const subAfterSlash = str.substring(i + 1);
        if (LATEX_COMMAND_STARTS_WITH_ESCAPE_CHAR.test(subAfterSlash)) {
          // Đây là lệnh LaTeX bắt đầu bằng chữ cái như \frac, \text -> escape thành \\frac, \\text
          result += '\\\\';
          i++;
          continue;
        }

        // Nếu là các ký tự escape chuẩn của JSON: \b, \f, \n, \r, \t
        if (['b', 'f', 'n', 'r', 't'].includes(nextChar)) {
          // Giữ nguyên escape
          result += '\\' + nextChar;
          i += 2;
          continue;
        }

        // Tất cả các trường hợp backslash còn lại (ví dụ \sqrt, \alpha, \Delta, \(, \), \circ, \pm...)
        // -> Bắt buộc escape thành \\
        result += '\\\\';
        i++;
      } else if (char === '\n') {
        result += '\\n';
        i++;
      } else if (char === '\r') {
        // Bỏ qua \r hoặc thay bằng \\r
        i++;
      } else if (char === '\t') {
        result += ' ';
        i++;
      } else {
        result += char;
        i++;
      }
    }
  }

  // 4. Xóa các trailing commas trước } hoặc ]
  result = result.replace(/,\s*([}\]])/g, '$1');

  // 5. Thêm dấu đóng nếu chuỗi bị cắt cụt (truncated)
  let openBraces = 0;
  let openBrackets = 0;
  let checkInString = false;
  let isEsc = false;

  for (let k = 0; k < result.length; k++) {
    const c = result[k];
    if (c === '"' && !isEsc) {
      checkInString = !checkInString;
    } else if (!checkInString) {
      if (c === '{') openBraces++;
      if (c === '}') openBraces = Math.max(0, openBraces - 1);
      if (c === '[') openBrackets++;
      if (c === ']') openBrackets = Math.max(0, openBrackets - 1);
    }
    if (c === '\\' && !isEsc) {
      isEsc = true;
    } else {
      isEsc = false;
    }
  }

  if (checkInString) {
    result += '"';
  }
  while (openBrackets > 0) {
    result += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    result += '}';
    openBraces--;
  }

  return result;
}

/**
 * Trích xuất từng phần dữ liệu dự phòng nếu JSON tổng thể bị lỗi cú pháp nặng
 */
function extractFallbackExamData(rawText: string): any {
  const result: any = { matrix: [], specification: [], questions: [] };

  try {
    // 1. Trích xuất questions array
    const questionsMatch = rawText.match(/"questions"\s*:\s*(\[[\s\S]*?\])(?=\s*,\s*"(?:matrix|specification)"|\s*\}|$)/);
    if (questionsMatch && questionsMatch[1]) {
      const qClean = repairJsonString(questionsMatch[1]);
      try {
        result.questions = JSON.parse(qClean);
      } catch {
        // Trích xuất từng object câu hỏi riêng biệt
        const questionObjects = questionsMatch[1].match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
        result.questions = questionObjects
          .map((qo) => {
            try {
              return JSON.parse(repairJsonString(qo));
            } catch {
              return null;
            }
          })
          .filter(Boolean);
      }
    }

    // 2. Trích xuất matrix array
    const matrixMatch = rawText.match(/"matrix"\s*:\s*(\[[\s\S]*?\])(?=\s*,\s*"(?:specification|questions)"|\s*\}|$)/);
    if (matrixMatch && matrixMatch[1]) {
      try {
        result.matrix = JSON.parse(repairJsonString(matrixMatch[1]));
      } catch {
        // ignore
      }
    }

    // 3. Trích xuất specification array
    const specMatch = rawText.match(/"specification"\s*:\s*(\[[\s\S]*?\])(?=\s*,\s*"(?:matrix|questions)"|\s*\}|$)/);
    if (specMatch && specMatch[1]) {
      try {
        result.specification = JSON.parse(repairJsonString(specMatch[1]));
      } catch {
        // ignore
      }
    }

    if (Array.isArray(result.questions) && result.questions.length > 0) {
      return result;
    }
  } catch (err) {
    console.warn('Lỗi trích xuất dự phòng JSON:', err);
  }

  return null;
}

/**
 * An toàn parse JSON với cơ chế tự sửa chữa đa cấp
 */
export function safeJsonParse<T = any>(rawText: string): T {
  if (!rawText || !rawText.trim()) throw new Error('Dữ liệu JSON phản hồi rỗng.');

  // Pass 1: Parse trực tiếp nếu chuỗi đã là JSON chuẩn
  try {
    return JSON.parse(rawText.trim());
  } catch {
    // Tiếp tục Pass 2
  }

  // Pass 2: Sử dụng State-Machine Repair Engine
  const repaired = repairJsonString(rawText);
  try {
    return JSON.parse(repaired);
  } catch (err: any) {
    // Pass 3: Sửa triệt để các dấu gạch chéo LaTeX còn sót
    try {
      const aggressive = repaired
        .replace(/\\([a-zA-Z])/g, '\\\\$1')
        .replace(/\\\\\\\\/g, '\\\\');
      return JSON.parse(aggressive);
    } catch {
      // Pass 4: Trích xuất từng phần dữ liệu (Block Extraction)
      const fallback = extractFallbackExamData(rawText);
      if (fallback && Array.isArray(fallback.questions) && fallback.questions.length > 0) {
        return fallback as T;
      }

      throw new Error(`Dữ liệu AI trả về không phải định dạng JSON hợp lệ: ${err.message}`);
    }
  }
}
