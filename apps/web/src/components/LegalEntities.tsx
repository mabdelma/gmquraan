import { LEGAL_ENTITIES, type LegalEntity } from "@/lib/content";
import type { UiLabels } from "@/lib/ui-i18n";

/**
 * The office's legal entities, one line each.
 *
 * /about and every policy document were rendering their own near-identical
 * copy of this block, so when an entity was added it landed in one place and
 * nowhere else. One component, one list.
 *
 * `pending` is what stands in for a reference number the office has not
 * supplied a certificate for. Rendering the label with an empty value next to
 * it reads as a bug; rendering "awaiting the certificate" reads as the truth,
 * which is what it is.
 */
export function LegalEntities({ ui, pending }: { ui: UiLabels; pending: string }) {
  // Kept as a lookup rather than inlined so adding an entity with a different
  // kind of registration is a change here and not at the call site.
  const refLabel = (label: LegalEntity["refs"][number]["label"]) =>
    ({
      licence: ui.licenceWord,
      syndicate: ui.syndicateNo,
      register: ui.registerNo,
      tax: ui.taxNo,
    })[label];

  return (
    <>
      {LEGAL_ENTITIES.map((e) => (
        <div key={e.name}>
          <span className="mr-1">{e.flag}</span>
          <span className="text-[color:var(--ink)]/80 font-semibold">{e.name}</span>
          {e.short && <> ({e.short})</>} · {e.form}
          {e.authority && <> · {e.authority}</>}
          {e.refs.map((r) => (
            <span key={r.label}>
              {" · "}
              {refLabel(r.label)}{" "}
              {r.value ? (
                <span className="font-mono">{r.value}</span>
              ) : (
                <span className="italic text-[color:var(--ink)]/45">{pending}</span>
              )}
            </span>
          ))}
          {e.validTo && <> · {ui.validTo} {e.validTo}</>}
          {" · "}
          {e.officeIsRegistered ? `${ui.registeredOffice} ${e.office}` : e.office}
        </div>
      ))}
    </>
  );
}
