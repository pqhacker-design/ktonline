import React, { useState } from 'react';
import { Download, Edit3, FileSpreadsheet, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { ExamPackage, SpecRow } from '../types';
import { MathText } from './MathText';
import { OFFICIAL_SPEC_FOOTNOTES, getOfficialSampleExamPackage } from '../services/officialTemplateData';

interface SpecificationViewProps {
  examPackage: ExamPackage | null;
  onUpdateSpec?: (updatedSpec: SpecRow[]) => void;
  onExportWord?: () => void;
  onExportExcel?: () => void;
}

export const SpecificationView: React.FC<SpecificationViewProps> = ({
  examPackage,
  onUpdateSpec,
  onExportWord,
  onExportExcel,
}) => {
  const currentPackage = examPackage || getOfficialSampleExamPackage();
  const { metadata, specification } = currentPackage;

  const [isEditing, setIsEditing] = useState(false);
  const [editableSpec, setEditableSpec] = useState<SpecRow[]>(
    specification && specification.length > 0 ? specification : getOfficialSampleExamPackage().specification
  );

  React.useEffect(() => {
    if (examPackage && examPackage.specification) {
      setEditableSpec(examPackage.specification);
    }
  }, [examPackage]);

  // Display mode: 'symbolic' (e.g. (n)\n(NL?)⁶) or 'numeric' (e.g. 1, 2)
  const [displayMode, setDisplayMode] = useState<'symbolic' | 'numeric'>('symbolic');

  const handleCellChange = (stt: number | string, field: string, value: any) => {
    setEditableSpec((prev) =>
      prev.map((row) => (row.stt === stt ? { ...row, [field]: value } : row))
    );
  };

  const handleCustomCellTextChange = (stt: number | string, cellKey: string, value: string) => {
    setEditableSpec((prev) =>
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
    setEditableSpec((prev) =>
      prev.map((row) => {
        if (row.stt !== stt) return row;
        const curPart = row[partKey] || { remember: 0, understand: 0, apply: 0, advanced: 0 };
        const updatedPart = { ...curPart, [level]: numValue };
        return { ...row, [partKey]: updatedPart };
      })
    );
  };

  const handleAddRow = () => {
    const nextStt = editableSpec.length > 0 ? Number(editableSpec[editableSpec.length - 1].stt) + 1 || editableSpec.length + 1 : 1;
    const newRow: SpecRow = {
      stt: nextStt,
      topic: `Chủ đề ${nextStt}`,
      subTopic: 'Nội dung kiến thức mới',
      requirements: `- Biết...\n...\n- Hiểu...\n...\n- VD...\n...`,
      part1: { remember: 1, understand: 0, apply: 0, advanced: 0 },
      part2: { remember: 0, understand: 0, apply: 0, advanced: 0 },
      part3: { remember: 0, understand: 0, apply: 0, advanced: 0 },
      part4: { remember: 0, understand: 0, apply: 0, advanced: 0 },
      totalPoints: 0.25,
      competency: 'NL_gqvđ',
      cellTexts: {
        p1_rem: '(1)\n(NL?)⁶',
      },
    };
    setEditableSpec([...editableSpec, newRow]);
  };

  const handleDeleteRow = (stt: number | string) => {
    setEditableSpec((prev) => prev.filter((r) => r.stt !== stt));
  };

  const handleResetToOfficialSample = () => {
    const sample = getOfficialSampleExamPackage();
    setEditableSpec(sample.specification);
    if (onUpdateSpec) {
      onUpdateSpec(sample.specification);
    }
  };

  const handleSave = () => {
    if (onUpdateSpec) {
      onUpdateSpec(editableSpec);
    }
    setIsEditing(false);
  };

  // Helper counts
  const getBiết = (part: any): number => Number(part?.remember || 0);
  const getHiểu = (part: any): number => Number(part?.understand || 0);
  const getVậnDụng = (part: any): number => Number(part?.apply || 0) + Number(part?.advanced || 0);

  const totalP1 = editableSpec.reduce(
    (acc, r) => acc + getBiết(r.part1) + getHiểu(r.part1) + getVậnDụng(r.part1),
    0
  );
  const totalP2 = editableSpec.reduce(
    (acc, r) => acc + getBiết(r.part2) + getHiểu(r.part2) + getVậnDụng(r.part2),
    0
  );
  const totalP3 = editableSpec.reduce(
    (acc, r) => acc + getBiết(r.part3) + getHiểu(r.part3) + getVậnDụng(r.part3),
    0
  );
  const totalP4 = editableSpec.reduce(
    (acc, r) => acc + getBiết(r.part4) + getHiểu(r.part4) + getVậnDụng(r.part4),
    0
  );

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

  const renderCellContent = (
    row: SpecRow,
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
          <textarea
            value={customText !== undefined ? customText : num > 0 ? (row.competency ? `(${num})\n(${row.competency})⁶` : `(${num})`) : ''}
            onChange={(e) => handleCustomCellTextChange(row.stt, cellKey, e.target.value)}
            rows={2}
            placeholder={num > 0 ? `(${num})\n(NL?)⁶` : '-'}
            className="w-14 text-center text-[11px] font-semibold bg-amber-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xs p-0.5 leading-tight"
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
        return (
          <div className="text-[11px] leading-tight font-medium text-slate-800 dark:text-slate-100 whitespace-pre-line">
            {customText}
          </div>
        );
      }
      if (num > 0) {
        return (
          <div className="text-[11px] leading-tight font-medium text-slate-800 dark:text-slate-100">
            <div>({num})</div>
            {row.competency && <div className="text-[10px] text-teal-700 dark:text-teal-400">({row.competency})⁶</div>}
          </div>
        );
      }
      return <span className="text-slate-300 dark:text-slate-600">-</span>;
    }

    if (num > 0) {
      return <span className="font-semibold text-slate-800 dark:text-slate-100">{num}</span>;
    }
    return <span className="text-slate-300 dark:text-slate-600">-</span>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
              Mẫu Chuẩn Bộ GD&ĐT
            </span>
            <span className="text-xs text-slate-500">Môn {metadata.subject} • {metadata.grade}</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            Bản Đặc Tả Đề Kiểm Tra Định Kì
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bám sát Chương trình GDPT 2018 ({metadata.curriculum}) | {metadata.examTitle}
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
              Mẫu Ký hiệu (n) (NL?)⁶
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

          <button
            onClick={handleResetToOfficialSample}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5"
            title="Nạp lại bảng đặc tả mẫu chuẩn Bộ GD&ĐT"
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
                <span>Lưu Đặc Tả</span>
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
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Document Paper Container matching Image 2 */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-lg border border-slate-200 dark:border-slate-800 overflow-x-auto text-slate-900 dark:text-slate-100">
        <div className="text-center mb-6">
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider font-serif">
            2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ
          </h1>
          <div className="text-xs text-slate-500 font-serif italic mt-1">
            Môn: {metadata.subject} - Lớp {metadata.grade} ({metadata.schoolYear || '2026 - 2027'})
          </div>
        </div>

        {/* 16-Column Specification Table */}
        <table className="w-full text-xs text-left border-collapse border border-black dark:border-slate-600 font-serif">
          <thead>
            {/* Header Row 1 */}
            <tr className="text-black dark:text-white font-bold text-center bg-slate-50 dark:bg-slate-800/80">
              <th rowSpan={4} className="border border-black dark:border-slate-600 p-2 w-10">
                TT
              </th>
              <th rowSpan={4} className="border border-black dark:border-slate-600 p-2 min-w-[120px] max-w-[150px]">
                Chủ đề/Chương
              </th>
              <th rowSpan={4} className="border border-black dark:border-slate-600 p-2 min-w-[140px] max-w-[170px]">
                Nội dung/đơn vị kiến thức
              </th>
              <th rowSpan={4} className="border border-black dark:border-slate-600 p-2 min-w-[240px]">
                Yêu cầu cần đạt
              </th>
              <th colSpan={12} className="border border-black dark:border-slate-600 p-2">
                Số câu hỏi ở các mức độ đánh giá
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
                “Đúng – Sai”
              </th>
              <th colSpan={3} className="border border-black dark:border-slate-600 p-1.5">
                Trả lời ngắn
              </th>
            </tr>

            {/* Header Row 4: 12 subcolumns */}
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
            </tr>
          </thead>

          <tbody className="divide-y divide-black dark:divide-slate-600">
            {editableSpec.map((row, idx) => {
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

                  {/* Yêu cầu cần đạt (Biết..., Hiểu..., VD...) */}
                  <td className="border border-black dark:border-slate-600 p-2.5 leading-relaxed">
                    {isEditing ? (
                      <textarea
                        value={row.requirements}
                        onChange={(e) => handleCellChange(row.stt, 'requirements', e.target.value)}
                        rows={5}
                        className="w-full bg-amber-50 dark:bg-slate-800 border p-1 rounded-xs text-xs"
                      />
                    ) : (
                      <div className="whitespace-pre-line text-[11.5px]">
                        <MathText content={row.requirements} />
                      </div>
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

          {/* Footer Summary Rows matching Image 2 */}
          <tfoot>
            {/* Row 1: Tổng số câu */}
            <tr className="font-bold text-center bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
              <td colSpan={4} className="border border-black dark:border-slate-600 p-2 text-center font-bold">
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
              {isEditing && <td className="border border-black dark:border-slate-600"></td>}
            </tr>

            {/* Row 2: Tổng số điểm */}
            <tr className="font-bold text-center bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
              <td colSpan={4} className="border border-black dark:border-slate-600 p-2 text-center font-bold">
                Tổng số điểm
              </td>
              <td colSpan={3} className="border border-black dark:border-slate-600 p-2 font-bold">
                {formatScore(scoreP1)}
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
              {isEditing && <td className="border border-black dark:border-slate-600"></td>}
            </tr>

            {/* Row 3: Tỉ lệ % */}
            <tr className="font-bold text-center bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
              <td colSpan={4} className="border border-black dark:border-slate-600 p-2 text-center font-bold">
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
              {isEditing && <td className="border border-black dark:border-slate-600"></td>}
            </tr>
          </tfoot>
        </table>

        {/* Footnote Section Below Table (Strictly Matching Image 2) */}
        <div className="mt-8 pt-4 border-t border-slate-400 dark:border-slate-600 font-serif text-[11.5px] leading-relaxed text-slate-700 dark:text-slate-300 space-y-1.5 max-w-5xl">
          <div className="w-32 border-b-2 border-black dark:border-slate-400 mb-2"></div>
          {OFFICIAL_SPEC_FOOTNOTES.map((fn, fIdx) => (
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
