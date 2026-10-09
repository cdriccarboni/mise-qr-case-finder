// Activités pédagogiques et manipulations techniques de nœuds et câblage de spectacle
// Provenance : Restauration et réinterprétation éditoriale moderne des archives CD-ROM son & régie

export const KNOT_ACTIVITIES = [
  {
    id: 'cabestan',
    title: 'Nœud de cabestan',
    subtitle: 'Fixation rapide micro, perche et cadre de bruitage',
    category: 'Accroche & perches',
    difficulty: 'Débutant',
    provenance: 'Archive CD-ROM Son & Scène (restauration éditoriale)',
    targetEquipment: ['Perche micro', 'Pied de micro', 'Drisse', 'Cadre acoustique'],
    description: 'Le nœud indispensable du plateau pour attacher rapidement une ligne sans glisser sous tension continue.',
    steps: [
      '1. Passez la drisse autour du tube ou de la perche.',
      '2. Croisez par-dessus le premier brin pour former un X.',
      '3. Faites un second tour autour du tube.',
      '4. Glissez le brin courant sous le croisement.',
      '5. Souquez fermement les deux brins dans des directions opposées.'
    ],
    tips: 'Sur un tube métallique lisse de pied de micro, terminez toujours par deux demi-clefs de sécurité.'
  },
  {
    id: 'noeud-en-huit',
    title: 'Nœud en huit d’arrêt',
    subtitle: 'Sécurité de câble et butée de coulisse',
    category: 'Sécurité & câbles',
    difficulty: 'Débutant',
    provenance: 'Archive CD-ROM Son & Scène (restauration éditoriale)',
    targetEquipment: ['Câble XLR', 'Élingue de sécurité', 'Boîte de direct'],
    description: 'Empêche un câble de glisser hors d’une gorge ou d’un passe-câble de caisse de régie sans écraser les conducteurs.',
    steps: [
      '1. Formez une boucle simple (ganse).',
      '2. Faites passer le brin autour du brin dormant (tour mort).',
      '3. Enfilez le brin dans la boucle par l’avant.',
      '4. Serrez pour observer la forme caractéristique du chiffre 8.'
    ],
    tips: 'Le nœud en huit préserve mieux l’âme du câble qu’un nœud simple et reste facile à défaire après tension.'
  },
  {
    id: 'lovage-huit',
    title: 'Lovage en huit (technique régie sonore)',
    subtitle: 'Rangement des câbles micro sans vrille ni nœud',
    category: 'Atelier de rangement',
    difficulty: 'Intermédiaire',
    provenance: 'Archive CD-ROM Son & Scène (restauration éditoriale)',
    targetEquipment: ['Câbles micro XLR', 'Câbles HP', 'Prolongateurs'],
    description: 'La méthode professionnelle pour ranger 10 ou 20 mètres de câble micro dans une valise sans qu’il vrille au déploiement.',
    steps: [
      '1. Prenez la fiche mâle dans la main gauche.',
      '2. Formez une première boucle normale vers l’avant.',
      '3. Formez la boucle suivante en tournant le poignet vers l’intérieur (contre-boucle).',
      '4. Alternez boucle normale et contre-boucle jusqu’au bout du câble.',
      '5. Verrouillez avec le scratch Velcro de la valise.'
    ],
    tips: 'Un câble lové en huit se déroule d’un seul geste sans faire de bouclettes ni de nœuds sur scène.'
  },
  {
    id: 'noeud-chaise',
    title: 'Nœud de chaise',
    subtitle: 'Boucle fixe pour suspension d’accessoire sonore',
    category: 'Accroche & suspension',
    difficulty: 'Intermédiaire',
    provenance: 'Archive CD-ROM Son & Scène (restauration éditoriale)',
    targetEquipment: ['Tôle à tonnerre', 'Chaînes', 'Réflecteur acoustique'],
    description: 'Crée un œil fixe et indéformable pour suspendre une tôle à tonnerre ou un accessoire lourd de bruitage.',
    steps: [
      '1. Formez une boucle (le « puits »).',
      '2. Le brin (« le serpent ») sort du puits.',
      '3. Il passe derrière le brin dormant (« fait le tour de l’arbre »).',
      '4. Il replonge dans le puits.',
      '5. Tenez les brins parallèles et serrez la boucle.'
    ],
    tips: 'Ne glisse jamais sous forte charge et se défait facilement en « brisant le dos » du nœud.'
  },
  {
    id: 'noeud-plat',
    title: 'Nœud plat d’arrimage',
    subtitle: 'Liaison de deux sangles ou drisses de même diamètre',
    category: 'Valises & caisses',
    difficulty: 'Débutant',
    provenance: 'Archive CD-ROM Son & Scène (restauration éditoriale)',
    targetEquipment: ['Sangles de caisse', 'Pochettes SPARE', 'Valises'],
    description: 'Idéal pour fermer une housse ou réunir deux liens de même grosseur autour d’un ensemble d’accessoires.',
    steps: [
      '1. Croisez le brin droit sur le brin gauche et faites une demi-clef.',
      '2. Croisez ensuite le brin gauche sur le brin droit.',
      '3. Repassez dans la boucle.',
      '4. Vérifiez la symétrie : les deux boucles doivent s’emboîter à plat.'
    ],
    tips: 'Attention à ne pas faire un nœud de vache (asymétrique qui glisse). Si les diamètres diffèrent, préférez le nœud d’écoute.'
  }
]

export function renderKnotsHtml(esc) {
  return `
    <div class="panel knotsPanel">
      <div class="tokenStrip" aria-hidden="true">
        <svg viewBox="0 0 320 52"><circle cx="36" cy="26" r="10"/><polygon points="104,10 124,20 119,42 91,42 84,20"/><polygon points="192,10 216,26 192,42 168,26"/><path d="M246 30c10-12 20-12 30 0s20 12 30 0"/></svg>
      </div>
      <h2>Atelier technique : nœuds & câblage scénique</h2>
      <p class="hint">Apprentissages pratiques de manipulation et de rangement issus des archives sonores du spectacle vivant.</p>
      <div class="cards knotCards">
        ${KNOT_ACTIVITIES.map(k => `
          <article class="card knotCard" data-knot-id="${esc(k.id)}">
            <div class="knotHead">
              <b>${esc(k.title)}</b>
              <span class="badge ${k.difficulty === 'Débutant' ? 'badgeEasy' : 'badgeMedium'}">${esc(k.difficulty)}</span>
            </div>
            <p class="knotSubtitle">${esc(k.subtitle)}</p>
            <small class="knotMeta">Matériel : ${esc(k.targetEquipment.join(', '))}</small>
            <details class="knotDetails">
              <summary>Voir les étapes de réalisation</summary>
              <ol class="knotSteps">
                ${k.steps.map(s => `<li>${esc(s)}</li>`).join('')}
              </ol>
              <p class="knotTip">💡 <em>${esc(k.tips)}</em></p>
              <small class="provenanceTag">Source : ${esc(k.provenance)}</small>
            </details>
          </article>
        `).join('')}
      </div>
    </div>
  `
}
