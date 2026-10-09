import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-custom-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, systemInstruction, responseMimeType, responseSchema, customApiKey, images, model } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Nội dung Yêu cầu (prompt) không được để trống.' });
    }

    const selectedModel = typeof model === 'string' && model.trim().length > 0 ? model.trim() : 'gemini-2.5-flash';

    const apiKey = (typeof customApiKey === 'string' && customApiKey.trim().length > 0)
      ? customApiKey.trim()
      : ((req.headers['x-custom-api-key'] as string || '').trim() || process.env.GEMINI_API_KEY || '');

    if (!apiKey) {
      return res.status(400).json({
        error: '[NO_API_KEY] Chưa cấu hình API Key. Vui lòng cấu hình GEMINI_API_KEY hoặc nhập Gemini API Key trong phần Cài Đặt.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const config: any = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (responseMimeType) config.responseMimeType = responseMimeType;
    if (responseSchema) config.responseSchema = responseSchema;

    let contents: any = prompt;
    if (Array.isArray(images) && images.length > 0) {
      const parts: any[] = [];
      for (const imgUrl of images) {
        if (typeof imgUrl === 'string' && imgUrl.startsWith('data:')) {
          const match = imgUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        }
      }
      parts.push({ text: prompt });
      contents = parts;
    }

    // Danh sách mô hình tối ưu theo thứ tự ưu tiên (Tự động fallback nếu model được chọn bị lỗi / không tồn tại)
    const candidateModels = Array.from(
      new Set([selectedModel, 'gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'])
    );

    let lastError: any = null;
    for (const currentModel of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents,
          config,
        });

        const text = response.text || '';
        if (text) {
          return res.status(200).json({ text, modelUsed: currentModel });
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Lỗi khi gọi model ${currentModel} trên Vercel:`, err.message || err);
        const errMsg = String(err.message || err);
        // Nếu lỗi là API key sai (401/403), ngắt ngay lập tức
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('401') || errMsg.includes('API key not valid')) {
          throw err;
        }
        // Đối với lỗi model không tồn tại (404 như 3.6-flash) hoặc quá tải (503/429), tiếp tục thử model dự phòng
      }
    }

    throw lastError || new Error('Không thể tạo dữ liệu từ các mô hình Gemini AI.');
  } catch (error: any) {
    console.error('Lỗi khi gọi Gemini API:', error);
    return res.status(500).json({
      error: error.message || 'Đã xảy ra lỗi khi tạo dữ liệu từ Gemini AI.',
    });
  }
}
