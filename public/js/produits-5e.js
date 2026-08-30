// ===================================================================
// produits-5e.js -- Les 8 fiches produit (methode 5E : Exemple,
// Explication, Enjeu, Elements cles, Etape suivante) et la bascule
// d'onglet Particuliers/Entreprises.
//
// Extrait d'index.html le 25/08/2026.
// ===================================================================

    const PRODUITS_5E = {
        auto: {
            titre: "Assurance Automobile",
            icone: "fa-car",
            image: "images_produits/auto_carte.jpg",
            imageModal: "images_produits/auto_modal.jpg",
            branche: "Auto",
            exemple: "Ahmadou roulait sur la route de Douala quand un véhicule lui a coupé la priorité. Sa voiture était hors d'usage, les réparations dépassaient 800 000 FCFA. Grâce à sa garantie Tous Risques, il n'a rien payé — et a eu un véhicule de courtoisie le temps des réparations.",
            explication: "L'assurance automobile prend en charge les conséquences financières d'un accident, d'un vol ou d'un incendie touchant votre véhicule — ou celui d'un tiers si vous en êtes responsable. Sans elle, un accrochage banal peut représenter plusieurs mois de salaire à rembourser de votre poche.",
            enjeuIntro: "Rouler sans assurance est illégal au Cameroun — mais au-delà de l'obligation, c'est votre protection financière qui est en jeu à chaque trajet.",
            couverts: ["Dommages causés à un tiers (RC, obligatoire)", "Vol et incendie du véhicule (Tiers étendu)", "Dommages à votre propre véhicule, même en tort (Tous Risques)", "Assistance dépannage 24h/24"],
            nonCouverts: ["Usure normale du véhicule", "Conduite sans permis valide", "Usage non déclaré (ex: taxi non déclaré comme tel)"],
            questions: [
                { q: "Que se passe-t-il si je change de véhicule en cours d'année ?", r: "Le contrat se transfère sur le nouveau véhicule après simple déclaration, sans repartir de zéro." },
                { q: "Le conducteur secondaire est-il couvert ?", r: "Oui, s'il est déclaré au contrat — une simple mention suffit, gratuite dans la plupart des cas." },
                { q: "L'assistance couvre-t-elle une panne loin de Yaoundé ?", r: "Oui, le remorquage jusqu'au garage le plus proche est pris en charge, partout au Cameroun." }
            ],
            formules: [
                { nom: "RC Seule", prix: "dès 35 000 FCFA/an", desc: "Minimum légal — dommages aux tiers" },
                { nom: "Tiers Étendu", prix: "dès 65 000 FCFA/an", desc: "RC + vol, incendie, bris de glace" },
                { nom: "Tous Risques", prix: "dès 120 000 FCFA/an", desc: "Protection complète, y compris vos torts" }
            ],
            etape: "Apportez votre CNI et la carte grise du véhicule — nous établissons votre devis en moins de 5 minutes, et votre attestation est délivrée sous 24h.",
        },
        sante: {
            titre: "Santé & Mutuelle Famille",
            icone: "fa-heart-pulse",
            image: "images_produits/sante_carte.jpg",
            imageModal: "images_produits/sante_modal.jpg",
            branche: "Sante",
            exemple: "La fille de Marie a dû être hospitalisée trois jours pour une crise de paludisme sévère. Grâce au tiers payant de sa mutuelle, la famille n'a rien avancé à la clinique — la facture est partie directement à l'assureur.",
            explication: "La mutuelle santé prend en charge tout ou partie de vos frais médicaux — consultations, pharmacie, hospitalisation — pour vous éviter d'avoir à choisir entre vous soigner et payer vos autres charges.",
            enjeuIntro: "Une hospitalisation imprévue peut représenter plusieurs centaines de milliers de FCFA — un choc financier que la mutuelle absorbe à votre place.",
            couverts: ["Consultations et pharmacie", "Hospitalisation et chirurgie", "Maternité et pédiatrie", "Soins dentaires et optiques (selon formule)"],
            nonCouverts: ["Maladies préexistantes non déclarées à la souscription", "Soins esthétiques non médicalement justifiés", "Chirurgie hors réseau sans accord préalable (selon formule)"],
            questions: [
                { q: "Y a-t-il un délai de carence avant d'être couvert ?", r: "Oui, généralement 30 jours pour les soins courants — 0 jour en cas d'accident." },
                { q: "Quel est le réseau d'hôpitaux partenaires ?", r: "Un réseau national de cliniques agréées pratiquant le tiers payant, dont la liste vous est remise à la souscription." },
                { q: "Puis-je résilier si je ne suis pas satisfait ?", r: "Oui, à l'échéance annuelle du contrat, avec un préavis à respecter — nous vous accompagnons dans cette démarche." }
            ],
            formules: [
                { nom: "Essentielle", prix: "dès 8 000 FCFA/mois", desc: "Consultations, pharmacie, urgences" },
                { nom: "Confort", prix: "dès 15 000 FCFA/mois", desc: "+ hospitalisation, maternité" },
                { nom: "Famille+", prix: "dès 28 000 FCFA/mois", desc: "+ dentaire, optique, jusqu'à 5 ayants droit" }
            ],
            etape: "Un conseiller évalue avec vous la formule adaptée à votre foyer — apportez les CNI des personnes à couvrir, le devis est immédiat.",
        },
        habitation: {
            titre: "Multirisque Habitation",
            icone: "fa-house",
            image: "images_produits/habitation_carte.jpg",
            imageModal: "images_produits/habitation_modal.jpg",
            branche: "Habitation",
            exemple: "Paul loue deux locaux attenants dans son immeuble de Yaoundé : un studio à un étudiant, une boutique à un commerçant. Une nuit, un tuyau mal fixé chez l'étudiant a lâché — l'eau s'est infiltrée à travers le mur mitoyen et a détruit une bonne partie du stock du boutiquier au petit matin. Les deux locataires se rejetaient la faute, et Paul se retrouvait pris entre les deux. Grâce à la Responsabilité Civile de son contrat Multirisque Habitation, son assureur a indemnisé le boutiquier directement — Paul n'a perdu ni argent, ni la relation avec ses deux locataires.",
            explication: "L'assurance habitation protège votre logement et son contenu contre les grands risques du quotidien : incendie, dégât des eaux, vol. Elle couvre aussi ce que vous pourriez, sans le vouloir, causer à un voisin.",
            enjeuIntro: "Un sinistre domestique arrive sans prévenir — la question n'est jamais 'si', mais 'quand', et l'assurance transforme un drame financier en simple formalité.",
            couverts: ["Incendie et explosion", "Dégât des eaux", "Vol avec effraction", "RC Vie Privée (dommages causés à un tiers)"],
            nonCouverts: ["Usure normale, moisissures liées à un défaut d'entretien", "Objets de valeur non déclarés spécifiquement", "Logement inoccupé plus de 90 jours sans déclaration"],
            questions: [
                { q: "Suis-je couvert si je suis locataire ?", r: "Oui, une formule locataire existe, généralement moins chère que celle du propriétaire." },
                { q: "Le contenu est-il couvert, ou juste les murs ?", r: "Les deux — le contenu peut être assuré à hauteur d'un capital que vous choisissez à la souscription." },
                { q: "Un cambriolage sans trace d'effraction visible, ça compte ?", r: "Une déclaration à la police reste nécessaire — le contrat précise les conditions exactes de prise en charge." }
            ],
            formules: [
                { nom: "Locataire", prix: "dès 25 000 FCFA/an", desc: "RC vie privée + contenu essentiel" },
                { nom: "Propriétaire", prix: "dès 45 000 FCFA/an", desc: "Murs + contenu + RC" },
                { nom: "Tous Risques Habitation", prix: "dès 80 000 FCFA/an", desc: "Protection maximale, capital élevé" }
            ],
            etape: "Une simple estimation de la valeur de votre logement et de son contenu suffit pour démarrer — devis en 5 minutes.",
        },
        voyage: {
            titre: "Voyage & Évacuation",
            icone: "fa-plane-departure",
            image: "images_produits/voyage_carte.jpg",
            imageModal: "images_produits/voyage_modal.jpg",
            branche: "Sante",
            exemple: "En déplacement professionnel à Paris, Sophie a dû être hospitalisée en urgence pour une appendicite. Sans son assurance voyage, la facture aurait dépassé 2 millions de FCFA — elle n'a rien payé, tout est passé par l'assureur.",
            explication: "L'assurance voyage couvre vos frais médicaux à l'étranger et organise, si nécessaire, votre retour au Cameroun en cas d'urgence — un système de santé étranger peut coûter très cher pour un non-résident sans couverture.",
            enjeuIntro: "Pour un visa, c'est souvent une pièce obligatoire — mais au-delà de la formalité, c'est une vraie protection si l'imprévu survient loin de chez vous.",
            couverts: ["Frais médicaux d'urgence à l'étranger", "Rapatriement sanitaire", "Bagages perdus ou retardés", "Attestation conforme aux exigences consulaires"],
            nonCouverts: ["Affection déjà connue avant le départ", "Sports extrêmes non déclarés", "Séjour dépassant la durée assurée"],
            questions: [
                { q: "L'attestation est-elle acceptée par toutes les ambassades ?", r: "Elle respecte les exigences standard Schengen et la plupart des autres destinations — à confirmer selon le pays visé." },
                { q: "Combien de temps avant le départ dois-je souscrire ?", r: "L'attestation peut être délivrée en 24h, mais mieux vaut prévoir quelques jours avant le dépôt du dossier de visa." },
                { q: "Le rapatriement est-il pris en charge à 100% ?", r: "Oui, dans les conditions du contrat — organisation et coût du retour sanitaire sont couverts." }
            ],
            formules: [
                { nom: "Schengen Standard", prix: "dès 15 000 FCFA", desc: "Couverture visa, durée courte" },
                { nom: "Voyage Confort", prix: "dès 28 000 FCFA", desc: "+ bagages, plafond médical élevé" },
                { nom: "Longue Durée", prix: "dès 45 000 FCFA", desc: "Séjours prolongés, études à l'étranger" }
            ],
            etape: "Indiquez simplement votre destination et vos dates de voyage — votre attestation est prête sous 24h.",
        },
        flottes: {
            titre: "Flottes de Véhicules",
            icone: "fa-truck-front",
            image: "images_produits/flottes_carte.jpg",
            imageModal: "images_produits/flottes_modal.jpg",
            branche: "Auto",
            exemple: "Un des dix camions d'une PME de transport à Douala est tombé en panne moteur en pleine période de forte demande de fin d'année — le pire moment pour annuler des livraisons déjà engagées. Parce que l'entreprise avait choisi la formule Tous Risques de son contrat flotte (pas la simple RC au tiers, qui ne l'aurait pas couverte), la garantie Véhicule de Remplacement a joué : un camion de courtoisie livré sous 48h, le temps de la réparation — sans perdre un seul client, ni un seul jour de chiffre d'affaires.",
            explication: "Une assurance flotte couvre l'ensemble de vos véhicules professionnels sous un seul contrat, plutôt qu'une police séparée par véhicule — plus simple à gérer, et souvent plus avantageux financièrement.",
            enjeuIntro: "Un parc automobile immobilisé, c'est une activité à l'arrêt — la bonne couverture transforme un incident isolé en simple contretemps géré.",
            couverts: ["Tous les véhicules du parc sous un contrat unique", "Véhicules de remplacement en cas d'immobilisation", "Tarification ajustée à la sinistralité réelle", "Gestion administrative centralisée"],
            nonCouverts: ["Véhicules non déclarés au contrat", "Usage non conforme à la déclaration initiale", "Défaut d'entretien avéré"],
            questions: [
                { q: "Puis-je ajouter ou retirer un véhicule en cours d'année ?", r: "Oui, un simple avenant au contrat suffit, sans attendre l'échéance annuelle." },
                { q: "La prime baisse-t-elle si notre sinistralité est faible ?", r: "Oui, c'est l'un des principaux avantages du contrat flotte — la tarification s'ajuste à votre historique réel." },
                { q: "Un seul interlocuteur gère-t-il tout le parc ?", r: "Oui, un conseiller dédié suit l'ensemble de votre flotte, du premier devis à la gestion des sinistres." }
            ],
            formules: [
                { nom: "Flotte Légère", prix: "dès 300 000 FCFA/an", desc: "Jusqu'à 10 motos/triporteurs" },
                { nom: "PME (5-15 véhicules)", prix: "sur devis personnalisé", desc: "Tarification groupée" },
                { nom: "Grande flotte (15+ véhicules)", prix: "sur devis personnalisé", desc: "Conditions négociées" }
            ],
            etape: "Un audit gratuit de votre parc actuel nous permet de vous proposer une tarification précise — contactez-nous avec la liste de vos véhicules.",
        },
        rc: {
            titre: "Responsabilité Civile Professionnelle",
            icone: "fa-briefcase",
            image: "images_produits/rc_carte.jpg",
            imageModal: "images_produits/rc_modal.jpg",
            branche: "Habitation",
            exemple: "Un client a glissé dans les locaux d'une PME de conseil à Yaoundé et menaçait une action en justice pour plusieurs millions de FCFA. Dès la déclaration du sinistre, Mutuelle Pro Assurances a mobilisé son réseau de cabinets d'avocats partenaires pour prendre en charge la défense de l'entreprise, sans attendre que la procédure ne s'enlise. Résultat : un accord trouvé à l'amiable en quelques semaines, entièrement pris en charge par la RC Professionnelle — l'entreprise n'a jamais eu à gérer seule ni le stress, ni les frais d'un contentieux.",
            explication: "La Responsabilité Civile Professionnelle couvre les conséquences financières d'un dommage que votre activité causerait à un tiers — client, fournisseur, visiteur — par une erreur, un accident, ou un défaut de conseil.",
            enjeuIntro: "Une seule réclamation non couverte peut représenter plusieurs mois, voire années, de résultat pour une PME — la RC Pro est souvent la garantie la plus sous-estimée, jusqu'au jour où elle devient nécessaire.",
            couverts: ["Dommages corporels causés à un tiers dans le cadre de l'activité", "Dommages matériels ou immatériels", "Erreurs de conseil ou de prestation", "Défense par nos cabinets d'avocats partenaires, dès la déclaration"],
            nonCouverts: ["Fautes intentionnelles", "Dommages à vos propres biens (voir Multirisque Pro)", "Activités non déclarées à la souscription"],
            questions: [
                { q: "La RC couvre-t-elle mes employés en cas de faute ?", r: "Oui, dans le cadre de leurs fonctions et sous votre responsabilité d'employeur." },
                { q: "Suis-je couvert si le litige va jusqu'au tribunal ?", r: "Oui, la protection juridique incluse prend en charge les frais de défense." },
                { q: "Le montant de couverture est-il suffisant pour mon secteur ?", r: "Le plafond se choisit selon votre activité et votre exposition au risque — nous vous conseillons le bon niveau." }
            ],
            formules: [
                { nom: "RC Exploitation", prix: "dès 150 000 FCFA/an", desc: "Activité courante" },
                { nom: "RC Professionnelle/Conseil", prix: "dès 250 000 FCFA/an", desc: "Métiers de conseil et service" },
                { nom: "RC Étendue", prix: "sur devis", desc: "Secteurs à risque élevé" }
            ],
            etape: "Décrivez-nous votre activité — nous identifions ensemble les risques réels et le bon niveau de couverture.",
        },
        santeGroupe: {
            titre: "Santé & Prévoyance Groupe",
            icone: "fa-users-gear",
            image: "images_produits/santeGroupe_carte.jpg",
            imageModal: "images_produits/santeGroupe_modal.jpg",
            branche: "Sante",
            exemple: "M. Kamga, chef d'une entreprise à Douala, voyait d'un mauvais œil la mise en place d'une mutuelle de santé groupe — un coût de plus, pensait-il, pour un bénéfice difficile à chiffrer. Depuis que son entreprise a souscrit chez Mutuelle Pro Assurances, deux choses l'ont fait changer d'avis : son meilleur technicien, courtisé par un concurrent, a choisi de rester — « la mutuelle de mes enfants, je ne la lâche pas », lui a-t-il confié. Et quand la fille de sa comptable a été hospitalisée en urgence, la prise en charge s'est faite sans qu'elle n'avance un seul FCFA. Aujourd'hui, c'est M. Kamga lui-même qui présente la mutuelle aux nouvelles recrues, en argument de poids.",
            explication: "La Santé & Prévoyance Groupe couvre l'ensemble de vos collaborateurs (et souvent leurs familles) sous un contrat collectif — un vrai avantage social, et souvent plus abordable qu'une couverture individuelle.",
            enjeuIntro: "Dans un marché de l'emploi compétitif, une bonne couverture santé est devenue un critère de choix — et de fidélisation — aussi important que le salaire pour beaucoup de candidats.",
            couverts: ["Consultations, pharmacie, hospitalisation des employés", "Extension possible aux familles", "Tiers payant national", "Garantie décès/invalidité (volet Prévoyance)"],
            nonCouverts: ["Employés non déclarés à l'effectif assuré", "Pathologies exclues au contrat collectif", "Anciens employés (sauf portabilité prévue)"],
            questions: [
                { q: "Tous les employés doivent-ils être inclus ?", r: "En général, l'ensemble de l'effectif éligible est inclus — c'est ce qui permet une tarification groupe avantageuse." },
                { q: "Que se passe-t-il en cas de départ d'un employé ?", r: "Sa couverture s'arrête à la date de sortie, sauf disposition de portabilité prévue au contrat." },
                { q: "Les familles peuvent-elles être ajoutées ?", r: "Oui, en option, généralement avec une participation employé/employeur à définir ensemble." }
            ],
            formules: [
                { nom: "Groupe Essentiel", prix: "dès 6 000 FCFA/employé/mois", desc: "Soins courants" },
                { nom: "Groupe Confort", prix: "dès 12 000 FCFA/employé/mois", desc: "+ hospitalisation, familles en option" },
                { nom: "Groupe Premium", prix: "dès 20 000 FCFA/employé/mois", desc: "+ dentaire, optique, prévoyance renforcée" }
            ],
            etape: "Communiquez-nous la taille de votre effectif — nous construisons une proposition sur mesure sous 48h.",
        },
        multirisquePro: {
            titre: "Multirisque Professionnelle",
            icone: "fa-warehouse",
            image: "images_produits/multirisquePro_carte.jpg",
            imageModal: "images_produits/multirisquePro_modal.jpg",
            branche: "Autres",
            branchePersonnalisee: "Multirisque Pro",
            brancheI18nKey: "MultirisquePro",
            exemple: "Un incendie dans l'entrepôt d'un grossiste a détruit une partie importante du stock. Au-delà des marchandises, l'assurance a compensé la perte de chiffre d'affaires pendant les trois mois de remise en état — sans quoi l'entreprise aurait pu ne jamais rouvrir.",
            explication: "La Multirisque Professionnelle protège vos locaux, votre stock et votre matériel contre les grands sinistres (incendie, vol), et va plus loin avec la garantie Pertes d'Exploitation, qui compense la perte de revenus pendant l'interruption d'activité.",
            enjeuIntro: "Beaucoup d'entreprises assurent leurs biens matériels, mais oublient que c'est souvent l'arrêt d'activité qui coûte le plus cher — pas seulement les dégâts eux-mêmes.",
            couverts: ["Incendie et risques annexes", "Vol de marchandises et de matériel", "Pertes d'exploitation suite à un sinistre couvert", "Bris de machine (selon formule)"],
            nonCouverts: ["Stock non déclaré à sa valeur réelle", "Vétusté du matériel non entretenu", "Interruption d'activité non liée à un sinistre couvert"],
            questions: [
                { q: "La perte d'exploitation, ça couvre quoi exactement ?", r: "La marge/le chiffre d'affaires que vous auriez normalement réalisé pendant l'arrêt forcé, dans la limite prévue au contrat." },
                { q: "Dois-je réévaluer mon stock chaque année ?", r: "C'est fortement recommandé — un stock sous-évalué peut réduire votre indemnisation en cas de sinistre." },
                { q: "Le matériel en leasing est-il couvert ?", r: "Oui, généralement, mais à déclarer spécifiquement au contrat." }
            ],
            formules: [
                { nom: "Local Simple", prix: "dès 100 000 FCFA/an", desc: "Petit local, stock limité" },
                { nom: "Commerce/Entrepôt", prix: "dès 250 000 FCFA/an", desc: "+ pertes d'exploitation" },
                { nom: "Industrielle", prix: "sur devis", desc: "Sites de production, machines" }
            ],
            etape: "Une visite ou un descriptif détaillé de vos locaux nous permet d'établir une proposition précise sous 48h.",
        },
    };


    // Ouvre la fiche détaillée "méthode 5E" d'un des 8 produits (contenu
    // partagé, rempli dynamiquement depuis PRODUITS_5E).
    function openProduitModal(cle) {
        const p = PRODUITS_5E[cle];
        if (!p) return;

        document.getElementById('produit-titre').textContent = p.titre;
        document.getElementById('produit-icone-titre').innerHTML = `<i class="fa-solid ${p.icone}"></i>`;
        const imgEl = document.getElementById('produit-image');
        if (imgEl) {
            imgEl.src = p.imageModal || p.image || '';
            imgEl.alt = p.titre;
            imgEl.style.aspectRatio = '600/657'; // ratio unique, identique aux 8 cartes
        }
        document.getElementById('produit-exemple').textContent = p.exemple;
        document.getElementById('produit-explication').textContent = p.explication;
        document.getElementById('produit-enjeu-intro').textContent = p.enjeuIntro;

        document.getElementById('produit-couverts').innerHTML = p.couverts
            .map((c) => `<li class="flex items-start gap-1.5"><i class="fa-solid fa-check text-emerald-500 mt-0.5 text-[10px]"></i><span>${c}</span></li>`).join('');
        document.getElementById('produit-non-couverts').innerHTML = p.nonCouverts
            .map((c) => `<li class="flex items-start gap-1.5"><i class="fa-solid fa-xmark text-red-400 mt-0.5 text-[10px]"></i><span>${c}</span></li>`).join('');

        document.getElementById('produit-questions').innerHTML = p.questions.map((qa) => `
            <div>
                <p class="text-xs font-bold text-gray-700">${qa.q}</p>
                <p class="text-xs text-gray-500">${qa.r}</p>
            </div>
        `).join('');

        document.getElementById('produit-formules').innerHTML = p.formules.map((f) => `
            <div class="bg-slate-50 border border-gray-200 rounded-xl p-3 text-center">
                <div class="text-xs font-extrabold text-navy mb-0.5">${f.nom}</div>
                <div class="text-[11px] font-bold text-brandPurple mb-1">${f.prix}</div>
                <div class="text-[10px] text-gray-500 leading-snug">${f.desc}</div>
            </div>
        `).join('');

        document.getElementById('produit-etape').textContent = p.etape;

        const ctaBtn = document.getElementById('produit-cta-btn');
        ctaBtn.onclick = () => {
            closeProduitModal();
            if (p.branchePersonnalisee) {
                selectDevisRisk(p.branche, p.branchePersonnalisee, p.brancheI18nKey);
            } else {
                selectDevisRisk(p.branche);
            }
            document.getElementById('devis')?.scrollIntoView({ behavior: 'smooth' });
            openDevisModal();
        };

        document.getElementById('produitModal').classList.remove('hidden');
    }


    // Ferme la fiche détaillée sans action.
    function closeProduitModal() {
        document.getElementById('produitModal').classList.add('hidden');
    }

    // Compagnies partenaires — logos fournis par Roger le 13/08/2026.
    // Atlantique Assurances Cameroun a changé de nom pour AFG Assurances
    // Cameroun (mis à jour). Samiris Insurance Company et Alpha Assurances
    // SA retirées de la liste (décision du 13/08/2026).
    // Chargées depuis site.partenaires_assurance via /api/listes-reference
    // (décidé le 15/08/2026 : configuration pilotable par l'administrateur
    // du site -- ajout d'une compagnie, actif/inactif, poids d'apparition --
    // sans jamais avoir à modifier ce fichier). Remplie par loadListesReference().

    function switchTab(tab) {
        const partBtn = document.getElementById('tab-particuliers-btn');
        const entBtn = document.getElementById('tab-entreprises-btn');
        const partContent = document.getElementById('tab-particuliers');
        const entContent = document.getElementById('tab-entreprises');
        const inviteBtnPart = document.getElementById('invite-btn-particuliers');
        const inviteBtnEnt = document.getElementById('invite-btn-entreprises');

        // Le bouton du bandeau qui reçoit la mise en avant est celui de
        // l'onglet PAS encore consulté -- l'action naturelle à proposer.
        const MIS_EN_AVANT = "inline-flex items-center gap-2 font-bold text-xs px-5 py-2.5 rounded-xl transition bg-navy hover:bg-purple-900 text-white shadow-md";
        const SECONDAIRE = "inline-flex items-center gap-2 font-bold text-xs px-5 py-2.5 rounded-xl transition bg-gray-100 hover:bg-gray-200 text-navy";

        if (tab === 'particuliers') {
            partBtn.className = "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 bg-white text-navy shadow-md";
            entBtn.className = "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 text-gray-600 hover:text-navy";
            partContent.classList.remove('hidden');
            entContent.classList.add('hidden');
            if (inviteBtnPart) inviteBtnPart.className = SECONDAIRE;
            if (inviteBtnEnt) inviteBtnEnt.className = MIS_EN_AVANT;
        } else {
            entBtn.className = "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 bg-white text-navy shadow-md";
            partBtn.className = "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 text-gray-600 hover:text-navy";
            entContent.classList.remove('hidden');
            partContent.classList.add('hidden');
            if (inviteBtnEnt) inviteBtnEnt.className = SECONDAIRE;
            if (inviteBtnPart) inviteBtnPart.className = MIS_EN_AVANT;
        }
    }

