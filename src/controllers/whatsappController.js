const db = require("../config/db");
const fs = require("fs");
const path = require("path");

/**
 * Dispatch message via RhaiTech WhatsApp API gateway (api.rhaitech.online)
 * Uses official FormData request format with appkey, authkey, template_id, and file parameters.
 */
async function dispatchWhatsAppMessage(phone, messageText, mediaUrl = null, options = {}) {
  const apiUrl = process.env.WHATSAPP_API_URL || "https://api.rhaitech.online/api/create-message";
  const appkey = process.env.WHATSAPP_APPKEY || "f67908d5-5aa9-49d9-8c56-9572272ea6d0";
  const authkey = process.env.WHATSAPP_AUTHKEY || "ppIYRYOlXVAd41QhiCDu6scku4jfJG0vTVBuLpsj395dXCT8wj";

  // Clean phone number (strip spaces, symbols)
  let cleanedPhone = String(phone || "").replace(/\D/g, "");
  if (cleanedPhone.length === 10) {
    cleanedPhone = `91${cleanedPhone}`;
  }

  const waUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(messageText)}`;

  try {
    const params = new URLSearchParams();
    params.append("appkey", appkey);
    params.append("authkey", authkey);
    params.append("to", cleanedPhone);
    params.append("template_id", options.template_id || process.env.WHATSAPP_TEMPLATE_ID || "recipt");
    params.append("language", options.language || process.env.WHATSAPP_LANGUAGE || "en");

    if (mediaUrl) {
      params.append("file", mediaUrl);
      params.append("file_name", "receipt.png");
      params.append("type", "3");
    }

    if (options.variables && typeof options.variables === "object") {
      for (const [key, val] of Object.entries(options.variables)) {
        params.append(`variables[${key}]`, String(val));
      }
    } else {
      params.append("variables[{variableKey1}]", options.studentName || "Student");
      params.append("variables[{variableKey2}]", options.amountPaid || "0");
      params.append("variables[{variableKey3}]", options.balance || "0");
    }

    console.log(`📤 Dispatching WhatsApp via RhaiTech FormData API to ${cleanedPhone} (Template: ${options.template_id || "recipt"})...`);

    const response = await fetch(apiUrl, {
      method: "POST",
      body: params,
    });

    const resJson = await response.json().catch(() => ({}));
    console.log(`✅ RhaiTech WhatsApp API response for ${cleanedPhone}:`, resJson);

    const isSuccess =
      resJson.message_status === "Success" ||
      resJson.status_code === 200 ||
      resJson.status === "success";

    return {
      sentViaApi: isSuccess,
      apiData: resJson,
      waUrl,
    };
  } catch (error) {
    console.error(`❌ RhaiTech WhatsApp API dispatch error for ${cleanedPhone}:`, error.message);
    return {
      sentViaApi: false,
      error: error.message,
      waUrl,
    };
  }
}

/* POST /api/whatsapp/send-invoice */
exports.sendInvoice = async (req, res) => {
  try {
    const { phone, studentName, amountPaid, balance, pdfUrl, imageUrl, message, template_id } = req.body;

    console.log(`📲 [Server Send Invoice] Target Phone: ${phone} | Student: ${studentName} | Paid: ₹${amountPaid} | Balance: ₹${balance}`);
    const targetMedia = imageUrl || pdfUrl || null;
    console.log(`🖼️ [Server Send Invoice] Target Media File URL: ${targetMedia}`);

    let messageText = message;
    if (!messageText) {
      messageText = `Greetings from *DNYANSAGAR CLASSES*,\n\nThank you for being a part of our institute. Please find the details of your fee payment below.\n\n📘 *Fee Payment Details*\n\n👨‍🎓 Student Name: ${studentName || ""}\n💰 Amount Paid: ₹${Number(amountPaid || 0).toLocaleString('en-IN')}\n📌 Balance: ₹${Number(balance || 0).toLocaleString('en-IN')}\n\n✅ Your payment has been received successfully.\n\nWe appreciate your trust in us and wish you success in your studies.\n\nRegards,\n*DNYANSAGAR CLASSES*`;
    }

    const result = await dispatchWhatsAppMessage(phone, messageText, targetMedia, {
      template_id: template_id || process.env.WHATSAPP_TEMPLATE_ID || "recipt",
      language: process.env.WHATSAPP_LANGUAGE || "en",
      studentName,
      amountPaid,
      balance,
      variables: {
        "{variableKey1}": studentName || "Student",
        "{variableKey2}": Number(amountPaid || 0).toLocaleString('en-IN'),
        "{variableKey3}": Number(balance || 0).toLocaleString('en-IN'),
      },
    });

    res.json({
      success: true,
      message: "WhatsApp invoice notification processed successfully",
      sentViaApi: result.sentViaApi,
      apiData: result.apiData,
      waUrl: result.waUrl,
      data: { phone, studentName, amountPaid, balance, pdfUrl, imageUrl },
    });
  } catch (err) {
    console.error("WhatsApp send-invoice error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to process WhatsApp invoice" });
  }
};

/* POST /api/whatsapp/send-report */
exports.sendReport = async (req, res) => {
  try {
    const { phone, studentName, className, examination, examDate, marks, totalMarks, performance, message, reportUrl, template_id } = req.body;

    let messageText = message;
    if (!messageText) {
      const percentage = totalMarks ? Math.round((marks / totalMarks) * 100) : 0;
      messageText = `🎓 *DNYANSAGAR CLASSES - ACADEMIC REPORT CARD*\n\nDear Parent,\nHere is the latest test performance report for *${studentName || "Student"}*:\n\n📖 *Class/Batch:* ${className || "N/A"}\n📝 *Exam Name:* ${examination || "N/A"}\n📅 *Date:* ${examDate || "N/A"}\n📊 *Marks Scored:* ${marks} / ${totalMarks} (${percentage}%)\n📈 *Performance Rating:* ${performance || "Good"}\n\nThank you for your continuous support!\nRegards,\n*Dnyansagar Classes*`;
    }

    const result = await dispatchWhatsAppMessage(phone, messageText, reportUrl || null, {
      template_id: template_id || process.env.WHATSAPP_REPORT_TEMPLATE_ID || "9th_2026_27",
      language: process.env.WHATSAPP_LANGUAGE || "en",
      studentName,
      variables: {
        "{variableKey1}": studentName || "Student",
        "{variableKey2}": `${marks}/${totalMarks}`,
      },
    });

    res.json({
      success: true,
      message: `WhatsApp report processed for ${studentName}`,
      sentViaApi: result.sentViaApi,
      apiData: result.apiData,
      waUrl: result.waUrl,
      data: { phone, studentName, marks, totalMarks },
    });
  } catch (err) {
    console.error("WhatsApp send-report error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to process WhatsApp report" });
  }
};

/* POST /api/whatsapp/upload-invoice */
exports.uploadInvoice = async (req, res) => {
  try {
    const { imageBase64, filename } = req.body;

    console.log(`📥 [Server Upload] Received image upload request. Base64 size: ${imageBase64 ? imageBase64.length : 0} bytes`);

    const uploadsDir = path.join(__dirname, "../../public/uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let fileName = filename || `invoice-${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
    if (!fileName.endsWith(".png") && !fileName.endsWith(".jpg") && !fileName.endsWith(".jpeg")) {
      fileName += ".png";
    }

    const filePath = path.join(uploadsDir, fileName);

    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(filePath, buffer);
    } else {
      return res.status(400).json({ success: false, message: "No image data provided" });
    }

    const hostUrl = process.env.PUBLIC_URL || "https://dnyansagarclasses.rhaitech.online";
    const imageUrl = `${hostUrl}/uploads/${fileName}`;

    console.log(`📸 [Server Upload] Saved file to disk: ${filePath}`);
    console.log(`🔗 [Server Upload] Public Image URL: ${imageUrl}`);

    res.json({
      success: true,
      message: "Invoice image uploaded successfully",
      url: imageUrl,
      fileName,
    });
  } catch (err) {
    console.error("Upload invoice error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to upload invoice image" });
  }
};
