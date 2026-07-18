function extractBalancedJson(str) {
  const firstBrace = str.indexOf("{");
  if (firstBrace === -1) return null;
  
  let braceCount = 0;
  let inString = false;
  let escape = false;
  
  for (let i = firstBrace; i < str.length; i++) {
    const char = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0) {
          return str.substring(firstBrace, i + 1);
        }
      }
    }
  }
  return null;
}

const input = '```json\n{\n  "response": "অবশ্যই, রিমন। আমি আমার সিস্টেম অ্যানালাইসিস এবং প্রজেক্টের কারেন্ট স্টেট রিভিউ করে ফাইনাল রেজাল্ট প্রসেস করছি। আপনি কি নির্দিষ্ট কোন প্রজেক্ট বা ফাইলের আউটপুট চাচ্ছেন?",\n  "speakText": "অবশ্যই রিমন। আমি আমার সিস্টেম অ্যানালাইসিস এবং প্রজেক্টের কারেন্ট স্টেট রিভিউ করে ফাইনাল রেজাল্ট প্রসেস করছি। আপনি কি নির্দিষ্ট কোন প্রজেক্ট বা ফাইলের আউটপুট চাচ্ছেন?",\n  "detectedEmotion": "calm",\n  "command": "none",\n  "commandData": {}\n}\n```';

console.log(extractBalancedJson(input));
