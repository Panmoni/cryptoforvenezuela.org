export const defaultLang = "en";

// Add one entry here per new locale as it's translated — this is the only
// place the header switcher's option list comes from.
export const languages = {
  en: "English",
  es: "Español",
  fr: "Français",
};

export type Lang = keyof typeof languages;

export const ui = {
  en: {
    "meta.title": "Direct wallet-to-wallet earthquake relief",
    "meta.description":
      "Direct, wallet-to-wallet earthquake relief for the June 2026 Venezuela earthquake. No custody, no middlemen — every donation goes straight to a volunteer group on the ground in Caracas, with every delivery photo-verified.",

    "nav.donate": "Donate",
    "nav.impact": "Impact",
    "nav.received": "Received",
    "nav.about": "About",

    "hero.title": "Direct relief for Venezuela, wallet to wallet.",
    "hero.body":
      "On June 24, 2026, twin M7.2 and M7.5 earthquakes hit Venezuela. A friend of mine leads a group of volunteers on the ground in Caracas, buying food, hygiene supplies, and hospital materials with whatever comes in — reaching families sleeping in the street and children left without parents after the quake. Every token or coin you send goes straight to his wallet. Nothing passes through anyone in between.",

    "impact.heading": "Every number here is a photo.",
    "impact.subtext":
      "These counters are a straight sum over deliveries a human personally reviewed and approved — click any number to see the photos behind it.",
    "impact.itemsDelivered": "items delivered, photo-verified",
    "impact.nothingApproved": "Nothing approved yet — check back soon.",
    "impact.fullBreakdown": "Full itemized breakdown",
    "impact.items": "items",
    "impact.evidence": "Evidence",
    "impact.followProgrammatically": "Follow programmatically:",
    "impact.clearFilter": "Clear filter",
    "impact.viewFullSize": "View full size",
    "impact.sameDelivery": "photos — same delivery.",
    "impact.english": "English:",
    "impact.generalEvidence": "General evidence",
    "impact.noPhotosCategory": "No photos in this category yet.",
    "impact.copied": "Copied!",
    "impact.copyText": "Copy text",

    "received.heading": "What's come in on-chain",
    "received.subtext":
      "This data comes straight from all of the supported chains — anyone can verify it independently on a block explorer. Shown here next to the impact log above so you can see money in vs. aid delivered.",
    "received.totalsHeading": "Totals received",
    "received.nothingConfirmed": "Nothing confirmed on-chain yet.",
    "received.recentHeading": "Recent transfers",
    "received.on": "on",
    "received.viewTx": "view tx",

    "sponsors.heading": "Sponsors",
    "sponsors.body":
      "We're open to discussing sponsorships. Reach out at {{email}} or message {{telegram}} on Telegram.",

    "about.heading": "How this works",
    "about.walletTitle": "Wallet to wallet, nothing in between",
    "about.walletBody":
      "This site displays addresses across several chains — Solana, Ethereum and other EVM chains, Bitcoin, Bitcoin Cash, and Tron — that belong to a friend of mine who leads a group of volunteers in Caracas. When you send funds, they go directly to his wallet, and he and the group use it to buy supplies on the ground. This site, and I, never touch the money. There is no pooled account, no smart contract holding funds, no intermediate custody of any kind, no middlemen — just funding straight from person to person to help children and adults in need on the streets of Venezuela.",
    "about.notTitle": "What this isn't",
    "about.not1": "Not a registered charity — no tax receipt, no 501(c)(3).",
    "about.not2": "No KYC, no fiat on/off-ramp — this is crypto, wallet to wallet.",
    "about.not3": "No pooled or custodial wallet — funds never pass through anything I control.",
    "about.verifyTitle": "Verifying the addresses",
    "about.verifyBody":
      'Address integrity is the single highest-stakes property of this whole project — a swapped address means your donation reaches a clone, not him or the volunteers he works with. The addresses shown above were published once, together, from an established personal channel I\'ve used for years, and haven\'t changed since. The "Verify this address" panel links to that post and to a block explorer so you can check independently before sending anything.',
    "about.trackingTitle": "Impact tracking",
    "about.trackingBody":
      "Photos of purchases and deliveries come in from the ground via Telegram. Every single one is manually reviewed and approved before it's published — nothing goes live automatically. Approved photos back every number in the impact section above, and every number links back to its evidence.",

    "footer.sourceGithub": "Source on GitHub",
    "footer.followX": "Follow on X",
    "footer.rss": "RSS",
    "footer.jsonFeed": "JSON Feed",
    "footer.panmoniCredit": "A {{link}} project.",
    "footer.fundsNote":
      "100% of donations go straight to disaster relief. The domains, development work, and even the microphones used to gather stories from the ground are donated by Panmoni.",

    "donation.sendHereAny": "Send here — any amount",
    "donation.sendHereToken": "Send here — SOL or any SPL token",
    "donation.copyAddress": "Copy address",
    "donation.copied": "Copied",
    "donation.token": "Token",
    "donation.verifyOnlyNotSend": "Verify only — not a send address",
    "donation.verifyTokenBody":
      "Your wallet resolves the token account for you — always send to the address above, for SOL and every SPL token alike. This is where USDC specifically ends up on-chain, shown so you can independently confirm it after sending:",
    "donation.suggestedAmounts": "Suggested amounts:",
    "donation.orAnyAmount": "or any amount",
    "donation.verifyThisAddress": "Verify this address",
    "donation.hideVerification": "Hide verification",
    "donation.checkValue": "Check value:",
    "donation.canonicalNote":
      "This address was published once, from an established channel, and hasn't changed since:",
    "donation.canonicalSource": "canonical source",
    "donation.viewOnExplorer": "View on block explorer",
    "donation.alertBanner":
      "This {{chain}} address has been flagged and is temporarily suspended. Do not send funds to it. Check {{url}} for the latest verified address.",

    "common.previous": "Previous",
    "common.next": "Next",
    "common.page": "Page",
    "common.of": "of",
    "common.close": "Close",

    "categories.food": "Food",
    "categories.hygiene": "Hygiene",
    "categories.hospital": "Hospital",
    "categories.water": "Water",
    "categories.shelter": "Shelter",
    "categories.other": "Other",
  },
  es: {
    "meta.title": "Ayuda directa, billetera a billetera, para el terremoto",
    "meta.description":
      "Ayuda directa, billetera a billetera, para el terremoto de junio de 2026 en Venezuela. Sin custodia, sin intermediarios: cada donación llega directo a un grupo de voluntarios sobre el terreno en Caracas, con cada entrega verificada con fotos.",

    "nav.donate": "Donar",
    "nav.impact": "Impacto",
    "nav.received": "Recibido",
    "nav.about": "Acerca de",

    "hero.title": "Ayuda directa para Venezuela, billetera a billetera.",
    "hero.body":
      "El 24 de junio de 2026, dos terremotos gemelos de magnitud 7.2 y 7.5 sacudieron a Venezuela. Un amigo mío lidera un grupo de voluntarios sobre el terreno en Caracas, comprando alimentos, artículos de higiene y material hospitalario con lo que va llegando, para familias que duermen en la calle y niños que quedaron sin sus padres tras el terremoto. Cada token o moneda que envías va directo a su billetera. Nada pasa por ninguna persona intermedia.",

    "impact.heading": "Cada número aquí es una foto.",
    "impact.subtext":
      "Estos contadores son la suma directa de entregas que una persona revisó y aprobó personalmente — haz clic en cualquier número para ver las fotos detrás de él.",
    "impact.itemsDelivered": "artículos entregados, verificados con fotos",
    "impact.nothingApproved": "Aún no hay nada aprobado — vuelve pronto.",
    "impact.fullBreakdown": "Desglose completo",
    "impact.items": "artículos",
    "impact.evidence": "Evidencia",
    "impact.followProgrammatically": "Síguelo de forma programática:",
    "impact.clearFilter": "Quitar filtro",
    "impact.viewFullSize": "Ver en tamaño completo",
    "impact.sameDelivery": "fotos — misma entrega.",
    "impact.english": "Inglés:",
    "impact.generalEvidence": "Evidencia general",
    "impact.noPhotosCategory": "Todavía no hay fotos en esta categoría.",
    "impact.copied": "¡Copiado!",
    "impact.copyText": "Copiar texto",

    "received.heading": "Lo que ha llegado on-chain",
    "received.subtext":
      "Estos datos vienen directamente de todas las cadenas soportadas — cualquiera puede verificarlos de forma independiente en un explorador de bloques. Se muestran junto al registro de impacto de arriba para que puedas comparar el dinero que entra con la ayuda entregada.",
    "received.totalsHeading": "Totales recibidos",
    "received.nothingConfirmed": "Aún no hay nada confirmado on-chain.",
    "received.recentHeading": "Transferencias recientes",
    "received.on": "en",
    "received.viewTx": "ver transacción",

    "sponsors.heading": "Patrocinadores",
    "sponsors.body":
      "Estamos abiertos a conversar sobre patrocinios. Escríbenos a {{email}} o envía un mensaje a {{telegram}} por Telegram.",

    "about.heading": "Cómo funciona esto",
    "about.walletTitle": "Billetera a billetera, sin nada en medio",
    "about.walletBody":
      "Este sitio muestra direcciones en varias cadenas — Solana, Ethereum y otras cadenas EVM, Bitcoin, Bitcoin Cash y Tron — que pertenecen a un amigo mío que lidera un grupo de voluntarios en Caracas. Cuando envías fondos, van directo a su billetera, y él y el grupo los usan para comprar suministros sobre el terreno. Este sitio, y yo, nunca tocamos el dinero. No hay cuenta mancomunada, ni contrato inteligente que retenga fondos, ni custodia intermedia de ningún tipo, ni intermediarios — solo financiamiento directo de persona a persona para ayudar a niños y adultos que lo necesitan en las calles de Venezuela.",
    "about.notTitle": "Lo que esto no es",
    "about.not1": "No es una organización benéfica registrada — sin recibo fiscal, sin figura 501(c)(3).",
    "about.not2": "Sin KYC, sin conversión a moneda fiat — esto es cripto, billetera a billetera.",
    "about.not3": "Sin billetera mancomunada ni custodiada — los fondos nunca pasan por nada que yo controle.",
    "about.verifyTitle": "Verificando las direcciones",
    "about.verifyBody":
      'La integridad de las direcciones es la propiedad más crítica de todo este proyecto — una dirección cambiada significa que tu donación llega a un clon, no a él ni a los voluntarios con los que trabaja. Las direcciones mostradas arriba se publicaron una sola vez, juntas, desde un canal personal establecido que uso desde hace años, y no han cambiado desde entonces. El panel "Verificar esta dirección" enlaza a esa publicación y a un explorador de bloques para que puedas comprobarlo de forma independiente antes de enviar nada.',
    "about.trackingTitle": "Seguimiento del impacto",
    "about.trackingBody":
      "Las fotos de compras y entregas llegan desde el terreno por Telegram. Cada una se revisa y aprueba manualmente antes de publicarse — nada se publica automáticamente. Las fotos aprobadas respaldan cada número en la sección de impacto de arriba, y cada número enlaza de vuelta a su evidencia.",

    "footer.sourceGithub": "Código fuente en GitHub",
    "footer.followX": "Síguenos en X",
    "footer.rss": "RSS",
    "footer.jsonFeed": "Feed JSON",
    "footer.panmoniCredit": "Un proyecto de {{link}}.",
    "footer.fundsNote":
      "El 100% de las donaciones va directo a la ayuda humanitaria. Los dominios, el desarrollo y hasta los micrófonos usados para recoger los testimonios sobre el terreno son donados por Panmoni.",

    "donation.sendHereAny": "Envía aquí — cualquier monto",
    "donation.sendHereToken": "Envía aquí — SOL o cualquier token SPL",
    "donation.copyAddress": "Copiar dirección",
    "donation.copied": "Copiado",
    "donation.token": "Token",
    "donation.verifyOnlyNotSend": "Solo para verificar — no es una dirección de envío",
    "donation.verifyTokenBody":
      "Tu billetera resuelve la cuenta de token por ti — envía siempre a la dirección de arriba, tanto para SOL como para cualquier token SPL. Aquí es donde termina específicamente el USDC on-chain, mostrado para que puedas confirmarlo de forma independiente después de enviar:",
    "donation.suggestedAmounts": "Montos sugeridos:",
    "donation.orAnyAmount": "o cualquier monto",
    "donation.verifyThisAddress": "Verificar esta dirección",
    "donation.hideVerification": "Ocultar verificación",
    "donation.checkValue": "Valor de verificación:",
    "donation.canonicalNote":
      "Esta dirección se publicó una sola vez, desde un canal establecido, y no ha cambiado desde entonces:",
    "donation.canonicalSource": "fuente canónica",
    "donation.viewOnExplorer": "Ver en el explorador de bloques",
    "donation.alertBanner":
      "Esta dirección de {{chain}} ha sido marcada y está suspendida temporalmente. No envíes fondos a ella. Consulta {{url}} para la dirección verificada más reciente.",

    "common.previous": "Anterior",
    "common.next": "Siguiente",
    "common.page": "Página",
    "common.of": "de",
    "common.close": "Cerrar",

    "categories.food": "Alimentos",
    "categories.hygiene": "Higiene",
    "categories.hospital": "Hospital",
    "categories.water": "Agua",
    "categories.shelter": "Refugio",
    "categories.other": "Otro",
  },
  fr: {
    "meta.title": "Aide directe, portefeuille à portefeuille, pour le séisme",
    "meta.description":
      "Aide directe, portefeuille à portefeuille, pour le séisme de juin 2026 au Venezuela. Sans dépositaire, sans intermédiaire : chaque don part directement vers un groupe de bénévoles sur le terrain à Caracas, chaque livraison étant vérifiée par photo.",

    "nav.donate": "Faire un don",
    "nav.impact": "Impact",
    "nav.received": "Reçu",
    "nav.about": "À propos",

    "hero.title": "Aide directe pour le Venezuela, portefeuille à portefeuille.",
    "hero.body":
      "Le 24 juin 2026, deux séismes jumeaux de magnitude 7,2 et 7,5 ont frappé le Venezuela. Un ami à moi dirige un groupe de bénévoles sur le terrain à Caracas, achetant nourriture, produits d'hygiène et matériel hospitalier avec ce qui arrive — venant en aide à des familles dormant dans la rue et à des enfants restés sans parents après le séisme. Chaque jeton ou pièce que vous envoyez va directement dans son portefeuille. Rien ne passe par un intermédiaire quelconque.",

    "impact.heading": "Chaque chiffre ici est une photo.",
    "impact.subtext":
      "Ces compteurs sont la somme directe des livraisons qu'une personne a examinées et approuvées elle-même — cliquez sur un chiffre pour voir les photos derrière.",
    "impact.itemsDelivered": "articles livrés, vérifiés par photo",
    "impact.nothingApproved": "Rien d'approuvé pour l'instant — revenez bientôt.",
    "impact.fullBreakdown": "Détail complet",
    "impact.items": "articles",
    "impact.evidence": "Preuves",
    "impact.followProgrammatically": "Suivre par programmation :",
    "impact.clearFilter": "Effacer le filtre",
    "impact.viewFullSize": "Voir en taille réelle",
    "impact.sameDelivery": "photos — même livraison.",
    "impact.english": "Anglais :",
    "impact.generalEvidence": "Preuve générale",
    "impact.noPhotosCategory": "Pas encore de photos dans cette catégorie.",
    "impact.copied": "Copié !",
    "impact.copyText": "Copier le texte",

    "received.heading": "Ce qui est arrivé on-chain",
    "received.subtext":
      "Ces données proviennent directement de toutes les chaînes prises en charge — n'importe qui peut les vérifier de façon indépendante sur un explorateur de blocs. Elles sont affichées ici à côté du journal d'impact ci-dessus pour comparer l'argent reçu et l'aide livrée.",
    "received.totalsHeading": "Totaux reçus",
    "received.nothingConfirmed": "Rien de confirmé on-chain pour l'instant.",
    "received.recentHeading": "Transferts récents",
    "received.on": "sur",
    "received.viewTx": "voir la transaction",

    "sponsors.heading": "Sponsors",
    "sponsors.body":
      "Nous sommes ouverts à discuter de sponsoring. Contactez-nous à {{email}} ou envoyez un message à {{telegram}} sur Telegram.",

    "about.heading": "Comment ça marche",
    "about.walletTitle": "Portefeuille à portefeuille, rien entre les deux",
    "about.walletBody":
      "Ce site affiche des adresses sur plusieurs chaînes — Solana, Ethereum et d'autres chaînes EVM, Bitcoin, Bitcoin Cash et Tron — qui appartiennent à un ami à moi qui dirige un groupe de bénévoles à Caracas. Lorsque vous envoyez des fonds, ils vont directement dans son portefeuille, et lui et le groupe les utilisent pour acheter des fournitures sur le terrain. Ce site, et moi-même, ne touchons jamais l'argent. Il n'y a ni compte commun, ni contrat intelligent détenant des fonds, ni garde intermédiaire d'aucune sorte, ni intermédiaires — juste un financement direct de personne à personne pour aider les enfants et les adultes dans le besoin dans les rues du Venezuela.",
    "about.notTitle": "Ce que ce n'est pas",
    "about.not1": "Pas un organisme de bienfaisance enregistré — pas de reçu fiscal, pas de statut 501(c)(3).",
    "about.not2": "Pas de KYC, pas de conversion en monnaie fiduciaire — c'est de la crypto, portefeuille à portefeuille.",
    "about.not3": "Pas de portefeuille commun ou dépositaire — les fonds ne passent jamais par quoi que ce soit que je contrôle.",
    "about.verifyTitle": "Vérifier les adresses",
    "about.verifyBody":
      "L'intégrité des adresses est la propriété la plus critique de tout ce projet — une adresse substituée signifie que votre don atteint un clone, pas lui ni les bénévoles avec qui il travaille. Les adresses affichées ci-dessus ont été publiées une seule fois, ensemble, depuis un canal personnel établi que j'utilise depuis des années, et n'ont pas changé depuis. Le panneau « Vérifier cette adresse » renvoie vers cette publication et vers un explorateur de blocs afin que vous puissiez vérifier de façon indépendante avant d'envoyer quoi que ce soit.",
    "about.trackingTitle": "Suivi de l'impact",
    "about.trackingBody":
      "Les photos des achats et des livraisons arrivent du terrain via Telegram. Chacune est examinée et approuvée manuellement avant sa publication — rien n'est publié automatiquement. Les photos approuvées justifient chaque chiffre de la section impact ci-dessus, et chaque chiffre renvoie à sa preuve.",

    "footer.sourceGithub": "Code source sur GitHub",
    "footer.followX": "Suivre sur X",
    "footer.rss": "RSS",
    "footer.jsonFeed": "Flux JSON",
    "footer.panmoniCredit": "Un projet {{link}}.",
    "footer.fundsNote":
      "100 % des dons vont directement à l'aide humanitaire. Les domaines, le développement, et même les microphones utilisés pour recueillir les témoignages sur le terrain, sont offerts par Panmoni.",

    "donation.sendHereAny": "Envoyez ici — n'importe quel montant",
    "donation.sendHereToken": "Envoyez ici — SOL ou n'importe quel jeton SPL",
    "donation.copyAddress": "Copier l'adresse",
    "donation.copied": "Copié",
    "donation.token": "Jeton",
    "donation.verifyOnlyNotSend": "Vérification uniquement — pas une adresse d'envoi",
    "donation.verifyTokenBody":
      "Votre portefeuille résout le compte de jeton pour vous — envoyez toujours à l'adresse ci-dessus, aussi bien pour SOL que pour n'importe quel jeton SPL. C'est ici que l'USDC atterrit précisément on-chain, affiché pour que vous puissiez le confirmer de façon indépendante après l'envoi :",
    "donation.suggestedAmounts": "Montants suggérés :",
    "donation.orAnyAmount": "ou n'importe quel montant",
    "donation.verifyThisAddress": "Vérifier cette adresse",
    "donation.hideVerification": "Masquer la vérification",
    "donation.checkValue": "Valeur de contrôle :",
    "donation.canonicalNote":
      "Cette adresse a été publiée une seule fois, depuis un canal établi, et n'a pas changé depuis :",
    "donation.canonicalSource": "source canonique",
    "donation.viewOnExplorer": "Voir sur l'explorateur de blocs",
    "donation.alertBanner":
      "Cette adresse {{chain}} a été signalée et est temporairement suspendue. N'y envoyez pas de fonds. Consultez {{url}} pour l'adresse vérifiée la plus récente.",

    "common.previous": "Précédent",
    "common.next": "Suivant",
    "common.page": "Page",
    "common.of": "sur",
    "common.close": "Fermer",

    "categories.food": "Nourriture",
    "categories.hygiene": "Hygiène",
    "categories.hospital": "Hôpital",
    "categories.water": "Eau",
    "categories.shelter": "Abri",
    "categories.other": "Autre",
  },
} as const;

export type UiKey = keyof (typeof ui)[typeof defaultLang];
