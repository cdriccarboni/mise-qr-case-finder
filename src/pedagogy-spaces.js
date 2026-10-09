// Espaces pédagogiques et sonores MISES!
// Intégration et réinterprétation éditoriale moderne des Ateliers d'écoute & jeux sonores
// Rubriques : Atelier, Jeux, Pédagogie, Voix

import { KNOT_ACTIVITIES } from './knots-pedagogy.js'
import { GAME_TYPES } from './game-engine.js'

export const PEDAGOGY_SPACES = {
  atelier: {
    id: 'atelier',
    title: 'Atelier sonore & technique',
    icon: '🛠️',
    description: 'Pratique, manipulation, matériel, gestes acoustiques et techniques scéniques de plateau.',
    activities: [
      ...KNOT_ACTIVITIES.map(k => ({
        id: `knot-${k.id}`,
        title: k.title,
        subtitle: k.subtitle,
        rubrique: 'Atelier',
        level: k.difficulty,
        provenance: k.provenance,
        status: 'intégré',
        description: k.description,
        targetEquipment: k.targetEquipment,
        steps: k.steps,
        tips: k.tips
      })),
      {
        id: 'atelier-micro-placement',
        title: 'Placement et prise de son de proximité',
        subtitle: 'Orientation de capsule, axe et distance sur corps sonores',
        rubrique: 'Atelier',
        level: 'Débutant',
        provenance: 'Ateliers sonores CD-ROM (réinterprétation)',
        status: 'intégré',
        description: 'Trouver la distance idéale entre le micro de bruitage et l’objet sans saturer ni perdre l’attaque acoustique.',
        targetEquipment: ['Micro bruitage (ex. Elvis)', 'Casque de contrôle', 'Pied de micro'],
        steps: [
          '1. Placer le micro à 15-20 cm de la zone de frottement ou d’impact.',
          '2. Éviter l’axe direct du souffle (angle de 30 à 45°).',
          '3. Régler le gain en faisant le geste sonore au niveau maximal prévu.',
          '4. Contrôler au casque l’absence de résonance parasite du support.'
        ],
        tips: 'Utiliser toujours une suspension ou un chiffon amortisseur sous les accessoires posés sur table.'
      }
    ]
  },
  jeux: {
    id: 'jeux',
    title: 'Jeux sonores & écoute',
    icon: '🎲',
    description: '10 mécaniques de jeux d’écoute, mini-défis, reconnaissance de timbres et mémoire acoustique.',
    games: [
      {
        code: 'A',
        title: 'Fais ce son',
        rubrique: 'Jeux',
        level: 'Tous niveaux',
        provenance: 'Jeu 1 — Ateliers d’écoute Ircam / CD-ROM',
        status: 'intégré',
        description: 'Un son cible est donné : trouver l’objet et le geste dans son inventaire pour le produire fidèlement.',
        needs: 'foley'
      },
      {
        code: 'B',
        title: 'Devine l’objet',
        rubrique: 'Jeux',
        level: 'Débutant',
        provenance: 'Jeu 2 — Ateliers d’écoute Ircam / CD-ROM',
        status: 'intégré',
        description: 'Écoute aveugle : identifier quel objet de la valise a produit ce son singulier.',
        needs: 'foley'
      },
      {
        code: 'C',
        title: 'Un objet, plusieurs sons',
        rubrique: 'Jeux',
        level: 'Intermédiaire',
        provenance: 'Jeu 3 — Ateliers d’écoute Ircam / CD-ROM',
        status: 'intégré',
        description: 'Explorer la richesse d’un seul corps sonore en changeant de geste (frotter, percuter, gratter, souffler).',
        needs: 'multiSound'
      },
      {
        code: 'D',
        title: 'Un son, plusieurs solutions',
        rubrique: 'Jeux',
        level: 'Intermédiaire',
        provenance: 'Jeu 4 — Ateliers d’écoute Ircam / CD-ROM',
        status: 'intégré',
        description: 'Trouver au moins deux manières ou matières différentes pour suggérer la même évocation sonore.',
        needs: 'shared'
      },
      {
        code: 'E',
        title: 'Univers en jeu',
        rubrique: 'Jeux',
        level: 'Tous niveaux',
        provenance: 'Jeu 5 — Ateliers d’écoute Ircam / CD-ROM',
        status: 'intégré',
        description: 'Construire un paysage sonore cohérent (forêt, port, tempête) à partir d’un sous-ensemble d’objets.',
        needs: 'objects2'
      },
      {
        code: 'F',
        title: 'L’intrus acoustique',
        rubrique: 'Jeux',
        level: 'Intermédiaire',
        provenance: 'Jeu 6 — Ateliers d’écoute Ircam / CD-ROM',
        status: 'intégré',
        description: 'Repérer parmi plusieurs propositions le son ou l’objet qui n’appartient pas à la même famille de matière.',
        needs: 'objects3'
      },
      {
        code: 'G',
        title: 'Bruitage mystère',
        rubrique: 'Jeux',
        level: 'Avancé',
        provenance: 'Jeu 7 — Ateliers d’écoute Ircam / CD-ROM',
        status: 'intégré',
        description: 'Deviner l’action scénique ou dramatique évoquée par une combinaison de bruits synchronisés.',
        needs: 'foley'
      },
      {
        code: 'H',
        title: 'Memory sonore',
        rubrique: 'Jeux',
        level: 'Débutant',
        provenance: 'Jeu 8 — Ateliers d’écoute Ircam / CD-ROM',
        status: 'intégré',
        description: 'Associer des paires d’objets produisant des sonorités cousines ou des profils de timbres proches.',
        needs: 'objects4'
      },
      {
        code: 'I',
        title: 'Défi express',
        rubrique: 'Jeux',
        level: 'Tous niveaux',
        provenance: 'Jeu 9 — Ateliers d’écoute Ircam / CD-ROM',
        status: 'intégré',
        description: 'Produire un effet sonore en temps limité (30 s à 1 min) avec la première boîte sous la main.',
        needs: 'foley'
      },
      {
        code: 'J',
        title: 'Scène sonore collective',
        rubrique: 'Jeux',
        level: 'Avancé',
        provenance: 'Jeu 10 — Ateliers d’écoute Ircam / CD-ROM',
        status: 'intégré',
        description: 'Diriger une polyphonie de bruitage où chaque participant tient un rôle précis dans la narration.',
        needs: 'objects2'
      }
    ]
  },
  pedagogie: {
    id: 'pedagogie',
    title: 'Pédagogie & transmission',
    icon: '📖',
    description: 'Fiches de séances, progression d’ateliers, répartition de rôles en grand groupe et consignes claires.',
    programs: [
      {
        id: 'prog-decouverte',
        title: 'Parcours Découverte (30 min)',
        rubrique: 'Pédagogie',
        level: 'Enfants / Tout public',
        provenance: 'Ateliers CD-ROM & EAC (restructuration)',
        status: 'intégré',
        description: 'Initiation à l’écoute active et au toucher des matières : 1 jeu d’écoute aveugle, 1 exploration libre, 1 ambiance finale.'
      },
      {
        id: 'prog-atelier-collectif',
        title: 'Parcours Grand Groupe (45 min)',
        rubrique: 'Pédagogie',
        level: 'Scolaire / Atelier (jusqu’à 30 participants)',
        provenance: 'Ateliers CD-ROM & EAC (restructuration)',
        status: 'intégré',
        description: 'Chaque participant a un rôle sonore défini (cue, geste, variation) avec son objet attitré.'
      }
    ]
  },
  voix: {
    id: 'voix',
    title: 'Voix & écoute vocale',
    icon: '🎙️',
    description: 'Création d’étiquettes à la voix, consignes parlées, mémos sonores et jeux d’oreille vocaux.',
    modules: [
      {
        id: 'voix-label-creator',
        title: 'Création vocale d’étiquettes',
        rubrique: 'Voix',
        level: 'Opérationnel terrain',
        provenance: 'MISES! Assistant vocal natif',
        status: 'intégré',
        description: 'Dicter en français le nom, les mots-clefs, l’emplacement et le statut SPARE pour générer une étiquette QR.'
      },
      {
        id: 'voix-audio-memo',
        title: 'Mémo sonore sur fiche',
        rubrique: 'Voix',
        level: 'Opérationnel terrain',
        provenance: 'MISES! Enregistrement microphone',
        status: 'intégré',
        description: 'Associer un exemple sonore enregistré au micro directement à une fiche d’objet pour la réécoute rapide.'
      },
      {
        id: 'voix-jeu-imitation',
        title: 'Jeu d’imitation vocale',
        rubrique: 'Voix',
        level: 'Tous niveaux',
        provenance: 'Ateliers vocaux CD-ROM (réinterprétation)',
        status: 'intégré',
        description: 'Imiter à la voix un bruitage acoustique avant de chercher l’accessoire correspondant.'
      }
    ]
  }
}

