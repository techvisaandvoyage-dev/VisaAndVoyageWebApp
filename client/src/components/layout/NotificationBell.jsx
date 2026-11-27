import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { api, useAuthStore } from "../../store/authStore";
import {
  buildNotificationKey,
  formatNotificationTime,
  mapApplicationNotifications,
  mapBlogNotifications,
  mapSupportNotifications,
  mapTransactionNotifications,
  persistNotificationKeys,
  readNotificationKeys,
  resolveSyntheticRead,
} from "../../utils/notifications";

const NotificationBell = ({ className = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 76, right: 16 });
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [markingNotificationsRead, setMarkingNotificationsRead] = useState(false);
  const [notificationReadKeys, setNotificationReadKeys] = useState(() => readNotificationKeys());

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const handlePointerDown = (event) => {
      if (buttonRef.current?.contains(event.target) || dropdownRef.current?.contains(event.target)) return;
      setNotificationsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    const updateDropdownPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const isMobile = window.innerWidth < 768;

      setDropdownPosition({
        top: rect.bottom + 12,
        right: isMobile ? 16 : Math.max(16, window.innerWidth - rect.right),
      });
    };

    const handleWindowScroll = (event) => {
      if (dropdownRef.current?.contains(event.target)) return;
      updateDropdownPosition();
    };

    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", handleWindowScroll, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", handleWindowScroll, true);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    let alive = true;

    const loadNotifications = async () => {
      if (!user?.id) return;
      setNotificationsLoading(true);
      try {
        const [blogRes, appRes, txRes, supportRes] = await Promise.all([
          api.get("/blog/me/notifications?limit=6"),
          api.get("/users/applications"),
          api.get("/users/payments/my-transactions"),
          user?.email
            ? api.get(`/support/conversations/client/chat?email=${encodeURIComponent(user.email)}`)
            : Promise.resolve({ data: { success: true, conversation: null } }),
        ]);

        if (!alive) return;

        const merged = [
          ...mapBlogNotifications(blogRes.data?.data || []),
          ...mapApplicationNotifications(appRes.data?.applications || []),
          ...mapTransactionNotifications(txRes.data?.transactions || []),
          ...mapSupportNotifications(supportRes.data?.conversation || null),
        ]
          .map((item) => ({
            ...item,
            read: resolveSyntheticRead(item, notificationReadKeys),
          }))
          .sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 12);

        setNotifications(merged);
      } catch (error) {
        if (alive) {
          console.error("Failed to load notifications:", error);
        }
      } finally {
        if (alive) setNotificationsLoading(false);
      }
    };

    loadNotifications();
    return () => {
      alive = false;
    };
  }, [user?.id, user?.email, notificationReadKeys]);

  if (!isAuthenticated) return null;

  const unreadNotifications = notifications.filter((item) => !item.read);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read && notification.source === "blog") {
        await api.patch("/blog/me/notifications/read", { ids: [notification.id] });
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    } finally {
      const nextKeys = new Set(notificationReadKeys);
      nextKeys.add(buildNotificationKey(notification));
      persistNotificationKeys(nextKeys);
      setNotificationReadKeys(nextKeys);
      setNotifications((prev) =>
        prev.map((item) =>
          buildNotificationKey(item) === buildNotificationKey(notification)
            ? { ...item, read: true }
            : item
        )
      );
      setNotificationsOpen(false);
      if (notification?.blogSlug) {
        navigate(`/blog/${notification.blogSlug}`);
      } else if (notification?.openSupportChat) {
        window.dispatchEvent(new CustomEvent("open-support-chat"));
      } else if (notification?.route) {
        navigate(notification.route);
      }
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!unreadNotifications.length) return;
    setMarkingNotificationsRead(true);
    try {
      const blogUnread = unreadNotifications.filter((item) => item.source === "blog");
      if (blogUnread.length) {
        await api.patch("/blog/me/notifications/read", { all: true });
      }

      const nextKeys = new Set(notificationReadKeys);
      unreadNotifications.forEach((item) => nextKeys.add(buildNotificationKey(item)));
      persistNotificationKeys(nextKeys);
      setNotificationReadKeys(nextKeys);
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch (error) {
      console.error("Failed to update notifications:", error);
    } finally {
      setMarkingNotificationsRead(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setNotificationsOpen((prev) => !prev)}
        className="ib relative"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadNotifications.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadNotifications.length}
          </span>
        )}
      </button>

      {notificationsOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[300] w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[20px] border border-[#2D2B22]/15 bg-[#EEDFC7] text-[#2D2B22] shadow-[0_22px_54px_rgba(45,43,34,0.3),0_4px_12px_rgba(45,43,34,0.14)]"
          style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
        >
          <div className="flex items-center justify-between border-b border-[#2D2B22]/12 bg-[#e8d7bc]/60 px-5 py-4">
            <div>
              <h3 className="text-base font-extrabold text-[#2D2B22]">Notifications</h3>
              <p className="text-xs font-medium text-[#6E6A59]">
                {unreadNotifications.length
                  ? `${unreadNotifications.length} unread update${unreadNotifications.length === 1 ? "" : "s"}`
                  : "You are all caught up"}
              </p>
            </div>
            <button
              type="button"
              disabled={!unreadNotifications.length || markingNotificationsRead}
              onClick={handleMarkAllNotificationsRead}
              className="rounded-lg px-2.5 py-1 text-xs font-bold text-[#607938] transition-all hover:bg-[#607938]/12 hover:text-[#4e632d] active:translate-y-[1px] disabled:cursor-not-allowed disabled:text-[#6E6A59]/50 disabled:hover:bg-transparent"
            >
              Mark all read
            </button>
          </div>

          <div
            className="max-h-[min(360px,calc(100vh-140px))] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#dfd2bc]/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#607938]/45 hover:[&::-webkit-scrollbar-thumb]:bg-[#607938]/70"
            style={{ scrollbarWidth: "thin", scrollbarColor: "color-mix(in srgb, var(--ac, #607938) 50%, transparent) transparent" }}
          >
            {notificationsLoading ? (
              <div className="flex items-center justify-center px-5 py-10 text-[#607938]">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#dfd2bc] text-[#6E6A59] shadow-[inset_1px_2px_4px_rgba(45,43,34,0.16)]">
                  <Bell size={18} />
                </div>
                <p className="text-sm font-bold text-[#2D2B22]">No notifications yet</p>
                <p className="mt-1 text-xs text-[#6E6A59]">
                  Replies, application updates, payments, and support messages will show here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const NotificationIcon = notification.icon || Bell;
                const isUnread = !notification.read;
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex w-full items-start gap-3 border-b border-[#2D2B22]/10 last:border-b-0 px-5 py-4 text-left transition-colors hover:bg-[#dfd2bc]/65 active:bg-[#dfd2bc] ${
                      isUnread ? "bg-[#607938]/10" : ""
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-[inset_1px_2px_4px_rgba(45,43,34,0.14)] ${
                        isUnread
                          ? "border-[#607938]/35 bg-[#dfd2bc] text-[#4e632d]"
                          : "border-[#2D2B22]/10 bg-[#dfd2bc]/70 text-[#6E6A59]"
                      }`}
                    >
                      <NotificationIcon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={`truncate text-sm ${
                            isUnread ? "font-extrabold text-[#1a1813]" : "font-semibold text-[#6E6A59]"
                          }`}
                        >
                          {notification.title || "Notification"}
                        </span>
                        {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#607938]" />}
                      </span>
                      <span
                        className={`mt-1 block text-xs leading-relaxed ${
                          isUnread ? "font-semibold text-[#2D2B22]" : "font-normal text-[#6E6A59]/90"
                        }`}
                      >
                        {notification.subtitle || "You have a new update."}
                      </span>
                      {notification.body && (
                        <span
                          className={`mt-1.5 block line-clamp-2 text-xs ${
                            isUnread ? "font-medium text-[#3b382c]" : "text-[#6E6A59]/75"
                          }`}
                        >
                          {notification.body}
                        </span>
                      )}
                      <span
                        className={`mt-2 block text-[11px] ${
                          isUnread ? "font-bold text-[#607938]" : "font-medium text-[#6E6A59]/65"
                        }`}
                      >
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;
