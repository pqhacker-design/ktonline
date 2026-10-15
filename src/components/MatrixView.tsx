import React, { useState } from 'react';
import { Download, Edit3, Grid, Save } from 'lucide-react';
import { ExamPackage, MatrixRow } from '../types';
import { MathText } from './MathText';

interface MatrixViewProps {
  examPackage: ExamPackage | null;
  onUpdateMatrix?: (updatedMatrix: MatrixRow[]) => void;
  onExportWord?: () => void;
  onExportExcel?: () => void;
}

export const MatrixView: React.FC<MatrixViewProps> = ({
  examPackage,
  onUpdateMatrix,
  onExportWord,
  onExportExcel,
}) => {
  if (!examPackage) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <Grid className="w-16 h-16 text-teal-600 mx-auto mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          Chưa Có Dữ Liệu Ma Trận Đề Kiểm Tra
        </h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Vui lòng vào mục "Tạo đề kiểm tra" để hệ thống AI sinh Ma trận đề chuẩn Công văn 7991/BGDĐT.
        </p>
      </div>
    );
  }

  const { metadata, matrix } = examPackage;
  const [isEditing, setIsEditing] = useState(false);
  const [editableMatrix, setEditableMatrix] = useState<MatrixRow[]>(matrix);

  const handleCellChange = (stt: number, field: string, value: any) => {
    setEditableMatrix((prev) =>
      prev.map((row) => (row.stt === stt ? { ...row, [field]: value } : row))
    );
  };

  const handleSave = () => {
    if (onUpdateMatrix) {
      onUpdateMatrix(editableMatrix);
    }
    setIsEditing(false);
  };

  const getCellStr = (part: any, field: string): string => {
    if (!part || part[field] === undefined || part[field] === null || part[field] === 0 || part[field] === '0') return '';
    return String(part[field]);
  };

  const getCellCount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).trim();
    if (!str || str === '-') return 0;
    if (/^\d+$/.test(str)) return parseInt(str, 10);
    const tokens = str.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    return tokens.length > 0 ? tokens.length : 1;
  };

  const handleNestedCellChange = (stt: number, partKey: 'part1' | 'part2' | 'part3' | 'part4', field: string, value: any) => {
    setEditableMatrix((prev) =>
      prev.map((row) => {
        if (row.stt !== stt) return row;
        const curPart = (row as any)[partKey] || {};
        return {
          ...row,
          [partKey]: {
            ...curPart,
            [field]: value,
          },
        };
      })
    );
  };

  // Tính toán tổng số câu ở từng cột cho Footer
  const p1_rem_sum = editableMatrix.reduce((a, b) => a + getCellCount(b.part1?.remember), 0);
  const p1_und_sum = editableMatrix.reduce((a, b) => a + getCellCount(b.part1?.understand), 0);
  const p1_app_sum = editableMatrix.reduce((a, b) => a + getCellCount(b.part1?.apply) + getCellCount(b.part1?.advanced), 0);

  const p2_rem_sum = editableMatrix.reduce((a, b) => a + getCellCount(b.part2?.remember), 0);
  const p2_und_sum = editableMatrix.reduce((a, b) => a + getCellCount(b.part2?.understand), 0);
  const p2_app_sum = editableMatrix.reduce((a, b) => a + getCellCount(b.part2?.apply) + getCellCount(b.part2?.advanced), 0);

  const p3_rem_sum = editableMatrix.reduce((a, b) => a + getCellCount(b.part3?.remember), 0);
  const p3_und_sum = editableMatrix.reduce((a, b) => a + getCellCount(b.part3?.understand), 0);
  const p3_app_sum = editableMatrix.reduce((a, b) => a + getCellCount(b.part3?.apply) + getCellCount(b.part3?.advanced), 0);

  const p4_rem_sum = editableMatrix.reduce((a, b) => a + getCellCount(b.part4?.remember), 0);
  const p4_und_sum = editableMatrix.reduce((a, b) => a + getCellCount(b.part4?.understand), 0);
  const p4_app_sum = editableMatrix.reduce((a, b) => a + getCellCount(b.part4?.apply) + getCellCount(b.part4?.advanced), 0);

  const sum_rem = p1_rem_sum + p2_rem_sum + p3_rem_sum + p4_rem_sum;
  const sum_und = p1_und_sum + p2_und_sum + p3_und_sum + p4_und_sum;
  const sum_app = p1_app_sum + p2_app_sum + p3_app_sum + p4_app_sum;

  const total_items = sum_rem + sum_und + sum_app;
  const totalQuestions =
    (examPackage.exams[0]?.questions?.length) ||
    editableMatrix.reduce((a, b) => a + Number(b.totalQuestions || 0), 0) ||
    (p1_rem_sum + p1_und_sum + p1_app_sum + (p2_rem_sum + p2_und_sum + p2_app_sum > 0 ? Math.ceil((p2_rem_sum + p2_und_sum + p2_app_sum) / 4) : 0) + (p3_rem_sum + p3_und_sum + p3_app_sum) + (p4_rem_sum + p4_und_sum + p4_app_sum));

  // Điểm số các phần
  const p1TotalPoints = Math.round((p1_rem_sum + p1_und_sum + p1_app_sum) * (metadata.questionCounts?.part1_PointsPerQuestion ?? 0.25) * 100) / 100 || 3.0;
  const p2QuestionsCount = Math.max(1, Math.round((p2_rem_sum + p2_und_sum + p2_app_sum) / 4));
  const p2TotalPoints = Math.round(p2QuestionsCount * (metadata.questionCounts?.part2_PointsPerQuestion ?? 1.0) * 100) / 100 || 2.0;
  const p3TotalPoints = Math.round((p3_rem_sum + p3_und_sum + p3_app_sum) * (metadata.questionCounts?.part3_PointsPerQuestion ?? 0.5) * 100) / 100 || 2.0;
  const p4TotalPoints = Math.max(0, Math.round((10.0 - p1TotalPoints - p2TotalPoints - p3TotalPoints) * 100) / 100);

  const remPoints = Math.round((p1_rem_sum * 0.25 + p2_rem_sum * 0.25 + p3_rem_sum * 0.5 + p4_rem_sum * 1.0) * 100) / 100 || 4.0;
  const undPoints = Math.round((p1_und_sum * 0.25 + p2_und_sum * 0.25 + p3_und_sum * 0.5 + p4_und_sum * 1.5) * 100) / 100 || 3.0;
  const appPoints = Math.max(0, Math.round((10.0 - remPoints - undPoints) * 100) / 100);

  const mcqRatio = Math.round(((p1TotalPoints + p2TotalPoints + p3TotalPoints) / 10.0) * 100);
  const essayRatio = 100 - mcqRatio;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              Công văn 7991/BGDĐT
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Khung Ma Trận Đề Kiểm Tra - Môn {metadata.subject} ({metadata.grade})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kỳ thi: {metadata.examTitle || 'Kiểm tra'} | Thời gian: {metadata.durationMinutes} phút | Thang điểm: 10,0 điểm | Bộ sách: {metadata.curriculum}
          </p>
          {metadata.customMatrixContext && (
            <div className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Đề thi &amp; Ma trận được sinh bám sát theo Khung Ma trận Tổ bộ môn cung cấp</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {isEditing ? (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Chỉnh Sửa</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>Chỉnh Sửa Bảng</span>
            </button>
          )}

          {onExportWord && (
            <button
              onClick={onExportWord}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-teal-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Word</span>
            </button>
          )}
        </div>
      </div>

      {/* Ma Trận Table Container - Chuẩn Công văn 7991 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse border border-slate-400 dark:border-slate-700">
          <thead>
            {/* Hàng 1 */}
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-center">
              <th rowSpan={3} className="border border-slate-400 dark:border-slate-700 p-2 w-10">
                TT
              </th>
              <th rowSpan={3} className="border border-slate-400 dark:border-slate-700 p-2 min-w-[130px]">
                Chủ đề / Chương
              </th>
              <th rowSpan={3} className="border border-slate-400 dark:border-slate-700 p-2 min-w-[180px]">
                Nội dung / Đơn vị kiến thức
              </th>
              <th colSpan={12} className="border border-slate-400 dark:border-slate-700 p-2 bg-slate-200/80 dark:bg-slate-800">
                Mức độ đánh giá
              </th>
              <th colSpan={3} className="border border-slate-400 dark:border-slate-700 p-2 bg-slate-100 dark:bg-slate-800">
                Tổng
              </th>
              <th rowSpan={3} className="border border-slate-400 dark:border-slate-700 p-2 w-16">
                Tỉ lệ % điểm
              </th>
            </tr>

            {/* Hàng 2: Trắc nghiệm khách quan vs Tự luận */}
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-center text-[11px]">
              <th colSpan={9} className="border border-slate-400 dark:border-slate-700 p-1 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold">
                Trắc nghiệm khách quan ({mcqRatio}%)
              </th>
              <th colSpan={3} className="border border-slate-400 dark:border-slate-700 p-1 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold">
                Tự luận ({essayRatio}%)
              </th>
              <th rowSpan={2} className="border border-slate-400 dark:border-slate-700 p-1 w-10 text-center font-bold">
                Biết
              </th>
              <th rowSpan={2} className="border border-slate-400 dark:border-slate-700 p-1 w-10 text-center font-bold">
                Hiểu
              </th>
              <th rowSpan={2} className="border border-slate-400 dark:border-slate-700 p-1 w-12 text-center font-bold">
                Vận dụng
              </th>
            </tr>

            {/* Hàng 3: 4 Dạng bài (Nhiều lựa chọn, Đúng-Sai, Trả lời ngắn, Tự luận) */}
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-center text-[11px]">
              <th colSpan={3} className="border border-slate-400 dark:border-slate-700 p-1 bg-teal-100/50 dark:bg-teal-900/30">
                Nhiều lựa chọn
              </th>
              <th colSpan={3} className="border border-slate-400 dark:border-slate-700 p-1 bg-teal-100/50 dark:bg-teal-900/30">
                Đúng – Sai
              </th>
              <th colSpan={3} className="border border-slate-400 dark:border-slate-700 p-1 bg-teal-100/50 dark:bg-teal-900/30">
                Trả lời ngắn
              </th>
              <th colSpan={3} className="border border-slate-400 dark:border-slate-700 p-1 bg-emerald-100/50 dark:bg-emerald-900/30">
                Tự luận
              </th>
            </tr>

            {/* Hàng 4: Biết - Hiểu - Vận dụng */}
            <tr className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-center text-[10px]">
              {/* Nhiều lựa chọn */}
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-10">Biết</th>
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-10">Hiểu</th>
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-12">Vận dụng</th>

              {/* Đúng - Sai */}
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-10">Biết</th>
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-10">Hiểu</th>
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-12">Vận dụng</th>

              {/* Trả lời ngắn */}
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-10">Biết</th>
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-10">Hiểu</th>
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-12">Vận dụng</th>

              {/* Tự luận */}
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-10">Biết</th>
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-10">Hiểu</th>
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-12">Vận dụng</th>

              {/* Tổng Biết - Hiểu - Vận dụng */}
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-10 bg-slate-100 dark:bg-slate-800">Biết</th>
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-10 bg-slate-100 dark:bg-slate-800">Hiểu</th>
              <th className="border border-slate-400 dark:border-slate-700 p-1 w-12 bg-slate-100 dark:bg-slate-800">Vận dụng</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {editableMatrix.map((row) => {
              const p1_rem = getCellStr(row.part1, 'remember');
              const p1_und = getCellStr(row.part1, 'understand');
              const p1_app = getCellStr(row.part1, 'apply') || getCellStr(row.part1, 'advanced');

              const p2_rem = getCellStr(row.part2, 'remember');
              const p2_und = getCellStr(row.part2, 'understand');
              const p2_app = getCellStr(row.part2, 'apply') || getCellStr(row.part2, 'advanced');

              const p3_rem = getCellStr(row.part3, 'remember');
              const p3_und = getCellStr(row.part3, 'understand');
              const p3_app = getCellStr(row.part3, 'apply') || getCellStr(row.part3, 'advanced');

              const p4_rem = getCellStr(row.part4, 'remember');
              const p4_und = getCellStr(row.part4, 'understand');
              const p4_app = getCellStr(row.part4, 'apply') || getCellStr(row.part4, 'advanced');

              const row_rem =
                row.totalRemember !== undefined
                  ? row.totalRemember
                  : getCellCount(p1_rem) + getCellCount(p2_rem) + getCellCount(p3_rem) + getCellCount(p4_rem);

              const row_und =
                row.totalUnderstand !== undefined
                  ? row.totalUnderstand
                  : getCellCount(p1_und) + getCellCount(p2_und) + getCellCount(p3_und) + getCellCount(p4_und);

              const row_app =
                row.totalApply !== undefined
                  ? row.totalApply
                  : getCellCount(p1_app) + getCellCount(p2_app) + getCellCount(p3_app) + getCellCount(p4_app);

              const renderCell = (partKey: 'part1' | 'part2' | 'part3' | 'part4', field: string, val: string) => {
                if (isEditing) {
                  return (
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleNestedCellChange(row.stt, partKey, field, e.target.value)}
                      className="w-full bg-amber-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-center text-xs p-1 rounded-xs"
                    />
                  );
                }
                return val ? <span className="font-semibold text-slate-900 dark:text-white">{val}</span> : <span className="text-slate-300 dark:text-slate-600">-</span>;
              };

              return (
                <tr key={row.stt} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-center">
                  {/* TT */}
                  <td className="border border-slate-300 dark:border-slate-700 p-2 font-bold text-slate-800 dark:text-slate-200">
                    {row.stt}
                  </td>
                  {/* Chủ đề / Chương */}
                  <td className="border border-slate-300 dark:border-slate-700 p-2 text-left font-semibold text-slate-900 dark:text-white">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.topic}
                        onChange={(e) => handleCellChange(row.stt, 'topic', e.target.value)}
                        className="w-full bg-amber-50 dark:bg-slate-800 border p-1 rounded-xs text-xs"
                      />
                    ) : (
                      <MathText content={row.topic} />
                    )}
                  </td>
                  {/* Nội dung / Đơn vị kiến thức */}
                  <td className="border border-slate-300 dark:border-slate-700 p-2 text-left text-slate-700 dark:text-slate-300">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.subTopic}
                        onChange={(e) => handleCellChange(row.stt, 'subTopic', e.target.value)}
                        className="w-full bg-amber-50 dark:bg-slate-800 border p-1 rounded-xs text-xs"
                      />
                    ) : (
                      <MathText content={row.subTopic} />
                    )}
                  </td>

                  {/* Nhiều lựa chọn */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5">{renderCell('part1', 'remember', p1_rem)}</td>
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5">{renderCell('part1', 'understand', p1_und)}</td>
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5">{renderCell('part1', 'apply', p1_app)}</td>

                  {/* Đúng - Sai */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5">{renderCell('part2', 'remember', p2_rem)}</td>
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5">{renderCell('part2', 'understand', p2_und)}</td>
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5">{renderCell('part2', 'apply', p2_app)}</td>

                  {/* Trả lời ngắn */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5">{renderCell('part3', 'remember', p3_rem)}</td>
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5">{renderCell('part3', 'understand', p3_und)}</td>
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5">{renderCell('part3', 'apply', p3_app)}</td>

                  {/* Tự luận */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5">{renderCell('part4', 'remember', p4_rem)}</td>
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5">{renderCell('part4', 'understand', p4_und)}</td>
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5">{renderCell('part4', 'apply', p4_app)}</td>

                  {/* Tổng: Biết - Hiểu - Vận dụng */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5 font-bold bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200">
                    {row_rem || 0}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5 font-bold bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200">
                    {row_und || 0}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5 font-bold bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200">
                    {row_app || 0}
                  </td>

                  {/* Tỉ lệ % điểm */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5 font-bold text-teal-700 dark:text-teal-400">
                    {row.percentage ? `${row.percentage}%` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer Tổng kết chuẩn 7991 */}
          <tfoot>
            {/* Hàng 1: Tổng số câu */}
            <tr className="bg-slate-100 dark:bg-slate-800 font-extrabold text-center text-slate-900 dark:text-white text-xs">
              <td colSpan={3} className="border border-slate-400 dark:border-slate-600 p-2 text-left font-bold">
                Tổng số câu
              </td>
              {/* Nhiều lựa chọn */}
              <td className="border border-slate-400 dark:border-slate-600 p-1.5">{p1_rem_sum}</td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5">{p1_und_sum}</td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5">{p1_app_sum}</td>

              {/* Đúng – Sai */}
              <td className="border border-slate-400 dark:border-slate-600 p-1.5">{p2_rem_sum}</td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5">{p2_und_sum}</td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5">{p2_app_sum}</td>

              {/* Trả lời ngắn */}
              <td className="border border-slate-400 dark:border-slate-600 p-1.5">{p3_rem_sum}</td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5">{p3_und_sum}</td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5">{p3_app_sum}</td>

              {/* Tự luận */}
              <td className="border border-slate-400 dark:border-slate-600 p-1.5">{p4_rem_sum}</td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5">{p4_und_sum}</td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5">{p4_app_sum}</td>

              {/* Tổng Biết - Hiểu - Vận dụng */}
              <td className="border border-slate-400 dark:border-slate-600 p-1.5 bg-slate-200 dark:bg-slate-700">{sum_rem}</td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5 bg-slate-200 dark:bg-slate-700">{sum_und}</td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5 bg-slate-200 dark:bg-slate-700">{sum_app}</td>

              {/* Tổng câu / ý */}
              <td className="border border-slate-400 dark:border-slate-600 p-1.5 text-center font-black text-teal-800 dark:text-teal-300">
                {total_items} ý ({totalQuestions} câu)
              </td>
            </tr>

            {/* Hàng 2: Tổng số điểm */}
            <tr className="bg-slate-50 dark:bg-slate-900 font-extrabold text-center text-slate-900 dark:text-white text-xs">
              <td colSpan={3} className="border border-slate-400 dark:border-slate-600 p-2 text-left font-bold">
                Tổng số điểm
              </td>
              <td colSpan={3} className="border border-slate-400 dark:border-slate-600 p-1.5 font-bold text-teal-700 dark:text-teal-400">
                {p1TotalPoints.toFixed(1).replace('.', ',')} điểm
              </td>
              <td colSpan={3} className="border border-slate-400 dark:border-slate-600 p-1.5 font-bold text-teal-700 dark:text-teal-400">
                {p2TotalPoints.toFixed(1).replace('.', ',')} điểm
              </td>
              <td colSpan={3} className="border border-slate-400 dark:border-slate-600 p-1.5 font-bold text-teal-700 dark:text-teal-400">
                {p3TotalPoints.toFixed(1).replace('.', ',')} điểm
              </td>
              <td colSpan={3} className="border border-slate-400 dark:border-slate-600 p-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                {p4TotalPoints.toFixed(1).replace('.', ',')} điểm
              </td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5 bg-slate-100 dark:bg-slate-800">
                {remPoints.toFixed(1).replace('.', ',')} điểm
              </td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5 bg-slate-100 dark:bg-slate-800">
                {undPoints.toFixed(1).replace('.', ',')} điểm
              </td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5 bg-slate-100 dark:bg-slate-800">
                {appPoints.toFixed(1).replace('.', ',')} điểm
              </td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5 text-center font-black text-red-600 dark:text-red-400">
                10,0 điểm
              </td>
            </tr>

            {/* Hàng 3: Tỉ lệ % */}
            <tr className="bg-slate-100 dark:bg-slate-800 font-extrabold text-center text-slate-900 dark:text-white text-xs">
              <td colSpan={3} className="border border-slate-400 dark:border-slate-600 p-2 text-left font-bold">
                Tỉ lệ %
              </td>
              <td colSpan={3} className="border border-slate-400 dark:border-slate-600 p-1.5">
                {Math.round((p1TotalPoints / 10) * 100)}%
              </td>
              <td colSpan={3} className="border border-slate-400 dark:border-slate-600 p-1.5">
                {Math.round((p2TotalPoints / 10) * 100)}%
              </td>
              <td colSpan={3} className="border border-slate-400 dark:border-slate-600 p-1.5">
                {Math.round((p3TotalPoints / 10) * 100)}%
              </td>
              <td colSpan={3} className="border border-slate-400 dark:border-slate-600 p-1.5">
                {Math.round((p4TotalPoints / 10) * 100)}%
              </td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5 bg-slate-200 dark:bg-slate-700">
                {Math.round((remPoints / 10) * 100)}%
              </td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5 bg-slate-200 dark:bg-slate-700">
                {Math.round((undPoints / 10) * 100)}%
              </td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5 bg-slate-200 dark:bg-slate-700">
                {Math.round((appPoints / 10) * 100)}%
              </td>
              <td className="border border-slate-400 dark:border-slate-600 p-1.5 font-black text-teal-800 dark:text-teal-300">
                100%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

