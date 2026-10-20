import { getLocale } from "@/lib/i18n.server";
import {
  AboutBlock,
  CareersCta,
  FounderNote,
  Hero,
  PracticeGrid,
  ReachStrip,
  ValuesStrip,
} from "@/components/brand/sections";

/**
 * The homepage: hero, values strip, practice areas, reach, founder, about,
 * careers.
 *
 * Sections alternate light and navy deliberately — that rhythm is what stops a
 * long single-column page reading as a template. Projects and the media centre
 * are not duplicated here: /projects is data-driven with zero records today,
 * and the visual portfolio is a long scroll that belongs on /media rather than
 * halfway down the front page. Both are one click from the nav.
 */
export default async function Home() {
  const locale = await getLocale();

  return (
    <>
      <Hero locale={locale} />
      <ValuesStrip locale={locale} />
      <PracticeGrid locale={locale} />
      <ReachStrip locale={locale} />
      <FounderNote locale={locale} />
      <AboutBlock locale={locale} />
      <CareersCta locale={locale} />
    </>
  );
}
