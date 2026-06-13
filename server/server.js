const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const connectDB = require('./config/db');

// Load env from root directory (for Hostinger/cPanel deployments) and server/ directory
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });

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
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174"
];

// Middleware
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

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("Blocked by CORS:", origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-auth-token"]
  })
);

app.options("*", cors());
app.use(express.json());

// Health Check Routes
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Visavo API is running"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is healthy"
  });
});

// Optional request logger middleware. Keep disabled by default to avoid noisy terminals.
const requestLoggingEnabled = String(process.env.ENABLE_API_REQUEST_LOGS || "").trim() === "1";
app.use((req, res, next) => {
  if (requestLoggingEnabled) {
    console.log(`[API REQUEST] ${req.method} ${req.originalUrl}`);
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
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/travelers', require('./routes/travelerRoutes'));
app.use('/api/visa-types', require('./routes/visaTypeRoutes'));

// Public Config Routes
const {
  getRazorpayKeyId,
  getPaymentConfig,
  getFirebaseConfig,
  getUploadSettings,
  getDestinationPageContent,
  getSiteState,
  getCustomerChatConfig,
  getFooterConfig,
  getSeoConfig,
} = require('./controllers/settingsController');
const { getPublicCountryCodeSettings } = require('./controllers/authSettingsController');
app.get('/api/config/razorpay', getRazorpayKeyId);
app.get('/api/config/payment', getPaymentConfig);
app.get('/api/config/firebase', getFirebaseConfig);
app.get('/api/config/upload-settings', getUploadSettings);
app.get('/api/config/destination-content', getDestinationPageContent);
app.get('/api/config/site-state', getSiteState);
app.get('/api/config/customer-chat', getCustomerChatConfig);
app.get('/api/config/footer', getFooterConfig);
app.get('/api/config/seo', getSeoConfig);
app.get('/api/config/country-codes', getPublicCountryCodeSettings);

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

  return {
    id: convo._id.toString(),
    name: convo.userName,
    email: convo.userEmail,
    phone: convo.userPhone,
    unread: convo.unreadCount,
    active: convo.active,
    adminTyping: adminTypingActive,
    lastMessage: convo.lastMessage,
    updatedAt: convo.updatedAt,
    messages: messages.map(m => ({
      id: m._id.toString(),
      sender: m.senderType,
      text: m.text,
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
      convo = await Conversation.findOne({ userEmail: emailAddress });
    }

    if (convo) {
      const mapped = await mapConversation(convo);
      res.json({ success: true, conversation: mapped });
    } else {
      res.json({ success: true, conversation: null });
    }
  } catch (err) {
    console.error("Error in my-conversation:", err);
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
    const emailAddress = email || req.query.email || (req.user ? req.user.email : null);
    if (!emailAddress) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    let convo = null;
    if (req.user) {
      convo = await Conversation.findOne({
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
      convo = await Conversation.findOne({ userEmail: emailAddress });
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
    console.error("Error sending user message:", err);
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
    console.error("Error getting admin conversations:", err);
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
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
    res.json({ success: true, messages: mappedMessages });
  } catch (err) {
    console.error("Error getting conversation messages:", err);
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
    console.error("Error sending admin reply:", err);
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
    console.error("Error updating admin typing status:", err);
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
    const emailAddress = email || req.query.email || (req.user ? req.user.email : null);
    if (!emailAddress) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    let convo = null;
    const isNew = !id || id === "new" || id === "undefined";
    
    if (!isNew && id.match(/^[0-9a-fA-F]{24}$/)) {
      convo = await Conversation.findById(id);
    }
    
    if (!convo) {
      if (req.user) {
        convo = await Conversation.findOne({
          $or: [
            { userId: req.user.id },
            { userEmail: emailAddress }
          ]
        });
      } else {
        convo = await Conversation.findOne({ userEmail: emailAddress });
      }
    }

    if (!convo) {
      convo = new Conversation({
        userId: req.user ? req.user.id : null,
        userName: name || "Anonymous User",
        userEmail: emailAddress,
        userPhone: phone || "Not provided",
        lastMessage: text,
        unreadCount: 0,
        active: true
      });
    } else {
      if (req.user && !convo.userId) convo.userId = req.user.id;
      if (name) convo.userName = name;
      if (phone) convo.userPhone = phone;
    }

    convo.lastMessage = text;
    if (sender === "user") {
      convo.unreadCount += 1;
      convo.active = true;
      convo.adminTyping = false;
      convo.adminTypingAt = null;
    } else {
      convo.unreadCount = 0;
      convo.adminTyping = false;
      convo.adminTypingAt = null;
    }
    convo.updatedAt = new Date();
    await convo.save();

    const msg = new Message({
      conversationId: convo._id,
      senderType: sender === "user" ? "user" : "admin",
      senderId: req.user ? req.user.id : (sender === "user" ? "guest" : "admin"),
      text,
      read: sender !== "user"
    });
    await msg.save();

    const mapped = await mapConversation(convo);
    res.json({ success: true, conversation: mapped, message: {
      id: msg._id.toString(),
      sender: msg.senderType,
      text: msg.text,
      time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }});
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get('/api/support/conversations/client/chat', optionalAuth, async (req, res) => {
  try {
    const emailAddress = req.query.email || (req.user ? req.user.email : null);
    if (!emailAddress) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    let convo = null;
    if (req.user) {
      convo = await Conversation.findOne({
        $or: [
          { userId: req.user.id },
          { userEmail: emailAddress }
        ]
      });
    } else {
      convo = await Conversation.findOne({ userEmail: emailAddress });
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

// Server start
const PORT = process.env.PORT || 5000;

console.log("Environment:", process.env.NODE_ENV || "development");
console.log("Mongo URI exists:", Boolean(process.env.MONGO_URI));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Database connection and seeding (done asynchronously so app.listen isn't blocked)
connectDB().then(async () => {
  // Create a first admin only for a genuinely empty Admin collection.
  // Never update an existing admin here: dashboard password changes must
  // survive every redeploy/restart.
  try {
    const Admin = require('./models/Admin');

    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const bootstrapEmail = String(process.env.BOOTSTRAP_ADMIN_EMAIL || 'tech.visaandvoyage@gmail.com')
        .trim()
        .toLowerCase();
      const bootstrapPassword = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin123');
      await Admin.create({ email: bootstrapEmail, password: bootstrapPassword });
      console.log(`Bootstrap Admin account created: ${bootstrapEmail}`);
    } else {
      console.log(`Admin seed skipped: ${adminCount} admin account(s) already exist.`);
    }
  } catch (err) {
    console.log('Skipping admin seed:', err.message);
  }

  // ── Seed countries on first boot + keep list at 195 ───────────
  try {
    const { seedCountries, syncMissingCountries } = require('./seedCountries');
    await seedCountries();
    await syncMissingCountries();
  } catch (err) {
    console.log('Skipping country seed:', err.message);
  }

  // ── Seed default static CMS pages (Terms & Conditions, etc.) ──
  try {
    const { seedStaticPages } = require('./seedStaticPages');
    await seedStaticPages();
  } catch (err) {
    console.log('Skipping static page seed:', err.message);
  }

  // ── Seed sample blog categories + posts ─────────────────────
  try {
    const { seedBlog } = require('./seedBlog');
    const result = await seedBlog();
    if (result.ok && result.postsInserted) {
      console.log(`Seeded ${result.postsInserted} sample blog posts.`);
    }
  } catch (err) {
    console.log('Skipping blog seed:', err.message);
  }
}).catch((err) => {
  console.error('Failed to connect to database on startup:', err);
});
