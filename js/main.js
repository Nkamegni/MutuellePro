    // LISTENERS DOM ATTACHMENTS
    document.addEventListener('DOMContentLoaded', async () => {
        // Chargement des agences DEPUIS POSTGRESQL, en tout premier -- tout le
        // reste de l'initialisation (carte, résolution de la plus proche,
        // etc.) dépend de cette donnée étant disponible.
        await loadAgencesData();
        try {
            loadListesReference();
        } catch (e) {
            console.error('Erreur lors du chargement des listes de référence (ignorée) :', e);
        }
        try {
            initTomSelect('sujet_categorie', { placeholder: '-- Choisissez un sujet --', create: false });
        } catch (e) {
            console.error('Erreur lors de l\'initialisation de Tom Select sur Sujet (ignorée) :', e);
        }
        // initPartnersBar() et initPartnersAnimation() ne sont plus appelées
        // ici (15/08/2026) : elles dépendent désormais des données réelles
        // chargées depuis la base (site.partenaires_assurance), et sont donc
        // déclenchées depuis loadListesReference() une fois ces données
        // effectivement disponibles — les appeler ici, avant, les aurait
        // fait tourner sur un tableau vide.
        try {
            ajusterHauteurSectionPartenaires();
            // Réajuste sur redimensionnement/rotation d'écran (anti-rebond
            // 200ms -- évite de recalculer à chaque pixel pendant un
            // redimensionnement en cours, reste léger en CPU).
            let partnersResizeTimer = null;
            window.addEventListener('resize', () => {
                clearTimeout(partnersResizeTimer);
                partnersResizeTimer = setTimeout(ajusterHauteurSectionPartenaires, 200);
            });
        } catch (e) {
            console.error('Erreur lors de l\'ajustement de hauteur de la section partenaires (ignorée) :', e);
        }

        // Bloc SÉPARÉ du précédent (20/08/2026) : une panne éventuelle sur
        // Partenaires ne doit jamais empêcher Assistance de s'ajuster, et
        // inversement -- même principe déjà appliqué ailleurs sur ce site.
        try {
            ajusterHauteurSectionAssistance();
            let assistanceResizeTimer = null;
            window.addEventListener('resize', () => {
                clearTimeout(assistanceResizeTimer);
                assistanceResizeTimer = setTimeout(ajusterHauteurSectionAssistance, 200);
            });
        } catch (e) {
            console.error('Erreur lors de l\'ajustement de hauteur de la section assistance (ignorée) :', e);
        }

        // initMap() dépend de la librairie Leaflet chargée depuis un CDN externe.
        // Si le CDN est inaccessible (pas d'internet, bloqué...), on ne doit pas
        // laisser une erreur ici interrompre tout le reste de l'initialisation
        // (restauration du formulaire, gestion des soumissions, etc.).
        try {
            initMap();
        } catch (err) {
            console.warn('Carte indisponible (Leaflet non chargé) :', err);
        }

        // Résolution de l'agence la plus proche demandée dès l'ouverture du
        // site (autorisation demandée immédiatement), pour que le résultat
        // soit déjà disponible bien avant qu'un devis ne soit soumis — évite
        // la course de vitesse entre géolocalisation et soumission.
        resolveNearestAgencyForQuote();

        // Si l'utilisateur clique directement sur une case du mini-formulaire
        // (plutôt que via un bouton "Multirisque Pro" etc.), on oublie la
        // branche mémorisée détournée — sinon elle resterait périmée.
        // .checked = true (programmatique, via selectDevisRisk) ne déclenche
        // pas cet événement 'change', seul un vrai clic utilisateur le fait.
        document.querySelectorAll('input[name="risque"]').forEach((radio) => {
            radio.addEventListener('change', () => { heroFormIntendedBranch = null; });
        });

        // Restauration du brouillon sauvegardé + sauvegarde continue à chaque saisie
        // Encapsulé : une erreur ici ne doit plus JAMAIS pouvoir interrompre
        // silencieusement le reste de l'initialisation de la page (c'est
        // exactement ce qui s'est produit avec le bug des champs fichier).
        try {
            restoreFormDraft();
        } catch (e) {
            console.error('Erreur lors de la restauration du brouillon (ignorée, le reste de la page continue) :', e);
        }
        try {
            setupWhatsAppEscort();
        } catch (e) {
            console.error('Erreur lors de l\'initialisation de l\'escorte WhatsApp (ignorée) :', e);
        }
        try {
            setupHeroSlideshow();
        } catch (e) {
            console.error('Erreur lors de l\'initialisation du diaporama du hero (ignorée) :', e);
        }
        try {
            initCookieConsent();
        } catch (e) {
            console.error('Erreur lors de l\'initialisation du consentement cookies (ignorée) :', e);
        }
        initDocClearButtons();
        const devisFormForDraft = document.getElementById('devisFormNormalized');
        if (devisFormForDraft) {
            devisFormForDraft.addEventListener('input', saveFormDraft);
            devisFormForDraft.addEventListener('change', saveFormDraft);
        }

        // Date de naissance : ouvrir le calendrier près d'un âge adulte
        // plausible (J-15 ans) plutôt qu'à la date du jour — évite à
        // l'utilisateur de faire défiler des dizaines d'années en arrière.
        // N'écrase jamais une valeur déjà restaurée depuis le brouillon.
        const dobField = document.getElementById('modal_user_dob');
        if (dobField) {
            const today = new Date();
            dobField.max = today.toISOString().split('T')[0];
            if (!dobField.value) {
                const fifteenYearsAgo = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate());
                dobField.value = fifteenYearsAgo.toISOString().split('T')[0];
            }
        }

        const insuranceSelect = document.getElementById('insurance_type');
        if (insuranceSelect) {
            insuranceSelect.addEventListener('change', function() {
                document.querySelectorAll('.risk-section').forEach(sec => sec.classList.add('hidden'));
                const target = document.getElementById(`fields-${this.value.toLowerCase()}`);
                if (target) target.classList.remove('hidden');

                const docAutoSection = document.getElementById('doc-auto-section');
                if (docAutoSection) {
                    docAutoSection.classList.toggle('hidden', this.value !== 'Auto');
                }

                // Changement de branche = les infos "Détails du Risque" ne sont
                // plus à jour tant qu'on n'y est pas repassé : on reverrouille
                // l'accès direct à l'étape 3.
                if (step3UnlockedForBranch !== this.value) {
                    step3UnlockedForBranch = null;
                    refreshStep3BadgeState();
                    // Si on était sur l'étape 3 au moment du changement (cas
                    // limite), on ramène vers l'étape 2 pour re-confirmer les
                    // détails de la nouvelle branche.
                    const step3El = document.getElementById('wizardStep3');
                    if (step3El && !step3El.classList.contains('hidden')) {
                        goToStep2();
                    }
                }
            });
        }

        // Suivi des pièces justificatives sélectionnées, avec compression
        // automatique des images (ne persistent PAS en rechargement de
        // page : les fichiers ne peuvent pas être stockés en localStorage —
        // l'utilisateur devra les resélectionner si la page est rechargée
        // avant soumission).
        document.querySelectorAll('.doc-upload').forEach((input) => {
            input.addEventListener('change', handleDocUploadChange);
        });

        const sections = document.querySelectorAll('section[id]');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveMenuLink(entry.target.id);
                    const idx = scrollPageOrder.indexOf(entry.target.id);
                    if (idx !== -1) {
                        currentSectionIndex = idx;
                        updateScrollArrows();
                    }
                }
            });
        }, { threshold: 0.4 });
        sections.forEach(section => observer.observe(section));

        // Flèches de défilement : réagissent au mouvement/toucher/scroll
        ['mousemove', 'touchstart', 'scroll'].forEach((evt) => {
            window.addEventListener(evt, resetArrowsInactivityTimer, { passive: true });
        });
        resetArrowsInactivityTimer(); // état initial : flèches visibles quelques secondes

        // Micro-animation : apparition en fondu des cartes au défilement
        // (réutilisable pour d'autres sections à l'avenir en ajoutant
        // simplement la classe "fade-in-section" + les classes de transition).
        const fadeInObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // Retire les deux valeurs possibles (translate-y-4 ET
                    // translate-y-6 sont toutes deux utilisées selon les
                    // sections) -- retirer une classe absente ne fait rien,
                    // donc aucun risque à toujours tenter les deux.
                    entry.target.classList.remove('opacity-0', 'translate-y-4', 'translate-y-6');
                    entry.target.classList.add('opacity-100', 'translate-y-0');
                    fadeInObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        document.querySelectorAll('.fade-in-section').forEach((el) => fadeInObserver.observe(el));

        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const submitBtn = document.getElementById('submit-btn');
                const originalBtnContent = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi en cours...';
                submitBtn.disabled = true;

                const memoField = document.getElementById('contact_memo_complet');
                if (memoField) memoField.value = buildContactMemoText(this);

                // Ticket backend (Helpdesk Volet 2, site.tickets, type
                // "info") — en parallèle, jamais bloquant.
                const contactEmail = this.elements['user_email'] ? this.elements['user_email'].value.trim() : '';
                const contactPrefixEl = this.querySelector('.devis-prefix-select');
                const contactPhone = this.elements['user_phone'] ? this.elements['user_phone'].value.trim() : '';
                const contactTelephone = `${contactPrefixEl ? contactPrefixEl.value : ''}${contactPhone}`;
                const contactSujetSelect = this.elements['sujet_categorie'];
                const contactSujetLabel = contactSujetSelect && contactSujetSelect.selectedIndex > 0
                    ? contactSujetSelect.options[contactSujetSelect.selectedIndex].textContent
                    : undefined;
                creerTicketBackend('info', contactEmail, contactTelephone, {
                    sujet: contactSujetLabel,
                    objet: this.elements['subject'] ? this.elements['subject'].value.trim() : undefined,
                    message: this.elements['message'] ? this.elements['message'].value.trim() : undefined,
                });

                // Routage par sujet — voir CONTACT_ROUTING plus haut. Repli sur
                // contact@ si, par un cas limite, aucun sujet n'était sélectionné
                // (le champ est "required", donc ça ne devrait jamais arriver).
                const sujetValue = this.elements['sujet_categorie'] ? this.elements['sujet_categorie'].value : '';
                const routing = CONTACT_ROUTING[sujetValue] || CONTACT_ROUTING_FALLBACK;

                sendQuoteEmail(this, routing.cc, routing.to)
                    .then(() => {
                        showToast('Votre message a bien été transmis ! Un conseiller vous recontactera sous 24h.', 'success');
                        contactForm.reset();
                    }, (error) => {
                        showToast(explainEmailError(error), 'error');
                        console.error('Erreur envoi email (Nodemailer) :', error);
                    })
                    .finally(() => {
                        submitBtn.innerHTML = originalBtnContent;
                        submitBtn.disabled = false;
                    });
            });
        }

        const devisFormNormalized = document.getElementById('devisFormNormalized');
        if (devisFormNormalized) {
            devisFormNormalized.addEventListener('submit', async function(event) {
                event.preventDefault();
                const submitBtn = document.getElementById('normalizedSubmitBtn');
                const originalBtnContent = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi en cours...';
                submitBtn.disabled = true;

                // Déclenché en tout premier, de façon synchrone, pour rester dans le
                // geste utilisateur (clic) — sinon certains navigateurs bloquent
                // l'ouverture de l'onglet WhatsApp si elle intervient après un délai
                // asynchrone (ex. après la réponse du serveur emailjs).
                const { agenceNom, ref, docs, whatsappBlocked } = sendQuoteToWhatsApp();

                // Remplit le champ email AVANT l'envoi — corrige le bug de
                // l'email vide : auparavant, ce champ n'était rempli que
                // lors d'un clic sur "Archiver", jamais sur une soumission
                // directe. Utilise la même source unique que l'archivage,
                // donc les deux contenus sont désormais toujours identiques.
                const memoData = buildMemoData();
                populateMemoCompletField(memoData);

                // Ticket backend (Helpdesk Volet 2, site.tickets) — voir
                // commentaire de creerTicketBackend : en parallèle, jamais
                // bloquant. Le champ email du formulaire alimente à la fois
                // l'email Nodemailer existant et ce nouveau ticket.
                const userEmail = document.getElementById('modal_user_email')
                    ? document.getElementById('modal_user_email').value.trim()
                    : '';
                creerTicketBackend('devis', userEmail, memoData.telephone, {
                    branche: memoData.insuranceLabel,
                    vin: memoData.vin || undefined,
                    details: memoData.detailsData,
                    notes: memoData.notes || undefined,
                    ref_memo: memoData.ref,
                });

                if (!(await warnIfAttachmentsTooLarge())) {
                    submitBtn.innerHTML = originalBtnContent;
                    submitBtn.disabled = false;
                    return;
                }

                // Copie à l'agence UNIQUEMENT si WhatsApp a échoué (règle
                // anti-doublon déjà câblée côté serveur) — utilise désormais
                // la vraie adresse de l'agence actuellement sélectionnée,
                // les 11 boîtes créées le 04/08/2026.
                const selectedAgencyKey = document.getElementById('select-agences')
                    ? document.getElementById('select-agences').value
                    : null;
                const selectedAgency = selectedAgencyKey ? agencesData[selectedAgencyKey] : null;
                const agencyEmailForCC = whatsappBlocked && selectedAgency ? selectedAgency.email : null;

                sendQuoteEmail(this, agencyEmailForCC)
                    .then(() => {
                        const docsReminder = docs.length
                            ? `\n\nN'oubliez pas de joindre manuellement dans WhatsApp : ${docs.map(d => d.label).join(', ')} (WhatsApp ne permet pas leur envoi automatique).`
                            : '';
                        const whatsappNote = whatsappBlocked
                            ? `\n\nLe navigateur a bloqué l'ouverture de WhatsApp. Votre demande a bien été transmise par email — pour l'envoyer aussi sur WhatsApp, réessayez ou autorisez les pop-ups pour ce site.`
                            : `— mémo envoyé sur WhatsApp à l'agence : ${agenceNom} !`;
                        showToast(`Votre demande de cotation (Réf. ${ref}) a été transmise avec succès ${whatsappNote} Un conseiller prend en charge votre dossier.${docsReminder}\n\nVos informations restent enregistrées si vous souhaitez les corriger ou soumettre une nouvelle demande.`, 'success', 8000);
                        closeDevisModal();
                        // Le formulaire n'est volontairement PAS réinitialisé : les
                        // utilisateurs indécis doivent pouvoir corriger et resoumettre.
                    }, (error) => {
                        showToast(explainEmailError(error), 'error');
                        console.error('Erreur envoi email (Nodemailer) :', error);
                    })
                    .finally(() => {
                        submitBtn.innerHTML = originalBtnContent;
                        submitBtn.disabled = false;
                    });
            });
        }
    });

    document.addEventListener('DOMContentLoaded', function () {
        // Vérifie l'état de connexion dès le chargement de la page, pour
        // que l'indicateur topbar reflète la session dès l'affichage,
        // sans attendre une ouverture de la modale Espace Client.
        refreshTopbarSessionIndicator();

        const loginForm = document.getElementById('espace-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async function (event) {
                event.preventDefault();
                const t = translations[currentLang] || translations.fr;
                const submitBtn = document.getElementById('espace-login-submit');
                const original = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

                const identifiant = document.getElementById('espace-login-identifiant').value.trim();
                const mot_de_passe = document.getElementById('espace-login-password').value;

                try {
                    const resp = await fetch('/api/connexion', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ identifiant, mot_de_passe }),
                    });
                    const data = await resp.json();
                    if (!data.succes) {
                        showToast((data.erreurs && data.erreurs[0]) || t['espace.errorGeneric'], 'error');
                        return;
                    }
                    showToast(t['espace.loginSuccess'], 'success');
                    loginForm.reset();
                    await espaceRefreshState();
                } catch (err) {
                    console.error('Espace Client — erreur de connexion :', err);
                    showToast(t['espace.errorGeneric'], 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = original;
                }
            });
        }

        const registerForm = document.getElementById('espace-register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async function (event) {
                event.preventDefault();
                const t = translations[currentLang] || translations.fr;
                const submitBtn = document.getElementById('espace-register-submit');
                const original = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

                const email = document.getElementById('espace-register-email').value.trim();
                const prefix = document.getElementById('espace-register-phone-prefix').value;
                const phone = document.getElementById('espace-register-phone').value.trim();
                const mot_de_passe = document.getElementById('espace-register-password').value;
                const mot_de_passe_confirmation = document.getElementById('espace-register-password-confirm').value;

                if (mot_de_passe !== mot_de_passe_confirmation) {
                    showToast(t['espace.passwordMismatch'], 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = original;
                    return;
                }

                try {
                    const resp = await fetch('/api/inscription', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ email, telephone: `${prefix}${phone}`, mot_de_passe, mot_de_passe_confirmation }),
                    });
                    const data = await resp.json();
                    if (!data.succes) {
                        showToast((data.erreurs && data.erreurs[0]) || t['espace.errorGeneric'], 'error');
                        return;
                    }
                    showToast(t['espace.registerSuccess'], 'success');
                    registerForm.reset();
                    // .reset() ne déclenche pas 'input' -- les barres de
                    // force/correspondance resteraient visuellement pleines
                    // sans cet appel explicite.
                    evaluerForcePassword();
                    // L'inscription ne connecte pas automatiquement (choix
                    // délibéré côté backend, §6.4) -- on redirige donc vers
                    // l'onglet Connexion plutôt que de tenter d'afficher la
                    // vue "connecté" à tort.
                    espaceSwitchTab('login');
                    document.getElementById('espace-login-identifiant').value = email;
                } catch (err) {
                    console.error('Espace Client — erreur d\'inscription :', err);
                    showToast(t['espace.errorGeneric'], 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = original;
                }
            });
        }
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch((err) => {
                console.warn('Service worker non enregistré :', err);
            });
        });
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        const btn = document.getElementById('pwa-install-btn');
        if (btn) btn.style.display = 'flex';
    });
