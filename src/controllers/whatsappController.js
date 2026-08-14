const db = require("../config/db");

/**
 * Dispatch message via RhaiTech WhatsApp API gateway (api.rhaitech.online)
 * Supports both text messages and media (Image / PDF document) attachments.
 */
async function dispatchWhatsAppMessage(phone, messageText, mediaUrl = null) {
  const apiUrl = process.env.WHATSAPP_API_URL || "https://api.rhaitech.online/api/send";
  const apiKey = process.env.WHATSAPP_API_KEY || "";
  const instanceId = process.env.WHATSAPP_INSTANCE_ID || "919772385268";

  // Clean phone number (strip spaces, symbols)
  let cleanedPhone = String(phone || "").replace(/\D/g, "");
  if (cleanedPhone.length === 10) {
    cleanedPhone = `91${cleanedPhone}`;
  }

  const waUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(messageText)}`;

  if (!apiKey) {
    console.log(`ℹ️ WHATSAPP_API_KEY not set in .env. Target (${cleanedPhone}): "${messageText.substring(0, 60)}..."`);
    return {
      sentViaApi: false,
      message: "WhatsApp message generated. (Set WHATSAPP_API_KEY in .env for direct server dispatch)",
      waUrl,
    };
  }

  try {
    const payload = {
      number: cleanedPhone,
      type: mediaUrl ? "media" : "text",
      message: messageText,
      caption: messageText,
      instance_id: instanceId,
      access_token: apiKey,
      api_key: apiKey,
    };

    if (mediaUrl) {
      payload.media_url = mediaUrl;
      payload.url = mediaUrl;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const resJson = await response.json().catch(() => ({}));
    console.log(`✅ RhaiTech WhatsApp API response for ${cleanedPhone}:`, resJson);

    return {
      sentViaApi: true,
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
    const { phone, studentName, amountPaid, balance, pdfUrl, imageUrl, message } = req.body;

    let messageText = message;
    if (!messageText) {
      messageText = `Greetings from *DNYANSAGAR CLASSES*,\n\nThank you for being a part of our institute. Please find the details of your fee payment below.\n\n📘 *Fee Payment Details*\n\n👨‍🎓 Student Name: ${studentName || ""}\n💰 Amount Paid: ₹${Number(amountPaid || 0).toLocaleString('en-IN')}\n📌 Balance: ₹${Number(balance || 0).toLocaleString('en-IN')}\n\n✅ Your payment has been received successfully.\n\nWe appreciate your trust in us and wish you success in your studies.\n\nRegards,\n*DNYANSAGAR CLASSES*`;
    }

    const targetMedia = imageUrl || pdfUrl || null;
    const result = await dispatchWhatsAppMessage(phone, messageText, targetMedia);

    res.json({
      success: true,
      message: "WhatsApp invoice notification processed successfully",
      sentViaApi: result.sentViaApi,
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
    const { phone, studentName, className, examination, examDate, marks, totalMarks, performance, message, reportUrl } = req.body;

    let messageText = message;
    if (!messageText) {
      const percentage = totalMarks ? Math.round((marks / totalMarks) * 100) : 0;
      messageText = `🎓 *DNYANSAGAR CLASSES - ACADEMIC REPORT CARD*\n\nDear Parent,\nHere is the latest test performance report for *${studentName || "Student"}*:\n\n📖 *Class/Batch:* ${className || "N/A"}\n📝 *Exam Name:* ${examination || "N/A"}\n📅 *Date:* ${examDate || "N/A"}\n📊 *Marks Scored:* ${marks} / ${totalMarks} (${percentage}%)\n📈 *Performance Rating:* ${performance || "Good"}\n\nThank you for your continuous support!\nRegards,\n*Dnyansagar Classes*`;
    }

    const result = await dispatchWhatsAppMessage(phone, messageText, reportUrl || null);

    res.json({
      success: true,
      message: `WhatsApp report processed for ${studentName}`,
      sentViaApi: result.sentViaApi,
      waUrl: result.waUrl,
      data: { phone, studentName, marks, totalMarks },
    });
/* POST /api/whatsapp/upload-invoice */
exports.uploadInvoice = async (req, res) => {
  try {
    const { imageBase64, filename } = req.body;

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

    console.log(`📸 Invoice image generated & saved: ${imageUrl}`);

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



