/**
 * gemini_detector.js - Google Gemini 視覺大模型智慧相片邊界辨識引擎 (BYOK 方案 A)
 * 
 * 核心特性：
 * 1. 100% 本地金鑰儲存 (LocalStorage)，絕不經過任何第三方雲端伺服器
 * 2. 支援 Gemini 3.6 Flash 等 2026 最新大模型，支援自訂輸入與自動探測
 * 3. 智慧多照片分割：相簿頁、桌面多張擺放、極端反光、拍歪傾斜均能秒級精準捕捉
 * 4. 嚴格 JSON 結構化輸出 (Structured Outputs: responseMimeType = application/json)
 * 5. 全面接管自動偵測：摒棄傳統 OpenCV 雜訊誤判，專注大模型真實語意理解
 */

(function () {
  const STORAGE_KEY = 'photoautocrop_gemini_api_key';
  const STORAGE_MODEL = 'photoautocrop_gemini_model';
  const STORAGE_ENABLED = 'photoautocrop_gemini_enabled';

  // Google 官方主流標準視覺大模型：Gemini 2.0 Flash / 1.5 Flash
  const DEFAULT_MODEL = 'gemini-2.0-flash';

  class GeminiDetector {
    constructor() {
      this.apiKey = localStorage.getItem(STORAGE_KEY) || '';
      this.model = localStorage.getItem(STORAGE_MODEL) || DEFAULT_MODEL;
      this.enabled = localStorage.getItem(STORAGE_ENABLED) !== 'false';
      this.availableModels = [];
      this.preferredApiVersion = 'v1beta';
    }

    getApiKey() {
      return this.apiKey ? this.apiKey.trim() : '';
    }

    setApiKey(key) {
      this.apiKey = (key || '').trim();
      this.availableModels = []; // 重置快取清單
      if (this.apiKey) {
        localStorage.setItem(STORAGE_KEY, this.apiKey);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    getModel() {
      return this.model || DEFAULT_MODEL;
    }

    setModel(modelName) {
      this.model = (modelName || DEFAULT_MODEL).trim();
      localStorage.setItem(STORAGE_MODEL, this.model);
    }

    /**
     * 智慧解析 Google API 真實線上端點 (以使用者選取優先，杜絕語音/純音訊等非多模態模型)
     */
    getEffectiveApiCandidates(reqModel) {
      const chosen = (reqModel || this.getModel()).trim();
      let candidates = [];

      // 使用者明確選取的模型永遠最高優先嘗試
      if (chosen) {
        candidates.push(chosen);
        if (chosen.includes('lite')) {
          candidates.push('gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-lite-preview');
        } else if (chosen.includes('pro')) {
          candidates.push('gemini-3.1-pro-preview', 'gemini-pro-latest', 'gemini-2.5-pro', 'gemini-1.5-pro');
        } else {
          candidates.push('gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash');
        }
      }

      // 若線上已成功獲取真實支援清單，依序排入真實開通的清單
      if (Array.isArray(this.availableModels) && this.availableModels.length > 0) {
        const flashModels = this.availableModels.filter(m => m.includes('flash'));
        candidates.push(...flashModels);
        candidates.push(...this.availableModels);
      } else {
        candidates.push(
          'gemini-3.6-flash',
          'gemini-flash-lite-latest',
          'gemini-flash-latest',
          'gemini-2.5-flash',
          'gemini-2.0-flash'
        );
      }

      return [...new Set(candidates.filter(Boolean))];
    }

    isEnabled() {
      return !!this.getApiKey() && this.enabled;
    }

    setEnabled(bool) {
      this.enabled = !!bool;
      localStorage.setItem(STORAGE_ENABLED, this.enabled ? 'true' : 'false');
    }

    /**
     * 呼叫 Google 官方 ListModels API，查詢此 Key 真正開放的【視覺多模態】模型清單
     * 嚴格排除 TTS 語音生成、純音訊、向量嵌入等非視覺模型
     */
    async fetchAvailableModels(apiKey) {
      const key = (apiKey || this.getApiKey()).trim();
      if (!key) return [];
      if (this.availableModels && this.availableModels.length > 0) {
        return this.availableModels;
      }

      const versions = ['v1beta', 'v1'];
      for (const ver of versions) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/${ver}/models?key=${encodeURIComponent(key)}`;
          const res = await fetch(endpoint, {
            headers: { 'x-goog-api-key': key }
          });
          if (!res.ok) continue;
          const data = await res.json();
          if (data && Array.isArray(data.models)) {
            const models = data.models
              .filter(m => {
                if (!Array.isArray(m.supportedGenerationMethods) || !m.supportedGenerationMethods.includes('generateContent')) {
                  return false;
                }
                const name = (m.name || '').toLowerCase();
                // 嚴格排除 TTS 語音、純音訊、向量與專用模型，確保純視覺/文本多模態模型
                if (name.includes('tts') || name.includes('audio') || name.includes('embedding') || name.includes('imagen') || name.includes('robotics')) {
                  return false;
                }
                return name.includes('gemini');
              })
              .map(m => m.name.replace(/^models\//, ''));

            if (models.length > 0) {
              this.availableModels = models;
              this.preferredApiVersion = ver;
              return models;
            }
          }
        } catch (err) {
          console.warn(`查詢 [${ver}] 可用模型清單失敗:`, err);
        }
      }
      return [];
    }

    /**
     * 測試 Gemini API Key 連線有效性 (雙向容錯探測與即時模型回填)
     */
    async testConnection(apiKey, requestedModel) {
      const key = (apiKey || this.getApiKey()).trim();
      if (!key) {
        throw new Error('請先輸入 Google Gemini API Key');
      }

      const reqModel = (requestedModel || this.getModel()).trim();

      // 先行查詢此 Key 真實支援的所有可用模型清單 (已自動排除非視覺模型)
      const onlineModels = await this.fetchAvailableModels(key);
      const candidates = this.getEffectiveApiCandidates(reqModel);

      let lastError = null;
      const versions = this.preferredApiVersion ? [this.preferredApiVersion, 'v1beta', 'v1'] : ['v1beta', 'v1'];
      const uniqueVersions = [...new Set(versions)];

      for (const modelToTry of candidates) {
        for (const ver of uniqueVersions) {
          const endpoint = `https://generativelanguage.googleapis.com/${ver}/models/${encodeURIComponent(modelToTry)}:generateContent?key=${encodeURIComponent(key)}`;
          const startTime = performance.now();

          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': key
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Respond with: OK' }] }]
              })
            });

            const elapsed = Math.round(performance.now() - startTime);

            if (response.ok) {
              this.setModel(modelToTry);
              this.preferredApiVersion = ver;
              return {
                success: true,
                latencyMs: elapsed,
                model: modelToTry,
                apiVersion: ver,
                availableModels: onlineModels
              };
            }

            let errDetail = response.statusText;
            try {
              const errData = await response.json();
              errDetail = errData.error?.message || errDetail;
            } catch (_) {}

            // 僅在明確為金鑰無效/過期時拋出阻斷異常；若是模型特定參數/模態報錯則繼續嘗試下一個候選模型
            const isKeyInvalid = response.status === 403 || errDetail.includes('API_KEY_INVALID') || errDetail.includes('key not valid');
            if (isKeyInvalid) {
              throw new Error(`API 金鑰無效或權限不足 (${errDetail})`);
            }

            lastError = new Error(`[${modelToTry} / ${ver}] HTTP ${response.status}: ${errDetail}`);
          } catch (fetchErr) {
            if (fetchErr.message && fetchErr.message.includes('API 金鑰無效')) {
              throw fetchErr;
            }
            lastError = fetchErr;
          }
        }
      }

      throw lastError || new Error('連線失敗，請檢查 API Key 或網路狀態');
    }

    /**
     * 將 Image 或 Canvas 轉換為適合 Vision API 傳輸的高解析度 Base64 (提升至 1600px 確保多目標微細接縫與角點精準辨識)
     */
    prepareImageBase64(imgElement) {
      const naturalW = imgElement.naturalWidth || imgElement.videoWidth || imgElement.width;
      const naturalH = imgElement.naturalHeight || imgElement.videoHeight || imgElement.height;

      if (!naturalW || !naturalH) {
        throw new Error('影像解析度無效，無法進行 AI 掃描');
      }

      // 1600px 大幅提升細節清晰度 (老相簿多照片縫隙、星號底紙花紋分界清晰可辨)，兼顧極低傳輸延遲
      const maxDim = 1600;
      let targetW = naturalW;
      let targetH = naturalH;

      if (naturalW > maxDim || naturalH > maxDim) {
        if (naturalW >= naturalH) {
          targetW = maxDim;
          targetH = Math.round((naturalH / naturalW) * maxDim);
        } else {
          targetH = maxDim;
          targetW = Math.round((naturalW / naturalH) * maxDim);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgElement, 0, 0, targetW, targetH);

      // 質量 0.86 避免 JPEG 塊狀噪點模糊相紙真實邊界
      const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      const base64Data = dataUrl.split(',')[1];

      return {
        base64: base64Data,
        mimeType: 'image/jpeg',
        naturalWidth: naturalW,
        naturalHeight: naturalH
      };
    }

    /**
     * 呼叫 Gemini Vision 大模型進行多相片邊界精準分割與自動擺正 (Google 官方 Flash 極速架構)
     */
    async detectPhotoRegions(imgElement) {
      const apiKey = this.getApiKey();
      if (!apiKey) {
        throw new Error('未配置 Gemini API Key');
      }

      const { base64, mimeType, naturalWidth, naturalHeight } = this.prepareImageBase64(imgElement);

      const systemPrompt = `You are a world-class computer vision AI specialized in digitizing vintage photo album pages, scrapbooks, and multi-photo scans.

CRITICAL ENVIRONMENT & BACKGROUND CHARACTERISTICS:
The input is a photograph/scan of an ALBUM PAGE or DESKTOP.
The following elements are STRICTLY BACKGROUND AND ARE NEVER PHOTOS:
1. The album backing board / cardboard / paper (cream, white, yellow, or kraft paper patterned with snowflakes, stars '*', memo lines, ruled grids, or binding punched holes).
2. The album binding strips, plastic spine columns, metal binder rings, spiral coils, or protective clear plastic film edges.
3. Human fingers, thumbs, hands, clothing, desks, wood tables, carpets, or shadows outside the album page.

========================================================================
CRITICAL RULE 1: DETECT FULL PHYSICAL PHOTO PAPER BOUNDARY (NEVER CROP ONLY PEOPLE OR FOREGROUND!)
- Every physical photo print is a complete rectangular paper print that includes BOTH the human subjects (faces, bodies, legs, feet) AND the background/environment (terrazzo flooring, tiles, ground, walls, windows, ceiling, furniture, shadows).
- STRICT RULE: NEVER prematurely truncate or cut off a photo at the feet, knees, or waist of people!
- The bounding box MUST extend all the way edge-to-edge to the 4 physical corners/edges where the photographic paper print meets the album backing page.
- Do NOT mistake the floor or wall INSIDE the photo for the album background! Only the album page backing sheet (with binder holes, stars, or memo lines) is background.

CRITICAL RULE 2: MULTI-PHOTO SEPARATION — TOP & BOTTOM STACKED PHOTOS (4x6 ALBUM SLEEVES)
- In traditional 4x6 photo albums, pages frequently contain TWO HORIZONTAL (3:2 aspect ratio) PHOTOS STACKED VERTICALLY (Top photo and Bottom photo)!
- Look for the horizontal line/gap/groove, clear plastic sleeve seam, or white/star-patterned margin separating the top photo from the bottom photo around the middle (y ≈ 0.46 to 0.54).
- CRITICAL WARNING ON SAME-BACKGROUND SCENES:
  Even if the top photo and bottom photo have the EXACT SAME BACKGROUND (e.g. red running track, sports field, classroom, birthday party, or grass), THEY ARE TWO SEPARATE INDEPENDENT PHYSICAL PRINTS!
- ABSOLUTELY FORBIDDEN: NEVER COMBINE THEM INTO ONE TALL GIANT PHOTO! A vintage 4x6 photo print is NEVER a tall vertical rectangle covering the entire page!
- STRICT RULE: YOU MUST RETURN TWO DISTINCT BOUNDING BOXES FOR TOP AND BOTTOM PHOTOS!
  * Photo 1 (Top): from top edge to the middle horizontal sleeve seam.
  * Photo 2 (Bottom): from middle horizontal sleeve seam to bottom edge.
- If photos are placed side-by-side or in a 2x2 grid, each physical photo MUST be detected as an independent bounding box.
- Only if the page is genuinely a single 8x10 full-page studio portrait without any middle plastic sleeve line should you return 1 photo.

CRITICAL RULE 3: ORIENTED QUADRILATERAL PRECISION (PRESERVE TILT & CORNERS)
- Photographs in albums or scans often have slight skew, slant, or phone camera perspective angles (2° to 15°).
- You MUST provide the exact 4 physical paper corners in "polygon" [Top-Left, Top-Right, Bottom-Right, Bottom-Left] normalized between 0.0000 and 1.0000.
- "box_2d" serves as the tight outer envelope [ymin, xmin, ymax, xmax] (0 to 1000).
========================================================================

OUTPUT FORMAT:
Return strictly a JSON object adhering to:
{
  "photos": [
    {
      "polygon": [
        {"x": 0.045, "y": 0.058},
        {"x": 0.952, "y": 0.061},
        {"x": 0.948, "y": 0.482},
        {"x": 0.046, "y": 0.479}
      ],
      "box_2d": [58, 45, 482, 952],
      "rotation": 0,
      "reason": "Top horizontal photo of sports day track field"
    },
    {
      "polygon": [
        {"x": 0.046, "y": 0.518},
        {"x": 0.951, "y": 0.521},
        {"x": 0.949, "y": 0.958},
        {"x": 0.045, "y": 0.955}
      ],
      "box_2d": [518, 45, 958, 951],
      "rotation": 0,
      "reason": "Bottom horizontal photo of kids performance under tent"
    }
  ]
}

SPECIFICATION:
- "polygon": 4 precise corner vertices [TL, TR, BR, BL] of the physical paper print, normalized between 0.0000 and 1.0000.
- "box_2d": [ymin, xmin, ymax, xmax] as normalized integers from 0 to 1000 representing the bounding box envelope of the physical photographic print.
- "rotation": Determine its natural orientation (human body gravity, heads pointing up, readable date stamps/text, horizon upright). Specify how many degrees CLOCKWISE the cropped photo must be rotated to be upright: 0, 90, 180, or 270.`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      };

      // 若尚未探測線上真實支援模型清單，先行查詢以保證 100% 命中開通端點
      if (!this.availableModels || this.availableModels.length === 0) {
        try {
          await this.fetchAvailableModels(apiKey);
        } catch (_) {}
      }

      // 優先使用 Google 官方線上真實支援的極速端點 (消除 404 重試)
      const uniqueModels = this.getEffectiveApiCandidates();

      let result = null;
      let lastErr = null;
      const versions = this.preferredApiVersion ? [this.preferredApiVersion, 'v1beta', 'v1'] : ['v1beta', 'v1'];
      const uniqueVersions = [...new Set(versions)];

      outerLoop:
      for (const m of uniqueModels) {
        for (const ver of uniqueVersions) {
          const endpoint = `https://generativelanguage.googleapis.com/${ver}/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
          
          // 35 秒超時控制器，確保高解析圖片與大模型視覺深度運算有充裕時間完成
          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timeoutId = controller ? setTimeout(() => controller.abort(), 35000) : null;

          try {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
              },
              body: JSON.stringify(requestBody),
              signal: controller ? controller.signal : undefined
            });

            if (timeoutId) clearTimeout(timeoutId);

            if (res.ok) {
              result = await res.json();
              this.preferredApiVersion = ver;
              // 一旦命中可用模型，立刻快取記錄，下次調用直達零重試！
              if (m !== this.model) {
                this.setModel(m);
              }
              break outerLoop;
            }

            let errMessage = res.statusText;
            try {
              const errData = await res.json();
              errMessage = errData.error?.message || errMessage;
            } catch (_) {}

            const isKeyInvalid = res.status === 403 || errMessage.includes('API_KEY_INVALID') || errMessage.includes('key not valid');
            if (isKeyInvalid) {
              throw new Error(`API 權限異常或金鑰無效 (${errMessage})`);
            }
            lastErr = new Error(`[${m} / ${ver}] HTTP ${res.status}: ${errMessage}`);
          } catch (callErr) {
            if (timeoutId) clearTimeout(timeoutId);
            if (callErr.name === 'AbortError') {
              lastErr = new Error(`模型 [${m}] 雲端分析逾時 (超過 35 秒)，請確認網路連線`);
            } else if (callErr.message && callErr.message.includes('API 權限異常')) {
              throw callErr;
            } else {
              lastErr = callErr;
            }
          }
        }
      }

      if (!result) {
        throw lastErr || new Error('Gemini API 請求未成功，請確認網路連線與 API 金鑰');
      }

      const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error('Gemini API 未回傳有效的分析結果');
      }

      let parsed;
      try {
        const cleanJson = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        const jsonMatch = candidateText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Gemini 回傳格式非合法 JSON: ' + candidateText.slice(0, 80));
        }
      }

      const photosList = parsed.photos || parsed.regions || (Array.isArray(parsed) ? parsed : []);
      if (!photosList || photosList.length === 0) {
        return [];
      }

      const regions = [];
      photosList.forEach((item, idx) => {
        let points = null;

        // 權威策略 1: 優先採用真實四角透視多邊形 (Oriented Quad: polygon / corners / points)
        // 遵循電腦視覺透視校正第一性原理，保留實體相片在相簿插袋或手機翻拍時的自然傾角 (2°~15°)
        const rawPoly = item.polygon || item.corners || item.points;
        if (Array.isArray(rawPoly) && rawPoly.length === 4) {
          const parsedPts = rawPoly.map(pt => {
            let px = typeof pt.x === 'number' ? pt.x : parseFloat(pt[0]);
            let py = typeof pt.y === 'number' ? pt.y : parseFloat(pt[1]);

            if (px > 1.0 && px <= 100.0 && py <= 100.0) {
              px /= 100;
              py /= 100;
            } else if (px > 100.0) {
              px /= 1000;
              py /= 1000;
            }

            px = Math.max(0, Math.min(1, px));
            py = Math.max(0, Math.min(1, py));

            return {
              x: Math.round(px * naturalWidth),
              y: Math.round(py * naturalHeight)
            };
          });

          // 驗證四角非共線且形成有效四邊形
          const xs = parsedPts.map(p => p.x);
          const ys = parsedPts.map(p => p.y);
          const polyW = Math.max(...xs) - Math.min(...xs);
          const polyH = Math.max(...ys) - Math.min(...ys);
          if (polyW > naturalWidth * 0.05 && polyH > naturalHeight * 0.05) {
            points = parsedPts;
          }
        }

        // 降級策略 2: 若未提供 polygon 或四角異常，降級為外接包圍盒 box_2d: [ymin, xmin, ymax, xmax]
        if ((!points || points.length !== 4) && Array.isArray(item.box_2d) && item.box_2d.length === 4) {
          let ymin = parseFloat(item.box_2d[0]);
          let xmin = parseFloat(item.box_2d[1]);
          let ymax = parseFloat(item.box_2d[2]);
          let xmax = parseFloat(item.box_2d[3]);

          // 若為 0~1000 歸一化
          if (ymin > 1.0 || xmin > 1.0 || ymax > 1.0 || xmax > 1.0) {
            ymin /= 1000;
            xmin /= 1000;
            ymax /= 1000;
            xmax /= 1000;
          }

          ymin = Math.max(0, Math.min(1, ymin));
          xmin = Math.max(0, Math.min(1, xmin));
          ymax = Math.max(0, Math.min(1, ymax));
          xmax = Math.max(0, Math.min(1, xmax));

          if (xmax > xmin && ymax > ymin) {
            points = [
              { x: Math.round(xmin * naturalWidth), y: Math.round(ymin * naturalHeight) }, // TL
              { x: Math.round(xmax * naturalWidth), y: Math.round(ymin * naturalHeight) }, // TR
              { x: Math.round(xmax * naturalWidth), y: Math.round(ymax * naturalHeight) }, // BR
              { x: Math.round(xmin * naturalWidth), y: Math.round(ymax * naturalHeight) }  // BL
            ];
          }
        }

        if (!points || points.length !== 4) return;

        let ordered = points;
        if (window.photoDetector && typeof window.photoDetector.orderPoints === 'function') {
          ordered = window.photoDetector.orderPoints(points);
        }

        const minX = Math.min(...ordered.map(p => p.x));
        const maxX = Math.max(...ordered.map(p => p.x));
        const minY = Math.min(...ordered.map(p => p.y));
        const maxY = Math.max(...ordered.map(p => p.y));
        const area = (maxX - minX) * (maxY - minY);
        const totalArea = naturalWidth * naturalHeight;
        if (area < totalArea * 0.015) {
          return;
        }

        // 語義視覺朝向自動擺正 (0, 90, 180, 270)
        let rot = 0;
        if (typeof item.rotation === 'number') {
          rot = [0, 90, 180, 270].includes(item.rotation) ? item.rotation : (Math.round(item.rotation / 90) * 90) % 360;
        } else if (typeof item.orientation === 'number') {
          rot = [0, 90, 180, 270].includes(item.orientation) ? item.orientation : 0;
        }
        if (rot < 0) rot = (rot + 360) % 360;

        regions.push({
          id: 'gemini-' + Date.now() + '-' + (idx + 1) + '-' + Math.random().toString(36).substr(2, 4),
          name: `相片 ${idx + 1}`,
          corners: ordered,
          polygon: ordered,
          rotation: rot,
          approved: false,
          status: 'pending',
          source: 'gemini-vision',
          orientationReason: item.reason || item.description || ''
        });
      });

      return regions;
    }
  }

  window.geminiDetector = new GeminiDetector();
})();
