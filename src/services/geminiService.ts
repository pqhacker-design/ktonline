import { ExamMetadata, ExamPackage, Question } from '../types';
import { PromptEngine } from './promptEngine';
import { ShuffleEngine } from './shuffleEngine';
import { ValidationEngine } from './validationEngine';
import { StorageEngine } from './storageEngine';
import { callGeminiApi } from './geminiClient';
import { LatexValidator } from './latexValidator';

export class GeminiService {
  /**
   * Bộ kiểm tra định dạng toán học (LaTeX Validator)
   */
  static latexValidator = LatexValidator;

  /**
   * Phương thức kiểm tra và sửa lỗi cú pháp LaTeX cho văn bản bất kỳ
   */
  static validateAndRepairLatex(text: string) {
    return LatexValidator.validateAndRepairString(text);
  }

  /**
   * Phương thức kiểm tra và sửa lỗi cú pháp LaTeX cho câu hỏi
   */
  static validateAndRepairQuestion(q: Question) {
    return LatexValidator.validateAndRepairQuestion(q);
  }

  /**
   * Phương thức kiểm tra và sửa lỗi cú pháp LaTeX cho toàn bộ gói đề thi
   */
  static validateAndRepairExamPackage(pkg: ExamPackage) {
    return LatexValidator.validateAndRepairExamPackage(pkg);
  }

  /**
   * Gọi backend API hoặc Client SDK để sinh Đề kiểm tra, Ma trận, Bảng đặc tả và Đáp án
   */
  static async generateExamPackage(
    metadata: ExamMetadata,
    onProgress?: (message: string) => void
  ): Promise<ExamPackage> {
    if (onProgress) onProgress('Đang tạo Prompt chuẩn Công văn 7991/BGDĐT...');

    const systemInstruction = PromptEngine.getSystemInstruction(metadata.subject);
    const prompt = PromptEngine.buildGenerationPrompt(metadata);
    const settings = StorageEngine.getSettings();
    const customApiKey = settings.customApiKey;
    const selectedModel = settings.selectedModel || 'gemini-3.6-flash';

    if (!customApiKey || customApiKey.trim().length === 0) {
      throw new Error(
        '[NO_API_KEY] Bắt buộc người dùng phải nhập Gemini API Key cá nhân! Vui lòng nhập API Key để bắt đầu sinh đề thi.'
      );
    }

    if (onProgress) onProgress(`Đang gửi yêu cầu tới Gemini AI (${selectedModel})...`);

    const rawText = await callGeminiApi({
      prompt,
      systemInstruction,
      responseMimeType: 'application/json',
      customApiKey,
      model: selectedModel,
      images: metadata.referenceImages || [],
      onStatusUpdate: onProgress,
    });

    if (!rawText) {
      throw new Error('Gemini API không phản hồi dữ liệu.');
    }

    if (onProgress) onProgress('Đang thẩm định và kiểm tra cấu trúc ma trận, câu hỏi...');

    const validationResult = ValidationEngine.validateAndRepair(rawText, metadata);

    if (!validationResult.isValid) {
      throw new Error(
        `Dữ liệu từ AI chưa chuẩn hóa: ${validationResult.errors.join('; ')}`
      );
    }

    if (onProgress)
      onProgress(`Đang xáo trộn và sinh ${metadata.codeCount || 1} mã đề kiểm tra...`);

    // Xáo trộn và sinh nhiều mã đề (101, 102, 103...)
    const { exams, answerKeys } = ShuffleEngine.generateMultipleExamCodes(
      validationResult.questions,
      metadata.codeCount || 1
    );

    const initialPackage: ExamPackage = {
      id: `exam-pack-${Date.now()}`,
      createdAt: new Date().toISOString(),
      metadata,
      matrix: validationResult.matrix,
      specification: validationResult.specification,
      exams,
      answerKeys,
    };

    // Tự động rà soát và sửa các lỗi hiển thị ký hiệu toán học phổ biến (dấu đóng ngoặc, căn thức, phân số,...)
    if (onProgress) {
      onProgress('Đang tự động rà soát & sửa lỗi ký hiệu toán học (LaTeX Validator)...');
    }

    const { repairedPackage, totalIssuesFixed } = LatexValidator.validateAndRepairExamPackage(initialPackage);

    if (totalIssuesFixed > 0 && onProgress) {
      onProgress(`Đã tự động chuẩn hóa ${totalIssuesFixed} ký hiệu toán học (căn thức, đóng mở ngoặc, phân số).`);
    }

    // Tự động lưu gói đề thi đã chuẩn hóa vào StorageEngine
    try {
      StorageEngine.saveExamPackage(repairedPackage);
    } catch (saveErr) {
      console.warn('Lỗi tự động lưu gói đề thi vào StorageEngine:', saveErr);
    }

    if (onProgress) onProgress('Đã hoàn tất khởi tạo và lưu trữ gói đề thi!');

    return repairedPackage;
  }

  static async generateExam(
    metadata: ExamMetadata,
    onProgress?: (message: string) => void
  ): Promise<ExamPackage> {
    return this.generateExamPackage(metadata, onProgress);
  }
}
