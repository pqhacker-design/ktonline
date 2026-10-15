/**
 * Chuẩn hóa xuống dòng và sửa triệt để lỗi ký hiệu \n trong lời giải chi tiết và nội dung câu hỏi
 * Chuyển các ký tự escape literal "\n", "\\n", "\r\n" thành dấu ngắt dòng thực sự '\n',
 * ngoại trừ khi \n là phần đầu của lệnh LaTeX hợp lệ (như \nabla, \natural, \ne, \neg, \neq, \ni, \not, \notin, \nu, \newline,...)
 */
export function normalizeNewlines(text: string): string {
  if (!text) return text;
  return text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\n(?!(?:abla|atural|eq?|eg|ewcommand|ewenvironment|ewline|i|ormalsize|ot(?:in)?|u|exists|Leftarrow|Leftrightarrow|Rightarrow|subseteq|supseteq|mid|parallel)\b)/g, '\n');
}
