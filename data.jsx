// data.jsx — sample authors + books (French). All art is placeholder.
// Exposed on window for the other babel scripts.

const CRAYON = {
  red:    "#e8443b",
  blue:   "#2b7fd4",
  yellow: "#f4c020",
  green:  "#4caf63",
  purple: "#8c5bd0",
  orange: "#f08a24",
  pink:   "#ec6aa8",
  teal:   "#1fa6a0",
};

const AUTHORS = [
  {
    id: "sophie",
    name: "Sophie",
    age: 9,
    color: CRAYON.purple,
    bio: "Sophie a 9 ans et invente des histoires depuis qu'elle sait tenir un crayon. Elle adore les dragons, les licornes et tout ce qui brille. Quand elle ne dessine pas, elle construit des cabanes dans le jardin.",
    favo: "Les histoires qui font un peu peur (mais pas trop).",
  },
  {
    id: "alice",
    name: "Alice",
    age: 9,
    color: CRAYON.teal,
    bio: "Alice a 6 ans et dessine surtout des animaux : des chats qui volent, des poissons qui parlent et des chiens présidents. Elle signe toujours ses dessins d'un petit soleil dans le coin.",
    favo: "Les animaux rigolos et les fins heureuses.",
  },
];

// Helper to build a digital page (a spread shown one at a time).
// Three ways to define a page:
//   p("text", { illoLabel: "..." })       -> standard layout: text + illustration slot
//   p("text", { html: "digital/<book>/p1.html" })  -> render the HTML file in the digital view
//   p(null,   { html: "digital/<book>/p1.html" })  -> HTML only, no fallback text
function p(text, { illo = true, illoLabel = "dessin", html = null } = {}) {
  return { text, illo, illoLabel, html };
}

