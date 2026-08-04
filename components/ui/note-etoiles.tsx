import { NOTE_MAX } from "@/lib/constants";

/** Note en lecture seule. La version cliquable vit dans le formulaire client. */
export function NoteEtoiles({
  note,
  taille = "normal",
}: {
  note: number;
  taille?: "normal" | "petit";
}) {
  const dimension = taille === "petit" ? "size-3.5" : "size-4";

  // Pas d'attribut `title` : il ferait annoncer la note deux fois par un
  // lecteur d'ecran — une fois par le texte cache, une fois par l'infobulle.
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="sr-only">
        Note&nbsp;: {note} sur {NOTE_MAX}
      </span>
      {Array.from({ length: NOTE_MAX }).map((_, index) => (
        <svg
          key={index}
          aria-hidden
          viewBox="0 0 20 20"
          className={`${dimension} ${index < note ? "text-alerte" : "text-trait"}`}
          fill="currentColor"
        >
          <path d="M10 1.6l2.47 5.29 5.53.72-4.08 3.9 1.05 5.68L10 14.5l-4.97 2.69 1.05-5.68L2 7.61l5.53-.72z" />
        </svg>
      ))}
    </span>
  );
}
