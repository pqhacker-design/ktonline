import React, { useState } from 'react';
import { Download, Edit3, FileSpreadsheet, Plus, Printer, RefreshCw, Save, Trash2 } from 'lucide-react';
import { ExamPackage, MatrixRow } from '../types';
import { MathText } from './MathText';
import { OFFICIAL_MATRIX_FOOTNOTES, getOfficialSampleExamPackage } from '../services/officialTemplateData';

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
  // If examPackage is null, initialize with standard official template
  const currentPackage = examPackage || getOfficialSampleExamPackage();
  const { metadata, matrix } = currentPackage;

  const [isEditing, setIsEditing] = useState(false);
  const [editableMatrix, setEditableMatrix] = useState<MatrixRow[]>(
    matrix && matrix.length > 0 ? matrix : getOfficialSampleExamPackage().matrix
  );

  // Sync state if examPackage changes from outside
  React.useEffect(() => {
    if (examPackage && examPackage.matrix) {
      setEditableMatrix(examPackage.matrix);
    }
  }, [examPackage]);

  // Display mode: 'symbolic' (e.g. (n)⁴, (1), etc.) or 'numeric' (exact counts 1, 2, 3)
  const [displayMode, setDisplayMode] = useState<'symbolic' | 'numeric'>('symbolic');

  const handleCellChange = (stt: number | string, field: string, value: any) => {
    setEditableMatrix((prev) =>
      prev.map((row) => (row.stt === stt ? { ...row, [field]: value } : row))
    );
  };

  const handleCustomCellTextChange = (stt: number | string, cellKey: string, value: string) => {
    setEditableMatrix((prev) =>
      prev.map((row) => {
        if (row.stt !== stt) return row;
        const updatedCells = { ...(row.cellTexts || {}), [cellKey]: value };
        return { ...row, cellTexts: updatedCells };
      })
    );
  };

  const handleCognitiveNumberChange = (
    stt: number | string,
    partKey: 'part1' | 'part2' | 'part3' | 'part4',
    level: 'remember' | 'understand' | 'apply',
    numValue: number
  ) => {
    setEditableMatrix((prev) =>
      prev.map((row) => {
        if (row.stt !== stt) return row;
        const curPart = row[partKey] || { remember: 0, understand: 0, apply: 0, advanced: 0 };
        const updatedPart = { ...curPart, [level]: numValue };
        return { ...row, [partKey]: updatedPart };
      })
    );
  };

  const handleAddRow = () => {
    const nextStt = editableMatrix.length > 0 ? Number(editableMatrix[editableMatrix.length - 1].stt) + 1 || editableMatrix.length + 1 : 1;
    const newRow: MatrixRow = {
      stt: nextStt,
      topic: `Chủ đề ${nextStt}`,
      subTopic: 'Nội dung kiến thức mới',
      part1: { remember: 1, understand: 0, apply: 0, advanced: 0 },
      part2: { remember: 0, understand: 0, apply: 0, advanced: 0 },
      part3: { remember: 0, understand: 0, apply: 0, advanced: 0 },
      part4: { remember: 0, understand: 0, apply: 0, advanced: 0 },
      totalQuestions: 1,
      totalPoints: 0.25,
      percentage: 2.5,
      cellTexts: {
        p1_rem: '1',
      },
    };
    setEditableMatrix([...editableMatrix, newRow]);
  };

  const handleDeleteRow = (stt: number | string) => {
    setEditableMatrix((prev) => prev.filter((r) => r.stt !== stt));
  };

  const handleResetToOfficialSample = () => {
    const sample = getOfficialSampleExamPackage();
    setEditableMatrix(sample.matrix);
    if (onUpdateMatrix) {
      onUpdateMatrix(sample.matrix);
    }
  };

  const handleSave = () => {
    if (onUpdateMatrix) {
      onUpdateMatrix(editableMatrix);
    }
    setIsEditing(false);
  };

  // Helper calculation functions
  const getBiết = (part: any): number => Number(part?.remember || 0);
  const getHiểu = (part: any): number => Number(part?.understand || 0);
  const getVậnDụng = (part: any): number => Number(part?.apply || 0) + Number(part?.advanced || 0);

  // Helper cell formatter
  const renderCellContent = (
    row: MatrixRow,
    partKey: 'part1' | 'part2' | 'part3' | 'part4',
    level: 'remember' | 'understand' | 'apply',
    cellKey: string
  ) => {
    const part = row[partKey];
    let num = 0;
    if (level === 'remember') num = getBiết(part);
    else if (level === 'understand') num = getHiểu(part);
    else num = getVậnDụng(part);

    const customText = row.cellTexts?.[cellKey];

    if (isEditing) {
      return (
        <div className="flex flex-col items-center gap-1 p-0.5">
          <input
            type="text"
            value={customText !== undefined ? customText : num > 0 ? String(num) : ''}
            onChange={(e) => handleCustomCellTextChange(row.stt, cellKey, e.target.value)}
            placeholder={num > 0 ? String(num) : '-'}
            className="w-12 text-center text-xs font-bold bg-amber-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xs py-0.5"
          />
          <input
            type="number"
            min={0}
            value={num}
            onChange={(e) =>
              handleCognitiveNumberChange(
                row.stt,
                partKey,
                level,
                Math.max(0, parseInt(e.target.value, 10) || 0)
              )
            }
            title="Số câu dùng để tính tổng điểm"
            className="w-10 text-center text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-900 border rounded-xs"
          />
        </div>
      );
    }

    if (displayMode === 'symbolic') {
      if (customText) {
        return <span className="font-semibold text-slate-800 dark:text-slate-100">{customText}</span>;
      }
      if (num > 0) {
        return <span className="font-semibold text-slate-800 dark:text-slate-100">{num}</span>;
      }
      return <span className="text-slate-300 dark:text-slate-600">-</span>;
    }

    // numeric mode
    if (num > 0) {
      return <span className="font-semibold text-slate-800 dark:text-slate-100">{num}</span>;
    }
    return <span className="text-slate-300 dark:text-slate-600">-</span>;
  };

  // Row summaries
  const getRowBiếtTotal = (r: MatrixRow) =>
    getBiết(r.part1) + getBiết(r.part2) + getBiết(r.part3) + getBiết(r.part4);
  const getRowHiểuTotal = (r: MatrixRow) =>
    getHiểu(r.part1) + getHiểu(r.part2) + getHiểu(r.part3) + getHiểu(r.part4);
  const getRowVậnDụngTotal = (r: MatrixRow) =>
    getVậnDụng(r.part1) + getVậnDụng(r.part2) + getVậnDụng(r.part3) + getVậnDụng(r.part4);

  // Column totals
  const totalP1 = editableMatrix.reduce(
    (acc, r) => acc + getBiết(r.part1) + getHiểu(r.part1) + getVậnDụng(r.part1),
    0
  );
  const totalP2 = editableMatrix.reduce(
    (acc, r) => acc + getBiết(r.part2) + getHiểu(r.part2) + getVậnDụng(r.part2),
    0
  );
  const totalP3 = editableMatrix.reduce(
    (acc, r) => acc + getBiết(r.part3) + getHiểu(r.part3) + getVậnDụng(r.part3),
    0
  );
  const totalP4 = editableMatrix.reduce(
    (acc, r) => acc + getBiết(r.part4) + getHiểu(r.part4) + getVậnDụng(r.part4),
    0
  );

  const totalBiếtAll = editableMatrix.reduce((acc, r) => acc + getRowBiếtTotal(r), 0);
  const totalHiểuAll = editableMatrix.reduce((acc, r) => acc + getRowHiểuTotal(r), 0);
  const totalVậnDụngAll = editableMatrix.reduce((acc, r) => acc + getRowVậnDụngTotal(r), 0);

  // Điểm số và tỷ lệ
  // Theo mẫu chuẩn Bộ GD&ĐT:
  // Nhiều lựa chọn: 3,0 điểm (30%)
  // Đúng - Sai: 2,0 điểm (20%)
  // Trả lời ngắn: 2,0 điểm (20%)
  // Tự luận: 3,0 điểm (30%)
  // Biết: 4,0 điểm (40%) | Hiểu: 3,0 điểm (30%) | Vận dụng: 3,0 điểm (30%)
  const scoreP1 = metadata?.questionCounts?.part1_MCQSingle
    ? Number(
        (
          (metadata.questionCounts.part1_MCQSingle || 12) *
          (metadata.questionCounts.part1_PointsPerQuestion ?? 0.25)
        ).toFixed(1)
      )
    : 3.0;

  const scoreP2 = metadata?.questionCounts?.part2_MCQTrueFalse
    ? Number(
        (
          (metadata.questionCounts.part2_MCQTrueFalse || 2) *
          (metadata.questionCounts.part2_PointsPerQuestion ?? 1.0)
        ).toFixed(1)
      )
    : 2.0;

  const scoreP3 = metadata?.questionCounts?.part3_MCQShort
    ? Number(
        (
          (metadata.questionCounts.part3_MCQShort || 4) *
          (metadata.questionCounts.part3_PointsPerQuestion ?? 0.5)
        ).toFixed(1)
      )
    : 2.0;

  const scoreP4 = Number(Math.max(0, 10.0 - scoreP1 - scoreP2 - scoreP3).toFixed(1));

  const formatScore = (val: number) => val.toFixed(1).replace('.', ',');

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Action Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
              Mẫu Chuẩn Bộ GD&ĐT
            </span>
            <span className="text-xs text-slate-500">Môn {metadata.subject} • {metadata.grade}</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            Khung Ma Trận Đề Kiểm Tra Định Kì
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thời gian: {metadata.durationMinutes} phút | Tổng điểm: {metadata.totalPoints} điểm | Bộ sách: {metadata.curriculum}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle View Mode */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              onClick={() => setDisplayMode('symbolic')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                displayMode === 'symbolic'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Mẫu Ký hiệu (n)⁴
            </button>
            <button
              onClick={() => setDisplayMode('numeric')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                displayMode === 'numeric'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Xem Số Câu
            </button>
          </div>

          {/* Sample Loader */}
          <button
            onClick={handleResetToOfficialSample}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5"
            title="Nạp lại bảng ma trận mẫu chuẩn Bộ GD&ĐT"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Nạp Mẫu Bộ</span>
          </button>

          {isEditing ? (
            <>
              <button
                onClick={handleAddRow}
                className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Dòng</span>
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Ma Trận</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>Chỉnh Sửa</span>
            </button>
          )}

          {onExportWord && (
            <button
              onClick={onExportWord}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-teal-600/20"
              title="Xuất file Word chuẩn 100% mẫu công văn"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Word</span>
            </button>
          )}

          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-700/20"
              title="Xuất file Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Document Paper Container (Mirrors Ministry Form Exactly) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-lg border border-slate-200 dark:border-slate-800 overflow-x-auto text-slate-900 dark:text-slate-100">
        {/* Document Header Title matching image */}
        <div className="text-center mb-6">
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider font-serif">
            1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ
          </h1>
          <div className="text-xs text-slate-500 font-serif italic mt-1">
            Môn: {metadata.subject} - Lớp {metadata.grade} ({metadata.schoolYear || '2026 - 2027'})
          </div>
        </div>

        {/* 19-Column Matrix Table */}
        <table className="w-full text-xs text-left border-collapse border border-black dark:border-slate-600 font-serif">
          <thead>
            {/* Header Row 1 */}
            <tr className="text-black dark:text-white font-bold text-center bg-slate-50 dark:bg-slate-800/80">
              <th rowSpan={4} className="border border-black dark:border-slate-600 p-2 w-10">
                TT
              </th>
              <th rowSpan={4} className="border border-black dark:border-slate-600 p-2 min-w-[130px] max-w-[160px]">
                Chủ đề/Chương
              </th>
              <th rowSpan={4} className="border border-black dark:border-slate-600 p-2 min-w-[170px]">
                Nội dung/đơn vị kiến thức
              </th>
              <th colSpan={12} className="border border-black dark:border-slate-600 p-2">
                Mức độ đánh giá
              </th>
              <th colSpan={3} rowSpan={3} className="border border-black dark:border-slate-600 p-2 bg-slate-100 dark:bg-slate-800">
                Tổng
              </th>
              <th rowSpan={4} className="border border-black dark:border-slate-600 p-2 w-16">
                Tỉ lệ % điểm
              </th>
              {isEditing && (
                <th rowSpan={4} className="border border-black dark:border-slate-600 p-2 w-12 text-rose-600">
                  Xóa
                </th>
              )}
            </tr>

            {/* Header Row 2 */}
            <tr className="text-black dark:text-white font-bold text-center bg-slate-50 dark:bg-slate-800/80">
              <th colSpan={9} className="border border-black dark:border-slate-600 p-1.5">
                TNKQ
              </th>
              <th colSpan={3} rowSpan={2} className="border border-black dark:border-slate-600 p-1.5">
                Tự luận
              </th>
            </tr>

            {/* Header Row 3 */}
            <tr className="text-black dark:text-white font-bold text-center bg-slate-50 dark:bg-slate-800/80 text-[11px]">
              <th colSpan={3} className="border border-black dark:border-slate-600 p-1.5">
                Nhiều lựa chọn
              </th>
              <th colSpan={3} className="border border-black dark:border-slate-600 p-1.5">
                “Đúng – Sai”²
              </th>
              <th colSpan={3} className="border border-black dark:border-slate-600 p-1.5">
                Trả lời ngắn³
              </th>
            </tr>

            {/* Header Row 4: 15 Cognitive Level subcolumns */}
            <tr className="text-black dark:text-white font-bold text-center text-[10px] bg-slate-100 dark:bg-slate-800">
              {/* Nhiều lựa chọn */}
              <th className="border border-black dark:border-slate-600 p-1 w-9">Biết</th>
              <th className="border border-black dark:border-slate-600 p-1 w-9">Hiểu</th>
              <th className="border border-black dark:border-slate-600 p-1 w-11">Vận dụng</th>

              {/* Đúng - Sai */}
              <th className="border border-black dark:border-slate-600 p-1 w-9">Biết</th>
              <th className="border border-black dark:border-slate-600 p-1 w-9">Hiểu</th>
              <th className="border border-black dark:border-slate-600 p-1 w-11">Vận dụng</th>

              {/* Trả lời ngắn */}
              <th className="border border-black dark:border-slate-600 p-1 w-9">Biết</th>
              <th className="border border-black dark:border-slate-600 p-1 w-9">Hiểu</th>
              <th className="border border-black dark:border-slate-600 p-1 w-11">Vận dụng</th>

              {/* Tự luận */}
              <th className="border border-black dark:border-slate-600 p-1 w-9">Biết</th>
              <th className="border border-black dark:border-slate-600 p-1 w-9">Hiểu</th>
              <th className="border border-black dark:border-slate-600 p-1 w-11">Vận dụng</th>

              {/* Tổng */}
              <th className="border border-black dark:border-slate-600 p-1 w-9 bg-slate-200 dark:bg-slate-700/60 font-black">
                Biết
              </th>
              <th className="border border-black dark:border-slate-600 p-1 w-9 bg-slate-200 dark:bg-slate-700/60 font-black">
                Hiểu
              </th>
              <th className="border border-black dark:border-slate-600 p-1 w-11 bg-slate-200 dark:bg-slate-700/60 font-black">
                Vận dụng
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-black dark:divide-slate-600">
            {editableMatrix.map((row, idx) => {
              const rowBiết = getRowBiếtTotal(row);
              const rowHiểu = getRowHiểuTotal(row);
              const rowVậnDụng = getRowVậnDụngTotal(row);

              return (
                <tr key={idx} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40 transition-colors">
                  {/* TT */}
                  <td className="border border-black dark:border-slate-600 p-2 text-center font-bold">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.stt}
                        onChange={(e) => handleCellChange(row.stt, 'stt', e.target.value)}
                        className="w-8 text-center bg-amber-50 dark:bg-slate-800 border rounded-xs"
                      />
                    ) : (
                      row.stt
                    )}
                  </td>

                  {/* Chủ đề/Chương */}
                  <td className="border border-black dark:border-slate-600 p-2 font-semibold">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.topic}
                        onChange={(e) => handleCellChange(row.stt, 'topic', e.target.value)}
                        className="w-full bg-amber-50 dark:bg-slate-800 border p-1 rounded-xs"
                      />
                    ) : (
                      <MathText content={row.topic} />
                    )}
                  </td>

                  {/* Nội dung/đơn vị kiến thức */}
                  <td className="border border-black dark:border-slate-600 p-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.subTopic}
                        onChange={(e) => handleCellChange(row.stt, 'subTopic', e.target.value)}
                        className="w-full bg-amber-50 dark:bg-slate-800 border p-1 rounded-xs"
                      />
                    ) : (
                      <MathText content={row.subTopic} />
                    )}
                  </td>

                  {/* 1. Nhiều lựa chọn (Biết, Hiểu, Vận dụng) */}
                  <td className="border border-black dark:border-slate-600 p-1 text-center">
                    {renderCellContent(row, 'part1', 'remember', 'p1_rem')}
                  </td>
                  <td className="border border-black dark:border-slate-600 p-1 text-center">
                    {renderCellContent(row, 'part1', 'understand', 'p1_und')}
                  </td>
                  <td className="border border-black dark:border-slate-600 p-1 text-center">
                    {renderCellContent(row, 'part1', 'apply', 'p1_app')}
                  </td>

                  {/* 2. Đúng - Sai (Biết, Hiểu, Vận dụng) */}
                  <td className="border border-black dark:border-slate-600 p-1 text-center">
                    {renderCellContent(row, 'part2', 'remember', 'p2_rem')}
                  </td>
                  <td className="border border-black dark:border-slate-600 p-1 text-center">
                    {renderCellContent(row, 'part2', 'understand', 'p2_und')}
                  </td>
                  <td className="border border-black dark:border-slate-600 p-1 text-center">
                    {renderCellContent(row, 'part2', 'apply', 'p2_app')}
                  </td>

                  {/* 3. Trả lời ngắn (Biết, Hiểu, Vận dụng) */}
                  <td className="border border-black dark:border-slate-600 p-1 text-center">
                    {renderCellContent(row, 'part3', 'remember', 'p3_rem')}
                  </td>
                  <td className="border border-black dark:border-slate-600 p-1 text-center">
                    {renderCellContent(row, 'part3', 'understand', 'p3_und')}
                  </td>
                  <td className="border border-black dark:border-slate-600 p-1 text-center">
                    {renderCellContent(row, 'part3', 'apply', 'p3_app')}
                  </td>

                  {/* 4. Tự luận (Biết, Hiểu, Vận dụng) */}
                  <td className="border border-black dark:border-slate-600 p-1 text-center">
                    {renderCellContent(row, 'part4', 'remember', 'p4_rem')}
                  </td>
                  <td className="border border-black dark:border-slate-600 p-1 text-center">
                    {renderCellContent(row, 'part4', 'understand', 'p4_und')}
                  </td>
                  <td className="border border-black dark:border-slate-600 p-1 text-center">
                    {renderCellContent(row, 'part4', 'apply', 'p4_app')}
                  </td>

                  {/* Tổng hàng (Biết, Hiểu, Vận dụng) */}
                  <td className="border border-black dark:border-slate-600 p-1 text-center font-bold bg-slate-50 dark:bg-slate-800/50">
                    {rowBiết > 0 ? rowBiết : '-'}
                  </td>
                  <td className="border border-black dark:border-slate-600 p-1 text-center font-bold bg-slate-50 dark:bg-slate-800/50">
                    {rowHiểu > 0 ? rowHiểu : '-'}
                  </td>
                  <td className="border border-black dark:border-slate-600 p-1 text-center font-bold bg-slate-50 dark:bg-slate-800/50">
                    {rowVậnDụng > 0 ? rowVậnDụng : '-'}
                  </td>

                  {/* Tỉ lệ % điểm */}
                  <td className="border border-black dark:border-slate-600 p-2 text-center font-bold">
                    {isEditing ? (
                      <input
                        type="number"
                        value={row.percentage || ''}
                        onChange={(e) =>
                          handleCellChange(row.stt, 'percentage', parseFloat(e.target.value) || 0)
                        }
                        className="w-12 text-center bg-amber-50 dark:bg-slate-800 border rounded-xs"
                      />
                    ) : row.percentage ? (
                      `${row.percentage}%`
                    ) : (
                      '-'
                    )}
                  </td>

                  {isEditing && (
                    <td className="border border-black dark:border-slate-600 p-2 text-center">
                      <button
                        onClick={() => handleDeleteRow(row.stt)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xs"
                        title="Xóa dòng này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          {/* Footer Summary Rows (Matches Ministry Template Exactly) */}
          <tfoot>
            {/* Summary Row 1: Tổng số câu */}
            <tr className="font-bold text-center bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 text-center font-bold">
                Tổng số câu
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {totalP1 > 0 ? totalP1 : 12}
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {totalP2 > 0 ? totalP2 : 2}
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {totalP3 > 0 ? totalP3 : 4}
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {totalP4 > 0 ? totalP4 : 2}
              </td>
              <td className="border border-black dark:border-slate-600 p-1 font-bold">
                {totalBiếtAll > 0 ? totalBiếtAll : 9}
              </td>
              <td className="border border-black dark:border-slate-600 p-1 font-bold">
                {totalHiểuAll > 0 ? totalHiểuAll : 6}
              </td>
              <td className="border border-black dark:border-slate-600 p-1 font-bold">
                {totalVậnDụngAll > 0 ? totalVậnDụngAll : 5}
              </td>
              <td className="border border-black dark:border-slate-600 p-2 bg-slate-200 dark:bg-slate-700/60">
                {/* Gray empty cell as in Ministry template */}
              </td>
              {isEditing && <td className="border border-black dark:border-slate-600"></td>}
            </tr>

            {/* Summary Row 2: Tổng số điểm */}
            <tr className="font-bold text-center bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 text-center font-bold">
                Tổng số điểm
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {formatScore(scoreP1)}⁵
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {formatScore(scoreP2)}
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {formatScore(scoreP3)}
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {formatScore(scoreP4)}
              </td>
              <td className="border border-black dark:border-slate-600 p-1 font-bold">
                4,0
              </td>
              <td className="border border-black dark:border-slate-600 p-1 font-bold">
                3,0
              </td>
              <td className="border border-black dark:border-slate-600 p-1 font-bold">
                3,0
              </td>
              <td className="border border-black dark:border-slate-600 p-2 font-bold">
                10,0
              </td>
              {isEditing && <td className="border border-black dark:border-slate-600"></td>}
            </tr>

            {/* Summary Row 3: Tỉ lệ % */}
            <tr className="font-bold text-center bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 text-center font-bold">
                Tỉ lệ %
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {Math.round(scoreP1 * 10)}
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {Math.round(scoreP2 * 10)}
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {Math.round(scoreP3 * 10)}
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {Math.round(scoreP4 * 10)}
              </td>
              <td className="border border-black dark:border-slate-600 p-1 font-bold">
                40
              </td>
              <td className="border border-black dark:border-slate-600 p-1 font-bold">
                30
              </td>
              <td className="border border-black dark:border-slate-600 p-1 font-bold">
                30
              </td>
              <td className="border border-black dark:border-slate-600 p-2 font-bold">
                100%
              </td>
              {isEditing && <td className="border border-black dark:border-slate-600"></td>}
            </tr>
          </tfoot>
        </table>

        {/* Footnotes Section Below Table (Strictly Matching Image 1) */}
        <div className="mt-8 pt-4 border-t border-slate-400 dark:border-slate-600 font-serif text-[11.5px] leading-relaxed text-slate-700 dark:text-slate-300 space-y-1.5 max-w-5xl">
          <div className="w-32 border-b-2 border-black dark:border-slate-400 mb-2"></div>
          {OFFICIAL_MATRIX_FOOTNOTES.map((fn, fIdx) => (
            <div key={fIdx} className="flex items-start space-x-1">
              <span className="font-bold text-xs select-none">{fn.symbol}</span>
              <p className="italic">{fn.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
