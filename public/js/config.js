    // -----------------------------------------------------------------
    // ESCORTE DE LA BULLE WHATSAPP — sur la section "Assistant IA", la
    // bulle flottante quitte sa place habituelle pour rejoindre le coin
    // supérieur droit du bouton "En attendant, nous vous répondons !",
    // et l'accompagne tant qu'il reste visible à l'écran. Dès qu'il sort
    // de la page (ou si la place manque pour afficher la bulle en
    // entier), elle reprend sa position par défaut.
    // -----------------------------------------------------------------
    // -----------------------------------------------------------------
    // DIAPORAMA DU HERO — fondu enchaîné automatique entre les 6 images
    // de fond. Une seule image visible à la fois (opacity-100), les
    // autres à 0 — la transition CSS (2s) fait le fondu.
    // -----------------------------------------------------------------
    // -----------------------------------------------------------------
    // BANDEAU COOKIES — Google Analytics n'est chargé qu'après un
    // consentement explicite, jamais par défaut. Le choix (accepté ou
    // refusé) est mémorisé dans localStorage, pour ne plus jamais
    // redemander à un visiteur qui a déjà répondu.
    // -----------------------------------------------------------------
    const COOKIE_CONSENT_KEY = 'mpro_cookie_consent'; // 'accepted' | 'refused'

    // Limites RÉELLES depuis la migration vers Nodemailer (serveur SMTP LWS) :
    // - MAX_FILE_SIZE_MB : plafond dur par fichier, doit correspondre exactement
    //   à la limite "multer" configurée côté serveur (voir server.js) — sinon
    //   un fichier accepté ici serait rejeté silencieusement à l'envoi.
    // - TOTAL_SIZE_WARNING_MB : simple avertissement (pas un blocage), les
    //   serveurs SMTP plafonnant souvent la taille totale d'un message autour
    //   de 20-25 Mo, tous fichiers confondus.
    const MAX_FILE_SIZE_MB = 15;
    const TOTAL_SIZE_WARNING_MB = 20;

    // -----------------------------------------------------------------
    // RÉMANENCE DU FORMULAIRE (localStorage)
    // Les utilisateurs sont souvent indécis, y compris après plusieurs
    // soumissions : le contenu du formulaire est donc sauvegardé en
    // continu et restauré automatiquement, sans être effacé après envoi.
    // -----------------------------------------------------------------
    const DRAFT_STORAGE_KEY = 'mutuellepro_devis_draft';

    // -----------------------------------------------------------------
    // CONTENU "EN SAVOIR PLUS" — méthode 5E (Exemple, Explication, Enjeu,
    // Éléments clés, Étape suivante), un objet par produit.
    //
    // IMPORTANT — sur les prix (formules) : ce sont des valeurs INDICATIVES
    // de départ, à ajuster par Roger. Structurées ici en JS en attendant
    // la construction du tableau de bord d'administration (chantier
    // "Back-office" déjà identifié) qui permettra de les piloter depuis
    // une vraie table PostgreSQL, comme les autres listes du site — sans
    // avoir besoin de retoucher ce fichier à chaque changement de tarif.
    // -----------------------------------------------------------------
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

    function loadGoogleAnalytics() {
        if (document.getElementById('ga-script')) return; // déjà chargé, jamais deux fois
        const script = document.createElement('script');
        script.id = 'ga-script';
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-J2V65EGLTT';
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag(){ window.dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'G-J2V65EGLTT');
    }

    function handleCookieChoice(accepted) {
        localStorage.setItem(COOKIE_CONSENT_KEY, accepted ? 'accepted' : 'refused');
        document.getElementById('cookie-banner')?.classList.add('hidden');
        if (accepted) loadGoogleAnalytics();
    }

    function initCookieConsent() {
        const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (stored === 'accepted') {
            loadGoogleAnalytics();
        } else if (stored === 'refused') {
            // Rien à faire — choix déjà connu et respecté, bandeau reste caché.
        } else {
            // Jamais répondu : on affiche le bandeau.
            document.getElementById('cookie-banner')?.classList.remove('hidden');
        }
    }

    function installPWA() {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.finally(() => {
            deferredInstallPrompt = null;
            const btn = document.getElementById('pwa-install-btn');
            if (btn) btn.style.display = 'none';
        });
    }

    const SINISTRE_I18N = {
        fr: {
            locale: 'fr-FR',
            champsManquants: 'Merci de renseigner tous les champs obligatoires.',
            waTitle: '🚨✨ *DÉCLARATION DE SINISTRE* — MutuellePro ✨🚨',
            waRef: '🆔 Réf. :', waBranche: '📁 Branche :', waPolice: '📋 N° de police :',
            waDate: '📅 Date du sinistre :', waDesc: '📝 Description :',
            waClient: '👤 *DÉCLARANT*', waPhone: '📞',
            waFooter: '✅ Merci d\'accuser réception dès que possible. Cette référence permet le suivi de votre dossier.',
            emailSubject: 'Déclaration de sinistre',
            emailIntro: 'Nouvelle déclaration de sinistre reçue via le site.',
            successMsg: (ref) => `Déclaration envoyée — référence ${ref}. Conservez ce numéro, il permettra le suivi de votre dossier.`,
            errorMsg: 'La déclaration WhatsApp a bien été préparée, mais l\'envoi de l\'e-mail a échoué. Votre référence reste valable : ',
        },
        en: {
            locale: 'en-US',
            champsManquants: 'Please fill in all required fields.',
            waTitle: '🚨✨ *CLAIM DECLARATION* — MutuellePro ✨🚨',
            waRef: '🆔 Ref.:', waBranche: '📁 Branch:', waPolice: '📋 Policy No.:',
            waDate: '📅 Date of incident:', waDesc: '📝 Description:',
            waClient: '👤 *DECLARANT*', waPhone: '📞',
            waFooter: '✅ Please confirm receipt as soon as possible. This reference allows tracking of your case.',
            emailSubject: 'Claim Declaration',
            emailIntro: 'New claim declaration received via the website.',
            successMsg: (ref) => `Declaration sent — reference ${ref}. Keep this number, it will allow tracking of your case.`,
            errorMsg: 'The WhatsApp declaration was prepared successfully, but sending the email failed. Your reference remains valid: ',
        },
    };
    // -----------------------------------------------------------------
    // Envoi de la demande de cotation par WhatsApp à l'agence la plus proche
    // (déterminée via resolveNearestAgencyForQuote), avec repli automatique
    // sur le siège si la géolocalisation échoue ou est refusée.
    //
    // Présenté comme un mémo — clair, structuré, mais volontairement FUN
    // (émoticônes) plutôt qu'austère : c'est le premier tour d'une
    // conversation, pas un export de données. Le destinataire est nommé
    // explicitement (le numéro WhatsApp d'une agence peut être réaffecté),
    // et deux questions concrètes sont posées pour amorcer un vrai échange
    // plutôt qu'un message qui reste sans réponse.
    // -----------------------------------------------------------------
    // -----------------------------------------------------------------
    // TEXTES FIXES DU MÉMO (WhatsApp + email) — bilingue, ajouté le
    // 13/08/2026. Séparé du dictionnaire `translations` général (qui
    // gère l'affichage du site) car ce contenu est généré dynamiquement
    // dans des chaînes JS, pas posé directement dans le HTML.
    // Principe rappelé par Roger : le mémo suit la langue choisie par le
    // VISITEUR sur le site (currentLang) — le rédacteur doit comprendre
    // ce qu'il envoie, le destinataire est libre de répondre dans la
    // langue de son interlocuteur.
    // -----------------------------------------------------------------
    const MEMO_I18N = {
        fr: {
            locale: 'fr-FR',
            greetingMorning: 'Bonjour', greetingEvening: 'Bonsoir',
            defaultInsurance: 'assurance', defaultInsuranceCap: 'Assurance', defaultName: 'un client',
            waTitle: '📄✨ *MÉMO DE COTATION* — MutuellePro ✨📄',
            waRef: '🆔 Réf. :', waFor: '📍 Pour :',
            waIntro: (greeting, branche) => `${greeting} 👋 Voici ma demande de devis *${branche}* — tout est ci-dessous pour éviter les allers-retours 😊`,
            waClient: '👤 *CLIENT*',
            waDetails: '🔎 *DÉTAILS DU RISQUE*', waNotes: '📝 *NOTES*',
            waDocsTitle: '📎 *PIÈCES À JOINDRE DANS CETTE CONVERSATION*',
            waDocsHint: '_(à joindre juste après ce message, WhatsApp ne permet pas l\'envoi automatique)_',
            waAskQuality: '❓ Pouvez-vous me confirmer si les pièces jointes sont de bonne qualité et exploitables ?',
            waAskAck: '✅ Merci d\'accuser réception de ce message dès que possible 🙏',
            waArchived: (ref) => `📌 Ce mémo (Réf. ${ref}) est archivé de mon côté — je reste disponible pour la suite !`,
            memoTitlePrefix: 'MÉMO - DEMANDE COTATION -',
            introWithVin: (branche, vin) => `Bien vouloir recevoir ma demande de devis ${branche} pour mon véhicule immatriculé ${vin}.`,
            introSansVin: (branche) => `Bien vouloir recevoir ma demande de devis ${branche}.`,
            from: 'De :', to: 'À : MutuellePro Assurance –', date: 'Date :', ref: 'Référence :',
            objet: 'Objet : Demande de cotation', risque: 'Risque :',
            greeting: 'Bonjour,', detailsBelow: 'Pour les détails, tout est ci-dessous.',
            clientSection: '--- CLIENT ---', nom: 'Nom :', tel: 'Téléphone :', branche: 'Branche :',
            detailsSection: '--- DÉTAILS DU RISQUE ---', notesSection: '--- NOTES ---',
            docsSection: '--- PIÈCES JUSTIFICATIVES ---', noDocs: 'Aucune pièce sélectionnée.',
            autoGenerated: (ref) => `Document généré automatiquement par mutuellepro.cm — Réf. ${ref}`,
            archiveClient: 'Client', archiveDetails: 'Détails du risque', archiveNotes: 'Notes',
            archiveDocs: 'Pièces justificatives', archiveNoDocs: 'Aucune pièce jointe sélectionnée au moment de l\'archivage.',
            archiveFooter: 'Document généré automatiquement par mutuellepro.cm — à conserver comme trace de votre demande.',
            archiveFooter2: 'Ce mémo ne remplace pas une confirmation officielle de l\'agence.',
            archivePrint: '🖨️ Imprimer / Enregistrer en PDF',
            tableFrom: 'De', tableTo: 'À', tableDate: 'Date', tableRef: 'Référence', tableObjet: 'Objet', tableRisque: 'Risque',
            tableObjetValue: 'Demande de cotation',
        },
        en: {
            locale: 'en-US',
            greetingMorning: 'Good morning', greetingEvening: 'Good evening',
            defaultInsurance: 'insurance', defaultInsuranceCap: 'Insurance', defaultName: 'a client',
            waTitle: '📄✨ *QUOTE REQUEST MEMO* — MutuellePro ✨📄',
            waRef: '🆔 Ref.:', waFor: '📍 For:',
            waIntro: (greeting, branche) => `${greeting} 👋 Here is my *${branche}* quote request — everything is below to avoid back-and-forth 😊`,
            waClient: '👤 *CLIENT*',
            waDetails: '🔎 *RISK DETAILS*', waNotes: '📝 *NOTES*',
            waDocsTitle: '📎 *DOCUMENTS TO ATTACH IN THIS CONVERSATION*',
            waDocsHint: '_(to attach right after this message — WhatsApp does not support automatic sending)_',
            waAskQuality: '❓ Could you confirm the attached documents are clear and usable?',
            waAskAck: '✅ Please confirm receipt of this message as soon as possible 🙏',
            waArchived: (ref) => `📌 This memo (Ref. ${ref}) is archived on my end — I remain available for next steps!`,
            memoTitlePrefix: 'MEMO - QUOTE REQUEST -',
            introWithVin: (branche, vin) => `Please find my ${branche} quote request for my vehicle registered ${vin}.`,
            introSansVin: (branche) => `Please find my ${branche} quote request.`,
            from: 'From:', to: 'To: MutuellePro Assurance –', date: 'Date:', ref: 'Reference:',
            objet: 'Subject: Quote Request', risque: 'Risk:',
            greeting: 'Hello,', detailsBelow: 'Details are below.',
            clientSection: '--- CLIENT ---', nom: 'Name:', tel: 'Phone:', branche: 'Branch:',
            detailsSection: '--- RISK DETAILS ---', notesSection: '--- NOTES ---',
            docsSection: '--- SUPPORTING DOCUMENTS ---', noDocs: 'No documents selected.',
            autoGenerated: (ref) => `Document automatically generated by mutuellepro.cm — Ref. ${ref}`,
            archiveClient: 'Client', archiveDetails: 'Risk Details', archiveNotes: 'Notes',
            archiveDocs: 'Supporting Documents', archiveNoDocs: 'No documents were selected at the time of archiving.',
            archiveFooter: 'Document automatically generated by mutuellepro.cm — keep this as a record of your request.',
            archiveFooter2: 'This memo does not replace an official confirmation from the agency.',
            archivePrint: '🖨️ Print / Save as PDF',
            tableFrom: 'From', tableTo: 'To', tableDate: 'Date', tableRef: 'Reference', tableObjet: 'Subject', tableRisque: 'Risk',
            tableObjetValue: 'Quote Request',
        },
    };
    // -----------------------------------------------------------------
    // TABLE DE ROUTAGE — formulaire de contact, par sujet précis. Chaque
    // entrée : destinataire principal (to) + copie(s) (cc). Construite
    // avec Roger le 04/08/2026, sur la base des boîtes email réellement
    // créées (contact@, devis@, direction@, production@, sinistres@,
    // comptablite@).
    // -----------------------------------------------------------------
    const CONTACT_ROUTING = {
        '1':  { to: 'devis@mutuelleproassurances.com',       cc: ['direction@mutuelleproassurances.com'] },
        '2':  { to: 'production@mutuelleproassurances.com',  cc: ['direction@mutuelleproassurances.com'] },
        '3':  { to: 'contact@mutuelleproassurances.com',     cc: ['direction@mutuelleproassurances.com', 'production@mutuelleproassurances.com'] },
        '4':  { to: 'sinistres@mutuelleproassurances.com',   cc: ['direction@mutuelleproassurances.com', 'production@mutuelleproassurances.com'] },
        '5':  { to: 'sinistres@mutuelleproassurances.com',   cc: ['direction@mutuelleproassurances.com'] },
        '6':  { to: 'sinistres@mutuelleproassurances.com',   cc: ['direction@mutuelleproassurances.com'] },
        '7':  { to: 'production@mutuelleproassurances.com',  cc: ['direction@mutuelleproassurances.com'] },
        '8':  { to: 'production@mutuelleproassurances.com',  cc: ['direction@mutuelleproassurances.com'] },
        '9':  { to: 'production@mutuelleproassurances.com',  cc: ['direction@mutuelleproassurances.com'] },
        '10': { to: 'production@mutuelleproassurances.com',  cc: ['direction@mutuelleproassurances.com'] },
        '11': { to: 'production@mutuelleproassurances.com',  cc: ['direction@mutuelleproassurances.com'] },
        '12': { to: 'production@mutuelleproassurances.com',  cc: ['comptablite@mutuelleproassurances.com'] },
        '13': { to: 'production@mutuelleproassurances.com',  cc: ['comptablite@mutuelleproassurances.com'] },
        '14': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '15': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '16': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '17': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '18': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '19': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '20': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '21': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '22': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
    };
    const CONTACT_ROUTING_FALLBACK = { to: 'contact@mutuelleproassurances.com', cc: [] };


    // -----------------------------------------------------------------
    // Traduction des types de carburant (vPIC, anglais US) → français local
    // "Gasoline" (anglais US) = Essence — jamais du Diesel/Gasoil.
    // "Diesel" est ici explicité "Diesel (Gasoil)" car chez nous les deux
    // termes sont souvent utilisés de façon interchangeable.
    // -----------------------------------------------------------------
    const FUEL_TYPE_FR = {
        'Gasoline': 'Essence',
        'Diesel': 'Diesel (Gasoil)',
        'Flexible Fuel Vehicle (FFV)': 'Flex-fuel (Essence/Éthanol)',
        'Electric': 'Électrique',
        'Compressed Natural Gas (CNG)': 'GNC (Gaz Naturel Comprimé)',
        'Liquefied Petroleum Gas (propane or LPG)': 'GPL (Gaz de Pétrole Liquéfié)',
        'Hybrid': 'Hybride (Essence-Électrique)',
        'Ethanol (E85)': 'Éthanol (E85)',
        'Hydrogen': 'Hydrogène',
        'Not Applicable': '',
    };
