/**
 * Chuẩn hóa xuống dòng và sửa triệt để lỗi ký hiệu \n trong lời giải chi tiết và nội dung câu hỏi
 * Chuyển triệt để các ký tự escape literal "\n", "\\n", "\\\n", "\\\\n", "\r\n", "\\r\\n" thành dấu ngắt dòng thực sự '\n',
 * ngoại trừ khi \n là phần đầu của lệnh LaTeX hợp lệ (như \nabla, \natural, \ne, \neg, \neq, \ni, \not, \notin, \nu, \newline,...)
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

