    function setLanguage(lang) {
        currentLang = lang;
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                // innerHTML (et non textContent) : permet de stocker un <br>
                // directement dans le dictionnaire pour les titres à deux
                // lignes (ex. "Gestion<br>Sinistres"), sans cas particulier
                // à gérer — le retour à la ligne survit désormais aux
                // changements de langue. Contenu entièrement maîtrisé
                // (dictionnaire interne, jamais de saisie utilisateur ici).
                element.innerHTML = translations[lang][key];
            }
        });
        if(lang === 'fr') {
            document.getElementById('btn-lang-fr').className = 'text-purple-300 font-extrabold';
            document.getElementById('btn-lang-en').className = 'text-gray-300 hover:text-white transition font-normal';
        } else {
            document.getElementById('btn-lang-en').className = 'text-purple-300 font-extrabold';
            document.getElementById('btn-lang-fr').className = 'text-gray-300 hover:text-white transition font-normal';
        }

        // Si l'affichette de proximité est ouverte au moment du changement de
        // langue, on la régénère immédiatement dans la nouvelle langue —
        // plutôt que d'attendre sa prochaine apparition.
        const openBadge = document.getElementById('agence-proximite-badge');
        if (openBadge && resolvedAgencyKey && resolvedAgencyDistanceKm != null) {
            showNearestAgencyBadge(resolvedAgencyKey, resolvedAgencyDistanceKm);
        }
    }

    function toggleMobileMenu() {
        document.getElementById('mobile-menu').classList.toggle('hidden');
    }

    function setActiveMenuLink(id) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === '#' + id) {
                link.className = 'nav-link py-1 transition text-brandPurple border-b-2 border-brandPurple';
            } else {
                link.className = 'nav-link py-1 hover:text-brandPurple transition text-navy';
            }
        });
    }

    function updateScrollArrows() {
        const upBtn = document.getElementById('scroll-arrow-up');
        const downBtn = document.getElementById('scroll-arrow-down');
        if (!upBtn || !downBtn) return;

        const total = scrollPageOrder.length;
        const idx = currentSectionIndex;
        let showUp, showDown;

        if (idx === 0) {
            showUp = false; showDown = false;                 // Page 1 : rien
        } else if (idx === total - 1) {
            showUp = true; showDown = false;                  // Dernière page : haut seul
        } else if (idx === 1) {
            showUp = false; showDown = true;                  // Page 2 : bas seul
        } else {
            showUp = true; showDown = true;                   // Pages intermédiaires : les deux
        }

        upBtn.style.display = showUp ? 'block' : 'none';
        downBtn.style.display = showDown ? 'block' : 'none';

        applyArrowsOpacity();
    }

    function initPartnersBar() {
        // Taille réduite de moitié le 20/08/2026, à la demande de Roger :
        // double la densité de logos visibles simultanément dans la bande
        // défilante, sans toucher aux fichiers eux-mêmes (aucune perte de
        // qualité -- le navigateur réduit juste l'affichage d'une image
        // déjà là, aucune requête réseau supplémentaire, donc aucun
        // impact sur la vitesse de rendu).
        const carte = (c) => `
            <div class="flex items-center justify-center border border-transparent hover:border-brandPurple/40 hover:bg-white hover:shadow-sm rounded-lg px-1.5 h-10 shrink-0 transition-all" title="${c.nom}">
                <img src="${c.logo}" alt="${c.nom}" style="width:28px; height:28px;" class="object-contain">
            </div>
        `;
        const html = COMPAGNIES_PARTENAIRES.map(carte).join('');
        const listA = document.getElementById('partners-list-a');
        const listB = document.getElementById('partners-list-b');
        if (listA) listA.innerHTML = html;
        if (listB) listB.innerHTML = html; // copie identique, pour la boucle continue
    }
    
    function partnerNext() {
        // Bassin pondéré (poids_apparition, ex: GMC/Belife/Royal Onyx à 3x
        // depuis le 15/08/2026), en excluant tout ce qui est déjà visible
        // ailleurs à l'instant T.
        const construireBassin = (avecExclusion) => {
            const pool = [];
            COMPAGNIES_PARTENAIRES.forEach((c) => {
                if (avecExclusion && partnerActuellementVisibles.has(c.nom)) return;
                const poids = Math.max(1, c.poids || 1);
                for (let i = 0; i < poids; i++) pool.push(c);
            });
            return pool;
        };

        let pool = construireBassin(true);
        // Garde-fou : si jamais le bassin exclu était vide (cas limite --
        // plus d'emplacements actifs que de compagnies), on retombe sur
        // toutes les compagnies pour ne jamais bloquer l'animation.
        if (pool.length === 0) pool = construireBassin(false);

        const compagnie = pool[Math.floor(Math.random() * pool.length)];

        partnerActuellementVisibles.add(compagnie.nom);
        partnerCycleVus.add(compagnie.nom);

        // Cycle complet : réinitialise pour repartir sur un nouveau cycle
        // de 18 (garantie n°5).
        if (partnerCycleVus.size >= COMPAGNIES_PARTENAIRES.length) {
            partnerCycleVus = new Set();
        }

        return compagnie;
    }

    
    function partnerRandom(min, max) {
        return min + Math.random() * (max - min);
    }


    function showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) { console.warn('Toast (conteneur absent) :', message); return; }

        const style = TOAST_STYLES[type] || TOAST_STYLES.info;
        const toast = document.createElement('div');
        toast.className = `${style.bg} text-white text-xs rounded-xl shadow-lg px-4 py-3 flex items-start gap-2.5 opacity-0 translate-x-4 transition-all duration-300`;
        toast.innerHTML = `
            <i class="fa-solid ${style.icon} mt-0.5 shrink-0"></i>
            <span class="flex-1 leading-relaxed whitespace-pre-line">${message}</span>
            <button type="button" aria-label="Fermer la notification" class="shrink-0 opacity-70 hover:opacity-100">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        container.appendChild(toast);

        // Anime l'entrée
        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', 'translate-x-4');
        });

        const dismiss = () => {
            toast.classList.add('opacity-0', 'translate-x-4');
            setTimeout(() => toast.remove(), 300);
        };
        toast.querySelector('button').addEventListener('click', dismiss);
        if (duration > 0) setTimeout(dismiss, duration);
    }

    // -----------------------------------------------------------------
    // BOÎTE DE DIALOGUE DE CONFIRMATION — remplace confirm(). Retourne
    // une Promise<boolean>, à utiliser avec await, ex:
    //   const ok = await showConfirmDialog('Voulez-vous continuer ?');
    // -----------------------------------------------------------------
    function showConfirmDialog(message) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('confirm-dialog-overlay');
            const messageEl = document.getElementById('confirm-dialog-message');
            const btnOk = document.getElementById('confirm-dialog-ok');
            const btnCancel = document.getElementById('confirm-dialog-cancel');

            messageEl.textContent = message;
            overlay.classList.remove('hidden');

            const cleanup = (result) => {
                overlay.classList.add('hidden');
                btnOk.removeEventListener('click', onOk);
                btnCancel.removeEventListener('click', onCancel);
                resolve(result);
            };
            const onOk = () => cleanup(true);
            const onCancel = () => cleanup(false);

            btnOk.addEventListener('click', onOk);
            btnCancel.addEventListener('click', onCancel);
        });
    }
    // -----------------------------------------------------------------
    // Suivi des pièces justificatives sélectionnées par l'utilisateur.
    // Les fichiers eux-mêmes ne sont PAS envoyés automatiquement à
    // l'agence (WhatsApp ne le permet pas via un simple lien wa.me) :
    // on se contente de lister leurs noms, pour rappel à l'utilisateur
    // et pour le mémo archivé.
    // -----------------------------------------------------------------
    // -----------------------------------------------------------------
    // Compression des images côté client (canvas natif, aucune dépendance).
    // Indispensable : une photo de pièce prise au téléphone peut peser
    // plusieurs Mo — inexploitable pour un envoi (WhatsApp, email, mémo
    // archivé). Redimensionne à 1600px max de côté et recompresse en JPEG
    // qualité 75%. Les PDF ne sont pas concernés (canvas ne s'applique pas
    // aux documents, seulement aux images) et restent inchangés.
    // -----------------------------------------------------------------
    function compressImageFile(file, maxDim = 1600, quality = 0.75) {
        if (!file.type.startsWith('image/')) {
            return Promise.resolve(file); // PDF ou autre : inchangé
        }
        return new Promise((resolve) => {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();

            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const scale = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(objectUrl);

                canvas.toBlob((blob) => {
                    if (!blob) { resolve(file); return; } // échec de compression → on garde l'original
                    const compressed = new File(
                        [blob],
                        file.name.replace(/\.\w+$/, '.jpg'),
                        { type: 'image/jpeg', lastModified: Date.now() }
                    );
                    // Ne garder la version compressée que si elle est vraiment plus légère
                    resolve(compressed.size < file.size ? compressed : file);
                }, 'image/jpeg', quality);
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(file); // format non supporté par le navigateur → fichier original conservé
            };

            img.src = objectUrl;
        });
    }

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
    let COMPAGNIES_PARTENAIRES = [];


    // -----------------------------------------------------------------
    // ANIMATION ALÉATOIRE DES LOGOS PARTENAIRES — cahier des charges du
    // 13/08/2026 :
    //   1. Zone plein écran (100dvh), positionnée avant la bande défilante
    //   2. Logos à position ET durée aléatoires (apparition/disparition)
    //   3. Garantie : tous les logos passent au moins une fois par cycle
    //   4. Garantie : jamais deux fois de suite au même endroit
    //   5. Garantie : jamais d'écran totalement vide
    //   6. Rythme pensé pour rester léger en CPU (peu d'emplacements,
    //      transitions CSS -- accélérées matériellement -- plutôt que
    //      des recalculs JS répétés, minuteurs individuels plutôt qu'une
    //      boucle serrée)
    // -----------------------------------------------------------------
    // -----------------------------------------------------------------
    // MOTEUR DE TIRAGE — révisé le 15/08/2026 selon le nouveau cahier des
    // charges de Roger. Deux ensembles suivis en permanence :
    //   - partnerActuellementVisibles : compagnies AFFICHÉES là, tout de
    //     suite (garantie n°3 : jamais deux fois le même logo en même
    //     temps à l'écran, quel que soit l'emplacement)
    //   - partnerCycleVus : compagnies déjà passées depuis la dernière
    //     réinitialisation (garantie n°5 : un "cycle" = les 18 compagnies
    //     sont toutes passées au moins une fois ; dès que c'est le cas,
    //     réinitialisation automatique et un nouveau cycle démarre)
    // -----------------------------------------------------------------
    let partnerActuellementVisibles = new Set();
    let partnerCycleVus = new Set();

    function partnerLibere(nom) {
        partnerActuellementVisibles.delete(nom);
    }

    // Positionnement en grille de cellules dédiées (correctif du
    // 13/08/2026) : chaque emplacement possède SA PROPRE région
    // rectangulaire, jamais partagée avec un autre -- deux logos ne
    // peuvent donc JAMAIS se chevaucher, par construction géométrique,
    // plutôt que par un calcul de collision a posteriori (plus fiable,
    // moins coûteux en CPU). Le tirage aléatoire ne joue qu'À L'INTÉRIEUR
    // de la cellule assignée, pour garder un effet organique.
    function partnerGridPour(n) {
        if (n <= 4) return { cols: 2, rows: 2 };
        if (n <= 6) return { cols: 3, rows: 2 };
        return { cols: 3, rows: 3 };
    }

    function partnerPositionSlot(el, container, cellIndex, cols, rows) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const cellW = w / cols;
        const cellH = h / rows;
        const col = cellIndex % cols;
        const row = Math.floor(cellIndex / cols);

        const taille = parseFloat(el.style.width) || 110;
        // Le logo reste TOUJOURS entièrement à l'intérieur de sa cellule --
        // son coin ne peut se déplacer que dans l'espace qui garantit ça.
        const maxDecalageX = Math.max(0, cellW - taille);
        const maxDecalageY = Math.max(0, cellH - taille);

        el.style.left = `${(col * cellW) + partnerRandom(0, maxDecalageX)}px`;
        el.style.top = `${(row * cellH) + partnerRandom(0, maxDecalageY)}px`;
    }

    function partnerScheduleSlot(el, cellIndex, cols, rows, rythme) {
        const delaiCache = partnerRandom(rythme.cacheMin, rythme.cacheMax);
        setTimeout(() => {
            const container = document.getElementById('partners-animation-zone');
            if (!container) return; // page quittée / section retirée

            const compagnie = partnerNext();
            el.dataset.dernierNom = compagnie.nom;
            partnerPositionSlot(el, container, cellIndex, cols, rows);
            el.innerHTML = `<img src="${compagnie.logo}" alt="" class="max-w-full max-h-full object-contain drop-shadow-md">`;
            el.classList.remove('opacity-0');
            el.classList.add('opacity-100');

            const dureeVisible = partnerRandom(rythme.visibleMin, rythme.visibleMax);
            setTimeout(() => {
                el.classList.remove('opacity-100');
                el.classList.add('opacity-0');
                // Libère le nom seulement APRÈS la transition de fondu
                // (700ms, cf. classe CSS) -- sinon un autre emplacement
                // pourrait piocher la même compagnie pendant qu'elle est
                // encore visuellement visible en train de disparaître.
                setTimeout(() => partnerLibere(compagnie.nom), 700);
                partnerScheduleSlot(el, cellIndex, cols, rows, rythme); // relance son propre cycle indépendamment
            }, dureeVisible);
        }, delaiCache);
    }

    // -----------------------------------------------------------------
    // AJUSTEMENT DE LA HAUTEUR DE LA SECTION PARTENAIRES — corrige le
    // 13/08/2026 : l'en-tête du site est "sticky" (toujours visible en
    // haut de l'écran), donc sa hauteur doit être SOUSTRAITE de la
    // hauteur "plein écran" de la section, sinon celle-ci déborde
    // exactement de la hauteur de l'en-tête sous la ligne de flottaison
    // (le bandeau du bas se retrouve alors hors de vue, comme observé).
    // Mesurée en JS (plutôt que codée en dur) pour rester juste même si
    // l'en-tête change un jour (texte plus long, logo redimensionné...).
    // -----------------------------------------------------------------
    function ajusterHauteurSectionPartenaires() {
        const section = document.getElementById('partenaires');
        const header = document.querySelector('header');
        if (!section || !header) return;

        // Plafonne la hauteur d'en-tête soustraite à 150px -- garde-fou :
        // si jamais la mesure réelle était anormalement grande (bug futur,
        // en-tête modifié plus tard...), la zone ne doit JAMAIS pouvoir
        // s'effondrer à une taille invisible. 150px est très généreux pour
        // un en-tête normal (~60-65px mesuré en pratique).
        const hauteurEntete = Math.min(header.offsetHeight || 0, 150);
        section.style.height = `calc(100vh - ${hauteurEntete}px)`;
        section.style.height = `calc(100dvh - ${hauteurEntete}px)`; // écrase la ligne au-dessus si dvh supporté
    }

    // Même principe que ci-dessus, appliqué à la section Assistance
    // (ajoutée le 20/08/2026) -- Roger jugeait l'ancienne version trop
    // grande ("presque une page de blanc à elle seule"). Fonction séparée
    // plutôt que généralisée à un id variable : chacune reste indépendante,
    // une panne sur l'une n'affecte jamais l'autre (même philosophie que
    // les blocs try/catch déjà séparés pour Partenaires).
    function ajusterHauteurSectionAssistance() {
        const section = document.getElementById('assistance');
        const header = document.querySelector('header');
        if (!section || !header) return;
        const hauteurEntete = Math.min(header.offsetHeight || 0, 150);
        section.style.height = `calc(100vh - ${hauteurEntete}px)`;
        section.style.height = `calc(100dvh - ${hauteurEntete}px)`;
    }

    function initPartnersAnimation() {
        const container = document.getElementById('partners-animation-zone');
        if (!container) return;

        // Réglages différenciés mobile/desktop (corrigé le 13/08/2026) --
        // avant cette correction, seuls le nombre et la taille des
        // emplacements changeaient, jamais le TEMPO -- d'où l'impression de
        // vide et de lenteur sur mobile (moins d'emplacements, même rythme
        // que le desktop). Mobile : plus d'emplacements ET cycle plus
        // rapide, pour combler l'écran plus étroit mais plus haut.
        //
        // Tailles doublées le 13/08/2026 (66/110px -> 132/220px), à la
        // demande de Roger. IMPORTANT : le nombre d'emplacements est réduit
        // en conséquence (6->4 mobile, 9->6 desktop) -- avec des logos deux
        // fois plus grands, garder le même nombre de cellules les aurait
        // rendues trop petites pour les contenir, risquant exactement le
        // chevauchement qu'on avait pris soin d'éliminer.
        // Emplacements mobile doublés le 20/08/2026 (4 -> 8), à la demande
        // de Roger -- avec le même garde-fou déjà appliqué le 13/08 :
        // deux fois plus d'emplacements exige des logos plus petits, sinon
        // les cellules de la grille deviennent trop petites pour les
        // contenir sans chevauchement. 132px -> 84px sur mobile (grille
        // 3x3 au lieu de 2x2, cf. partnerGridPour).
        const largeur = window.innerWidth;
        const estMobile = largeur < 640;
        const nbSlots = estMobile ? 8 : (largeur < 1024 ? 4 : 6);
        const { cols, rows } = partnerGridPour(nbSlots);
        const tailleLogo = estMobile ? 84 : 220;
        // Rythme accéléré le 15/08/2026 (points 1 et 2) : durée maximum
        // d'apparition réduite de moitié (visibleMax), et délais raccourcis
        // dans l'ensemble pour augmenter le nombre de cycles complets
        // (les 18 compagnies passées) par tranche de 60 secondes.
        const rythme = estMobile
            ? { cacheMin: 300, cacheMax: 900, visibleMin: 900, visibleMax: 1600 }
            : { cacheMin: 600, cacheMax: 2200, visibleMin: 1400, visibleMax: 2750 };

        const slots = [];
        for (let i = 0; i < nbSlots; i++) {
            const el = document.createElement('div');
            el.className = 'absolute opacity-0 transition-opacity duration-700 ease-in-out flex items-center justify-center pointer-events-none';
            el.style.width = `${tailleLogo}px`;
            el.style.height = `${tailleLogo}px`;
            container.appendChild(el);
            slots.push(el);
            partnerScheduleSlot(el, i, cols, rows, rythme);
        }

        // Garde-fou (garantie n°5 de la version précédente, toujours valable) :
        // vérifie périodiquement qu'au moins un logo est visible -- sinon en
        // force un immédiatement. Intervalle volontairement peu fréquent
        // (2,5s) pour rester léger en CPU.
        setInterval(() => {
            const visibles = slots.filter((s) => s.classList.contains('opacity-100'));
            if (visibles.length === 0 && slots.length > 0) {
                const idx = Math.floor(Math.random() * slots.length);
                const el = slots[idx];
                const compagnie = partnerNext();
                el.dataset.dernierNom = compagnie.nom;
                partnerPositionSlot(el, container, idx, cols, rows);
                el.innerHTML = `<img src="${compagnie.logo}" alt="" class="max-w-full max-h-full object-contain drop-shadow-md">`;
                el.classList.remove('opacity-0');
                el.classList.add('opacity-100');
            }
        }, 2500);
    }


    // Déclaration globale -- retrouvée manquante le 15/08/2026 (effacée
    // par erreur lors d'une modification précédente), causant un plantage
    // JS si une fonction lisait currentLang avant le premier changement de
    // langue (ex: badge de proximité déclenché tôt par la géolocalisation).
    let currentLang = 'fr';

    // -----------------------------------------------------------------
    // FLÈCHES DE DÉFILEMENT ENTRE SECTIONS
    // Règle d'affichage :
    //   Page 1            : aucune flèche
    //   Page 2            : flèche BAS uniquement
    //   Page 3 à N-1      : flèches HAUT + BAS
    //   Dernière page (N) : flèche HAUT uniquement
    // Très discrètes (opacité faible), et se masquent après 3s d'inactivité
    // (réapparaissent au moindre mouvement/toucher/scroll).
    // -----------------------------------------------------------------
    const scrollPageOrder = ['accueil', 'comment-ca-marche', 'simulateur', 'assistant-ia', 'solutions', 'cabinet', 'contact'];
    let currentSectionIndex = 0;
    let arrowsDimmed = false;
    let arrowsInactivityTimer = null;

    const ARROW_OPACITY_VISIBLE = '0.35';
    const ARROW_OPACITY_HOVER_HINT = '0.35'; // le hover (CSS non nécessaire ici) reste géré par la couleur du texte


    function applyArrowsOpacity() {
        const opacity = arrowsDimmed ? '0' : ARROW_OPACITY_VISIBLE;
        const pointerEvents = arrowsDimmed ? 'none' : 'auto';
        ['scroll-arrow-up', 'scroll-arrow-down'].forEach((id) => {
            const btn = document.getElementById(id);
            if (btn && btn.style.display !== 'none') {
                btn.style.opacity = opacity;
                btn.style.pointerEvents = pointerEvents;
            }
        });
    }

    function resetArrowsInactivityTimer() {
        if (arrowsDimmed) {
            arrowsDimmed = false;
            applyArrowsOpacity();
        }
        clearTimeout(arrowsInactivityTimer);
        arrowsInactivityTimer = setTimeout(() => {
            arrowsDimmed = true;
            applyArrowsOpacity();
        }, 3000);
    }

    function scrollToAdjacentSection(direction) {
        const targetIndex = currentSectionIndex + direction;
        if (targetIndex < 0 || targetIndex >= scrollPageOrder.length) return;
        const targetEl = document.getElementById(scrollPageOrder[targetIndex]);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
    }
