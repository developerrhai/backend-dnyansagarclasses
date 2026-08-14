const express = require("express");
const router = express.Router();
const whatsappController = require("../controllers/whatsappController");

router.post("/send-invoice", whatsappController.sendInvoice);
router.post("/send-report", whatsappController.sendReport);
router.post("/upload-invoice", whatsappController.uploadInvoice);

module.exports = router;

