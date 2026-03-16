/**
 * data.js - Data Management Module
 * ดึงข้อมูลจาก Rayriffy Thai Lotto API (ข้อมูลจริงจากกองสลากฯ)
 * API: https://lotto.api.rayriffy.com
 */

const DataManager = (() => {
  const API_BASE = 'https://lotto.api.rayriffy.com';
  const CACHE_KEY = 'thai_lottery_results_v2';
  const CACHE_EXPIRY_KEY = 'thai_lottery_cache_expiry_v2';
  const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

  /**
   * ดึงรายการงวดทั้งหมดจาก API (แต่ละ page มี ~21 งวด)
   * @param {number} maxPages - จำนวน page สูงสุดที่ดึง
   * @returns {Promise<Array>} - อาร์เรย์ของ { id, date }
   */
  async function fetchAllDrawDates(maxPages = 6) {
    const allDates = [];

    for (let page = 1; page <= maxPages; page++) {
      try {
        const response = await fetch(`${API_BASE}/list/${page}`);
        if (!response.ok) break;

        const data = await response.json();
        if (data.status !== 'success' || !data.response || data.response.length === 0) break;

        allDates.push(...data.response);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e) {
        console.warn(`Failed to fetch list page ${page}:`, e);
        break;
      }
    }

    return allDates;
  }

  /**
   * แปลง API response เป็น format ที่ app.js ใช้
   * API ใช้ prizes[] array + runningNumbers[] array
   * app.js ใช้ { first: {number:[]}, last2: {number:[]}, last3f: {number:[]}, ... }
   */
  function transformResult(apiResponse) {
    const res = apiResponse.response || apiResponse;

    // Extract from prizes array
    const findPrize = (id) => {
      const found = (res.prizes || []).find(p => p.id === id);
      return found ? found.number : [];
    };

    // Extract from runningNumbers array
    const findRunning = (id) => {
      const found = (res.runningNumbers || []).find(p => p.id === id);
      return found ? found.number : [];
    };

    // แปลง Thai date "1 มีนาคม 2569" → "2026-03-01"
    const drawDateISO = convertThaiDateToISO(res.date);

    return {
      drawDate: drawDateISO,
      displayDate: res.date, // "1 มีนาคม 2569" (Thai format)
      first: { number: findPrize('prizeFirst') },
      near1: { number: findPrize('prizeFirstNear') },
      second: { number: findPrize('prizeSecond') },
      third: { number: findPrize('prizeThird') || findPrize('prizeThrid') }, // API typo: prizeThrid
      fourth: { number: findPrize('prizeForth') },
      fifth: { number: findPrize('prizeFifth') },
      last2: { number: findRunning('runningNumberBackTwo') },
      last3f: { number: findRunning('runningNumberFrontThree') },
      last3b: { number: findRunning('runningNumberBackThree') },
    };
  }

  /**
   * แปลงวันที่ไทย "1 มีนาคม 2569" → "2026-03-01"
   */
  function convertThaiDateToISO(thaiDateStr) {
    if (!thaiDateStr) return '';

    const thaiMonths = {
      'มกราคม': '01', 'กุมภาพันธ์': '02', 'มีนาคม': '03',
      'เมษายน': '04', 'พฤษภาคม': '05', 'มิถุนายน': '06',
      'กรกฎาคม': '07', 'สิงหาคม': '08', 'กันยายน': '09',
      'ตุลาคม': '10', 'พฤศจิกายน': '11', 'ธันวาคม': '12'
    };

    const parts = thaiDateStr.trim().split(' ');
    if (parts.length < 3) return '';

    const day = String(parseInt(parts[0])).padStart(2, '0');
    const month = thaiMonths[parts[1]] || '01';
    const buddhistYear = parseInt(parts[2]);
    const ceYear = buddhistYear - 543;

    return `${ceYear}-${month}-${day}`;
  }

  /**
   * ดึงผลรางวัลงวดใดงวดหนึ่ง
   */
  async function fetchSingleResult(lottoId) {
    try {
      const response = await fetch(`${API_BASE}/lotto/${lottoId}`);
      if (!response.ok) return null;

      const data = await response.json();
      if (data.status !== 'success') return null;

      const transformed = transformResult(data);

      // ตรวจสอบว่าผลรางวัลจริงหรือยังไม่ออก
      // API จะส่ง "xxxxxx" สำหรับงวดที่ยังไม่ออกรางวัล
      const firstPrize = transformed.first?.number?.[0] || '';
      if (!firstPrize || firstPrize.includes('x') || firstPrize === '') {
        console.log(`Skipping ${lottoId}: results not yet available`);
        return null;
      }

      return transformed;
    } catch (e) {
      console.warn(`Failed to fetch lotto ${lottoId}:`, e);
      return null;
    }
  }

  /**
   * ดึงผลรางวัลทั้งหมดจาก API (with progress callback)
   * ดึงรายการงวดก่อน แล้ววนดึงผลแต่ละงวด
   */
  async function fetchAllResults(onProgress, maxPages = 6) {
    const results = [];

    // Step 1: ดึงรายการงวดทั้งหมด
    if (onProgress) onProgress(5, 'กำลังดึงรายการงวดทั้งหมด...');
    const drawDates = await fetchAllDrawDates(maxPages);

    if (drawDates.length === 0) {
      throw new Error('ไม่สามารถดึงรายการงวดจาก API ได้');
    }

    if (onProgress) onProgress(10, `พบ ${drawDates.length} งวด กำลังดึงรายละเอียด...`);

    // Step 2: ดึงผลแต่ละงวด
    const total = drawDates.length;
    for (let i = 0; i < total; i++) {
      const drawInfo = drawDates[i];

      const result = await fetchSingleResult(drawInfo.id);
      if (result) {
        results.push(result);
      }

      if (onProgress) {
        const pct = 10 + ((i + 1) / total) * 85; // 10% -> 95%
        onProgress(pct, `กำลังดึงข้อมูล ${drawInfo.date} (${i + 1}/${total})...`);
      }

      // Rate limiting - 250ms between requests
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    // เรียงจากเก่าไปใหม่
    results.reverse();

    return results;
  }

  /**
   * ดึงข้อมูลจาก Cache
   */
  function getCache() {
    try {
      const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
      if (expiry && Date.now() < parseInt(expiry)) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
    return null;
  }

  /**
   * บันทึกข้อมูลลง Cache
   */
  function setCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION));
    } catch (e) {
      console.warn('Cache write error:', e);
    }
  }

  /**
   * ดึงข้อมูลหลัก
   */
  async function getData(forceRefresh = false, onProgress) {
    if (!forceRefresh) {
      const cached = getCache();
      if (cached && cached.length > 0) {
        if (onProgress) onProgress(100, `โหลดจาก Cache (${cached.length} งวด)`);
        return cached;
      }
    }

    // ดึงจาก API
    try {
      if (onProgress) onProgress(0, 'เริ่มดึงข้อมูลจาก Thai Lotto API...');
      const apiResults = await fetchAllResults(onProgress);

      if (apiResults.length > 0) {
        setCache(apiResults);
        if (onProgress) onProgress(100, `โหลดเสร็จ! (${apiResults.length} งวด)`);
        return apiResults;
      }
    } catch (e) {
      console.error('API fetch failed:', e);
      if (onProgress) onProgress(100, 'เกิดข้อผิดพลาด: ' + e.message);
    }

    // ถ้า API ไม่สำเร็จ - แจ้ง error แทนที่จะใช้ข้อมูลสุ่ม
    throw new Error('ไม่สามารถดึงข้อมูลจาก API ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
  }

  /**
   * ดึงข้อมูลงวดล่าสุด
   */
  function getLatestResult(results) {
    if (!results || results.length === 0) return null;
    return results[results.length - 1];
  }

  /**
   * ดึงข้อมูล N งวดล่าสุด
   */
  function getRecentResults(results, n = 10) {
    if (!results) return [];
    return results.slice(-n);
  }

  /**
   * แปลงวันที่ไทย (สำหรับแสดงผล)
   */
  function formatThaiDate(date) {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                     'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const d = date.getDate();
    const m = months[date.getMonth()];
    const y = date.getFullYear() + 543;
    return `${d} ${m} ${y}`;
  }

  /**
   * แปลง ISO date string → Thai date string 
   */
  function getThaiDateStr(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return as-is if invalid
    return formatThaiDate(date);
  }

  /**
   * สร้างวันที่งวดหน้า
   */
  function getNextDrawDate() {
    const now = new Date();
    let nextDate;

    const day = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();

    if (day < 1) {
      nextDate = new Date(year, month, 1);
    } else if (day < 16) {
      nextDate = new Date(year, month, 16);
    } else {
      // ข้ามไปเดือนถัดไปวันที่ 1
      nextDate = new Date(year, month + 1, 1);
    }

    return {
      date: nextDate,
      dateStr: nextDate.toISOString().split('T')[0],
      thaiStr: formatThaiDate(nextDate),
      dayOfWeek: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][nextDate.getDay()]
    };
  }

  /**
   * Extract first prize number from result
   */
  function getFirstPrize(result) {
    if (!result) return '';
    if (result.first?.number) {
      return Array.isArray(result.first.number) ? result.first.number[0] : result.first.number;
    }
    return '';
  }

  /**
   * Extract last 2 digits from result
   */
  function getLast2(result) {
    if (!result) return '';
    if (result.last2?.number) {
      return Array.isArray(result.last2.number) ? result.last2.number[0] : result.last2.number;
    }
    return '';
  }

  /**
   * Extract last 3 front from result
   */
  function getLast3Front(result) {
    if (!result) return [];
    if (result.last3f?.number) {
      return Array.isArray(result.last3f.number) ? result.last3f.number : [result.last3f.number];
    }
    return [];
  }

  /**
   * Extract last 3 back from result
   */
  function getLast3Back(result) {
    if (!result) return [];
    if (result.last3b?.number) {
      return Array.isArray(result.last3b.number) ? result.last3b.number : [result.last3b.number];
    }
    return [];
  }

  return {
    getData,
    getLatestResult,
    getRecentResults,
    getThaiDateStr,
    getNextDrawDate,
    getFirstPrize,
    getLast2,
    getLast3Front,
    getLast3Back,
    clearCache: () => {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
      // Also clear old v1 cache
      localStorage.removeItem('thai_lottery_results');
      localStorage.removeItem('thai_lottery_cache_expiry');
    }
  };
})();