const BOOKS = [
  {
    id: "grand-mere",
    title: "L'enterrement de ma grand-mère",
    author: "sophie",
    color: CRAYON.purple,
    shape: "moon",
    year: 2026,
    isNew: true,
    blurb: "Il était une fois une petite fille très triste… et un papillon qui change tout.",
    pages: [
      p("Il était une fois une petite fille qui s'appelait Lou. Sa grand-mère venait de partir au ciel, et Lou était très très triste.", { illoLabel: "Lou qui pleure" }),
      p("Le jour de l'enterrement, il pleuvait. Tout le monde portait des habits gris. Lou serrait fort la main de son papa.", { illoLabel: "la famille sous la pluie" }),
      p("Soudain, un petit papillon orange s'est posé sur l'épaule de Lou. Il n'avait pas du tout peur de la pluie.", { illoLabel: "le papillon orange" }),
      p(null, { html: "digital/grand-mere/p4.html" }),
      p("Ils ont volé ensemble au-dessus des nuages. En bas, le soleil revenait doucement sur le cimetière.", { illoLabel: "vol au-dessus des nuages" }),
      p("« Je serai toujours là », dit mamie-papillon. « Dans le vent, dans les fleurs, et dans ton cœur. »", { illoLabel: "le cœur de Lou" }),
    ],
  },
  {
    id: "dragon-noir",
    title: "Le dragon qui avait peur du noir",
    author: "sophie",
    color: CRAYON.red,
    shape: "flame",
    year: 2026,
    isNew: true,
    blurb: "Brindille crache du feu, mais le soir venu, il tremble dans sa grotte.",
    pages: [
      p("Brindille était un dragon. Un vrai, avec des écailles rouges et une grande queue. Mais Brindille avait un secret : il avait peur du noir !", { illoLabel: "Brindille le dragon" }),
      p("Chaque soir, dans sa grotte sombre, il tremblait. « Et s'il y avait un monstre ? » pensait-il.", { illoLabel: "la grotte sombre" }),
      p("Un jour, une luciole perdue est entrée. « Pourquoi trembles-tu ? Tu craches du feu ! » dit-elle en riant.", { illoLabel: "la luciole" }),
      p("« C'est vrai ! » réalisa Brindille. Il souffla une petite flamme, et toute la grotte s'illumina.", { illoLabel: "la grotte illuminée" }),
      p("Depuis ce jour, Brindille n'a plus jamais peur du noir. Il est sa propre veilleuse. Fin.", { illoLabel: "Brindille endormi" }),
    ],
  },
  {
    id: "chat-volant",
    title: "Le chat qui voulait voler",
    author: "alice",
    color: CRAYON.blue,
    shape: "star",
    year: 2026,
    isNew: true,
    blurb: "Moustache regarde les oiseaux et rêve. Et si on essayait avec un parapluie ?",
    pages: [
      p("Moustache était un chat gris. Toute la journée, il regardait les oiseaux par la fenêtre. « Moi aussi je veux voler ! » miaulait-il.", { illoLabel: "Moustache à la fenêtre" }),
      p("Il essaya avec un parapluie. PLOUF, dans la mare. Il essaya avec des ballons. POP, sur le toit du voisin.", { illoLabel: "le chat et les ballons" }),
      p("Un soir, une chouette lui dit : « Ferme les yeux, et rêve très fort. » Alors Moustache s'endormit…", { illoLabel: "la chouette sage" }),
      p("…et dans son rêve, il volait ! Au-dessus des maisons, au-dessus des nuages, jusqu'à la lune. C'était magnifique.", { illoLabel: "Moustache qui vole" }),
      p("Au réveil, Moustache ronronnait. Voler, finalement, c'est facile : il suffit de fermer les yeux. Fin.", { illoLabel: "le chat qui ronronne" }),
    ],
  },
  {
    id: "poissons-parlent",
    title: "Pourquoi les poissons ne parlent pas",
    author: "alice",
    color: CRAYON.teal,
    shape: "wave",
    year: 2025,
    isNew: false,
    blurb: "Une explication très sérieuse et très rigolote au fond de l'océan.",
    pages: [
      p("Au fond de l'océan vivait un poisson très bavard. Il s'appelait Glouglou et il parlait, parlait, parlait sans arrêt.", { illoLabel: "Glouglou le poisson" }),
      p("Un jour, le roi de la mer en eut assez. « Glouglou, tu fais trop de bulles ! Tu vas réveiller la baleine ! »", { illoLabel: "le roi de la mer" }),
      p("Mais Glouglou continuait. Alors la fée des coquillages décida de prendre la voix de tous les poissons et de la cacher dans une perle.", { illoLabel: "la fée des coquillages" }),
      p("Depuis ce jour, les poissons ne parlent plus. Ils font seulement « blop ». Et la perle, elle, brille toujours quelque part. Fin.", { illoLabel: "la perle brillante" }),
    ],
  },
  {
    id: "nuage-ami",
    title: "Mon ami le nuage",
    author: "sophie",
    color: CRAYON.yellow,
    shape: "cloud",
    year: 2025,
    isNew: false,
    blurb: "Nino trouve un nuage tout doux qui le suit partout. Même à l'école.",
    pages: [
      p("Un matin, Nino trouva un petit nuage tout doux accroché à sa fenêtre. « Tu veux jouer ? » demanda le nuage.", { illoLabel: "Nino et le nuage" }),
      p("Le nuage suivait Nino partout. À l'école, il lui faisait de l'ombre. À la cantine, il lui piquait ses frites !", { illoLabel: "le nuage à l'école" }),
      p("Mais un jour, le nuage devint tout gris. « Je crois que je dois pleuvoir », dit-il tristement.", { illoLabel: "le nuage gris" }),
      p("Alors Nino lui fit un câlin. La pluie tomba, douce et chaude, et un magnifique arc-en-ciel apparut. Fin.", { illoLabel: "l'arc-en-ciel" }),
    ],
  },
  {
    id: "licorne-velo",
    title: "La licorne et le vélo rouge",
    author: "alice",
    color: CRAYON.pink,
    shape: "heart",
    year: 2025,
    isNew: false,
    blurb: "Étincelle ne sait pas faire de la magie. Mais elle sait faire du vélo !",
    pages: [
      p("Étincelle était une licorne, mais elle avait un problème : sa corne ne faisait aucune magie. Pas une seule étincelle !", { illoLabel: "Étincelle la licorne" }),
      p("Les autres licornes se moquaient. « Une licorne sans magie, ça ne sert à rien ! » Étincelle était triste.", { illoLabel: "les licornes moqueuses" }),
      p("Un jour, elle trouva un vieux vélo rouge. Elle apprit à pédaler, et elle allait plus vite que le vent !", { illoLabel: "le vélo rouge" }),
      p("Quand le village fut en danger, c'est Étincelle qui alla chercher de l'aide, à toute vitesse sur son vélo. Une héroïne ! Fin.", { illoLabel: "Étincelle héroïne" }),
    ],
  },
  {
    id: "journee-envers",
    title: "Une journée à l'envers",
    author: "sophie",
    color: CRAYON.green,
    shape: "spiral",
    year: 2024,
    isNew: false,
    blurb: "Et si on mangeait le dessert d'abord et qu'on marchait sur les mains ?",
    pages: [
      p("Ce matin-là, Tom décida que tout serait à l'envers. Il mit son pyjama par-dessus ses habits et marcha à reculons.", { illoLabel: "Tom à l'envers" }),
      p("Au petit-déjeuner, il mangea le dessert d'abord : du gâteau au chocolat ! Puis ses céréales. Miam.", { illoLabel: "le gâteau du matin" }),
      p("À l'école, il écrivit son nom de droite à gauche et lut son livre par la fin. La maîtresse rigola bien.", { illoLabel: "l'école à l'envers" }),
      p("Le soir, Tom dit « bonjour » au lieu de « bonne nuit ». Et il s'endormit… la tête en bas ? Non, ça c'est impossible. Fin.", { illoLabel: "Tom qui dort" }),
    ],
  },
  {
    id: "robot-fleur",
    title: "Le robot et la fleur",
    author: "alice",
    color: CRAYON.orange,
    shape: "gear",
    year: 2024,
    isNew: false,
    blurb: "Bip-Bip ne connaît rien aux fleurs. Il va apprendre à en prendre soin.",
    pages: [
      p("Bip-Bip était un robot tout carré. Il rangeait, il calculait, il bipait. Mais il ne souriait jamais.", { illoLabel: "Bip-Bip le robot" }),
      p("Un jour, une petite fleur poussa dans son jardin de métal. Bip-Bip ne savait pas quoi en faire.", { illoLabel: "la petite fleur" }),
      p("Il lui donna de l'eau, du soleil, et même une chanson en langage robot : « Bip bip bidou. »", { illoLabel: "Bip-Bip arrose" }),
      p("La fleur grandit, grandit, et devint magnifique. Et pour la première fois, Bip-Bip fit : « :) ». Fin.", { illoLabel: "le sourire du robot" }),
    ],
  },
];

window.LISONS_DATA = { CRAYON, AUTHORS, BOOKS };
