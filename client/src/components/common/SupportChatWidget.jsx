import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  X,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  MoreVertical,
  Send,
  Smile,
  ExternalLink,
  MessageSquare,
  Loader2,
  Headphones,
  CircleEllipsis,
  CheckCheck,
  Zap,
  LogOut,
  History,
  Plus,
  Ticket,
} from "lucide-react";
import { api, useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { useLocation } from "react-router-dom";
import { formatOrdinalDate } from "../../utils/dateUtils";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  filterPhoneCountryOptions,
  findPhoneCountryOption,
  getPhoneCountryOptions,
  loadPhoneCountryOptions,
} from "../../utils/phoneCountryCodes";

const DEFAULT_QUICK_TABS = [
  { label: "Application Status", actionType: "application_status", replyText: "" },
  { label: "Require Document Needed", actionType: "required_documents", replyText: "" },
  { label: "Refund Related", actionType: "refund_policy", replyText: "" },
  { label: "Talk to Human", actionType: "human_support", replyText: "" },
];

const DEFAULT_CHAT_CONFIG = {
  enabled: true,
  mode: "external_link",
  link: "",
  title: "Continue with Chat",
  description: "Get instant support from our visa team",
  headerTitle: "Chat with us",
  headerSubtitle: "We typically reply in a few minutes",
  whatsappTemplate: "",
  quickTabs: DEFAULT_QUICK_TABS,
};

const WhatsAppIcon = ({ className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const isWhatsAppSupportLink = (value) => {
  const link = String(value || "").trim().toLowerCase();
  if (!link) return false;
  if (
    link.includes("wa.me/") ||
    link.includes("whatsapp.com/") ||
    link.includes("api.whatsapp.com/")
  ) {
    return true;
  }
  const cleaned = link.replace(/[^0-9]/g, "");
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return true;
  }
  return false;
};

const getWhatsAppUrl = (value) => {
  const link = String(value || "").trim();
  if (!link) return "https://wa.me/918882838383";
  if (link.includes("wa.me/") || link.includes("whatsapp.com/") || link.includes("api.whatsapp.com/")) {
    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      return `https://${link}`;
    }
    return link;
  }
  const cleaned = link.replace(/[^0-9]/g, "");
  if (cleaned.length >= 10) {
    return `https://wa.me/${cleaned}`;
  }
  return `https://wa.me/918882838383`;
};

