const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const connectDB = require('./config/db');
const { getDbStatus } = require('./config/db');
const logger = require('./utils/logger');
const validateEnv = require('./utils/validateEnv');
const errorHandler = require('./middleware/errorHandler');

// ── 1. Load environment ────────────────────────────────────────────────────────
// Load env from root directory (for Hostinger/cPanel deployments) and server/ directory
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });

// ── 2. Validate environment variables (exits if critical vars are missing) ─────
const envCheck = validateEnv();
if (!envCheck.valid) {
  process.exit(1);
}

// ── 3. Express app setup ───────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1); // Render / other reverse proxies

const allowedOrigins = [
  "https://visavo.in",
  "https://www.visavo.in",
  "https://admin.visavo.in",
  "https://www.admin.visavo.in",
  "https://api.visavo.in",
  "https://visa-voyage-client.onrender.com",
  "https://visa-voyage-admin.onrender.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
  "http://127.0.0.1:5177"
];

// ── Middleware ──────────────────────────────────────────────────────────────────
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false,
}));
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin, like curl, Postman, mobile apps, server-to-server, and health checks
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      logger.warn(`Blocked by CORS: ${JSON.stringify(origin)} (length: ${origin.length})`);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-auth-token"]
  })
);

app.options(/(.*)/, cors());
app.use(express.json());

// ── Health Check Routes ────────────────────────────────────────────────────────
const formatUptime = (seconds) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
};

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Visavo API is running"
  });
});

app.get("/health", (req, res) => {
  const dbStatus = getDbStatus();
  res.status(dbStatus === 'connected' ? 200 : 503).json({
    status: dbStatus === 'connected' ? 'OK' : 'DEGRADED',
    uptime: formatUptime(process.uptime()),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    },
  });
});

app.get("/api/health", (req, res) => {
  const dbStatus = getDbStatus();
  res.status(dbStatus === 'connected' ? 200 : 503).json({
    status: dbStatus === 'connected' ? 'OK' : 'DEGRADED',
    uptime: formatUptime(process.uptime()),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    },
  });
});

// Optional request logger middleware. Keep disabled by default to avoid noisy terminals.
const requestLoggingEnabled = String(process.env.ENABLE_API_REQUEST_LOGS || "").trim() === "1";
app.use((req, res, next) => {
  if (requestLoggingEnabled) {
    logger.request(req.method, req.originalUrl, '-', 0);
  }
  next();
});

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Admin universal controls — mounted on `app` (not only inside the admin router) so
// POST /api/admin/control/* always resolves the same way as other first-class routes.
const { protect, requireAdmin } = require('./middleware/authMiddleware');
const {
  getGlobalCountryDefaults,
  updateGlobalBasePrice,
  updateGlobalGovernmentFee,
  updateGlobalVisaType,
  updateGlobalValidity,
  updateGlobalLengthOfStay,
  updateGlobalEntryType,
  updateGlobalProcessingDays,
  updateGlobalRequiredDocuments,
  updateGlobalOptionalDocuments,
  updateDocumentSectionCopy,
  manageCustomDocuments,
  updateCountryDisplayToggles,
} = require('./controllers/countryController');
app.get('/api/admin/control/country-defaults', protect, requireAdmin, getGlobalCountryDefaults);
app.post('/api/admin/control/base-price', protect, requireAdmin, updateGlobalBasePrice);
app.post('/api/admin/control/government-fee', protect, requireAdmin, updateGlobalGovernmentFee);
app.post('/api/admin/control/visa-type', protect, requireAdmin, updateGlobalVisaType);
app.post('/api/admin/control/validity', protect, requireAdmin, updateGlobalValidity);
app.post('/api/admin/control/length-of-stay', protect, requireAdmin, updateGlobalLengthOfStay);
app.post('/api/admin/control/entry-type', protect, requireAdmin, updateGlobalEntryType);
app.post('/api/admin/control/processing-days', protect, requireAdmin, updateGlobalProcessingDays);
app.post('/api/admin/control/required-documents', protect, requireAdmin, updateGlobalRequiredDocuments);
app.post('/api/admin/control/optional-documents', protect, requireAdmin, updateGlobalOptionalDocuments);
app.post('/api/admin/control/document-section-copy', protect, requireAdmin, updateDocumentSectionCopy);
app.post('/api/admin/control/custom-documents', protect, requireAdmin, manageCustomDocuments);
app.post('/api/admin/control/display-toggles', protect, requireAdmin, updateCountryDisplayToggles);

