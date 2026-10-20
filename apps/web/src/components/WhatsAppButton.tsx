/**
 * Floating WhatsApp contact button shown on public pages.
 * The number is edited from the central dashboard (Setting `contact.whatsapp`),
 * passed in as `number` (digits only, country code, no "+" or spaces — wa.me format).
 */
import { COMPANY } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { getAriaLabels } from "@/lib/ui-i18n";

const PREFILL = encodeURIComponent("Hi Unskinned — I'd like to know more about your solutions.");

export function WhatsAppButton({ locale = "en", number }: { locale?: Locale; number: string }) {
  // Falls back to the published line rather than a number from a previous
  // product, so a missing Setting row cannot send anyone to a stranger.
  const NUMBER = (number || COMPANY.whatsapp).replace(/[^0-9]/g, "");
  return (
    <a
      href={`https://wa.me/${NUMBER}?text=${PREFILL}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={getAriaLabels(locale).whatsapp}
      className="fixed app-fab app-fab-l z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition hover:scale-105 hover:opacity-90"
    >
      <svg width="30" height="30" viewBox="0 0 32 32" fill="#fff" aria-hidden="true">
        <path d="M16.004 2.667c-7.36 0-13.333 5.973-13.333 13.333 0 2.351.616 4.652 1.787 6.681L2.667 29.333l6.84-1.793a13.27 13.27 0 0 0 6.497 1.655h.005c7.36 0 13.333-5.973 13.333-13.333 0-3.563-1.387-6.913-3.907-9.433-2.52-2.52-5.87-3.762-9.431-3.762zm0 24.146h-.004a11.03 11.03 0 0 1-5.62-1.539l-.403-.239-4.06 1.065 1.083-3.957-.262-.406a11.01 11.01 0 0 1-1.688-5.876c0-6.116 4.977-11.093 11.097-11.093 2.963 0 5.749 1.155 7.843 3.251a11.02 11.02 0 0 1 3.247 7.846c0 6.117-4.977 11.093-11.093 11.093zm6.084-8.31c-.333-.167-1.973-.973-2.279-1.084-.305-.111-.528-.167-.75.167-.222.333-.861 1.083-1.056 1.306-.194.222-.389.25-.722.083-.333-.167-1.408-.519-2.682-1.655-.991-.884-1.66-1.976-1.855-2.31-.194-.333-.021-.513.146-.679.15-.149.333-.389.5-.583.167-.195.222-.334.333-.556.111-.222.056-.417-.028-.583-.083-.167-.75-1.808-1.027-2.476-.271-.65-.546-.562-.75-.573l-.639-.011c-.222 0-.583.083-.889.417-.305.333-1.166 1.139-1.166 2.778s1.194 3.223 1.361 3.445c.167.222 2.35 3.589 5.694 5.031.796.344 1.417.55 1.9.704.799.254 1.526.218 2.101.132.641-.096 1.973-.806 2.251-1.584.278-.778.278-1.445.194-1.584-.083-.139-.305-.222-.638-.389z" />
      </svg>
    </a>
  );
}
