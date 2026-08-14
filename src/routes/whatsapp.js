const express = require("express");
const router = express.Router();
const whatsappController = require("../controllers/whatsappController");

router.post("/send-invoice", whatsappController.sendInvoice);

module.exports = router;
