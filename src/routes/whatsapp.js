const express = require("express");
const router = express.Router();
const whatsappController = require("../controllers/whatsappController");

router.post("/send-invoice", whatsappController.sendInvoice);
router.post("/send-report", whatsappController.sendReport);

module.exports = router;

