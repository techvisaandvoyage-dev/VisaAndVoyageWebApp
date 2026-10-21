import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { SERVER_URL } from '../store/authStore';

// We use native fetch to ensure it doesn't get blocked by auth interceptors if anonymous
const trackApi = (endpoint, payload) => {
  return fetch(`${SERVER_URL}/api/analytics/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(err => console.error("Tracking Error:", err));
};

const getBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return "Unknown";
};

const getOS = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Win")) return "Windows";
  if (ua.includes("Mac")) return "MacOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("like Mac")) return "iOS";
  return "Unknown";
};

const getDevice = () => {
  return /Mobile|Android|iP(hone|od|ad)/i.test(navigator.userAgent) ? "Mobile" : "Desktop";
};

export const useVisitorTracking = () => {
  const location = useLocation();
  const initialized = useRef(false);

  // Initialize Visitor and Session
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initTracking = async () => {
      let visitorId = localStorage.getItem('visitorId');
      
      if (!visitorId) {
        // Initialize new visitor
        try {
          const res = await fetch(`${SERVER_URL}/api/analytics/visitor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device: getDevice(),
              browser: getBrowser(),
              os: getOS(),
            })
          });
          const data = await res.json();
          if (data.success && data.visitorId) {
            visitorId = data.visitorId;
            localStorage.setItem('visitorId', visitorId);
          }
        } catch (e) {
          console.error("Failed to initialize visitor", e);
          return;
        }
      }

      // Start Session
      let sessionId = sessionStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = `SES${Date.now()}${Math.floor(Math.random() * 1000)}`;
        sessionStorage.setItem('sessionId', sessionId);
        
        await trackApi('session', { visitorId, sessionId });
      }
    };

    initTracking();
  }, []);

  // Track Page Views
  useEffect(() => {
    const visitorId = localStorage.getItem('visitorId');
    const sessionId = sessionStorage.getItem('sessionId');
    if (!visitorId || !sessionId) return; // Might be a race condition on very first load

    const userStr = localStorage.getItem('auth-storage');
    let userId = null;
    try {
      if (userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed?.state?.user?._id) userId = parsed.state.user._id;
        if (parsed?.state?.user?.id) userId = parsed.state.user.id;
      }
    } catch(e) {}

    trackApi('event', {
      visitorId,
      sessionId,
      eventType: 'page_view',
      page: location.pathname,
      userId
    });
  }, [location.pathname]);

};

export const trackEvent = (eventType, metadata = {}) => {
  const visitorId = localStorage.getItem('visitorId');
  const sessionId = sessionStorage.getItem('sessionId');
  if (!visitorId || !sessionId) return;
  
  const userStr = localStorage.getItem('auth-storage');
  let userId = null;
  try {
    if (userStr) {
      const parsed = JSON.parse(userStr);
      if (parsed?.state?.user?._id) userId = parsed.state.user._id;
      if (parsed?.state?.user?.id) userId = parsed.state.user.id;
    }
  } catch(e) {}

  trackApi('event', {
    visitorId,
    sessionId,
    eventType,
    page: window.location.pathname,
    userId,
    ...metadata
  });
};
