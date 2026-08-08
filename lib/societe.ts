/**
 * The company's identity, as printed at the top of an invoice.
 *
 * **The matricule fiscal is deliberately all zeros, and the document says so.**
 * A Tunisian invoice is a tax document, and inventing a plausible-looking
 * registration number would produce a piece of paper that could pass for a
 * genuine one — exactly the line this project draws elsewhere by refusing to
 * fake a bank page. All zeros cannot collide with a real company's number and
 * reads as a placeholder at a glance, while still showing where the mention
 * belongs on the page.
 *
 * The day the real details are known: replace `matriculeFiscal` and set
 * `mentionsReelles` to `true`. The footer note then disappears on its own.
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

  /**
   * Numéro d'identification fiscale, au format tunisien
   * `1234567/A/M/000`. Tout à zéro : c'est un exemple, pas un vrai numéro.
   */
  matriculeFiscal: "0000000/A/M/000",

  /**
   * Passer à `true` uniquement quand les informations ci-dessus sont celles
   * d'une société réelle. Tant que c'est `false`, la facture porte en pied de
   * page qu'elle n'est pas une pièce fiscale.
   */
  mentionsReelles: false,
} as const;

/** Pilote la note de bas de page du document. */
export const mentionsCompletes = SOCIETE.mentionsReelles;

/** `FibreConnect SARL`, tel qu'il s'écrit en en-tête. */
export const raisonSociale = `${SOCIETE.nom} ${SOCIETE.forme}`;