const buildGreetingMessage = (currentUser, quickTabs = DEFAULT_QUICK_TABS) => {
  const options =
    Array.isArray(quickTabs) && quickTabs.length > 0
      ? quickTabs.map((t) => String(t?.label || "").trim()).filter(Boolean)
      : DEFAULT_QUICK_TABS.map((t) => t.label);
  return {
    id: "m_greet",
    sender: "support",
    text: `Hello ${currentUser?.name || "there"}! Welcome to Visa & Voyage Support. How can we help you today?`,
    type: "chips",
    options,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

const resolveChatEmail = (currentUser) => {
  if (currentUser?.email) return currentUser.email;
  const digits = String(currentUser?.phone || "").replace(/\D/g, "");
  if (digits) return `${digits}@phone.visavo.in`;
  return "";
};

const withAutomationGreeting = (conversationMessages = [], currentUser, quickTabs = DEFAULT_QUICK_TABS) => {
  if (!currentUser) return conversationMessages;
  if (!Array.isArray(conversationMessages) || conversationMessages.length === 0) {
    return [buildGreetingMessage(currentUser, quickTabs)];
  }

  const hasSupportReply = conversationMessages.some((msg) => msg.sender !== "user");
  if (hasSupportReply) return conversationMessages;

  return [buildGreetingMessage(currentUser, quickTabs), ...conversationMessages];
};

const CHAT_EMOJIS = ["😀", "😊", "😍", "👍", "🙏", "🎉", "❤️", "😄", "🤝", "✨"];

export default function SupportChatWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState("options");
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [adminIsTyping, setAdminIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatConfig, setChatConfig] = useState(() => {
    try {
      const cached = sessionStorage.getItem("customer_chat_config");
      return cached ? JSON.parse(cached) : DEFAULT_CHAT_CONFIG;
    } catch {
      return DEFAULT_CHAT_CONFIG;
    }
  });

  // Live Chat sync states
  const [guestUser, setGuestUser] = useState(() => {
    const cached = localStorage.getItem("guest_chat_user");
    return cached ? JSON.parse(cached) : null;
  });
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCountryCode, setGuestCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [guestPhoneError, setGuestPhoneError] = useState("");
  const [guestCountryOpen, setGuestCountryOpen] = useState(false);
  const [guestCountrySearch, setGuestCountrySearch] = useState("");
  const [phoneCountryOptions, setPhoneCountryOptions] = useState(() => getPhoneCountryOptions());
  const guestCountryRef = useRef(null);
  const [activeConvo, setActiveConvo] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [chatError, setChatError] = useState("");
  const sendingRef = useRef(false);
  const lastSendAtRef = useRef(0);

  const getActiveChatUser = () => {
    const authUser = useAuthStore.getState().user;
    if (authUser) return authUser;
    if (guestUser) return guestUser;
    try {
      const cached = localStorage.getItem("guest_chat_user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  const registeredUser = useAuthStore((state) => state.user);
  const authIdentity = registeredUser?.id || registeredUser?.email || registeredUser?.phone || "";
  const prevAuthIdentityRef = useRef(authIdentity);

  useEffect(() => {
    let alive = true;
    loadPhoneCountryOptions().then((opts) => {
      if (alive && Array.isArray(opts) && opts.length) {
        setPhoneCountryOptions(opts);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!guestCountryOpen) return;
    const handleOutside = (e) => {
      if (guestCountryRef.current && !guestCountryRef.current.contains(e.target)) {
        setGuestCountryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [guestCountryOpen]);

  // Clear session cross-bleed ONLY when auth identity actually changes (login, logout, or account switch)
  useEffect(() => {
    if (prevAuthIdentityRef.current === authIdentity) return;
    prevAuthIdentityRef.current = authIdentity;

    localStorage.removeItem("guest_chat_user");
    setGuestUser(null);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setActiveConvo(null);
    setMessages([]);
    setTickets([]);
    setSelectedTicketId("");
    setView("options");
  }, [authIdentity]);

  const loadTickets = async (userOverride = null) => {
    const currentUser = userOverride || getActiveChatUser();
    const chatEmail = resolveChatEmail(currentUser);
    if (!chatEmail) return [];

    const isGuestMode = !useAuthStore.getState().user;
    const guestParam = isGuestMode ? "&guest=1" : "";

    setLoadingTickets(true);
    try {
      const { data } = await api.get(
        `/support/conversations/client/tickets?email=${encodeURIComponent(chatEmail)}${guestParam}`
      );
      if (data?.success && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
        return data.tickets;
      }
    } catch (err) {
      console.error("Failed to fetch support tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
    return [];
  };

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen, guestUser]);

  // Sync client chat feed from backend using non-overlapping polling so requests never pile up
  useEffect(() => {
    if (!isOpen || view !== "chat") return;

    let cancelled = false;
    let timerId = null;

    const syncChat = async () => {
      const currentUser = getActiveChatUser();
      const chatEmail = resolveChatEmail(currentUser);
      if (!chatEmail || cancelled) return;

      if (sendingRef.current || Date.now() - lastSendAtRef.current < 1200) {
        if (!cancelled) timerId = setTimeout(syncChat, 1200);
        return;
      }

      try {
        const isGuestMode = !useAuthStore.getState().user;
        const guestParam = isGuestMode ? "&guest=1" : "";
        const ticketQuery = selectedTicketId ? `&ticketId=${encodeURIComponent(selectedTicketId)}` : "";
        const { data } = await api.get(
          `/support/conversations/client/chat?email=${encodeURIComponent(chatEmail)}${guestParam}${ticketQuery}`
        );
        if (cancelled) return;
        if (sendingRef.current || Date.now() - lastSendAtRef.current < 1200) {
          timerId = setTimeout(syncChat, 1200);
          return;
        }
        if (data?.success) {
          if (data.conversation) {
            setActiveConvo(data.conversation);
            setMessages(withAutomationGreeting(data.conversation.messages, currentUser, chatConfig.quickTabs));
            setAdminIsTyping(Boolean(data.conversation.adminTyping));
          } else {
            setActiveConvo(null);
            setMessages(withAutomationGreeting([], currentUser, chatConfig.quickTabs));
            setAdminIsTyping(false);
          }
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to sync customer chat:", err);
      } finally {
        if (!cancelled) {
          timerId = setTimeout(syncChat, 1500);
        }
      }
    };

    syncChat();
    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [isOpen, view, guestUser, selectedTicketId, chatConfig.quickTabs]);

  const getDynamicValues = async (currentLocation) => {
    const values = {
      userName: "Not selected",
      country: "Not selected",
      visaType: "Not selected",
      travelDate: "Not selected",
      applicationId: "Not selected",
    };

    try {
      // 1. Logged in user fallback
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.name) {
        values.userName = currentUser.name;
      }

      // 2. Resolve country from path if present
      const path = currentLocation?.pathname || "";
      const countryMatch = path.match(/\/destination\/([a-zA-Z0-9-_]+)/) || path.match(/\/apply\/([a-zA-Z0-9-_]+)/);
      const countryId = countryMatch ? countryMatch[1] : null;
      if (countryId) {
        const countries = useDataStore.getState().countries || [];
        const activeCountry = countries.find(c => c.id === countryId || c.slug === countryId);
        values.country = activeCountry ? activeCountry.name : (countryId.charAt(0).toUpperCase() + countryId.slice(1).replace(/-/g, " "));
      }

      // 3. Resolve application ID from path
      const appMatch = path.match(/\/dashboard\/application\/([a-fA-F0-9]{24})/);
      const urlAppId = appMatch ? appMatch[1] : null;

      if (urlAppId) {
        const { data } = await api.get(`/users/applications/${urlAppId}`);
        if (data?.success && data?.application) {
          const app = data.application;
          values.applicationId = app.applicationId || app._id || "Not selected";
          values.country = app.countryName || values.country;
          values.visaType = app.visaType || values.visaType;
          if (app.travelDate) {
            values.travelDate = formatOrdinalDate(app.travelDate);
          }
          if (app.travelerNames && app.travelerNames[0]) {
            values.userName = app.travelerNames[0];
          }
        }
      } else if (countryId) {
        // 4. Try reading from draft local storage
        const draftKey = `travelDraft_${countryId}`;
        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          if (draft.travelers && draft.travelers[0]?.name) {
            values.userName = draft.travelers[0].name;
          }
          if (draft.visaOption) {
            values.visaType = draft.visaOption;
          }
          if (draft.travelDateFrom) {
            values.travelDate = formatOrdinalDate(draft.travelDateFrom);
          }
        }
      }
    } catch (err) {
      console.error("Error resolving dynamic variables in chat widget:", err);
    }

    return values;
  };

  const generateWhatsAppMessage = (template, values) => {
    let msg = template || "";
    msg = msg.replace(/\{\{userName\}\}/gi, values.userName || "Not selected");
    msg = msg.replace(/\{\{country\}\}/gi, values.country || "Not selected");
    
    // Support {{visaType}} and {{type}}
    msg = msg.replace(/\{\{visaType\}\}/gi, values.visaType || "Not selected");
    msg = msg.replace(/\{\{type\}\}/gi, values.visaType || "Not selected");
    
    // Support {{travelDate}} and {{date}}
    msg = msg.replace(/\{\{travelDate\}\}/gi, values.travelDate || "Not selected");
    msg = msg.replace(/\{\{date\}\}/gi, values.travelDate || "Not selected");
    
    // Support {{applicationId}}, {{application_id}}, and {{application id}}
    msg = msg.replace(/\{\{applicationId\}\}/gi, values.applicationId || "Not selected");
    msg = msg.replace(/\{\{application[ _]?id\}\}/gi, values.applicationId || "Not selected");
    
    return msg;
  };

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadChatConfig = async () => {
      try {
        const { data } = await api.get("/config/customer-chat");
        if (cancelled) return;
        if (data?.success && data?.config) {
          const newConfig = {
            ...DEFAULT_CHAT_CONFIG,
            ...data.config,
          };
          setChatConfig(newConfig);
          sessionStorage.setItem("customer_chat_config", JSON.stringify(newConfig));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load customer chat config:", error);
        }
      }
    };

    loadChatConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!messagesEndRef.current || !scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    // Always scroll to bottom to ensure new messages (especially large ones) are visible
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping, adminIsTyping]);

  useEffect(() => {
    if (isOpen && view === "chat") {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, view]);

  useEffect(() => {
    const handleOpenSupportChat = () => {
      setIsOpen(true);
      handleStartChat();
    };

    window.addEventListener("open-support-chat", handleOpenSupportChat);
    return () => window.removeEventListener("open-support-chat", handleOpenSupportChat);
  }, [guestUser]);

  const canOpenExternalChat =
    chatConfig.enabled &&
    String(chatConfig.link || "").trim().length > 0;
  const hasConfiguredLink = String(chatConfig.link || "").trim().length > 0;
  const showComingSoonState = chatConfig.mode === "live_chat" && !hasConfiguredLink;
  const isWhatsAppLink = isWhatsAppSupportLink(chatConfig.link);
  const ctaTitle = isWhatsAppLink
    ? "Continue with WhatsApp"
    : (chatConfig.title || DEFAULT_CHAT_CONFIG.title);
  const ctaDescription = isWhatsAppLink
    ? "Get instant support from our visa team"
    : (chatConfig.description || DEFAULT_CHAT_CONFIG.description);
  const supportLabel = isWhatsAppLink ? "WhatsApp support" : "Customer support";

  const openExternalChat = async () => {
    const isWa = chatConfig.link ? isWhatsAppSupportLink(chatConfig.link) : true;
    if (isWa) {
      const baseWaUrl = chatConfig.link && isWhatsAppSupportLink(chatConfig.link)
        ? getWhatsAppUrl(chatConfig.link)
        : "https://wa.me/918882838383";
      const values = await getDynamicValues(location);
      const message = generateWhatsAppMessage(chatConfig.whatsappTemplate, values);
      const cleanBase = baseWaUrl.split('?')[0];
      const targetLink = message 
        ? `${cleanBase}?text=${encodeURIComponent(message)}`
        : cleanBase;
      window.open(targetLink, "_blank", "noopener,noreferrer");
    } else {
      if (canOpenExternalChat) {
        window.open(chatConfig.link, "_blank", "noopener,noreferrer");
      }
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setView("options");
    }
  };

  const handleStartChat = async (ticketIdOverride = "", userOverride = null) => {
    const currentUser = userOverride || getActiveChatUser();
    
    if (!currentUser) {
      setView("guest_onboarding");
      return;
    }

    // Wipe stale states immediately to eliminate transition glitches and race conditions!
    setChatError("");
    setActiveConvo(null);
    setMessages([]);
    setAdminIsTyping(false);
    if (ticketIdOverride) {
      setSelectedTicketId(ticketIdOverride);
    } else if (userOverride) {
      setSelectedTicketId("");
    }

    setView("chat");
    setIsTyping(true);

    try {
      const chatEmail = resolveChatEmail(currentUser);
      const isGuestMode = !useAuthStore.getState().user;
      const guestParam = isGuestMode ? "&guest=1" : "";
      const targetTicketId = userOverride ? "" : (ticketIdOverride || selectedTicketId);
      const ticketQuery = targetTicketId ? `&ticketId=${encodeURIComponent(targetTicketId)}` : "";
      const { data } = await api.get(
        `/support/conversations/client/chat?email=${encodeURIComponent(chatEmail)}${guestParam}${ticketQuery}`
      );
      if (data?.success && data?.conversation) {
        setActiveConvo(data.conversation);
        setSelectedTicketId(data.conversation.id);
        setMessages(withAutomationGreeting(data.conversation.messages, currentUser, chatConfig.quickTabs));
        setAdminIsTyping(Boolean(data.conversation.adminTyping));
      } else {
        setMessages(withAutomationGreeting([], currentUser, chatConfig.quickTabs));
        setAdminIsTyping(false);
      }
    } catch (err) {
      console.error("Error loading client chat:", err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleOpenTicketsHistory = async () => {
    const currentUser = useAuthStore.getState().user || guestUser;
    if (!currentUser) {
      setView("guest_onboarding");
      return;
    }
    setView("tickets");
    await loadTickets();
  };

  const openTicket = tickets.find((t) => t.status !== "RESOLVED") || null;

  const handleCreateNewTicket = async () => {
    const currentUser = useAuthStore.getState().user || guestUser;
    if (!currentUser) {
      setView("guest_onboarding");
      return;
    }
    if (openTicket) {
      handleStartChat(openTicket.id);
      return;
    }
    const chatEmail = resolveChatEmail(currentUser);
    if (!chatEmail || creatingTicket) return;

    setCreatingTicket(true);
    try {
      const { data } = await api.post("/support/conversations/client/tickets", {
        name: currentUser.name,
        email: chatEmail,
        phone: currentUser.phone || "Not provided",
        subject: "New Support Ticket",
      });
      if (data?.success && data?.conversation) {
        setActiveConvo(data.conversation);
        setSelectedTicketId(data.conversation.id);
        setMessages(withAutomationGreeting([], currentUser, chatConfig.quickTabs));
        setAdminIsTyping(false);
        setView("chat");
        loadTickets();
      }
    } catch (err) {
      const existing = err?.response?.data?.existingTicket;
      if (existing?.id) {
        setActiveConvo(existing);
        setSelectedTicketId(existing.id);
        setMessages(withAutomationGreeting(existing.messages, currentUser, chatConfig.quickTabs));
        setAdminIsTyping(Boolean(existing.adminTyping));
        setView("chat");
        loadTickets();
      } else {
        console.error("Failed to create new ticket:", err);
      }
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleOptionClick = (text) => {
    if (activeConvo?.status === "RESOLVED") return;
    handleSendText(text);
  };

  const handleSendText = async (textToSend) => {
    if (!textToSend.trim()) return;
    if (activeConvo?.status === "RESOLVED") return;

    const currentUser = getActiveChatUser();
    const chatEmail = resolveChatEmail(currentUser);
    if (!chatEmail) return;

    setChatError("");
    setShowEmojiPicker(false);
    setInputText("");

    let displayText = textToSend;
    if (textToSend.startsWith("APP_SELECT_")) {
      const appId = textToSend.replace("APP_SELECT_", "");
      displayText = `Selected Application: ${appId}`;
    }

    const optId = "opt_" + Date.now();
    const userMsg = {
      id: optId,
      sender: "user",
      text: displayText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    sendingRef.current = true;
    lastSendAtRef.current = Date.now();
    setMessages((prev) => [...prev, userMsg]);

    try {
      const conversationId = activeConvo?.id || "new";
      const { data } = await api.post(`/support/conversations/${conversationId}/messages`, {
        sender: "user",
        text: textToSend,
        name: currentUser.name,
        email: chatEmail,
        phone: currentUser.phone || "Guest User"
      });
      if (data?.success && data?.conversation) {
        setActiveConvo(data.conversation);
        setSelectedTicketId(data.conversation.id);
        setMessages(withAutomationGreeting(data.conversation.messages, currentUser, chatConfig.quickTabs));
        setAdminIsTyping(Boolean(data.conversation.adminTyping));
        loadTickets();
      }
    } catch (err) {
      console.error("Failed to send customer message:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optId));
      setChatError(err?.response?.data?.message || "Could not send message. Please try again.");
    } finally {
      sendingRef.current = false;
      lastSendAtRef.current = Date.now();
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    handleSendText(inputText);
  };

  const handleHumanRequest = async () => {
    if (activeConvo?.status === "RESOLVED") return;
    const currentUser = getActiveChatUser();
    const chatEmail = resolveChatEmail(currentUser);
    if (!chatEmail) return;

    const conversationId = activeConvo?.id || "new";
    if (conversationId === "new") {
      await handleSendText("Talk to Human");
      return;
    }

    sendingRef.current = true;
    lastSendAtRef.current = Date.now();
    try {
      const { data } = await api.post(`/support/conversations/${conversationId}/human-request`);
      if (data?.success && data?.conversation) {
        setActiveConvo(data.conversation);
        setSelectedTicketId(data.conversation.id);
        setMessages(withAutomationGreeting(data.conversation.messages, currentUser, chatConfig.quickTabs));
      }
    } catch (err) {
      console.error("Failed to request human:", err);
      setChatError("Could not notify support team. Please try again.");
    } finally {
      sendingRef.current = false;
      lastSendAtRef.current = Date.now();
    }
  };

  const handleEmojiSelect = (emoji) => {
    setInputText((prev) => `${prev}${emoji}`);
    setShowEmojiPicker(false);
  };



  const handleGuestSubmit = (e) => {
    e.preventDefault();
    const normalizedEmail = guestEmail.trim().toLowerCase();
    const phoneDigits = String(guestPhone || "").replace(/\D/g, "");
    if (!guestName.trim() || !normalizedEmail) return;
    if (phoneDigits.length !== 10) {
      setGuestPhoneError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setGuestPhoneError("");
    const newGuest = { 
      name: guestName.trim(), 
      email: normalizedEmail, 
      phone: `${guestCountryCode} ${phoneDigits}` 
    };
    localStorage.setItem("guest_chat_user", JSON.stringify(newGuest));
    setGuestUser(newGuest);
    setActiveConvo(null);
    setMessages([]);
    setTickets([]);
    setSelectedTicketId("");
    loadTickets(newGuest);
    handleStartChat("", newGuest);
  };

  if (!chatConfig.enabled) return null;

  return (
    <div className="support-chat-widget fixed bottom-6 right-6 z-[9999] font-sans select-none antialiased">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in {
          animation: chatFadeIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      ` }} />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 45 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 45 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed bottom-[106px] right-6 w-[calc(100vw-32px)] max-w-[360px] sm:max-w-[400px] max-h-[calc(100vh-128px)] overflow-y-auto rounded-[26px] border border-[#2D2B22]/15 bg-[#EEDFC7] text-[#2D2B22] shadow-[0_24px_64px_rgba(45,43,34,0.35)]"
          >
            {view === "options" && (
              <div>
                <div className="relative overflow-hidden bg-gradient-to-br from-[#607938] to-[#4e632d] px-5 py-4.5 text-white flex items-center justify-between" style={{ paddingTop: "18px", paddingBottom: "18px" }}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(238,223,199,0.2),transparent_40%)] pointer-events-none" />
                  <div className="flex items-center gap-3 relative z-10 min-w-0">
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEDFC7] text-[#607938] shadow-[2px_4px_10px_rgba(25,24,18,0.25)]">
                      <Headphones className="h-5 w-5" />
                      <span className="absolute -right-0.5 bottom-0 h-3 w-3 rounded-full border-2 border-[#4e632d] bg-emerald-400" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold leading-tight tracking-wide text-white truncate">
                        {chatConfig.headerTitle || DEFAULT_CHAT_CONFIG.headerTitle}
                      </h3>
                      <p className="mt-1 text-xs text-[#EEDFC7]/90 flex items-center gap-1.5 font-medium truncate">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                        </span>
                        {chatConfig.headerSubtitle || DEFAULT_CHAT_CONFIG.headerSubtitle}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleOpen}
                    aria-label="Minimize chat"
                    className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white/85 hover:bg-white/15 transition-all cursor-pointer"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3 max-h-[min(470px,calc(100vh-220px))] overflow-y-auto bg-[#EEDFC7] p-4.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#607938]/35" style={{ padding: "18px" }}>
                  <div className="px-1 pb-0.5">
                    <p className="text-sm font-extrabold text-[#2D2B22]">
                      Hi {(registeredUser?.name || guestUser?.name || "there").split(" ")[0]}! 👋
                    </p>
                    <p className="mt-0.5 text-xs text-[#6E6A59]">
                      How can we help with your visa today?
                    </p>
                  </div>

                  {/* Card 1: Live Support Chat */}
                  <div className="rounded-2xl border border-[#2D2B22]/12 bg-[#EEDFC7] p-4 text-left shadow-[4px_4px_12px_rgba(148,138,123,0.45),-4px_-4px_12px_rgba(214,201,179,0.5)]">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#607938] text-white shadow-[2px_3px_8px_rgba(45,43,34,0.2)]">
                        <MessageSquare className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-extrabold leading-tight text-[#2D2B22] flex items-center gap-1.5">
                            Live Support Chat
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#607938] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#607938]"></span>
                            </span>
                          </h4>
                        </div>
                        <p className="mt-0.5 text-xs text-[#6E6A59] leading-snug">
                          Instant answers &amp; live executive support
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartChat("")}
                      className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#607938] px-4 py-2.5 text-sm font-bold text-white shadow-[2px_5px_14px_rgba(45,43,34,0.38),0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.22)] hover:-translate-y-px hover:brightness-95 hover:shadow-[2px_7px_18px_rgba(45,43,34,0.45),0_3px_6px_rgba(0,0,0,0.24)] active:translate-y-[1px] active:shadow-[inset_2px_3px_7px_rgba(0,0,0,0.55),inset_0_1px_3px_rgba(0,0,0,0.4)] transition-all"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Start / Resume Chat
                    </button>
                  </div>

                  {/* Card 2: Support Tickets & History */}
                  <button
                    type="button"
                    onClick={handleOpenTicketsHistory}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-[#2D2B22]/12 bg-[#dfd2bc]/75 p-3.5 text-left shadow-[3px_3px_10px_rgba(148,138,123,0.35),-3px_-3px_10px_rgba(214,201,179,0.4)] transition-all hover:-translate-y-px hover:bg-[#dfd2bc] active:translate-y-[1px]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEDFC7] text-[#607938] shadow-[inset_1px_2px_4px_rgba(45,43,34,0.16)]">
                      <Ticket className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-[#2D2B22]">My Support Tickets</h4>
                        {tickets.length > 0 && (
                          <span className="rounded-full bg-[#607938] px-2 py-0.5 text-[10px] font-extrabold text-white">
                            {tickets.length}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#6E6A59] truncate">
                        View past chats, ticket IDs &amp; status
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#6E6A59] transition-transform group-hover:translate-x-0.5 group-hover:text-[#607938]" />
                  </button>

                  {/* Card 3: WhatsApp Support */}
                  {chatConfig.enabled && !chatConfig.hideWhatsAppSection && (
                    <div className="rounded-2xl border border-[#2D2B22]/12 bg-[#EEDFC7] p-4 text-left shadow-[4px_4px_12px_rgba(148,138,123,0.45),-4px_-4px_12px_rgba(214,201,179,0.5)]">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-[2px_3px_8px_rgba(37,211,102,0.28)]">
                          <WhatsAppIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-extrabold leading-tight text-[#2D2B22]">
                            WhatsApp Support
                          </h4>
                          <p className="mt-0.5 text-xs text-[#6E6A59] leading-snug">
                            Quick help directly on WhatsApp
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openExternalChat}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-[2px_5px_14px_rgba(20,90,45,0.38),0_2px_4px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.28)] hover:-translate-y-px hover:brightness-95 hover:shadow-[2px_7px_18px_rgba(20,90,45,0.45),0_3px_6px_rgba(0,0,0,0.22)] active:translate-y-[1px] active:shadow-[inset_2px_3px_7px_rgba(0,0,0,0.45),inset_0_1px_3px_rgba(0,0,0,0.3)] transition-all"
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                        Continue with WhatsApp
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#2D2B22]/10 bg-[#dfd2bc]/60 py-3 text-center text-xs text-[#6E6A59] font-medium">
                  Powered by <span className="text-[#607938] font-extrabold">Visa &amp; Voyage</span> Support
                </div>
              </div>
            )}

            {view === "guest_onboarding" && (
              <div>
                <div className="relative overflow-hidden bg-gradient-to-br from-[#607938] to-[#4e632d] px-6 py-5 text-white flex items-center justify-between">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(238,223,199,0.2),transparent_40%)] pointer-events-none" />
                  <div className="flex items-center gap-3 relative z-10">
                    <button
                      type="button"
                      onClick={() => setView("options")}
                      className="rounded-xl p-1.5 hover:bg-white/15 transition-colors cursor-pointer"
                      title="Back to options"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                      <h3 className="text-base font-extrabold tracking-wide">Live Support Chat</h3>
                      <p className="text-xs text-[#EEDFC7]/85">Introduce yourself to start chatting</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleGuestSubmit} className="p-6 space-y-4 bg-[#EEDFC7]">
                  <div>
                    <label className="block text-xs font-bold text-[#2D2B22] mb-1.5">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      className="w-full rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc] px-3.5 py-2.5 text-xs font-medium text-[#2D2B22] placeholder-[#6E6A59] shadow-[inset_2px_3px_6px_rgba(45,43,34,0.18)] focus:border-[#607938] focus:bg-[#EEDFC7] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2D2B22] mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. john@example.com"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc] px-3.5 py-2.5 text-xs font-medium text-[#2D2B22] placeholder-[#6E6A59] shadow-[inset_2px_3px_6px_rgba(45,43,34,0.18)] focus:border-[#607938] focus:bg-[#EEDFC7] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2D2B22] mb-1.5">Phone Number</label>
                    <div className="flex gap-2">
                      <div ref={guestCountryRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setGuestCountryOpen((o) => !o)}
                          className="flex h-[38px] items-center gap-1.5 rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc] px-2.5 text-xs font-bold text-[#2D2B22] shadow-[inset_2px_3px_6px_rgba(45,43,34,0.18)] hover:bg-[#e5d9c5] transition-colors"
                        >
                          <span>{findPhoneCountryOption(guestCountryCode, phoneCountryOptions)?.flag || "🇮🇳"}</span>
                          <span>{guestCountryCode}</span>
                          <ChevronDown className="h-3.5 w-3.5 text-[#6E6A59]" />
                        </button>
                        {guestCountryOpen && (
                          <div className="absolute bottom-full left-0 z-30 mb-1.5 w-56 overflow-hidden rounded-2xl border border-[#2D2B22]/15 bg-[#EEDFC7] shadow-[0_14px_34px_rgba(45,43,34,0.3)]">
                            <div className="border-b border-[#2D2B22]/10 p-2">
                              <input
                                type="text"
                                value={guestCountrySearch}
                                onChange={(e) => setGuestCountrySearch(e.target.value)}
                                placeholder="Search country or code..."
                                className="w-full rounded-lg border border-[#2D2B22]/15 bg-[#dfd2bc] px-2.5 py-1.5 text-xs text-[#2D2B22] placeholder-[#6E6A59] focus:border-[#607938] focus:outline-none"
                              />
                            </div>
                            <div className="max-h-40 overflow-y-auto p-1">
                              {filterPhoneCountryOptions(guestCountrySearch, phoneCountryOptions).map((opt) => (
                                <button
                                  key={`${opt.iso || opt.label}-${opt.value}`}
                                  type="button"
                                  onClick={() => {
                                    setGuestCountryCode(opt.value);
                                    setGuestCountryOpen(false);
                                    setGuestCountrySearch("");
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#2D2B22] hover:bg-[#dfd2bc]"
                                >
                                  <span>{opt.flag}</span>
                                  <span className="flex-1 truncate">{opt.label}</span>
                                  <span className="font-bold text-[#607938]">{opt.value}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        required
                        placeholder="10-digit mobile number"
                        value={guestPhone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setGuestPhone(digits);
                          if (guestPhoneError) setGuestPhoneError("");
                        }}
                        className="flex-1 min-w-0 rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc] px-3.5 py-2 text-xs font-medium text-[#2D2B22] placeholder-[#6E6A59] shadow-[inset_2px_3px_6px_rgba(45,43,34,0.18)] focus:border-[#607938] focus:bg-[#EEDFC7] focus:outline-none"
                      />
                    </div>
                    {guestPhoneError && (
                      <p className="mt-1.5 text-[11px] font-semibold text-[#9a3b2a]">
                        {guestPhoneError}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#607938] px-4 py-3 text-sm font-bold text-white shadow-[2px_5px_14px_rgba(45,43,34,0.38),0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.22)] hover:-translate-y-px hover:brightness-95 hover:shadow-[2px_7px_18px_rgba(45,43,34,0.45),0_3px_6px_rgba(0,0,0,0.24)] active:translate-y-[1px] active:shadow-[inset_2px_3px_7px_rgba(0,0,0,0.55),inset_0_1px_3px_rgba(0,0,0,0.4)] transition-all"
                  >
                    Start Live Chat
                  </button>
                </form>
              </div>
            )}

            {view === "tickets" && (
              <div>
                <div className="relative overflow-hidden bg-gradient-to-br from-[#607938] to-[#4e632d] px-5 py-4 text-white flex items-center justify-between">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(238,223,199,0.2),transparent_40%)] pointer-events-none" />
                  <div className="flex items-center gap-3 relative z-10 min-w-0">
                    <button
                      type="button"
                      onClick={() => setView("options")}
                      className="rounded-xl p-1.5 hover:bg-white/15 transition-colors cursor-pointer"
                      title="Back to options"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold tracking-wide text-white truncate">
                        Support Tickets
                      </h3>
                      <p className="text-xs text-[#EEDFC7]/85 truncate">
                        View your past &amp; active conversations
                      </p>
                    </div>
                  </div>
                  {!openTicket ? (
                    <button
                      type="button"
                      disabled={creatingTicket}
                      onClick={handleCreateNewTicket}
                      className="relative z-10 inline-flex items-center gap-1 rounded-xl bg-[#EEDFC7] px-3 py-1.5 text-xs font-extrabold text-[#2D2B22] shadow-[2px_3px_8px_rgba(25,24,18,0.25)] hover:bg-[#f5ead8] active:translate-y-[1px] disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#607938]" />
                      New Ticket
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartChat(openTicket.id)}
                      className="relative z-10 inline-flex items-center gap-1 rounded-xl bg-[#EEDFC7] px-3 py-1.5 text-xs font-extrabold text-[#4e632d] shadow-[2px_3px_8px_rgba(25,24,18,0.25)] hover:bg-[#f5ead8] active:translate-y-[1px]"
                    >
                      Resume Active
                    </button>
                  )}
                </div>

                <div className="h-[min(420px,calc(100vh-230px))] overflow-y-auto bg-[#EEDFC7] p-4 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#607938]/35">
                  {openTicket && (
                    <div className="rounded-xl border border-[#607938]/25 bg-[#607938]/10 px-3.5 py-2.5 text-[11px] font-medium text-[#2D2B22]">
                      Active ticket <span className="font-mono font-extrabold text-[#4e632d]">#{openTicket.ticketId}</span> is open. You can create a new ticket once it is resolved.
                    </div>
                  )}
                  {loadingTickets ? (
                    <div className="flex h-48 items-center justify-center text-[#607938]">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="rounded-2xl border border-[#2D2B22]/10 bg-[#dfd2bc]/70 p-8 text-center shadow-[inset_1px_2px_5px_rgba(45,43,34,0.14)]">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EEDFC7] text-[#607938] shadow-sm">
                        <Ticket className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-extrabold text-[#2D2B22]">No Support Tickets Yet</p>
                      <p className="mt-1 text-xs text-[#6E6A59]">
                        Start a new ticket anytime to get help from our visa specialists.
                      </p>
                      <button
                        type="button"
                        disabled={creatingTicket}
                        onClick={handleCreateNewTicket}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#607938] px-4 py-2.5 text-xs font-bold text-white shadow-[2px_4px_10px_rgba(45,43,34,0.28)] hover:bg-[#536930]"
                      >
                        <Plus className="h-4 w-4" />
                        Raise New Ticket
                      </button>
                    </div>
                  ) : (
                    tickets.map((t) => {
                      const statusMap = {
                        AI_PENDING: { label: "Open", cls: "bg-[#607938]/15 text-[#4e632d]" },
                        HUMAN_PENDING: { label: "Waiting for Agent", cls: "bg-amber-600/15 text-amber-800" },
                        HUMAN_CONNECTED: { label: "Agent Active", cls: "bg-emerald-600/15 text-emerald-800" },
                        RESOLVED: { label: "Resolved", cls: "bg-[#2D2B22]/10 text-[#6E6A59]" },
                      };
                      const st = statusMap[t.status] || statusMap.AI_PENDING;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleStartChat(t.id)}
                          className="w-full rounded-2xl border border-[#2D2B22]/12 bg-[#EEDFC7] p-3.5 text-left shadow-[3px_3px_10px_rgba(148,138,123,0.4),-3px_-3px_10px_rgba(214,201,179,0.45)] transition-all hover:-translate-y-px hover:border-[#607938]/40 active:translate-y-[1px]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-lg bg-[#dfd2bc] px-2 py-0.5 font-mono text-[11px] font-extrabold text-[#4e632d]">
                              #{t.ticketId}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${st.cls}`}>
                              {st.label}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-sm font-extrabold text-[#2D2B22]">
                            {t.subject || "Support Inquiry"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[#6E6A59]">
                            {t.lastMessage || "No messages yet"}
                          </p>
                          <div className="mt-2 flex items-center justify-between border-t border-[#2D2B22]/10 pt-2 text-[10px] font-semibold text-[#6E6A59]">
                            <span>{t.messageCount || 0} messages</span>
                            <span>{t.updatedAt ? formatOrdinalDate(t.updatedAt) : "Just now"}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-[#2D2B22]/10 bg-[#dfd2bc]/60 py-3 text-center text-xs text-[#6E6A59] font-medium">
                  Click any ticket to view full conversation history
                </div>
              </div>
            )}

            {view === "chat" && (
              <div>
                <div className="relative overflow-hidden bg-gradient-to-br from-[#607938] to-[#4e632d] px-5 py-4 text-white flex items-center justify-between">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(238,223,199,0.18),transparent_40%)] pointer-events-none" />
                  <div className="flex items-center gap-3 min-w-0 relative z-10">
                    <button
                      type="button"
                      onClick={() => setView("options")}
                      className="rounded-xl p-1.5 hover:bg-white/15 transition-colors cursor-pointer"
                      title="Back to options"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="relative">
                      <div className="h-11 w-11 rounded-full bg-[#EEDFC7] flex items-center justify-center text-[#607938] shadow-[2px_4px_10px_rgba(25,24,18,0.22)]">
                        <Headphones className="h-5 w-5" />
                      </div>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#4e632d]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-extrabold tracking-wide truncate">
                        {chatConfig.headerTitle || DEFAULT_CHAT_CONFIG.headerTitle}
                      </h4>
                      <p className="text-xs text-[#EEDFC7]/90 font-medium flex items-center gap-1.5 truncate">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${activeConvo?.status === "RESOLVED" ? "bg-slate-300" : "bg-emerald-400"}`} />
                        <span>
                          {activeConvo?.status === "RESOLVED"
                            ? "Resolved"
                            : activeConvo?.status === "HUMAN_CONNECTED"
                            ? "Agent Joined"
                            : activeConvo?.status === "HUMAN_PENDING"
                            ? "Waiting for Agent"
                            : "Online"}
                        </span>
                        {activeConvo?.ticketId && (
                          <>
                            <span className="opacity-60">·</span>
                            <span className="font-mono text-[11px] font-bold text-[#EEDFC7]">
                              #{activeConvo.ticketId}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 relative z-10">
                    <button
                      type="button"
                      onClick={handleOpenTicketsHistory}
                      className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-white/25 transition-colors cursor-pointer"
                      title="My Tickets & History"
                    >
                      <History className="h-3.5 w-3.5" />
                      Tickets
                    </button>
                    {guestUser && (
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem("guest_chat_user");
                          setGuestUser(null);
                          setActiveConvo(null);
                          setMessages([]);
                          setTickets([]);
                          setSelectedTicketId("");
                          setAdminIsTyping(false);
                          setView("options");
                        }}
                        className="rounded-xl p-1.5 hover:bg-white/15 text-white/85 hover:text-white transition-colors cursor-pointer"
                        title="End guest session and start fresh"
                      >
                        <LogOut className="h-[18px] w-[18px]" />
                      </button>
                    )}
                  </div>
                </div>

                <div ref={scrollContainerRef} className="h-[min(360px,calc(100vh-290px))] overflow-y-auto bg-[#EEDFC7] p-4 space-y-3.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#607938]/35">
                  <div className="flex justify-center">
                    <span className="rounded-full bg-[#dfd2bc] px-3 py-1 text-xs font-bold text-[#6E6A59] shadow-[inset_1px_2px_4px_rgba(45,43,34,0.14)]">
                      Today
                    </span>
                  </div>

                  {messages.map((msg) => {
                    if (msg.type === "customer_chat_card") {
                      return (
                        <div key={msg.id} className="flex justify-start w-full animate-fade-in">
                          <div className={`w-[88%] rounded-[1.35rem] border p-4 shadow-[0_16px_32px_rgba(15,23,42,0.08)] flex flex-col gap-2.5 ${
                            isWhatsAppLink
                              ? "border-[#86E7AE] bg-[linear-gradient(180deg,#F7FFF9_0%,#F1FFF5_100%)]"
                              : "border-cyan/20 bg-cyan/5"
                          }`}>
                            <div className="flex items-center gap-3">
                              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${
                                isWhatsAppLink ? "bg-[#25D366]" : "bg-cyan"
                              }`}>
                                {isWhatsAppLink ? <WhatsAppIcon className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                              </span>
                              <div className="min-w-0 flex-1">
                                <h5 className="text-lg font-semibold text-slate-900">
                                  {ctaTitle}
                                </h5>
                                <p className="text-sm text-slate-600 truncate">
                                  {showComingSoonState
                                    ? "Live chat will be available soon."
                                    : ctaDescription}
                                </p>
                              </div>
                              {isWhatsAppLink && (
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9FFF1] text-[#1D9E54]">
                                  <ExternalLink className="h-5 w-5" />
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-3 border-t border-cyan/15 pt-3 text-[10px]">
                              <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isWhatsAppLink
                                  ? "bg-[#25D366]/12 text-[#128C49]"
                                  : "bg-cyan/10 text-cyan"
                              }`}>
                                {supportLabel}
                              </span>
                              {/* If no external link is configured, fallback to Coming Soon */}
                              {!canOpenExternalChat && (
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-[11px] font-bold text-slate-400 cursor-not-allowed"
                                >
                                  Coming soon
                                </button>
                              )}

                              {/* Clickable WhatsApp button */}
                              {isWhatsAppLink && canOpenExternalChat && (
                                <button
                                  type="button"
                                  onClick={openExternalChat}
                                  className="inline-flex w-full items-center justify-between gap-3 rounded-[1.15rem] border border-[#86E7AE] bg-white px-4 py-3 text-left text-[11px] font-bold shadow-[0_10px_24px_rgba(37,211,102,0.12)] transition-transform hover:scale-[1.01]"
                                >
                                  <span className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white">
                                      <WhatsAppIcon className="h-4 w-4" />
                                    </span>
                                    <span className="flex flex-col">
                                      <span className="text-[13px] font-bold text-slate-900">Continue with WhatsApp</span>
                                      <span className="text-xs font-medium text-slate-600">Get instant support from our visa team.</span>
                                    </span>
                                  </span>
                                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E9FFF1] text-[#1D9E54]">
                                    <ExternalLink className="h-4 w-4" />
                                  </span>
                                </button>
                              )}

                              {/* Clickable general support link button */}
                              {!isWhatsAppLink && canOpenExternalChat && (
                                <button
                                  type="button"
                                  onClick={openExternalChat}
                                  className="inline-flex w-full items-center justify-between gap-3 rounded-[1.15rem] border border-cyan/20 bg-white px-4 py-3 text-left text-[11px] font-bold shadow-[0_10px_24px_rgba(37,99,235,0.08)] transition-transform hover:scale-[1.01]"
                                >
                                  <span className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan text-white">
                                      <MessageSquare className="h-4 w-4" />
                                    </span>
                                    <span className="flex flex-col">
                                      <span className="text-[13px] font-bold text-slate-900">{ctaTitle}</span>
                                      <span className="text-xs font-medium text-slate-600">{ctaDescription}</span>
                                    </span>
                                  </span>
                                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan/10 text-cyan">
                                    <ExternalLink className="h-4 w-4" />
                                  </span>
                                </button>
                              )}
                              {isWhatsAppLink && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                  <Zap className="h-3.5 w-3.5 text-emerald-500" />
                                  Typically replies in 2 minutes
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const isUser = msg.sender === "user";

                    return (
                      <div
                        key={msg.id}
                        className={`flex w-full flex-col ${isUser ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 text-xs leading-relaxed ${
                            isUser
                              ? "rounded-[20px] rounded-tr-md bg-[#607938] text-white shadow-[2px_3px_8px_rgba(45,43,34,0.2)]"
                              : "rounded-[20px] rounded-tl-md border border-[#2D2B22]/10 bg-[#dfd2bc] text-[#2D2B22] shadow-[2px_3px_8px_rgba(45,43,34,0.1)]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          {msg.type === "human_escalation" && (
                            <button
                              type="button"
                              onClick={handleHumanRequest}
                              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#607938] px-3 py-2 text-[11px] font-bold text-white shadow-[2px_3px_6px_rgba(45,43,34,0.2)] hover:bg-[#536930] transition-colors"
                            >
                              <MessageSquare className="h-3.5 w-3.5" /> Connect to Human
                            </button>
                          )}
                          <div
                            className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                              isUser ? "text-white/75" : "text-[#6E6A59]"
                            }`}
                          >
                            <span>{msg.time}</span>
                            {isUser && <CheckCheck className="h-3.5 w-3.5 text-[#EEDFC7]" />}
                          </div>
                        </div>

                        {msg.type === "chips" && msg.options && msg.options.length > 0 && (
                          <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
                            {msg.options.map((option, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleOptionClick(option)}
                                className="rounded-xl border border-[#607938]/25 bg-[#EEDFC7] px-3 py-1.5 text-[11px] font-bold text-[#4e632d] shadow-[2px_2px_6px_rgba(45,43,34,0.1)] transition-all hover:bg-[#607938] hover:text-white active:translate-y-[1px]"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}

                        {msg.type === "application_cards" && msg.applicationsData && msg.applicationsData.length > 0 && (
                          <div className="mt-2.5 flex w-full flex-col gap-2.5">
                            {msg.applicationsData.map((app, idx) => {
                              const statusLower = String(app.status || "").toLowerCase();
                              const statusCls =
                                statusLower === "approved"
                                  ? "bg-[#607938] text-white"
                                  : statusLower === "rejected"
                                  ? "bg-[#9a3b2a]/15 text-[#9a3b2a]"
                                  : "bg-[#dfd2bc] text-[#4e632d]";
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleOptionClick(`APP_SELECT_${app.applicationId}`)}
                                  className="flex w-full flex-col gap-2 rounded-2xl border border-[#2D2B22]/12 bg-[#EEDFC7] p-3.5 text-left shadow-[3px_3px_10px_rgba(148,138,123,0.38),-3px_-3px_10px_rgba(214,201,179,0.45)] transition-all hover:-translate-y-px hover:border-[#607938]/40 active:translate-y-[1px]"
                                >
                                  <div className="flex w-full items-center justify-between gap-2 border-b border-[#2D2B22]/10 pb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {app.flagEmoji && (
                                        <span className="inline-flex h-6 min-w-[26px] items-center justify-center rounded-lg bg-[#dfd2bc] px-1.5 text-[11px] font-extrabold text-[#4e632d] shadow-[inset_1px_1px_3px_rgba(45,43,34,0.14)]">
                                          {app.flagEmoji}
                                        </span>
                                      )}
                                      <span className="truncate text-sm font-extrabold text-[#2D2B22]">
                                        {app.countryName}
                                      </span>
                                    </div>
                                    <span className="shrink-0 rounded-lg bg-[#dfd2bc] px-2 py-0.5 font-mono text-[10px] font-bold text-[#6E6A59]">
                                      #{app.applicationId}
                                    </span>
                                  </div>
                                  <div className="flex w-full items-center justify-between gap-2">
                                    <span className="truncate text-xs font-bold text-[#2D2B22]">
                                      {app.visaType}
                                    </span>
                                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${statusCls}`}>
                                      {app.status}
                                    </span>
                                  </div>
                                  {app.travelDate && (
                                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#6E6A59]">
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#607938]" />
                                      Travel: {formatOrdinalDate(app.travelDate)}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(isTyping || adminIsTyping) && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-tl-md border border-[#2D2B22]/10 bg-[#dfd2bc] p-3 shadow-[2px_3px_8px_rgba(45,43,34,0.1)]">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#607938] animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#607938]/60 animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#607938]/40 animate-bounce" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {chatError && (
                  <div className="border-t border-[#9a3b2a]/20 bg-[#9a3b2a]/10 px-4 py-2 text-[11px] font-semibold text-[#9a3b2a]">
                    {chatError}
                  </div>
                )}

                {activeConvo?.status === "RESOLVED" ? (
                  <div className="border-t border-[#2D2B22]/10 bg-[#dfd2bc]/80 px-4 py-3.5 text-center text-xs font-semibold text-[#6E6A59]">
                    This ticket is resolved and closed for new replies.
                  </div>
                ) : (
                  <form
                    onSubmit={handleSendMessage}
                    className="border-t border-[#2D2B22]/10 bg-[#e8d7bc]/75 p-3 flex flex-col gap-2"
                  >
                    <div className="rounded-2xl border border-[#2D2B22]/15 bg-[#dfd2bc] px-3.5 py-2.5 shadow-[inset_2px_3px_6px_rgba(45,43,34,0.18)]">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Write your message..."
                        className="w-full border-none bg-transparent px-0 py-0 text-sm font-medium text-[#2D2B22] outline-none placeholder:text-[#6E6A59]"
                      />
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="relative flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker((prev) => !prev)}
                            aria-label="Open emoji picker"
                            className="rounded-xl p-2 text-[#6E6A59] hover:bg-[#EEDFC7] hover:text-[#607938] transition-colors"
                          >
                            <Smile className="h-4 w-4" />
                          </button>
                          {showEmojiPicker && (
                            <div className="absolute bottom-14 left-0 z-20 flex w-max max-w-[320px] gap-2 overflow-x-auto whitespace-nowrap rounded-2xl border border-[#2D2B22]/15 bg-[#EEDFC7] p-3 shadow-[0_18px_40px_rgba(45,43,34,0.25)]">
                              {CHAT_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleEmojiSelect(emoji)}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-colors hover:bg-[#dfd2bc]"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="submit"
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#607938] text-white shadow-[2px_5px_14px_rgba(45,43,34,0.38),0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all hover:-translate-y-px hover:brightness-95 active:translate-y-[1px] active:shadow-[inset_2px_3px_7px_rgba(0,0,0,0.55),inset_0_1px_3px_rgba(0,0,0,0.4)]"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={toggleOpen}
        className="fab"
        aria-label="Open customer chat"
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
        <i aria-hidden="true" />
      </button>
    </div>
  );
}
