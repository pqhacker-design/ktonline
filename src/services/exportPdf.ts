import { ExamPackage, getCognitiveTag } from '../types';
import { autoWrapUnwrappedLatex, cleanLatexForDocx } from './exportDocx';
import { OFFICIAL_MATRIX_FOOTNOTES, OFFICIAL_SPEC_FOOTNOTES } from './officialTemplateData';

export class ExportPdf {
  /**
   * Tạo cửa sổ in / PDF cho Đề thi hoặc Gói Đề thi hoàn chỉnh
   */
  static printExamPackage(examPack: ExamPackage, selectedCode?: string): void {
    const { metadata, matrix, specification, exams, answerKeys } = examPack;

    const filteredExams = selectedCode
      ? exams.filter((e) => e.code === selectedCode)
      : exams;

    let htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Đề kiểm tra Công văn 7991 - ${metadata.subject}</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/mhchem.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
      <style>
        @page {
          size: A4;
          margin: 1.5cm;
        }
        body {
          font-family: "Times New Roman", Times, serif;
          font-size: 13pt;
          line-height: 1.4;
          color: #000;
          background: #fff;
          margin: 0;
          padding: 0;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .header-table td {
          vertical-align: top;
          padding: 2px;
        }
        .title-main {
          text-align: center;
          font-weight: bold;
          font-size: 15pt;
          margin-top: 10px;
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        .subtitle {
          text-align: center;
          font-style: italic;
          font-size: 11pt;
          margin-bottom: 15px;
        }
        .section-title {
          font-weight: bold;
          font-size: 12pt;
          margin-top: 15px;
          margin-bottom: 8px;
          color: #000;
          text-transform: uppercase;
        }
        .question-box {
          margin-bottom: 12px;
        }
        .question-num {
          font-weight: bold;
        }
        .options-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px 15px;
          margin-left: 20px;
          margin-top: 4px;
        }
        .statement-list {
          margin-left: 20px;
          margin-top: 4px;
        }
        table.border-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          margin-bottom: 15px;
        }
        table.border-table th, table.border-table td {
          border: 1px solid #000;
          padding: 6px 8px;
          text-align: left;
          font-size: 11pt;
        }
        table.border-table th {
          background-color: #f0f0f0;
          text-align: center;
          font-weight: bold;
        }
        .code-badge {
          float: right;
          border: 2px solid #000;
          padding: 4px 10px;
          font-weight: bold;
          font-size: 14pt;
        }
        .page-break {
          page-break-after: always;
          break-after: page;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="padding: 10px; background: #008080; color: white; text-align: center; font-family: sans-serif;">
        <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; font-weight: bold; cursor: pointer; background: #fff; color: #008080; border: none; border-radius: 4px;">
          🖨️ Nhấn vào đây để In / Tải PDF
        </button>
      </div>
    `;

    // 1. IN ĐỀ KIỂM TRA
    filteredExams.forEach((exam, idx) => {
      htmlContent += `
        <div class="exam-paper ${idx < filteredExams.length - 1 ? 'page-break' : ''}">
          <table class="header-table">
            <tr>
              <td style="width: 50%; text-align: center;">
                <b>${metadata.departmentName.toUpperCase()}</b><br>
                <b>${metadata.schoolName.toUpperCase()}</b>
              </td>
              <td style="width: 50%; text-align: center;">
                <b>KỲ THI ${metadata.examTitle.toUpperCase()}</b><br>
                <b>NĂM HỌC ${metadata.schoolYear}</b>
              </td>
            </tr>
          </table>

          <div class="code-badge">MÃ ĐỀ: ${exam.code}</div>
          <div style="clear: both;"></div>

          <div class="title-main">ĐỀ KIỂM TRA MÔN: ${metadata.subject.toUpperCase()} - LỚP ${metadata.grade}</div>
          ${metadata.chapterTitle ? `<div style="text-align: center; font-weight: bold; font-size: 11pt; margin-top: 3px;">Nội dung / Chương: ${metadata.chapterTitle}</div>` : ''}
          ${metadata.topicsList && metadata.topicsList.length > 1 ? `<div style="text-align: center; font-style: italic; font-size: 9.5pt; color: #374151; margin-top: 2px;">Các bài kiểm tra: ${metadata.topicsList.join(' • ')}</div>` : ''}
          <div class="subtitle">(Thời gian làm bài: ${metadata.durationMinutes} phút | Thang điểm: ${metadata.totalPoints} điểm)</div>

          <div style="border-top: 1px solid #000; margin-bottom: 15px;"></div>
      `;

      let currentPartTitle = '';

      exam.questions.forEach((q) => {
        if (q.partTitle !== currentPartTitle) {
          currentPartTitle = q.partTitle;
          htmlContent += `<div class="section-title">${currentPartTitle}</div>`;
        }

        const tag = getCognitiveTag(q.cognitiveLevel, q.partType);
        htmlContent += `
          <div class="question-box">
            <span class="question-num">Câu ${q.number} ${tag ? `<span style="color:#d97706; font-size: 11pt;">${tag}</span>` : ''}:</span> ${autoWrapUnwrappedLatex(q.content)}
        `;

        if (q.partType === 'PART1' && q.options) {
          htmlContent += `<div class="options-grid">`;
          q.options.forEach((opt) => {
            htmlContent += `<div><b>${opt.key}.</b> ${autoWrapUnwrappedLatex(opt.content)}</div>`;
          });
          htmlContent += `</div>`;
        } else if (q.partType === 'PART2' && q.trueFalseStatements) {
          htmlContent += `<div class="statement-list">`;
          q.trueFalseStatements.forEach((tf) => {
            htmlContent += `<div><b>${tf.key})</b> ${autoWrapUnwrappedLatex(tf.content)}</div>`;
          });
          htmlContent += `</div>`;
        }

        htmlContent += `</div>`;
      });

      htmlContent += `
          <div style="text-align: center; margin-top: 30px; font-style: italic;">
            --- HẾT MÃ ĐỀ ${exam.code} ---
          </div>
        </div>
      `;
    });

    // Render KaTeX khi load xong và kích hoạt Lệnh In
    htmlContent += `
      <script>
        function triggerPrint() {
          if (typeof renderMathInElement === 'function') {
            renderMathInElement(document.body, {
              delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false}
              ]
            });
          }
          setTimeout(function() {
            window.focus();
            window.print();
          }, 300);
        }
        if (document.readyState === "complete" || document.readyState === "interactive") {
          triggerPrint();
        } else {
          document.addEventListener("DOMContentLoaded", triggerPrint);
        }
      </script>
    </body>
    </html>
    `;

    let printWindow: Window | null = null;
    try {
      printWindow = window.open('', '_blank');
    } catch (e) {
      printWindow = null;
    }

    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      // Fallback cho iFrame sandbox trong AI Studio / Preview
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setTimeout(() => {
          try {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          } catch (e) {}
        }, 5000);
      }
    }
  }

  /**
   * In / Tải PDF riêng phần Đáp Án VÀ HƯỚNG DẪN CHẤM
   */
  static printAnswerKeys(examPack: ExamPackage, selectedCode?: string): void {
    const { metadata, answerKeys } = examPack;

    const filteredAK = selectedCode
      ? answerKeys.filter((ak) => ak.code === selectedCode)
      : answerKeys;

    let htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM - ${metadata.subject}</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/mhchem.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
      <style>
        @page { size: A4; margin: 1.5cm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.4; color: #000; background: #fff; margin: 0; padding: 0; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .header-table td { vertical-align: top; padding: 2px; }
        .title-main { text-align: center; font-weight: bold; font-size: 15pt; margin-top: 10px; margin-bottom: 15px; text-transform: uppercase; color: #008080; }
        .section-title { font-weight: bold; font-size: 12pt; margin-top: 15px; margin-bottom: 8px; color: #008080; text-transform: uppercase; }
        table.border-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 15px; }
        table.border-table th, table.border-table td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 11pt; }
        table.border-table th { background-color: #f0f0f0; font-weight: bold; }
        .essay-box { margin-bottom: 15px; border: 1px solid #ddd; padding: 12px; border-radius: 6px; background-color: #fcfcfc; }
        .essay-title { font-weight: bold; font-size: 12pt; color: #008080; margin-bottom: 6px; }
        .essay-guide { white-space: pre-wrap; font-size: 11.5pt; margin-bottom: 8px; line-height: 1.5; }
        .page-break { page-break-after: always; break-after: page; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="padding: 10px; background: #008080; color: white; text-align: center; font-family: sans-serif;">
        <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; font-weight: bold; cursor: pointer; background: #fff; color: #008080; border: none; border-radius: 4px;">
          🖨️ Nhấn vào đây để In / Tải PDF Đáp Án
        </button>
      </div>

    `;

    filteredAK.forEach((ak, idx) => {
      htmlContent += `
        <div class="ak-section ${idx < filteredAK.length - 1 ? 'page-break' : ''}">
            <table class="header-table">
              <tr>
                <td style="width: 50%; text-align: center;">
                  <b>${metadata.departmentName.toUpperCase()}</b><br>
                  <b>${metadata.schoolName.toUpperCase()}</b>
                </td>
                <td style="width: 50%; text-align: center;">
                  <b>KỲ THI ${metadata.examTitle.toUpperCase()}</b><br>
                  <b>NĂM HỌC ${metadata.schoolYear}</b>
                </td>
              </tr>
            </table>

            <div class="code-badge">MÃ ĐỀ: ${ak.code}</div>
            <div style="clear: both;"></div>

            <div class="title-main">ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM MÔN: ${metadata.subject.toUpperCase()} - LỚP ${metadata.grade}</div>
            ${metadata.chapterTitle ? `<div style="text-align: center; font-weight: bold; font-size: 11pt; margin-top: 3px;">Nội dung / Chương: ${metadata.chapterTitle}</div>` : ''}
            ${metadata.topicsList && metadata.topicsList.length > 1 ? `<div style="text-align: center; font-style: italic; font-size: 9.5pt; color: #374151; margin-top: 2px;">Các bài kiểm tra: ${metadata.topicsList.join(' • ')}</div>` : ''}
            <div class="subtitle">(Thang điểm tổng: ${metadata.totalPoints} điểm | Bám sát Công văn 7991/BGDĐT)</div>
            <div style="border-top: 1px solid #000; margin-bottom: 15px; margin-top: 10px;"></div>
        `;

      if (ak.part1Answers && ak.part1Answers.length > 0) {
        htmlContent += `
          <div class="section-title">1. Bảng đáp án Phần I (Trắc nghiệm nhiều lựa chọn):</div>
          <table class="border-table">
            <tr>
              ${ak.part1Answers.map((a) => `<th>C${a.questionNumber}</th>`).join('')}
            </tr>
            <tr>
              ${ak.part1Answers.map((a) => `<td><b>${a.correctOption}</b></td>`).join('')}
            </tr>
          </table>
        `;
      }

      if (ak.part2Answers && ak.part2Answers.length > 0) {
        htmlContent += `
          <div class="section-title">2. Đáp án Phần II (Trắc nghiệm Đúng/Sai):</div>
          <table class="border-table">
            <tr>
              <th>Câu</th><th>Ý a</th><th>Ý b</th><th>Ý c</th><th>Ý d</th>
            </tr>
            ${ak.part2Answers.map((a) => `
              <tr>
                <td><b>Câu ${a.questionNumber}</b></td>
                <td>${a.statements.find(s=>s.key==='a')?.isCorrect ? 'Đ' : 'S'}</td>
                <td>${a.statements.find(s=>s.key==='b')?.isCorrect ? 'Đ' : 'S'}</td>
                <td>${a.statements.find(s=>s.key==='c')?.isCorrect ? 'Đ' : 'S'}</td>
                <td>${a.statements.find(s=>s.key==='d')?.isCorrect ? 'Đ' : 'S'}</td>
              </tr>
            `).join('')}
          </table>
        `;
      }

      if (ak.part3Answers && ak.part3Answers.length > 0) {
        htmlContent += `
          <div class="section-title">3. Đáp án Phần III (Trả lời ngắn):</div>
          <table class="border-table">
            <tr>
              ${ak.part3Answers.map((a) => `<th>Câu ${a.questionNumber}</th>`).join('')}
            </tr>
            <tr>
              ${ak.part3Answers.map((a) => `<td><b>${autoWrapUnwrappedLatex(a.shortAnswer)}</b></td>`).join('')}
            </tr>
          </table>
        `;
      }

      if (ak.part4Answers && ak.part4Answers.length > 0) {
        htmlContent += `
          <div class="section-title">4. Hướng dẫn giải chi tiết & Rubric bài Tự luận:</div>
        `;

        ak.part4Answers.forEach((ans) => {
          htmlContent += `
            <div class="essay-box">
              <div class="essay-title">Câu ${ans.questionNumber} (${ans.points} điểm)</div>
              <div class="essay-guide"><b>Hướng dẫn giải:</b><br>${autoWrapUnwrappedLatex(ans.essayAnswerGuide)}</div>
          `;

          if (ans.rubric && ans.rubric.length > 0) {
            htmlContent += `
              <table class="border-table" style="margin-top: 6px;">
                <tr>
                  <th style="width: 25%;">Tiêu chí</th>
                  <th style="width: 15%;">Điểm</th>
                  <th style="text-align: left;">Mô tả yêu cầu</th>
                </tr>
                ${ans.rubric.map((r) => `
                  <tr>
                    <td style="text-align: left;"><b>${autoWrapUnwrappedLatex(r.criteria)}</b></td>
                    <td><b>${r.points}đ</b></td>
                    <td style="text-align: left;">${autoWrapUnwrappedLatex(r.description)}</td>
                  </tr>
                `).join('')}
              </table>
            `;
          }

          htmlContent += `</div>`;
        });
      }

      htmlContent += `</div>`;
    });

    // Render KaTeX khi load xong và kích hoạt Lệnh In
    htmlContent += `
      <script>
        function triggerPrint() {
          if (typeof renderMathInElement === 'function') {
            renderMathInElement(document.body, {
              delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false}
              ]
            });
          }
          setTimeout(function() {
            window.focus();
            window.print();
          }, 300);
        }
        if (document.readyState === "complete" || document.readyState === "interactive") {
          triggerPrint();
        } else {
          document.addEventListener("DOMContentLoaded", triggerPrint);
        }
      </script>
    </body>
    </html>
    `;

    let printWindow: Window | null = null;
    try {
      printWindow = window.open('', '_blank');
    } catch (e) {
      printWindow = null;
    }

    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setTimeout(() => {
          try {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          } catch (e) {}
        }, 5000);
      }
    }
  }

  /**
   * In / Tải PDF riêng Bảng Ma Trận Đề Kiểm Tra chuẩn mẫu Bộ GD&ĐT
   */
  static printMatrix(examPack: ExamPackage): void {
    const { metadata, matrix } = examPack;

    const getBiết = (part: any): number => (part && part.remember ? Number(part.remember) : 0);
    const getHiểu = (part: any): number => (part && part.understand ? Number(part.understand) : 0);
    const getVậnDụng = (part: any): number =>
      (part && part.apply ? Number(part.apply) : 0) + (part && part.advanced ? Number(part.advanced) : 0);

    let totalP1 = 0, totalP2 = 0, totalP3 = 0, totalP4 = 0;
    let totalBiết = 0, totalHiểu = 0, totalVậnDụng = 0;

    let rowsHtml = '';
    matrix.forEach((row) => {
      const p1B = getBiết(row.part1), p1H = getHiểu(row.part1), p1V = getVậnDụng(row.part1);
      const p2B = getBiết(row.part2), p2H = getHiểu(row.part2), p2V = getVậnDụng(row.part2);
      const p3B = getBiết(row.part3), p3H = getHiểu(row.part3), p3V = getVậnDụng(row.part3);
      const p4B = getBiết(row.part4), p4H = getHiểu(row.part4), p4V = getVậnDụng(row.part4);

      const rB = p1B + p2B + p3B + p4B;
      const rH = p1H + p2H + p3H + p4H;
      const rV = p1V + p2V + p3V + p4V;

      totalP1 += p1B + p1H + p1V;
      totalP2 += p2B + p2H + p2V;
      totalP3 += p3B + p3H + p3V;
      totalP4 += p4B + p4H + p4V;

      totalBiết += rB;
      totalHiểu += rH;
      totalVậnDụng += rV;

      const cell = (val?: string | number) => (val ? `<b>${val}</b>` : '-');

      rowsHtml += `
        <tr>
          <td style="text-align:center;"><b>${row.stt}</b></td>
          <td>${cleanLatexForDocx(row.topic)}</td>
          <td>${cleanLatexForDocx(row.subTopic)}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p1_rem || (p1B > 0 ? p1B : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p1_und || (p1H > 0 ? p1H : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p1_app || (p1V > 0 ? p1V : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p2_rem || (p2B > 0 ? p2B : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p2_und || (p2H > 0 ? p2H : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p2_app || (p2V > 0 ? p2V : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p3_rem || (p3B > 0 ? p3B : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p3_und || (p3H > 0 ? p3H : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p3_app || (p3V > 0 ? p3V : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p4_rem || (p4B > 0 ? p4B : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p4_und || (p4H > 0 ? p4H : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p4_app || (p4V > 0 ? p4V : ''))}</td>
          <td style="text-align:center; background:#f9fafb;">${cell(rB > 0 ? rB : '')}</td>
          <td style="text-align:center; background:#f9fafb;">${cell(rH > 0 ? rH : '')}</td>
          <td style="text-align:center; background:#f9fafb;">${cell(rV > 0 ? rV : '')}</td>
          <td style="text-align:center;"><b>${row.percentage ? row.percentage + '%' : '-'}</b></td>
        </tr>
      `;
    });

    const scoreP1 = metadata?.questionCounts?.part1_MCQSingle
      ? Number(((metadata.questionCounts.part1_MCQSingle || 12) * (metadata.questionCounts.part1_PointsPerQuestion ?? 0.25)).toFixed(1))
      : 3.0;
    const scoreP2 = metadata?.questionCounts?.part2_MCQTrueFalse
      ? Number(((metadata.questionCounts.part2_MCQTrueFalse || 2) * (metadata.questionCounts.part2_PointsPerQuestion ?? 1.0)).toFixed(1))
      : 2.0;
    const scoreP3 = metadata?.questionCounts?.part3_MCQShort
      ? Number(((metadata.questionCounts.part3_MCQShort || 4) * (metadata.questionCounts.part3_PointsPerQuestion ?? 0.5)).toFixed(1))
      : 2.0;
    const scoreP4 = Number(Math.max(0, 10.0 - scoreP1 - scoreP2 - scoreP3).toFixed(1));

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ - ${metadata.subject}</title>
      <style>
        @page { size: A4 landscape; margin: 1cm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; background: #fff; margin: 0; padding: 0; }
        .title-main { text-align: center; font-weight: bold; font-size: 15pt; margin-top: 10px; margin-bottom: 5px; text-transform: uppercase; }
        .subtitle { text-align: center; font-style: italic; font-size: 10.5pt; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10pt; }
        th, td { border: 1px solid #000; padding: 4px; }
        th { text-align: center; font-weight: bold; background: #f8fafc; }
        .footnotes { margin-top: 15px; font-size: 9.5pt; line-height: 1.4; border-top: 1px solid #666; padding-top: 6px; }
        .footnotes div { margin-bottom: 3px; font-style: italic; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="padding: 10px; background: #008080; color: white; text-align: center; font-family: sans-serif;">
        <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; font-weight: bold; cursor: pointer; background: #fff; color: #008080; border: none; border-radius: 4px;">
          🖨️ In Ma Trận Đề Kiểm Tra
        </button>
      </div>
      <div class="title-main">1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ</div>
      <div class="subtitle">Môn: ${metadata.subject} - Lớp ${metadata.grade} | Thời gian: ${metadata.durationMinutes} phút | Tổng điểm: ${metadata.totalPoints}đ</div>
      <table>
        <thead>
          <tr>
            <th rowspan="4" style="width: 3%;">TT</th>
            <th rowspan="4" style="width: 14%;">Chủ đề/Chương</th>
            <th rowspan="4" style="width: 16%;">Nội dung/đơn vị kiến thức</th>
            <th colspan="12">Mức độ đánh giá</th>
            <th colspan="3" rowspan="3" style="background:#f1f5f9;">Tổng</th>
            <th rowspan="4" style="width: 6%;">Tỉ lệ % điểm</th>
          </tr>
          <tr>
            <th colspan="9">TNKQ</th>
            <th colspan="3" rowspan="2">Tự luận</th>
          </tr>
          <tr>
            <th colspan="3">Nhiều lựa chọn</th>
            <th colspan="3">“Đúng – Sai”²</th>
            <th colspan="3">Trả lời ngắn³</th>
          </tr>
          <tr style="background:#f1f5f9;">
            <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
            <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
            <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
            <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
            <th style="background:#e2e8f0;">Biết</th>
            <th style="background:#e2e8f0;">Hiểu</th>
            <th style="background:#e2e8f0;">Vận dụng</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="font-weight:bold; text-align:center; background:#f8fafc;">
            <td colspan="3">Tổng số câu</td>
            <td colspan="3">${totalP1 > 0 ? totalP1 : 12}</td>
            <td colspan="3">${totalP2 > 0 ? totalP2 : 2}</td>
            <td colspan="3">${totalP3 > 0 ? totalP3 : 4}</td>
            <td colspan="3">${totalP4 > 0 ? totalP4 : 2}</td>
            <td>${totalBiết > 0 ? totalBiết : 9}</td>
            <td>${totalHiểu > 0 ? totalHiểu : 6}</td>
            <td>${totalVậnDụng > 0 ? totalVậnDụng : 5}</td>
            <td style="background:#e2e8f0;"></td>
          </tr>
          <tr style="font-weight:bold; text-align:center; background:#f8fafc;">
            <td colspan="3">Tổng số điểm</td>
            <td colspan="3">${scoreP1.toFixed(1).replace('.', ',')}⁵</td>
            <td colspan="3">${scoreP2.toFixed(1).replace('.', ',')}</td>
            <td colspan="3">${scoreP3.toFixed(1).replace('.', ',')}</td>
            <td colspan="3">${scoreP4.toFixed(1).replace('.', ',')}</td>
            <td>4,0</td><td>3,0</td><td>3,0</td>
            <td>10,0</td>
          </tr>
          <tr style="font-weight:bold; text-align:center; background:#f8fafc;">
            <td colspan="3">Tỉ lệ %</td>
            <td colspan="3">${Math.round(scoreP1 * 10)}</td>
            <td colspan="3">${Math.round(scoreP2 * 10)}</td>
            <td colspan="3">${Math.round(scoreP3 * 10)}</td>
            <td colspan="3">${Math.round(scoreP4 * 10)}</td>
            <td>40</td><td>30</td><td>30</td>
            <td>100%</td>
          </tr>
        </tfoot>
      </table>
      <div class="footnotes">
        ${OFFICIAL_MATRIX_FOOTNOTES.map((fn) => `<div><b>${fn.symbol}</b> ${fn.text}</div>`).join('')}
      </div>
    </body>
    </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
          }, 3000);
        } catch (e) {}
      }, 500);
    }
  }

  /**
   * In / Tải PDF riêng Bảng Đặc Tả Đề Kiểm Tra chuẩn mẫu Bộ GD&ĐT
   */
  static printSpecification(examPack: ExamPackage): void {
    const { metadata, specification } = examPack;

    const getBiết = (part: any): number => (part && part.remember ? Number(part.remember) : 0);
    const getHiểu = (part: any): number => (part && part.understand ? Number(part.understand) : 0);
    const getVậnDụng = (part: any): number =>
      (part && part.apply ? Number(part.apply) : 0) + (part && part.advanced ? Number(part.advanced) : 0);

    let totalP1 = 0, totalP2 = 0, totalP3 = 0, totalP4 = 0;

    let rowsHtml = '';
    specification.forEach((row) => {
      const p1B = getBiết(row.part1), p1H = getHiểu(row.part1), p1V = getVậnDụng(row.part1);
      const p2B = getBiết(row.part2), p2H = getHiểu(row.part2), p2V = getVậnDụng(row.part2);
      const p3B = getBiết(row.part3), p3H = getHiểu(row.part3), p3V = getVậnDụng(row.part3);
      const p4B = getBiết(row.part4), p4H = getHiểu(row.part4), p4V = getVậnDụng(row.part4);

      totalP1 += p1B + p1H + p1V;
      totalP2 += p2B + p2H + p2V;
      totalP3 += p3B + p3H + p3V;
      totalP4 += p4B + p4H + p4V;

      const cell = (val?: string | number) => {
        if (!val) return '-';
        return `<div>${val}</div>`;
      };

      rowsHtml += `
        <tr>
          <td style="text-align:center;"><b>${row.stt}</b></td>
          <td><b>${cleanLatexForDocx(row.topic)}</b></td>
          <td>${cleanLatexForDocx(row.subTopic)}</td>
          <td style="white-space:pre-wrap; font-size:9.5pt;">${cleanLatexForDocx(row.requirements)}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p1_rem || (p1B > 0 ? `(${p1B})` : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p1_und || (p1H > 0 ? `(${p1H})` : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p1_app || (p1V > 0 ? `(${p1V})` : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p2_rem || (p2B > 0 ? `(${p2B})` : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p2_und || (p2H > 0 ? `(${p2H})` : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p2_app || (p2V > 0 ? `(${p2V})` : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p3_rem || (p3B > 0 ? `(${p3B})` : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p3_und || (p3H > 0 ? `(${p3H})` : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p3_app || (p3V > 0 ? `(${p3V})` : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p4_rem || (p4B > 0 ? `(${p4B})` : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p4_und || (p4H > 0 ? `(${p4H})` : ''))}</td>
          <td style="text-align:center;">${cell(row.cellTexts?.p4_app || (p4V > 0 ? `(${p4V})` : ''))}</td>
        </tr>
      `;
    });

    const scoreP1 = metadata?.questionCounts?.part1_MCQSingle
      ? Number(((metadata.questionCounts.part1_MCQSingle || 12) * (metadata.questionCounts.part1_PointsPerQuestion ?? 0.25)).toFixed(1))
      : 3.0;
    const scoreP2 = metadata?.questionCounts?.part2_MCQTrueFalse
      ? Number(((metadata.questionCounts.part2_MCQTrueFalse || 2) * (metadata.questionCounts.part2_PointsPerQuestion ?? 1.0)).toFixed(1))
      : 2.0;
    const scoreP3 = metadata?.questionCounts?.part3_MCQShort
      ? Number(((metadata.questionCounts.part3_MCQShort || 4) * (metadata.questionCounts.part3_PointsPerQuestion ?? 0.5)).toFixed(1))
      : 2.0;
    const scoreP4 = Number(Math.max(0, 10.0 - scoreP1 - scoreP2 - scoreP3).toFixed(1));

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ - ${metadata.subject}</title>
      <style>
        @page { size: A4 landscape; margin: 1cm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; background: #fff; margin: 0; padding: 0; }
        .title-main { text-align: center; font-weight: bold; font-size: 15pt; margin-top: 10px; margin-bottom: 5px; text-transform: uppercase; }
        .subtitle { text-align: center; font-style: italic; font-size: 10.5pt; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5pt; }
        th, td { border: 1px solid #000; padding: 4px; }
        th { text-align: center; font-weight: bold; background: #f8fafc; }
        .footnotes { margin-top: 15px; font-size: 9.5pt; line-height: 1.4; border-top: 1px solid #666; padding-top: 6px; }
        .footnotes div { margin-bottom: 3px; font-style: italic; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="padding: 10px; background: #008080; color: white; text-align: center; font-family: sans-serif;">
        <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; font-weight: bold; cursor: pointer; background: #fff; color: #008080; border: none; border-radius: 4px;">
          🖨️ In Bản Đặc Tả Đề Kiểm Tra
        </button>
      </div>
      <div class="title-main">2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ</div>
      <div class="subtitle">Môn: ${metadata.subject} - Lớp ${metadata.grade} | ${metadata.examTitle}</div>
      <table>
        <thead>
          <tr>
            <th rowspan="4" style="width: 3%;">TT</th>
            <th rowspan="4" style="width: 12%;">Chủ đề/Chương</th>
            <th rowspan="4" style="width: 14%;">Nội dung/đơn vị kiến thức</th>
            <th rowspan="4" style="width: 25%;">Yêu cầu cần đạt</th>
            <th colspan="12">Số câu hỏi ở các mức độ đánh giá</th>
          </tr>
          <tr>
            <th colspan="9">TNKQ</th>
            <th colspan="3" rowspan="2">Tự luận</th>
          </tr>
          <tr>
            <th colspan="3">Nhiều lựa chọn</th>
            <th colspan="3">“Đúng – Sai”</th>
            <th colspan="3">Trả lời ngắn</th>
          </tr>
          <tr style="background:#f1f5f9;">
            <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
            <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
            <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
            <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="font-weight:bold; text-align:center; background:#f8fafc;">
            <td colspan="4">Tổng số câu</td>
            <td colspan="3">${totalP1 > 0 ? totalP1 : 12}</td>
            <td colspan="3">${totalP2 > 0 ? totalP2 : 2}</td>
            <td colspan="3">${totalP3 > 0 ? totalP3 : 4}</td>
            <td colspan="3">${totalP4 > 0 ? totalP4 : 2}</td>
          </tr>
          <tr style="font-weight:bold; text-align:center; background:#f8fafc;">
            <td colspan="4">Tổng số điểm</td>
            <td colspan="3">${scoreP1.toFixed(1).replace('.', ',')}</td>
            <td colspan="3">${scoreP2.toFixed(1).replace('.', ',')}</td>
            <td colspan="3">${scoreP3.toFixed(1).replace('.', ',')}</td>
            <td colspan="3">${scoreP4.toFixed(1).replace('.', ',')}</td>
          </tr>
          <tr style="font-weight:bold; text-align:center; background:#f8fafc;">
            <td colspan="4">Tỉ lệ %</td>
            <td colspan="3">${Math.round(scoreP1 * 10)}</td>
            <td colspan="3">${Math.round(scoreP2 * 10)}</td>
            <td colspan="3">${Math.round(scoreP3 * 10)}</td>
            <td colspan="3">${Math.round(scoreP4 * 10)}</td>
          </tr>
        </tfoot>
      </table>
      <div class="footnotes">
        ${OFFICIAL_SPEC_FOOTNOTES.map((fn) => `<div><b>${fn.symbol}</b> ${fn.text}</div>`).join('')}
      </div>
    </body>
    </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
          }, 3000);
        } catch (e) {}
      }, 500);
    }
  }
}
