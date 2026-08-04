import type { ReactNode } from "react";

/**
 * Form fields. Every field owns its label, its hint and its error message,
 * wired together with `aria-describedby` so a screen reader announces the
 * error with the field rather than in isolation.
 */

const CHAMP_BASE =
  "w-full rounded-net border bg-white px-3 py-2.5 text-sm text-nuit " +
  "placeholder:text-brume focus:border-signal focus:outline-none " +
  "disabled:bg-ivoire disabled:text-ardoise";

function classesChamp(enErreur?: boolean) {
  return `${CHAMP_BASE} ${enErreur ? "border-critique" : "border-trait"}`;
}

export function Champ({
  id,
  label,
  indication,
  erreur,
  obligatoire,
  children,
}: {
  id: string;
  label: string;
  indication?: string;
  erreur?: string;
  obligatoire?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-nuit">
        {label}
        {obligatoire && (
          <span className="ml-1 text-critique" aria-hidden>
            *
          </span>
        )}
      </label>
      {indication && (
        <p id={`${id}-aide`} className="text-xs text-ardoise">
          {indication}
        </p>
      )}
      {children}
      {erreur && (
        <p id={`${id}-erreur`} role="alert" className="text-xs text-critique">
          {erreur}
        </p>
      )}
    </div>
  );
}

type ProprietesCommunes = {
  id: string;
  label: string;
  indication?: string;
  erreur?: string;
};

/**
 * Champs où le correcteur orthographique n'a rien à faire : il souligne en
 * rouge une adresse e-mail, un matricule ou un numéro de contrat parfaitement
 * valides, et propose de les « corriger ».
 */
const TYPES_SANS_CORRECTION = ["email", "password", "tel", "url"];

function correctionUtile(type: string | undefined, id: string) {
  if (type && TYPES_SANS_CORRECTION.includes(type)) return false;
  return !/contrat|matricule|email|identifiant|code/i.test(id);
}

export function ChampTexte({
  id,
  label,
  indication,
  erreur,
  ...props
}: ProprietesCommunes & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Champ
      id={id}
      label={label}
      indication={indication}
      erreur={erreur}
      obligatoire={props.required}
    >
      <input
        {...props}
        id={id}
        name={props.name ?? id}
        spellCheck={props.spellCheck ?? correctionUtile(props.type, id)}
        autoCapitalize={
          props.autoCapitalize ??
          (correctionUtile(props.type, id) ? undefined : "none")
        }
        aria-invalid={erreur ? true : undefined}
        aria-describedby={
          [indication && `${id}-aide`, erreur && `${id}-erreur`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={classesChamp(Boolean(erreur))}
      />
    </Champ>
  );
}

export function ChampZone({
  id,
  label,
  indication,
  erreur,
  ...props
}: ProprietesCommunes & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Champ
      id={id}
      label={label}
      indication={indication}
      erreur={erreur}
      obligatoire={props.required}
    >
      <textarea
        {...props}
        id={id}
        name={props.name ?? id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={
          [indication && `${id}-aide`, erreur && `${id}-erreur`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`${classesChamp(Boolean(erreur))} min-h-32 resize-y leading-relaxed`}
      />
    </Champ>
  );
}

export function ChampSelect({
  id,
  label,
  indication,
  erreur,
  options,
  ...props
}: ProprietesCommunes &
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    options: ReadonlyArray<{ valeur: string; libelle: string }>;
  }) {
  return (
    <Champ
      id={id}
      label={label}
      indication={indication}
      erreur={erreur}
      obligatoire={props.required}
    >
      <select
        {...props}
        id={id}
        name={props.name ?? id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={
          [indication && `${id}-aide`, erreur && `${id}-erreur`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={classesChamp(Boolean(erreur))}
      >
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    </Champ>
  );
}

/** Bandeau d'erreur global d'un formulaire. */
export function MessageErreur({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-net border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700"
    >
      {children}
    </p>
  );
}

/** Bandeau de confirmation. */
export function MessageSucces({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-net border border-green-300 bg-green-50 px-3 py-2.5 text-sm text-green-800"
    >
      {children}
    </p>
  );
}
