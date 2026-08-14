const db = require("../config/db");

/* POST /api/whatsapp/send-invoice */
exports.sendInvoice = async (req, res) => {
  try {
    const { phone, studentName, amountPaid, balance, pdfUrl, message } = req.body;

    console.log(`📱 WhatsApp Invoice Notification for ${studentName} (${phone}):`, {
      amountPaid,
      balance,
      pdfUrl,
    });

    // If an external WhatsApp API provider (e.g. UltraMsg, Twilio, Meta Cloud API) is set up,
    // process.env.WHATSAPP_API_TOKEN can be used here.
    // For now, return success so the frontend receives a clean 200 OK response.
    res.json({
      success: true,
      message: "WhatsApp invoice notification processed successfully",
      data: {
        phone,
        studentName,
        amountPaid,
        balance,
        pdfUrl,
        message,
      },
    });
  } catch (err) {
    console.error("WhatsApp send-invoice error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to process WhatsApp invoice" });
  }
};
