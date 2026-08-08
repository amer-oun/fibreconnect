/**
 * The company's identity, as printed at the top of an invoice.
 *
 * **The registration numbers are deliberately absent, and the document says so
 * in its footer.** A Tunisian invoice is a tax document: it carries a matricule
 * fiscal, and the amounts carry TVA. Inventing a plausible-looking matricule
 * would produce a piece of paper that could pass for a genuine tax invoice —
 * which is exactly the line this project draws elsewhere by refusing to fake a
 * bank page. A demo document that announces itself as one is honest; one that
 * imitates an official record is not.
 *
 * The day the real details are known: fill `matriculeFiscal`, add the TVA
 * handling, and `mentionsCompletes` becomes `true`, which removes the footer
 * note on its own.
 */
export const SOCIETE = {
  nom: "FibreConnect",
  forme: "SARL",
  activite: "Installation et maintenance de réseaux fibre optique",
  adresse: "14 rue du Lac Turkana, Les Berges du Lac",
  codePostal: "1053",
  ville: "Tunis",
  pays: "Tunisie",
  telephone: "+216 71 234 567",
  email: "contact@fibreconnect.tn",

  /** Numéro d'identification fiscale. Non renseigné : voir le commentaire. */
  matriculeFiscal: null as string | null,
} as const;

/**
 * Faux tant que les mentions légales ne sont pas complètes. Pilote la note de
 * bas de page qui empêche le document de se faire passer pour une facture
 * fiscale.
 */
export const mentionsCompletes = SOCIETE.matriculeFiscal !== null;

/** `FibreConnect SARL`, tel qu'il s'écrit en en-tête. */
export const raisonSociale = `${SOCIETE.nom} ${SOCIETE.forme}`;