// Routes
app.use('/api/admin/auth', require('./routes/adminAuthRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/travelers', require('./routes/travelerRoutes'));
app.use('/api/visa-types', require('./routes/visaTypeRoutes'));
app.use('/api/google-sheets', require('./routes/googleSheetsRoutes'));
app.use('/api/google', require('./routes/googleWebhookRoutes'));
app.use('/api/blog', require('./routes/blogRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/testimonials', require('./routes/testimonialRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Public Config Routes
const {
  getRazorpayKeyId,
  getPaymentConfig,
  getFirebaseConfig,
  getUploadSettings,
  getDestinationPageContent,
  getSiteState,
  getCustomerChatConfig,
  getThemeConfig,
  getFooterConfig,
  getSeoConfig,
  getUserProfilePageCopy,
  getUserDashboardPageCopy,
} = require('./controllers/settingsController');
const { getPublicCountryCodeSettings } = require('./controllers/authSettingsController');
app.get('/api/config/razorpay', getRazorpayKeyId);
app.get('/api/config/payment', getPaymentConfig);
app.get('/api/config/firebase', getFirebaseConfig);
app.get('/api/config/upload-settings', getUploadSettings);
app.get('/api/config/destination-content', getDestinationPageContent);
app.get('/api/config/profile-copy', getUserProfilePageCopy);
app.get('/api/config/dashboard-copy', getUserDashboardPageCopy);
app.get('/api/config/site-state', getSiteState);
app.get('/api/config/customer-chat', getCustomerChatConfig);
app.get('/api/config/theme', getThemeConfig);
app.get('/api/config/footer', getFooterConfig);
app.get('/api/config/seo', getSeoConfig);
app.get('/api/config/country-codes', getPublicCountryCodeSettings);
const { validateCoupon } = require('./controllers/paymentController');
app.post('/api/coupons/validate', validateCoupon);

// Public Countries Routes
const { getCountries, getCountryBySlug, getPopularCountries, trackCountryVisit } = require('./controllers/countryController');
const { getPublicPageBySlug, getPublicPages } = require('./controllers/staticPageController');
app.get('/api/countries', getCountries);
app.get('/api/countries/popular', getPopularCountries);
app.post('/api/countries/:id/visit', trackCountryVisit);
app.get('/api/countries/:slug', getCountryBySlug);
app.get('/api/pages', getPublicPages);
app.get('/api/pages/:slug', getPublicPageBySlug);

app.use('/api/blog', require('./routes/blogRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));

const { searchPlaces } = require('./controllers/geocodeController');
const { getFooterSocialIcons } = require('./controllers/footerSocialIconController');
app.get('/api/geocode/places', searchPlaces);
app.get('/api/footer-social-icons', getFooterSocialIcons);

// ── MongoDB Persistent Support Chat Store & Models ───────────────────────────────────────
const optionalAuth = require('./middleware/optionalAuth');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const Faq = require('./models/Faq');
const Application = require('./models/Application');
const Settings = require('./models/Settings');

const generateTicketId = () =>
  `TKT-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;

// Helper to construct a standard virtual conversation payload exactly matching the UI expectation
const mapConversation = async (convo) => {
  const messages = await Message.find({ conversationId: convo._id }).sort({ createdAt: 1 });
  const adminTypingActive = Boolean(
    convo.adminTyping &&
    convo.adminTypingAt &&
    (Date.now() - new Date(convo.adminTypingAt).getTime()) < 10000
  );

  if (convo.adminTyping && !adminTypingActive) {
    convo.adminTyping = false;
    convo.adminTypingAt = null;
    await convo.save();
  }

  const firstUserMsg = messages.find((m) => m.senderType === 'user')?.text || '';
  const resolvedTicketId = convo.ticketId || `TKT-${convo._id.toString().slice(-6).toUpperCase()}`;
  const resolvedSubject =
    (convo.subject && convo.subject !== 'Support Inquiry' ? convo.subject : '') ||
    convo.userSelectedCategory ||
    convo.escalationReason ||
    (firstUserMsg ? firstUserMsg.slice(0, 60) : 'Support Inquiry');

  return {
    id: convo._id.toString(),
    ticketId: resolvedTicketId,
    subject: resolvedSubject,
    name: convo.userName,
    email: convo.userEmail,
    phone: convo.userPhone,
    unread: convo.unreadCount,
    active: convo.active,
    adminTyping: adminTypingActive,
    lastMessage: convo.lastMessage,
    createdAt: convo.createdAt,
    updatedAt: convo.updatedAt,
    closedAt: convo.closedAt || null,
    status: convo.status,
    escalationReason: convo.escalationReason,
    userSelectedCategory: convo.userSelectedCategory,
    humanRequested: convo.humanRequested,
    messageCount: messages.length || convo.messageCount || 0,
    messages: messages.map(m => ({
      id: m._id.toString(),
      sender: m.senderType,
      text: m.text,
      type: m.messageType || 'text',
      options: m.options || [],
      applicationsData: m.applicationsData || [],
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }))
  };
};

// ── USER-SIDE NEW CHAT API ENDPOINTS ───────────────────────────────────────

// 1. GET /api/chat/my-conversation (Uses auth token if present, or email query fallback)
app.get('/api/chat/my-conversation', optionalAuth, async (req, res) => {
  try {
    let convo = null;
    const emailAddress = req.query.email || (req.user ? req.user.email : null);
    if (req.user) {
      convo = await Conversation.findOne({
        hiddenFromUser: { $ne: true },
        $or: [
          { userId: req.user.id },
          ...(emailAddress ? [{ userEmail: emailAddress }] : [])
        ]
      });
      if (convo && !convo.userId) {
        convo.userId = req.user.id;
        await convo.save();
      }
    } else if (emailAddress) {
      convo = await Conversation.findOne({ hiddenFromUser: { $ne: true }, userEmail: emailAddress });
    }

    if (convo) {
      const mapped = await mapConversation(convo);
      res.json({ success: true, conversation: mapped });
    } else {
      res.json({ success: true, conversation: null });
    }
  } catch (err) {
    logger.error("Error in my-conversation:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. POST /api/chat/message (Creates or reuses conversation, posts user message)
app.post('/api/chat/message', optionalAuth, async (req, res) => {
  const { text, name, email, phone } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: "Text is required" });
  }

  try {
    const rawEmail = email || req.query.email || (req.user ? req.user.email : null);
    const emailAddress = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
    if (!emailAddress) {
      return res.status(400).json({ success: false, message: "Email required" });
    }
    const emailRegex = new RegExp(`^${emailAddress.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    let convo = null;
    if (req.user) {
      convo = await Conversation.findOne({
        hiddenFromUser: { $ne: true },
        $or: [
          { userId: req.user.id },
          { userEmail: emailAddress }
        ]
      });

      if (!convo) {
        convo = new Conversation({
          userId: req.user.id,
          userName: name || "Logged-in User",
          userEmail: emailAddress,
          userPhone: phone || "Not provided",
          lastMessage: text,
          unreadCount: 0,
          active: true
        });
      } else {
        if (!convo.userId) convo.userId = req.user.id;
        if (name) convo.userName = name;
        if (phone) convo.userPhone = phone;
      }
    } else {
      convo = await Conversation.findOne({ hiddenFromUser: { $ne: true }, userEmail: emailAddress });
      if (!convo) {
        convo = new Conversation({
          userId: null,
          userName: name || "Anonymous Guest",
          userEmail: emailAddress,
          userPhone: phone || "Not provided",
          lastMessage: text,
          unreadCount: 0,
          active: true
        });
      } else {
        if (name) convo.userName = name;
        if (phone) convo.userPhone = phone;
      }
    }

    convo.lastMessage = text;
    convo.unreadCount += 1;
    convo.active = true;
    convo.updatedAt = new Date();
    await convo.save();

    const msg = new Message({
      conversationId: convo._id,
      senderType: "user",
      senderId: req.user ? req.user.id : "guest",
      text,
      read: false
    });
    await msg.save();

    const mapped = await mapConversation(convo);
    res.json({ success: true, conversation: mapped });
  } catch (err) {
    logger.error("Error sending user message:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── ADMIN-SIDE NEW CHAT API ENDPOINTS ───────────────────────────────────────

// 1. GET /api/admin/chat/conversations (Fetches all persistent user threads)
app.get('/api/admin/chat/conversations', protect, requireAdmin, async (req, res) => {
  try {
    const convos = await Conversation.find().sort({ updatedAt: -1 });
    const mapped = await Promise.all(convos.map(c => mapConversation(c)));
    res.json({ success: true, conversations: mapped });
  } catch (err) {
    logger.error("Error getting admin conversations:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. GET /api/admin/chat/conversations/:conversationId/messages
app.get('/api/admin/chat/conversations/:conversationId/messages', protect, requireAdmin, async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.conversationId }).sort({ createdAt: 1 });
    const mappedMessages = messages.map(m => ({
      id: m._id.toString(),
      sender: m.senderType,
      text: m.text,
      type: m.messageType || 'text',
      options: m.options || [],
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
    res.json({ success: true, messages: mappedMessages });
  } catch (err) {
    logger.error("Error getting conversation messages:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 3. POST /api/admin/chat/conversations/:conversationId/reply
app.post('/api/admin/chat/conversations/:conversationId/reply', protect, requireAdmin, async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: "Text is required" });
  }

  try {
    const convo = await Conversation.findById(req.params.conversationId);
    if (!convo) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    convo.lastMessage = text;
    convo.unreadCount = 0; // Reset unread count since admin replied
    convo.adminTyping = false;
    convo.adminTypingAt = null;
    convo.updatedAt = new Date();
    await convo.save();

    const msg = new Message({
      conversationId: convo._id,
      senderType: "admin",
      senderId: req.user.id,
      text,
      read: true
    });
    await msg.save();

    const mapped = await mapConversation(convo);
    res.json({ success: true, conversation: mapped });
  } catch (err) {
    logger.error("Error sending admin reply:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post('/api/admin/chat/conversations/:conversationId/typing', protect, requireAdmin, async (req, res) => {
  const { isTyping } = req.body;

  try {
    const convo = await Conversation.findById(req.params.conversationId);
    if (!convo) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    convo.adminTyping = Boolean(isTyping);
    convo.adminTypingAt = isTyping ? new Date() : null;
    await convo.save();

    res.json({ success: true });
  } catch (err) {
    logger.error("Error updating admin typing status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post('/api/admin/chat/conversations/:conversationId/status', protect, requireAdmin, async (req, res) => {
  const { status } = req.body;
  try {
    const convo = await Conversation.findById(req.params.conversationId);
    if (!convo) return res.status(404).json({ success: false, message: "Conversation not found" });

    convo.status = status;
    if (status === 'RESOLVED') {
      convo.closedAt = new Date();
    } else {
      convo.closedAt = null;
    }
    if (status === 'RESOLVED' || status === 'AI_PENDING') {
      convo.humanRequested = false;
      convo.messageCount = 0;
      convo.consecutiveFailures = 0;
      convo.escalationReason = "";
      convo.userSelectedCategory = "";
    }
    await convo.save();
    
    // Send a system message to user
    let text = "Conversation has been resolved.";
    if (status === 'AI_PENDING') text = "An agent has closed the conversation. You are now chatting with our Virtual Assistant.";
    if (status === 'HUMAN_CONNECTED') text = "An agent has joined the chat.";
    
    const msg = new Message({
      conversationId: convo._id,
      senderType: "admin",
      senderId: "system",
      text,
      read: true
    });
    await msg.save();
    
    const mapped = await mapConversation(convo);
    res.json({ success: true, conversation: mapped });
  } catch (err) {
    logger.error("Error updating conversation status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── BACKWARDS COMPATIBILITY MAPPINGS FOR LEGACY CHAT ENDPOINTS ───────────────────

app.get('/api/support/conversations', protect, requireAdmin, async (req, res) => {
  try {
    const convos = await Conversation.find().sort({ updatedAt: -1 });
    const mapped = await Promise.all(convos.map(c => mapConversation(c)));
    res.json({ success: true, conversations: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post('/api/support/conversations/:id', protect, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { active, unread } = req.body;
  try {
    const convo = await Conversation.findById(id);
    if (convo) {
      if (active !== undefined) convo.active = active;
      if (unread !== undefined) convo.unreadCount = unread;
      convo.updatedAt = new Date();
      await convo.save();
      const mapped = await mapConversation(convo);
      res.json({ success: true, conversation: mapped });
    } else {
      res.status(404).json({ success: false, message: "Conversation not found" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post('/api/support/conversations/:id/messages', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const { sender, text, name, email, phone } = req.body;
  if (!text) return res.status(400).json({ success: false, message: "Text is required" });

  try {
    const rawEmail = email || req.query.email || (req.user ? req.user.email : null);
    const emailAddress = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
    if (!emailAddress) {
      return res.status(400).json({ success: false, message: "Email required" });
    }
    const emailRegex = new RegExp(`^${emailAddress.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    let convo = null;
    const isNew = !id || id === "new" || id === "undefined";
    
    if (!isNew && id.match(/^[0-9a-fA-F]{24}$/)) {
      convo = await Conversation.findById(id);
    }
    
    if (!convo && !isNew) {
      if (req.user) {
        convo = await Conversation.findOne({
          hiddenFromUser: { $ne: true },
          status: { $ne: 'RESOLVED' },
          $or: [
            { userId: req.user.id },
            { userEmail: emailRegex }
          ]
        }).sort({ updatedAt: -1 });
      } else {
        convo = await Conversation.findOne({
          hiddenFromUser: { $ne: true },
          status: { $ne: 'RESOLVED' },
          userEmail: emailRegex
        }).sort({ updatedAt: -1 });
      }
    }

    if (!convo) {
      convo = new Conversation({
        userId: req.user ? req.user.id : null,
        userName: name || "Anonymous User",
        userEmail: emailAddress,
        userPhone: phone || "Not provided",
        ticketId: generateTicketId(),
        subject: text.startsWith("APP_SELECT_") ? "Application Inquiry" : String(text).trim().slice(0, 60),
        lastMessage: text,
        unreadCount: 0,
        active: true
      });
    } else {
      if (req.user && !convo.userId) convo.userId = req.user.id;
      if (!convo.ticketId) convo.ticketId = generateTicketId();
      if ((!convo.subject || convo.subject === "Support Inquiry") && sender === "user" && !text.startsWith("APP_SELECT_")) {
        convo.subject = String(text).trim().slice(0, 60);
      }
      if (sender === "user" && convo.status === "RESOLVED") {
        return res.status(400).json({ success: false, message: "This ticket is already resolved." });
      }
      if (name) convo.userName = name;
      if (phone) convo.userPhone = phone;
    }

    if (sender === "user") {
      convo.messageCount = (convo.messageCount || 0) + 1;
      convo.unreadCount += 1;
      convo.active = true;
      convo.adminTyping = false;
      convo.adminTypingAt = null;
    } else {
      convo.unreadCount = 0;
      convo.adminTyping = false;
      convo.adminTypingAt = null;
    }
    convo.lastMessage = text;
    convo.updatedAt = new Date();
    await convo.save();

    const userMsg = new Message({
      conversationId: convo._id,
      senderType: sender === "user" ? "user" : "admin",
      senderId: req.user ? req.user.id : (sender === "user" ? "guest" : "admin"),
      text,
      read: sender !== "user"
    });
    await userMsg.save();

    let aiMessage = null;

    if (sender === "user" && (!convo.status || convo.status === "AI_PENDING")) {
      const lowerText = text.toLowerCase();
      const chatSettingsDoc = await Settings.findOne().select("customerChatQuickTabs").lean();
      const configuredTabs =
        Array.isArray(chatSettingsDoc?.customerChatQuickTabs) && chatSettingsDoc.customerChatQuickTabs.length > 0
          ? chatSettingsDoc.customerChatQuickTabs
              .map((t) => ({
                label: String(t?.label || "").trim(),
                actionType: String(t?.actionType || "custom_reply").trim(),
                replyText: String(t?.replyText || "").trim(),
              }))
              .filter((t) => t.label.length > 0)
          : [
              { label: "Application Status", actionType: "application_status", replyText: "" },
              { label: "Require Document Needed", actionType: "required_documents", replyText: "" },
              { label: "Refund Related", actionType: "refund_policy", replyText: "" },
              { label: "Talk to Human", actionType: "human_support", replyText: "" },
            ];
      const quickTabLabels = configuredTabs.map((t) => t.label);
      const matchedTab = configuredTabs.find((t) => t.label.toLowerCase() === lowerText.trim());

      const triggersHuman =
        matchedTab?.actionType === "human_support" ||
        /(human|agent|executive|talk to human|representative|real person)/i.test(lowerText);

      const findUserApplications = async () => {
        const filters = [];
        if (convo.userId) {
          filters.push({ user: convo.userId });
        }
        const safeEmail = String(convo.userEmail || "").trim();
        if (safeEmail && !safeEmail.endsWith("@phone.visavo.in")) {
          filters.push({ email: new RegExp(`^${safeEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
        }
        if (filters.length === 0) return [];
        return Application.find(filters.length === 1 ? filters[0] : { $or: filters }).sort({ createdAt: -1 });
      };

      if (matchedTab?.actionType === "custom_reply") {
        convo.consecutiveFailures = 0;
        await convo.save();
        aiMessage = new Message({
          conversationId: convo._id,
          senderType: "admin",
          senderId: "system",
          text:
            matchedTab.replyText ||
            `Thanks for reaching out about "${matchedTab.label}". Please share your query below or connect with our support team.`,
          messageType: "chips",
          options: ["Talk to Human", "Main Menu"],
          read: true
        });
      } else if (triggersHuman) {
        convo.consecutiveFailures = 0;
        await convo.save();
        aiMessage = new Message({
          conversationId: convo._id,
          senderType: "admin",
          senderId: "system",
          text: matchedTab?.replyText || "I can connect you with one of our visa support executives right away. Click below to notify our team.",
          messageType: "human_escalation",
          read: true
        });
        await aiMessage.save();
      } else {
        const appRelatedIntents = [
          "application status", "check status", "track application", "uploaded documents", "payment",
          "refund", "refund related", "refund & cancellation", "required documents", "require document needed",
          "document needed", "documents needed", "visa information", "traveller details", "document verification"
        ];
        
        let isAppIntent =
          matchedTab?.actionType === "application_status" ||
          matchedTab?.actionType === "required_documents" ||
          matchedTab?.actionType === "refund_policy" ||
          appRelatedIntents.some(intent => lowerText.includes(intent));
        const isChangeApp = lowerText.includes("change application") || lowerText.includes("select another application");
        
        let processingText = lowerText;
        if (matchedTab?.actionType === "required_documents") processingText = "document";
        else if (matchedTab?.actionType === "refund_policy") processingText = "refund";
        else if (matchedTab?.actionType === "application_status") processingText = "check status";
        let isAppSelect = false;

        if (text.startsWith("APP_SELECT_")) {
          const selectedAppId = text.replace("APP_SELECT_", "");
          isAppSelect = true;
          convo.selectedApplicationId = selectedAppId;
          processingText = convo.pendingQuestion || "check status";
          convo.pendingQuestion = "";
          await convo.save();
          isAppIntent = true; // Force into the app intent flow
        } else if (isChangeApp) {
          convo.selectedApplicationId = null;
          await convo.save();
          processingText = "check status"; 
          isAppIntent = true;
        }

        if (isAppIntent) {
          if (!convo.selectedApplicationId) {
            const apps = await findUserApplications();

            if (apps.length === 0) {
              if (processingText.includes("document")) {
                aiMessage = new Message({
                  conversationId: convo._id,
                  senderType: "admin",
                  senderId: "system",
                  text:
                    matchedTab?.replyText ||
                    "Standard Visa Documents Required:\n\n" +
                    "1. Valid Passport (at least 6 months validity from travel date)\n" +
                    "2. Recent Passport-size Photograph\n" +
                    "3. Bank Statement / Financial Proof\n" +
                    "4. Flight & Hotel Reservation / Travel Itinerary\n" +
                    "5. Employment / Business / Student Proof (as applicable)\n\n" +
                    "Tip: Exact checklist depends on your destination country. Open any country page to view its full document list, or connect with our team for personalized help.",
                  messageType: "chips",
                  options: ["Talk to Human", "Main Menu"],
                  read: true
                });
              } else if (processingText.includes("refund") || processingText.includes("cancellation")) {
                aiMessage = new Message({
                  conversationId: convo._id,
                  senderType: "admin",
                  senderId: "system",
                  text:
                    matchedTab?.replyText ||
                    "Visa & Voyage Refund Policy:\n\n" +
                    "• If your visa application is rejected, eligible refund amounts are processed directly to your original payment method / bank account within 1-3 business days.\n" +
                    "• For cancellation or refund requests on an existing application, please share your Application ID with our support team at support@visavo.in or connect with a live agent below.",
                  messageType: "chips",
                  options: ["Talk to Human", "Main Menu"],
                  read: true
                });
              } else {
                aiMessage = new Message({
                  conversationId: convo._id,
                  senderType: "admin",
                  senderId: "system",
                  text:
                    matchedTab?.replyText ||
                    "We couldn't find any visa applications under your account yet. You can start a new application from the home page, or connect with a support executive if you applied using a different email.",
                  messageType: "chips",
                  options: ["Talk to Human", "Require Document Needed", "Main Menu"],
                  read: true
                });
              }
            } else {
              if (!isChangeApp && !isAppSelect) {
                convo.pendingQuestion = lowerText;
                await convo.save();
              }
              
              const appsData = apps.map(app => ({
                applicationId: app.applicationId,
                countryName: app.countryName,
                flagEmoji: app.flagEmoji,
                visaType: app.visaType,
                status: app.status,
                travelDate: app.travelDate
              }));

              aiMessage = new Message({
                conversationId: convo._id,
                senderType: "admin",
                senderId: "system",
                text: "Please select the application.",
                messageType: "application_cards",
                applicationsData: appsData,
                read: true
              });
            }
          } else {
            // Context-aware response
            const app = await Application.findOne({ applicationId: convo.selectedApplicationId });
            if (!app) {
              convo.selectedApplicationId = null;
              await convo.save();
              aiMessage = new Message({
                conversationId: convo._id,
                senderType: "admin",
                senderId: "system",
                text: "Application not found. Please try again or select from the menu.",
                messageType: "chips",
                options: ["Main Menu"],
                read: true
              });
            } else {
              let responseText = "";

              if (processingText.includes("document")) {
                responseText = `Required Documents for ${app.countryName} (${app.visaType}):\n\n`;
                if (app.requiredDocuments && app.requiredDocuments.length > 0) {
                  app.requiredDocuments.forEach((doc, i) => {
                    responseText += `${i + 1}. ${doc}\n`;
                  });
                } else {
                  responseText += "No specific documents are listed.\n";
                }
                responseText += `\n📌 Important: You can upload your passport directly from the application details page on your dashboard.`;
                responseText += `\n\n📁 For other required documents, please upload them to a single Google Drive folder and share the link on your application dashboard.`;
                responseText += `\n\nHow to Share Folder Link:\n1. Upload all required documents to your Google Drive folder.\n2. Right-click the folder and select Share > Share.\n3. Under General access, change Restricted to 'Anyone with the link'.\n4. Make sure the role is set to Viewer.\n5. Click 'Copy link' and paste it in your application dashboard.`;
              } else if (processingText.includes("refund") || processingText.includes("cancellation")) {
                responseText = `Refund Policy for ${app.countryName} Visa:\n\n`;
            
                responseText += `If your application is rejected, don't worry! Your fee amount is directly sent to your bank account within 1-3 days.\n\n`;
                responseText += `If you would like to request a cancellation or refund for this application (${app.applicationId}), please reach out to our support team at support@visavo.in with your Application ID.`;
              } else {
                const statusMap = {
                  'pending': 'Pending Documents',
                  'review': 'Under Review',
                  'approved': 'Approved',
                  'rejected': 'Rejected'
                };
                
                const travelerCount = app.travellerCount || 1;
                const isUploaded = (app.documents && app.documents.length > 0) || (app.travellerDocuments && app.travellerDocuments.length > 0);
                
                responseText = `Application Selected:\n${app.flagEmoji} ${app.countryName}\nApplication ID: ${app.applicationId}\n\n`;
                
                responseText += `👤 Primary Applicant: ${app.firstName} ${app.lastName}\n`;
                responseText += `✈️ Visa Type: ${app.visaType}\n`;
                responseText += `📌 Status: ${statusMap[app.status] || app.status}\n`;
                responseText += `👥 Travelers: ${travelerCount}\n`;
                responseText += `📅 Applied On: ${new Date(app.createdAt).toLocaleDateString()}\n`;
                if (app.travelDate) responseText += `🛫 Travel Date: ${new Date(app.travelDate).toLocaleDateString()}\n`;
                if (app.returnDate) responseText += `🛬 Return Date: ${new Date(app.returnDate).toLocaleDateString()}\n`;
                if (app.processingDays) responseText += `⏳ Processing Time: ${app.processingDays} days\n`;
                
                responseText += `\n💳 Payment Summary:\n`;
                responseText += `Total Fee: ₹${app.fee || 0}\n`;
                responseText += `Status: ${app.paymentStatus === 'completed' ? 'Completed ✅' : 'Pending ❌'}\n`;
                if (app.paymentMethod) responseText += `Method: ${app.paymentMethod}\n`;
                if (app.transactionId) responseText += `Transaction ID: ${app.transactionId}\n`;
                
                responseText += `\n📄 Documents Status:\n`;
                responseText += `Uploads: ${isUploaded ? "Uploaded ✅" : "Pending ❌"}\n\n`;

                if (app.status === 'approved') {
                  responseText += `✅ Your visa has been approved! You can directly download it from your application dashboard or check your email.`;
                } else if (app.status === 'review' || (isUploaded && app.paymentStatus === 'completed')) {
                  responseText += `ℹ️ Our team is currently reviewing your documents. Once your visa is approved, we will send it to your email address, or you can directly download it from your application dashboard.`;
                } else {
                  responseText += `ℹ️ Your documents are currently pending. You can upload your passport directly from the application details page on your dashboard. For other documents, please upload them to a Google Drive folder and share the link on your application dashboard.`;
                }
              }


              aiMessage = new Message({
                conversationId: convo._id,
                senderType: "admin",
                senderId: "system",
                text: responseText,
                messageType: "chips",
                options: ["Main Menu"],
                read: true
              });
            }
          }
        } else if (lowerText === "main menu") {
          convo.consecutiveFailures = 0;
          await convo.save();
          aiMessage = new Message({
            conversationId: convo._id,
            senderType: "admin",
            senderId: "system",
            text: "How can we help you today? Please select from the options below:",
            messageType: "chips",
            options: quickTabLabels,
            read: true
          });
        } else if (/^(hi|hello|hey|hii|namaste|good morning|good evening)\b/i.test(lowerText)) {
          convo.consecutiveFailures = 0;
          await convo.save();
          aiMessage = new Message({
            conversationId: convo._id,
            senderType: "admin",
            senderId: "system",
            text: `Hello ${convo.userName || "there"}! How can we assist you with your visa today? Choose a quick option below or type your question.`,
            messageType: "chips",
            options: quickTabLabels,
            read: true
          });
        } else {
          // Free text search in FAQ
          const faqs = await Faq.find();
          let bestMatch = null;
          for (const faq of faqs) {
            if (lowerText.includes(faq.question.toLowerCase()) || 
                faq.keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
              bestMatch = faq;
              break;
            }
          }
          if (bestMatch) {
            convo.consecutiveFailures = 0;
            await convo.save();
            aiMessage = new Message({
              conversationId: convo._id,
              senderType: "admin",
              senderId: "system",
              text: bestMatch.answer,
              messageType: "chips",
              options: ["Talk to Human", "Main Menu"],
              read: true
            });
          } else {
            convo.consecutiveFailures += 1;
            const apps = await findUserApplications();
            
            if (apps.length > 0 && convo.consecutiveFailures === 1) {
              convo.pendingQuestion = lowerText;
              await convo.save();
              
              const appsData = apps.map(app => ({
                applicationId: app.applicationId,
                countryName: app.countryName,
                flagEmoji: app.flagEmoji,
                visaType: app.visaType,
                status: app.status,
                travelDate: app.travelDate
              }));
              
              aiMessage = new Message({
                conversationId: convo._id,
                senderType: "admin",
                senderId: "system",
                text: "Is your question about one of your applications? Select an application below, or connect directly with our support team.",
                messageType: "application_cards",
                applicationsData: appsData,
                read: true
              });
            } else if (convo.consecutiveFailures >= 2) {
              convo.consecutiveFailures = 0;
              await convo.save();
              aiMessage = new Message({
                conversationId: convo._id,
                senderType: "admin",
                senderId: "system",
                text: "Let me connect you with one of our visa specialists so you get an accurate answer right away.",
                messageType: "human_escalation",
                read: true
              });
            } else {
              await convo.save();
              aiMessage = new Message({
                conversationId: convo._id,
                senderType: "admin",
                senderId: "system",
                text: "Thanks for your message! Please choose a topic below or click 'Talk to Human' to chat directly with our support executive.",
                messageType: "chips",
                options: quickTabLabels,
                read: true
              });
            }
          }
        }
      }
        if (aiMessage) {
          await aiMessage.save();
          convo.lastMessage = aiMessage.text;
          convo.updatedAt = new Date();
          await convo.save();
        }
      }

    const mapped = await mapConversation(convo);
    res.json({ 
      success: true, 
      conversation: mapped,
      message: {
        id: userMsg._id.toString(),
        sender: userMsg.senderType,
        text: userMsg.text,
        type: userMsg.messageType || 'text',
        options: userMsg.options || [],
        time: new Date(userMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    });
  } catch (err) {
    logger.error('Legacy chat message error:', err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post('/api/support/conversations/:id/human-request', optionalAuth, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ success: false, message: "Conversation not found" });

    convo.status = "HUMAN_PENDING";
    convo.humanRequested = true;
    convo.escalationReason = "User explicitly requested human support";
    convo.updatedAt = new Date();
    await convo.save();

    const msg = new Message({
      conversationId: convo._id,
      senderType: "admin",
      senderId: "system",
      text: "We have notified our support team. An agent will be with you shortly.",
      read: true
    });
    await msg.save();

    const mapped = await mapConversation(convo);
    res.json({ success: true, conversation: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get('/api/support/conversations/client/tickets', optionalAuth, async (req, res) => {
  try {
    const isGuestMode = req.query.guest === "1";
    const effectiveUser = isGuestMode ? null : req.user;
    const rawEmail = req.query.email || (effectiveUser ? effectiveUser.email : null);
    const emailAddress = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
    if (!emailAddress && !effectiveUser) {
      return res.status(400).json({ success: false, message: "Email required" });
    }
    const emailRegex = emailAddress
      ? new RegExp(`^${emailAddress.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
      : null;

    const filter = effectiveUser
      ? {
          hiddenFromUser: { $ne: true },
          $or: [
            { userId: effectiveUser.id },
            ...(emailRegex ? [{ userEmail: emailRegex }] : [])
          ]
        }
      : { hiddenFromUser: { $ne: true }, userEmail: emailRegex };

    const convos = await Conversation.find(filter).sort({ updatedAt: -1 }).limit(30);
    const tickets = await Promise.all(
      convos.map(async (c) => {
        const msgCount = await Message.countDocuments({ conversationId: c._id });
        const firstUserMsg = await Message.findOne({ conversationId: c._id, senderType: 'user' })
          .sort({ createdAt: 1 })
          .select('text')
          .lean();
        return {
          id: c._id.toString(),
          ticketId: c.ticketId || `TKT-${c._id.toString().slice(-6).toUpperCase()}`,
          subject:
            (c.subject && c.subject !== 'Support Inquiry' ? c.subject : '') ||
            c.userSelectedCategory ||
            c.escalationReason ||
            firstUserMsg?.text?.slice(0, 60) ||
            'Support Inquiry',
          status: c.status || 'AI_PENDING',
          lastMessage: c.lastMessage || 'No messages yet',
          messageCount: msgCount || c.messageCount || 0,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          closedAt: c.closedAt || null,
        };
      })
    );

    res.json({ success: true, tickets });
  } catch (err) {
    logger.error('Error fetching client tickets:', err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post('/api/support/conversations/client/tickets', optionalAuth, async (req, res) => {
  try {
    const { name, email, phone, subject } = req.body || {};
    const rawEmail = email || req.query.email || (req.user ? req.user.email : null);
    const emailAddress = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
    if (!emailAddress && !req.user) {
      return res.status(400).json({ success: false, message: "Email required" });
    }
    const emailRegex = emailAddress
      ? new RegExp(`^${emailAddress.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
      : null;

    const activeFilter = req.user
      ? {
          hiddenFromUser: { $ne: true },
          status: { $ne: "RESOLVED" },
          $or: [
            { userId: req.user.id },
            ...(emailRegex ? [{ userEmail: emailRegex }] : [])
          ]
        }
      : { hiddenFromUser: { $ne: true }, status: { $ne: "RESOLVED" }, userEmail: emailRegex };

    const existingOpen = await Conversation.findOne(activeFilter).sort({ updatedAt: -1 });
    if (existingOpen) {
      const mappedExisting = await mapConversation(existingOpen);
      return res.status(409).json({
        success: false,
        code: "OPEN_TICKET_EXISTS",
        message: `You already have an active ticket (#${mappedExisting.ticketId}). Please wait until it is resolved before creating a new one.`,
        existingTicket: mappedExisting,
      });
    }

    const convo = new Conversation({
      userId: req.user ? req.user.id : null,
      userName: name || (req.user ? req.user.name : null) || "Customer",
      userEmail: emailAddress,
      userPhone: phone || (req.user ? req.user.phone : null) || "Not provided",
      ticketId: generateTicketId(),
      subject: String(subject || "Support Inquiry").trim().slice(0, 60) || "Support Inquiry",
      status: "AI_PENDING",
      lastMessage: "",
      unreadCount: 0,
      active: true,
    });
    await convo.save();

    const mapped = await mapConversation(convo);
    res.json({ success: true, conversation: mapped });
  } catch (err) {
    logger.error('Error creating support ticket:', err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get('/api/support/conversations/client/chat', optionalAuth, async (req, res) => {
  try {
    const isGuestMode = req.query.guest === "1";
    const effectiveUser = isGuestMode ? null : req.user;
    const rawEmail = req.query.email || (effectiveUser ? effectiveUser.email : null);
    const emailAddress = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
    const requestedTicketId = String(req.query.ticketId || "").trim();
    if (!emailAddress && !effectiveUser) {
      return res.status(400).json({ success: false, message: "Email required" });
    }
    const emailRegex = emailAddress
      ? new RegExp(`^${emailAddress.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
      : null;

    let convo = null;
    if (requestedTicketId && requestedTicketId.match(/^[0-9a-fA-F]{24}$/)) {
      convo = await Conversation.findOne({ _id: requestedTicketId, hiddenFromUser: { $ne: true } });
    }

    if (!convo) {
      const baseFilter = effectiveUser
        ? {
            hiddenFromUser: { $ne: true },
            $or: [
              { userId: effectiveUser.id },
              ...(emailRegex ? [{ userEmail: emailRegex }] : [])
            ]
          }
        : { hiddenFromUser: { $ne: true }, userEmail: emailRegex };

      convo = await Conversation.findOne({ ...baseFilter, status: { $ne: 'RESOLVED' } }).sort({ updatedAt: -1 });
      if (!convo) {
        convo = await Conversation.findOne(baseFilter).sort({ updatedAt: -1 });
      }
    }

    if (convo) {
      const mapped = await mapConversation(convo);
      res.json({ success: true, conversation: mapped });
    } else {
      res.json({ success: true, conversation: null });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── Global Error Handler (must be LAST middleware) ─────────────────────────────
app.use(errorHandler);

// ── Start HTTP server immediately (required by Hostinger/Passenger) ────────────
const port = process.env.PORT || 5000;
const host = process.env.PORT ? undefined : "0.0.0.0";

app.listen(port, host, () => {
  logger.startup(`Server running on port ${port} ✓`);
  logger.startup(`Health check: http://localhost:${port}/api/health`);
  logger.startup('Ready to accept requests.');
});

// ── 4. Bootstrap: Connect DB → Seed ───────────────────────────────────────────
const bootstrap = async () => {
  // ── 4a. Connect to MongoDB (retries internally) ─────────────────────────────
  await connectDB();

  // ── 4a.5. Start Google Sheets Polling Job ───────────────────────────────────
  try {
    const { pollSheetForStatusUpdates } = require('./services/googleSheetsService');
    const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1llCFju33TnXTFwVQB8D5XDAcUQEeINXKyKgyoUCGh5o';
    
    // Run initial poll 10 seconds after boot
    setTimeout(() => {
      pollSheetForStatusUpdates(SPREADSHEET_ID).catch(err => {});
    }, 10000);

    // Then poll every 30 seconds for fast sync
    setInterval(() => {
      pollSheetForStatusUpdates(SPREADSHEET_ID).catch(err => {
         logger.error('Error in Google Sheets polling job:', err);
      });
    }, 30 * 1000);
    logger.startup('Google Sheets 2-way sync polling job started (interval: 30s).');
  } catch (err) {
    logger.error('Failed to start Google Sheets polling job:', err);
  }

  // ── 4b. Admin seed ──────────────────────────────────────────────────────────
  try {
    const Admin = require('./models/Admin');

    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const bootstrapEmail = String(process.env.BOOTSTRAP_ADMIN_EMAIL || 'tech.visaandvoyage@gmail.com')
        .trim()
        .toLowerCase();
      const bootstrapPassword = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin123');
      await Admin.create({ email: bootstrapEmail, password: bootstrapPassword });
      logger.startup(`Bootstrap Admin account created: ${bootstrapEmail}`);
    } else {
      logger.startup(`Admin seed skipped: ${adminCount} admin account(s) already exist.`);
    }
  } catch (err) {
    logger.warn(`Skipping admin seed: ${err.message}`);
  }

  // ── Seed FAQs ─────────────────────────────────────────────────────────────
  try {
    const faqCount = await Faq.countDocuments();
    if (faqCount === 0) {
      await Faq.insertMany([
        {
          question: "What is the processing time for visas?",
          answer: "Processing times vary by country. Typically it ranges from 3 to 15 working days. Please check the specific country page for exact details.",
          category: "Visa Information",
          keywords: ["processing", "time", "days", "how long", "duration"]
        },
        {
          question: "Can I get a refund if my visa is rejected?",
          answer: "Government and embassy fees are strictly non-refundable regardless of the outcome. Our service fees may be refundable under specific circumstances as per our terms and conditions.",
          category: "Refunds",
          keywords: ["refund", "rejected", "cancel", "money back", "denied"]
        },
        {
          question: "How can I track my application?",
          answer: "You can track your application directly from your user dashboard under the 'Applications' tab.",
          category: "Application Status",
          keywords: ["track", "status", "where is my visa", "dashboard"]
        },
        {
          question: "What are the common reasons for visa rejection?",
          answer: "Common reasons include incomplete documentation, insufficient funds, incorrect information, or past immigration violations.",
          category: "Visa Information",
          keywords: ["reject", "rejection", "refusal", "why rejected"]
        }
      ]);
      logger.startup(`Seeded default FAQs.`);
    }
  } catch (err) {
    logger.warn(`Skipping FAQ seed: ${err.message}`);
  }

  // ── Auto-Seeding (Disabled by default to speed up Hostinger boot times) ──
  // To run these on startup, add RUN_SEEDERS=true to your Hostinger environment variables.
  if (process.env.RUN_SEEDERS === 'true') {
    // ── Seed countries on first boot + keep list at 195 ───────────
    try {
      const { seedCountries, syncMissingCountries } = require('./seedCountries');
      await seedCountries();
      await syncMissingCountries();
    } catch (err) {
      logger.warn(`Skipping country seed: ${err.message}`);
    }

    // ── Seed default static CMS pages (Terms & Conditions, etc.) ──
    try {
      const { seedStaticPages } = require('./seedStaticPages');
      await seedStaticPages();
    } catch (err) {
      logger.warn(`Skipping static page seed: ${err.message}`);
    }

    // ── Seed sample blog categories + posts ─────────────────────
    try {
      const { seedBlog } = require('./seedBlog');
      const result = await seedBlog();
      if (result.ok && result.postsInserted) {
        logger.startup(`Seeded ${result.postsInserted} sample blog posts.`);
      }
    } catch (err) {
      logger.warn(`Skipping blog seed: ${err.message}`);
    }
  } else {
    logger.startup("Seeders skipped to optimize boot time. (Set RUN_SEEDERS=true to enable)");
  }
};

// ── 5. Process-Level Crash Guards ──────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION — shutting down…', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION — shutting down…', reason instanceof Error ? reason : new Error(String(reason)));
  process.exit(1);
});

// Graceful shutdown on SIGTERM (Hostinger / Docker / systemd)
process.on('SIGTERM', () => {
  logger.startup('SIGTERM received — graceful shutdown');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.startup('SIGINT received — shutting down');
  process.exit(0);
});

// ── 6. Run ─────────────────────────────────────────────────────────────────────
bootstrap().catch((err) => {
  logger.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
