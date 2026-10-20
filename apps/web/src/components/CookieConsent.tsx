"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

const TXT: Record<Locale, { msg: string; accept: string; privacy: string }> = {
  en: { msg: "We use cookies to keep you signed in and remember your language. By using the site you accept our", accept: "Accept", privacy: "Privacy Policy" },
  es: { msg: "Usamos cookies para mantener tu sesión y recordar tu idioma. Al usar el sitio aceptas nuestra", accept: "Aceptar", privacy: "Política de Privacidad" },
  ar: { msg: "نستخدم ملفات تعريف الارتباط لإبقائك مسجّلاً وتذكّر لغتك. باستخدام الموقع فإنك توافق على", accept: "موافقة", privacy: "سياسة الخصوصية" },
  fr: { msg: "Nous utilisons des cookies pour vous garder connecté et mémoriser votre langue. En utilisant le site, vous acceptez notre", accept: "Accepter", privacy: "Politique de confidentialité" },
  
  pt: { msg: "Usamos cookies para manter você conectado e lembrar seu idioma. Ao usar o site, você aceita nossa", accept: "Aceitar", privacy: "Política de Privacidade" }

  

};

export function CookieConsent({ locale }: { locale: Locale }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!document.cookie.includes("app_consent=")) setShow(true);
  }, []);
  if (!show) return null;
  const t = TXT[locale] ?? TXT.en;

  function accept() {
    document.cookie = `app_consent=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setShow(false);
  }

  return (
    <div className="app-touch fixed bottom-0 inset-x-0 z-[60] bg-[color:var(--panel)] border-t border-[color:var(--hairline)] px-5 pt-4 app-safe-b">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center gap-3 justify-between">
        <p className="text-xs text-[color:var(--ink)]/70">
          {t.msg}{" "}
          <Link href="/privacy" className="text-[color:var(--accent-text)] underline">
            {t.privacy}
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="app-gradient text-[color:var(--on-accent)] font-bold text-sm px-5 py-2 rounded-xl shrink-0"
        >
          {t.accept}
        </button>
      </div>
    </div>
  );
}
