// src/sidebar/gemini.ts (Final version with corrected property name)

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent";

const FULL_BODY_PROMPT = `Based on the person in the uploaded image, realistically extend their body to create a full-body photograph. Maintain the same clothing style, lighting, and overall aesthetic as the original photo. The person should be standing in a neutral pose against a simple, light-gray background.`;

/**
 * 调用 Gemini API 生成全身照
 * @param base64Image 用户上传的原始图片 (Base64格式)
 * @param apiKey 用户的 Gemini API Key
 * @returns 返回生成的新图片的 Base64 字符串
 */
export async function generateFullBodyImage(base64Image: string, apiKey: string): Promise<string> {
  const pureBase64 = base64Image.split(',')[1];

  const requestBody = {
    contents: [
      {
        parts: [
          { text: FULL_BODY_PROMPT },
          {
            inline_data: { // 注意：发送给 API 的数据模型仍然使用下划线
              mime_type: 'image/jpeg',
              data: pureBase64,
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`API 请求失败: ${errorBody.error?.message || response.statusText}`);
  }

  const responseData = await response.json();

  // --- 核心修复：使用正确的驼峰命名法 'inlineData' ---
  const imagePart = responseData.candidates?.[0]?.content?.parts?.find(
    (part: any) => part.inlineData // 从 inline_data 改为 inlineData
  );
  const generatedImageData = imagePart?.inlineData?.data; // 从 inline_data 改为 inlineData
  // --- 修复结束 ---

  if (!generatedImageData) {
    console.error('Gemini API Full Response:', JSON.stringify(responseData, null, 2));

    const finishReason = responseData.candidates?.[0]?.finishReason;
    const promptFeedback = responseData.promptFeedback;

    if (promptFeedback?.blockReason) {
      throw new Error(`请求被安全策略阻止 (${promptFeedback.blockReason})。请尝试一张不包含清晰人脸或更常规的照片。`);
    }

    // ... (其他错误处理逻辑保持不变)
    switch (finishReason) {
      case 'STOP':
        throw new Error('AI 模型完成了运行但没有输出图像。这通常是由于安全策略限制（例如，包含人物的图片）。请尝试一张不同的照片。');
      case 'SAFETY':
        throw new Error('请求因安全原因被拒绝。请确保您的图片和提示内容是适当的。');
      case 'RECITATION':
        throw new Error('请求被拒绝，因为可能生成受版权保护的内容。');
      default:
        throw new Error(`未能生成图片，API 返回了未知原因: ${JSON.stringify(finishReason || responseData)}`);
    }
  }

  return `data:image/jpeg;base64,${generatedImageData}`;
}


/**
 * 从包含复杂背景的图片中提取指定的服饰单品。
 * @param base64Image 包含服饰的原始图片 (Base64格式)
 * @param category 用户选择的服饰类别 (e.g., "clothing", "accessories")
 * @param apiKey 用户的 Gemini API Key
 * @returns 返回一张背景干净、仅包含服饰的新图片的 Base64 字符串
 */
export async function extractApparelFromImage(
  base64Image: string,
  category: string,
  apiKey: string
): Promise<string> {
  // --- Prompt Engineering Starts Here ---

  // 1. 定义一个基础指令，设定角色和基本目标
  const baseInstruction = `
You are an expert e-commerce product image editor. Your task is to extract specific items from the provided photograph.
The final output MUST be a single image with a completely clean, plain white background (#FFFFFF).
Remove the model, background, and any other distracting elements entirely.
  `;

  // 2. 根据用户选择的类别，动态构建详细指令
  let detailedInstruction = '';
  switch (category) {
    case 'all items':
      detailedInstruction = `
Identify EVERY SINGLE fashion item in the photo. This includes all clothing (like shirts, pants, dresses), accessories (like handbags, hats, belts, sunglasses), and footwear.
Extract ALL of them.
If there are multiple items, arrange them neatly side-by-side, like a "flat lay" or "knolling" photograph. DO NOT overlap the items. Ensure every item is fully visible.
      `;
      break;
    case 'clothing':
      detailedInstruction = `
Identify only the main clothing items (e.g., shirt, jacket, trousers, dress, skirt).
Ignore accessories like bags, glasses, hats, and jewelry.
Extract the identified clothing pieces. If there are multiple clothing items (e.g., a top and pants), arrange them neatly side-by-side without overlapping.
      `;
      break;
    case 'accessories':
      detailedInstruction = `
Identify ONLY the fashion accessories. This includes items like the handbag, hat, sunglasses, scarf, belt, etc.
Ignore the main clothing (shirt, pants, etc.) and footwear.
Extract ALL identified accessories. Arrange them neatly side-by-side on the white background without overlapping. It is critical that you find every single accessory.
      `;
      break;
    default:
      // 默认情况，与 "all items" 相同
      detailedInstruction = `
Identify EVERY SINGLE fashion item in the photo. This includes all clothing, accessories, and footwear.
Extract ALL of them and arrange them neatly side-by-side without overlapping.
      `;
  }

  // 3. 组合成最终的 Prompt
  const FINAL_PROMPT = baseInstruction + detailedInstruction;

  // --- Prompt Engineering Ends Here ---
  const pureBase64 = base64Image.split(',')[1];

  const requestBody = {
    contents: [
      {
        parts: [
          { text: FINAL_PROMPT },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: pureBase64,
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`API 请求失败: ${errorBody.error?.message || response.statusText}`);
  }

  const responseData = await response.json();

  const imagePart = responseData.candidates?.[0]?.content?.parts?.find(
    (part: any) => part.inlineData
  );
  const generatedImageData = imagePart?.inlineData?.data;

  if (!generatedImageData) {
    console.error('Gemini API Full Response:', JSON.stringify(responseData, null, 2));
    const finishReason = responseData.candidates?.[0]?.finishReason || 'Unknown';
    throw new Error(`AI 未能提取服饰。原因: ${finishReason}. 请检查控制台日志获取详情。`);
  }

  return `data:image/jpeg;base64,${generatedImageData}`;
}


/**
 * 将服饰图片“穿”在用户模特身上，生成虚拟试穿图。
 * @param modelImageBase64 用户的全身模特照片 (Base64)
 * @param apparelImageBase64 提取出的干净背景的服饰照片 (Base64)
 * @param apiKey 用户的 Gemini API Key
 * @returns 返回最终虚拟试穿效果图的 Base64 字符串
 */
export async function performVirtualTryOn(
  modelImageBase64: string,
  apparelImageBase64: string,
  apiKey: string
): Promise<string> {
  const TRY_ON_PROMPT = `
You are a master fashion stylist and photo editor. Your task is to create a realistic virtual try-on image.
You will be given two images: The first is the person (the model), the second is the clothing item.
Your job is to realistically dress the person from the first image in the clothing item from the second image.
CRITICAL: Ensure the fit, drape, lighting, and shadows of the clothing look completely natural on the person's body.
Maintain the original background and the exact pose of the person from the first image. Do not change the person's face or body.
The output MUST be a high-fidelity, photorealistic image.
`;

  const pureModelBase64 = modelImageBase64.split(',')[1];
  const pureApparelBase64 = apparelImageBase64.split(',')[1];

  const requestBody = {
    contents: [
      {
        parts: [
          { text: TRY_ON_PROMPT },
          { inline_data: { mime_type: 'image/jpeg', data: pureModelBase64 } },
          { inline_data: { mime_type: 'image/jpeg', data: pureApparelBase64 } },
        ],
      },
    ],
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`API 请求失败: ${errorBody.error?.message || response.statusText}`);
  }

  const responseData = await response.json();
  
  const imagePart = responseData.candidates?.[0]?.content?.parts?.find(
    (part: any) => part.inlineData
  );
  const generatedImageData = imagePart?.inlineData?.data;

  // --- 核心修复：应用了与之前相同的、更强大的错误处理逻辑 ---
  if (!generatedImageData) {
    console.error('Gemini API Full Response (Try-On):', JSON.stringify(responseData, null, 2));

    const finishReason = responseData.candidates?.[0]?.finishReason;
    const promptFeedback = responseData.promptFeedback;

    if (promptFeedback?.blockReason) {
      throw new Error(`请求被安全策略阻止 (${promptFeedback.blockReason})。请尝试不同的模特或服饰图片。`);
    }

    switch (finishReason) {
      case 'STOP':
        throw new Error('AI 模型完成了运行但没有输出试穿图。这通常是由于安全策略限制。请尝试不同的图片。');
      case 'SAFETY':
        throw new Error('请求因安全原因被拒绝。请确保您的模特和服饰图片都是适当的。');
      case 'RECITATION':
         throw new Error('请求被拒绝，因为可能生成受版权保护的内容。');
      default:
        throw new Error(`未能生成试穿图，API 返回了未知原因: ${JSON.stringify(finishReason || responseData)}`);
    }
  }
  
  return `data:image/jpeg;base64,${generatedImageData}`;
}

/**
 * 基于现有的试穿图进行创意修改和重新生成。
 * @param baseImageBase64 当前的试穿效果图 (Base64)
 * @param creativePrompt 用户输入的创意指令 (e.g., "change background to a cafe")
 * @param apiKey 用户的 Gemini API Key
 * @returns 返回一张经过创意修改后的新效果图 (Base64)
 */
export async function regenerateWithCreativeEdit(
  baseImageBase64: string,
  creativePrompt: string,
  apiKey: string
): Promise<string> {
  const REGENERATION_PROMPT = `
You are a creative director for a high-end fashion magazine photoshoot.
Using the provided image as a base, your task is to re-imagine and regenerate it based on a specific creative instruction.

**CRITICAL RULES:**
1.  **DO NOT CHANGE THE PERSON'S IDENTITY:** The face, body shape, and ethnicity of the person in the base image MUST remain exactly the same.
2.  **DO NOT CHANGE THE CLOTHING:** The clothing item(s) the person is wearing MUST remain identical to the base image. Do not add, remove, or change any clothing.

**YOUR CREATIVE TASK:**
Apply the following change to the image: "${creativePrompt}"

**FINAL STYLE:**
The output image MUST be a photorealistic, professional-grade fashion photograph. It should have dynamic, compelling lighting and a natural, confident model pose suitable for the new context.
`;

  const pureBase64 = baseImageBase64.split(',')[1];

  const requestBody = {
    contents: [
      {
        parts: [
          { text: REGENERATION_PROMPT },
          { inline_data: { mime_type: 'image/jpeg', data: pureBase64 } },
        ],
      },
    ],
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`API 请求失败: ${errorBody.error?.message || response.statusText}`);
  }

  const responseData = await response.json();
  
  const imagePart = responseData.candidates?.[0]?.content?.parts?.find(
    (part: any) => part.inlineData
  );
  const generatedImageData = imagePart?.inlineData?.data;

  if (!generatedImageData) {
    console.error('Gemini API Full Response (Regeneration):', JSON.stringify(responseData, null, 2));
    const finishReason = responseData.candidates?.[0]?.finishReason || 'Unknown';
    throw new Error(`AI 未能重新生成图片。原因: ${finishReason}.`);
  }
  
  return `data:image/jpeg;base64,${generatedImageData}`;
}