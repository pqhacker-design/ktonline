/**
 * Chuẩn hóa xuống dòng và sửa triệt để lỗi ký hiệu \n, \\, \ trong lời giải chi tiết và nội dung câu hỏi
 * 1. Chuyển triệt để các ký tự escape literal "\n", "\\n", "\\\n", "\\\\n", "\r\n", "\\r\\n" thành dấu ngắt dòng thực sự '\n',
 *    ngoại trừ khi \n là phần đầu của lệnh LaTeX hợp lệ.
 * 2. Chuyển đổi các dấu xuống dòng kiểu LaTeX '\\' hoặc '\\\\' ở ngoài công thức toán học thành '\n'.
 *    Đặc biệt xử lý các trường hợp AI dùng '\\' trước các ý con như '\\1)', '\\2)', '\\a)', '\\b)' hoặc trước văn bản tiếng Việt '\\Diện tích', '\\Chiều rộng'.
 * 3. Loại bỏ triệt để các dấu gạch chéo ngược '\' thừa bị dính vào đầu từ tiếng Việt (như '\Diện tích', '\Chiều rộng', '\Tính', '\Một') hoặc trước các số '\1)'.
 */
export function normalizeNewlines(text: string): string {
  if (!text) return text;
  let str = text;

  // 1. Chuyển các biến thể escape của carriage return + newline
  str = str.replace(/\\+r\\+n/g, '\n');
  str = str.replace(/\\+r/g, '\n');

  // 2. Chuyển tất cả biến thể chuỗi thoát \n (1 hay nhiều dấu backslash \ trước n) thành ký tự ngắt dòng '\n'
  // Bảo lưu các lệnh LaTeX hợp lệ bắt đầu bằng \n
  str = str.replace(
    /\\+n(?!(?:abla|atural|eq?|eg|ewcommand|ewenvironment|ewline|i|ormalsize|ot(?:in)?|u|exists|Leftarrow|Leftrightarrow|Rightarrow|subseteq|supseteq|mid|parallel)\b)/g,
    '\n'
  );

  // 3. Xử lý các dấu gạch chéo ngược '\', '\\', '\\\\', '.\ \', '.\ \' ngoài khối công thức toán
  // Tách text theo các khối toán ($...$, $$...$$, hoặc môi trường \begin{cases}...\end{cases})
  const mathBlockRegex = /(\$\$[\s\S]*?\$\$|\$[^\$]+?\$|\\begin\{(?:cases|aligned|array|matrix|pmatrix|bmatrix)\}[\s\S]*?\\end\{(?:cases|aligned|array|matrix|pmatrix|bmatrix)\})/g;

  const parts = str.split(mathBlockRegex);
  for (let i = 0; i < parts.length; i += 2) {
    if (!parts[i]) continue;
    let plain = parts[i];

    // Khắc phục lỗi AI dùng LaTeX \Chi hoặc \chi trước "ều rộng" -> Chiều rộng
    plain = plain.replace(/\\Chi\s*ều\b/gi, 'Chiều');
    plain = plain.replace(/\\chi\s*ều\b/gi, 'chiều');
    plain = plain.replace(/X\s*ều\b/g, 'Chiều');

    // Khắc phục lỗi AI dùng \Di ện hoặc \di ện -> Diện / diện
    plain = plain.replace(/\\Di\s*ện\b/gi, 'Diện');
    plain = plain.replace(/\\di\s*ện\b/gi, 'diện');

    // Chuyển ".\ \" hoặc ".\ \\" hoặc ".\ \" thành ".\n"
    plain = plain.replace(/\.[ \t]*\\[ \t]*\\*[ \t]*/g, '.\n');
    plain = plain.replace(/([?!:;])\s*\\+\s*(?=[A-Za-z0-9àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ])/g, '$1\n');

    // Chuyển '\\' trước số thứ tự ý con: \\1), \\2), \\a), \\b), \\c), \\d)... thành \n1), \n2), \na)...
    plain = plain.replace(/\\+([0-9]+[.)])/g, '\n$1');
    plain = plain.replace(/\\+([a-zA-Z][.)])/g, '\n$1');
    plain = plain.replace(/\\+([-*•])/g, '\n$1');

    // Chuyển các dấu '\\' còn lại trong plain text thành '\n'
    plain = plain.replace(/\\\\+/g, '\n');

    // Loại bỏ dấu '\' thừa dính trước từ tiếng Việt (ví dụ: \Diện tích -> Diện tích, \Chiều rộng -> Chiều rộng, \Tính -> Tính)
    plain = plain.replace(/\\([A-Za-z]*[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ][A-Za-zàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]*)/g, '$1');

    // Dọn dẹp dấu '\' đơn độc trước từ viết hoa: ".\ Diện tích" -> ".\nDiện tích"
    plain = plain.replace(/([.?!])\s*\\\s*([A-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ])/g, '$1\n$2');
    plain = plain.replace(/(^|\n)\s*\\\s*/g, '$1');
    plain = plain.replace(/\s*\\\s*$/g, '');

    parts[i] = plain;
  }

  str = parts.join('');

  // 4. Chuẩn hóa không để quá 2 dấu xuống dòng liên tiếp
  str = str.replace(/\n{3,}/g, '\n\n');

  return str;
}

/**
 * Làm sạch và chuẩn hóa công thức bên trong khối KaTeX ($...$ hoặc $$...$$)
 * Thay thế triệt để các ký tự \n hoặc \\n vô tình lọt vào trong công thức toán học
 * giúp KaTeX không bao giờ hiển thị lỗi ký hiệu \n màu đỏ trên giao diện
 */
export function cleanMathNewlines(mathStr: string): string {
  if (!mathStr) return '';
  let s = mathStr.trim();

  const isMultiLineEnv = /\\begin\{(cases|aligned|array|matrix|pmatrix|bmatrix)\}/.test(s);
  if (isMultiLineEnv) {
    // Trong môi trường nhiều dòng (như hệ phương trình cases, ma trận), chuyển \n thành ngắt dòng LaTeX '\\'
    s = s.replace(/\\+n(?!(?:abla|atural|eq?|eg|ewcommand|ewenvironment|ewline|i|ormalsize|ot(?:in)?|u|exists|Leftarrow|Leftrightarrow|Rightarrow|subseteq|supseteq|mid|parallel)\b)/g, ' \\\\ ');
    s = s.replace(/[\r\n]+/g, ' \\\\ ');
  } else {
    // Trong công thức dòng đơn thông thường, thay \n thành khoảng trắng để KaTeX hiển thị liền mạch
    s = s.replace(/\\+n(?!(?:abla|atural|eq?|eg|ewcommand|ewenvironment|ewline|i|ormalsize|ot(?:in)?|u|exists|Leftarrow|Leftrightarrow|Rightarrow|subseteq|supseteq|mid|parallel)\b)/g, ' ');
    s = s.replace(/[\r\n]+/g, ' ');
  }

  // Dọn dẹp khoảng trắng kép
  s = s.replace(/[ \t]{2,}/g, ' ');
  return s;
}