/**
 * Génère le HTML de l'espace pédagogique unifié
 */
export function renderPedagogySpacesHtml(activeSpace = 'atelier', esc = s => s) {
  const current = PEDAGOGY_SPACES[activeSpace] || PEDAGOGY_SPACES.atelier

  return `
    <div class="pedagogyHub">
      <div class="dialoghead">
        <div>
          <b>${esc(current.title)}</b>
          <small>${esc(current.description)}</small>
        </div>
        <button type="button" class="ghost" data-pedagogy-close>×</button>
      </div>

      <nav class="pedagogyTabs" aria-label="Espaces pédagogiques">
        ${Object.values(PEDAGOGY_SPACES).map(s => `
          <button type="button" class="pedTabBtn ${s.id === current.id ? 'active' : ''}" data-ped-tab="${esc(s.id)}">
            ${s.icon} ${esc(s.title.split(' ')[0])}
          </button>
        `).join('')}
      </nav>

      <div class="pedagogyContent">
        ${renderSpaceBody(current, esc)}
      </div>
    </div>
  `
}

function renderSpaceBody(space, esc) {
  if (space.id === 'atelier') {
    return `
      <div class="cards pedCards">
        ${space.activities.map(a => `
          <article class="card pedCard">
            <div class="knotHead">
              <b>${esc(a.title)}</b>
              <span class="badge ${a.level === 'Débutant' ? 'badgeEasy' : 'badgeMedium'}">${esc(a.level)}</span>
            </div>
            <p class="knotSubtitle">${esc(a.subtitle)}</p>
            <p class="hint">${esc(a.description)}</p>
            ${a.targetEquipment ? `<small class="knotMeta">Matériel lié : ${esc(a.targetEquipment.join(', '))}</small>` : ''}
            ${a.steps ? `
              <details class="knotDetails">
                <summary>Étapes de manipulation</summary>
                <ol class="knotSteps">${a.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
                ${a.tips ? `<p class="knotTip">💡 <em>${esc(a.tips)}</em></p>` : ''}
              </details>
            ` : ''}
            <small class="provenanceTag">Provenance : ${esc(a.provenance)} · <em>${esc(a.status)}</em></small>
          </article>
        `).join('')}
      </div>
    `
  }

  if (space.id === 'jeux') {
    return `
      <div class="cards pedCards">
        ${space.games.map(g => `
          <article class="card pedCard">
            <div class="knotHead">
              <b>Jeu ${esc(g.code)} · ${esc(g.title)}</b>
              <span class="badge badgeMedium">${esc(g.level)}</span>
            </div>
            <p>${esc(g.description)}</p>
            <small class="knotMeta">Mécanique : ${esc(GAME_TYPES[g.code]?.needs || 'inventaire réel')}</small>
            <div class="row" style="margin-top:.4rem">
              <button type="button" class="ghost miniActionBtn" data-launch-game="${esc(g.code)}">Lancer ce jeu</button>
            </div>
            <small class="provenanceTag">Provenance : ${esc(g.provenance)} · <em>${esc(g.status)}</em></small>
          </article>
        `).join('')}
      </div>
    `
  }

  if (space.id === 'pedagogie') {
    return `
      <div class="cards pedCards">
        ${space.programs.map(p => `
          <article class="card pedCard">
            <div class="knotHead">
              <b>${esc(p.title)}</b>
              <span class="badge badgeEasy">${esc(p.level)}</span>
            </div>
            <p>${esc(p.description)}</p>
            <div class="row" style="margin-top:.4rem">
              <button type="button" class="ghost miniActionBtn" data-launch-program="${esc(p.id)}">Ouvrir l’atelier</button>
            </div>
            <small class="provenanceTag">Provenance : ${esc(p.provenance)} · <em>${esc(p.status)}</em></small>
          </article>
        `).join('')}
      </div>
    `
  }

  if (space.id === 'voix') {
    return `
      <div class="cards pedCards">
        ${space.modules.map(m => `
          <article class="card pedCard">
            <div class="knotHead">
              <b>${esc(m.title)}</b>
              <span class="badge badgeEasy">${esc(m.level)}</span>
            </div>
            <p>${esc(m.description)}</p>
            <div class="row" style="margin-top:.4rem">
              ${m.id === 'voix-label-creator' ? '<button type="button" class="miniActionBtn" data-voice-action="label">🎙 Dicter une étiquette</button>' : ''}
              ${m.id === 'voix-audio-memo' ? '<button type="button" class="ghost miniActionBtn" data-voice-action="search">Rechercher un son</button>' : ''}
              ${m.id === 'voix-jeu-imitation' ? '<button type="button" class="ghost miniActionBtn" data-voice-action="game">Lancer le défi</button>' : ''}
            </div>
            <small class="provenanceTag">Provenance : ${esc(m.provenance)} · <em>${esc(m.status)}</em></small>
          </article>
        `).join('')}
      </div>
    `
  }

  return ''
}
