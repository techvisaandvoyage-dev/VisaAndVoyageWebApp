import { useEffect, useState } from "react";
import { X } from "lucide-react";
import LoginPage from "../../pages/LoginPage";
import RegisterPage from "../../pages/RegisterPage";

const AuthPageModal = ({ isOpen, initialMode = "login", onClose }) => {
  const [mode, setMode] = useState(initialMode === "register" ? "register" : "login");

  useEffect(() => {
    if (!isOpen) return undefined;
    setMode(initialMode === "register" ? "register" : "login");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-3 py-4 sm:px-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-[#2D2B22]/35 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close authentication popup"
      />

      <div
        className="relative z-10 w-full max-w-[430px] overflow-hidden rounded-[22px] border border-[#2D2B22]/15 bg-[#EEDFC7] text-[#2D2B22] shadow-[0_24px_60px_rgba(45,43,34,0.34),0_4px_12px_rgba(45,43,34,0.16)]"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "login" ? "Login" : "Sign up"}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#dfd2bc]/70 text-[#2D2B22] shadow-[1px_2px_4px_rgba(45,43,34,0.14)] transition-all hover:bg-[#dfd2bc] active:translate-y-[1px] active:shadow-[inset_1px_2px_4px_rgba(45,43,34,0.26)]"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain">
          {mode === "login" ? (
            <LoginPage
              embedded
              onClose={onClose}
              onAuthenticated={onClose}
              onSwitchToRegister={() => setMode("register")}
            />
          ) : (
            <RegisterPage
              embedded
              onClose={onClose}
              onAuthenticated={onClose}
              onSwitchToLogin={() => setMode("login")}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPageModal;
