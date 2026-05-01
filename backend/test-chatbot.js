const USER_ID = "86868394-0836-411f-b93d-a2bac5708176";
const URL = "http://localhost:3006/chatbot/ask";

const testCases = [
  "Khoản chi nào cao hơn bình thường?",
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("=========================================");
  console.log("🚀 BẮT ĐẦU CHẠY TEST CHATBOT AI");
  console.log("=========================================\n");
  
  for (let i = 0; i < testCases.length; i++) {
    const q = testCases[i];
    console.log(`[Câu ${i+1}/${testCases.length}] 👤 Hỏi: "${q}"`);
    try {
      const response = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": USER_ID },
        body: JSON.stringify({ message: q })
      });
      const resData = await response.json();
      
      if (!response.ok) {
         console.log(`❌ LỖI API: ${response.status} - ${JSON.stringify(resData)}`);
      } else {
         const data = resData.data;
         console.log(`🤖 Trả lời: "${data.reply}"`);
         console.log(`🧠 Intent nhận diện: ${data.metadata?.intent || "None"}`);
         if (data.metadata?.args) {
            console.log(`🛠️  Tham số (Args):`, data.metadata.args);
         }
      }
    } catch (err) {
      console.log(`❌ LỖI MẠNG: ${err.message}`);
    }
    console.log(`-----------------------------------------\n`);
    // Nghỉ 4 giây giữa các request để tránh Google rate limit (429)
    await sleep(4000);
  }
  console.log("✅ HOÀN TẤT BÀI TEST!");
}

runTests();
