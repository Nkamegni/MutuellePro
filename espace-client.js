    // Ouvre la modale et détermine immédiatement l'état de connexion en
    // interrogeant /api/mes-tickets : un 401 signifie "non connecté" (vue
    // anonyme), un succès signifie "connecté" (vue tickets). Évite un
    // endpoint dédié "qui suis-je" -- une seule requête sert les deux buts.
    async function openEspaceClientModal() {
        const modal = document.getElementById('espaceClientModal');
        if (modal) modal.classList.remove('hidden');
        await espaceRefreshState();
    }

    function closeEspaceClientModal() {
        const modal = document.getElementById('espaceClientModal');
        if (modal) modal.classList.add('hidden');
    }

    async function espaceRefreshState() {
        const vueAnonyme = document.getElementById('espace-vue-anonyme');
        const vueConnecte = document.getElementById('espace-vue-connecte');
        refreshTopbarSessionIndicator();
        try {
            const resp = await fetch('/api/mes-tickets', { credentials: 'include' });
            if (resp.status === 401) {
                vueAnonyme.classList.remove('hidden');
                vueConnecte.classList.add('hidden');
                return;
            }
            const data = await resp.json();
            if (!data.succes) throw new Error('mes-tickets: réponse en échec');
            vueAnonyme.classList.add('hidden');
            vueConnecte.classList.remove('hidden');
            espaceRenderTickets(data.tickets);
        } catch (err) {
            console.error('Espace Client — erreur de vérification de session :', err);
            // En cas de doute (erreur réseau), on retombe sur la vue anonyme
            // plutôt que de laisser un état intermédiaire incohérent.
            vueAnonyme.classList.remove('hidden');
            vueConnecte.classList.add('hidden');
        }
    }

    // -------------------------------------------------------------
    // Évaluateurs discrets de robustesse/correspondance du mot de passe
    // (19/08/2026, sur demande de Roger) -- simples barres de progression
    // colorées de 4px de haut, aucun texte intrusif, mise à jour en direct.
    // -------------------------------------------------------------
    function evaluerForcePassword() {
        const val = document.getElementById('espace-register-password').value;
        const bar = document.getElementById('espace-password-strength-bar');
        if (!bar) return;
        let score = 0;
        if (val.length >= 10) score++;
        if (/[a-zA-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^a-zA-Z0-9]/.test(val)) score++;
        const pct = val.length ? (score / 4) * 100 : 0;
        bar.style.width = pct + '%';
        bar.className = 'h-full transition-all duration-200 ' + (
            score <= 1 ? 'bg-red-400' : score === 2 ? 'bg-orange-400' : score === 3 ? 'bg-yellow-400' : 'bg-emerald-500'
        );
        // Le mot de passe de référence a changé -- la correspondance
        // affichée dans le second champ doit se recalculer aussitôt.
        evaluerCorrespondancePassword();
    }


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

        // -------------------------------------------------------------
    // Indicateur "connecté" dans la topbar (19/08/2026, sur demande de
    // Roger) -- utilise /api/session, volontairement distinct de
    // /api/mes-tickets pour ne pas charger la liste complète des tickets
    // sur CHAQUE page vue alors que la topbar a juste besoin de savoir
    // si on est connecté. Appelé au chargement de la page ET à chaque
    // fois que l'état de connexion change (connexion/inscription/
    // déconnexion), via espaceRefreshState().
    // -------------------------------------------------------------
    function refreshTopbarSessionIndicator() {
        const link = document.getElementById('topbar-espace-link');
        const icon = document.getElementById('topbar-espace-icon');
        const label = document.getElementById('topbar-espace-label');
        if (!link || !icon || !label) return;

        fetch('/api/session', { credentials: 'include' })
            .then((r) => (r.status === 200 ? r.json() : null))
            .then((data) => {
                const t = translations[currentLang] || translations.fr;
                if (data && data.succes && data.connecte) {
                    link.classList.remove('bg-brandPurple/40', 'hover:bg-brandPurple', 'border-purple-400/30');
                    link.classList.add('bg-emerald-500', 'hover:bg-emerald-400', 'border-emerald-300', 'shadow-[0_0_8px_rgba(16,185,129,0.6)]');
                    icon.className = 'fa-solid fa-circle-user text-[9px] lg:text-xs';
                    const identifiant = (data.compte && data.compte.email) || '';
                    const court = identifiant.length > 18 ? identifiant.slice(0, 15) + '…' : identifiant;
                    label.removeAttribute('data-i18n'); // évite qu'un changement de langue n'écrase l'email affiché
                    label.textContent = court || t['topbar.loggedInAs'];
                } else {
                    link.classList.add('bg-brandPurple/40', 'hover:bg-brandPurple', 'border-purple-400/30');
                    link.classList.remove('bg-emerald-500', 'hover:bg-emerald-400', 'border-emerald-300', 'shadow-[0_0_8px_rgba(16,185,129,0.6)]');
                    icon.className = 'fa-solid fa-user-lock text-[9px] lg:text-xs';
                    label.setAttribute('data-i18n', 'topbar.clientSpace');
                    label.textContent = t['topbar.clientSpace'];
                }
            })
            .catch((err) => console.error('Indicateur topbar — erreur de vérification de session :', err));
    }

    function espaceRenderTickets(tickets) {
        const t = translations[currentLang] || translations.fr;
        const container = document.getElementById('espace-tickets-list');
        if (!container) return;

        if (!tickets || tickets.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-400 text-center py-6">${t['espace.noTickets']}</p>`;
            return;
        }

        const labelKey = currentLang === 'en' ? 'type_libelle_en' : 'type_libelle_fr';
        container.innerHTML = tickets.map((ticket) => {
            const dateStr = new Date(ticket.date_creation).toLocaleDateString(
                currentLang === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }
            );
            return `
                <div class="border border-gray-200 rounded-xl p-3">
                    <div class="flex justify-between items-start gap-2 mb-1">
                        <span class="text-xs font-extrabold text-navy">${ticket[labelKey]}</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${espaceStatutBadgeClass(ticket.code_statut_ticket)}">${espaceStatutLabel(ticket.code_statut_ticket)}</span>
                    </div>
                    <p class="text-[11px] text-gray-400">${ticket.code_ticket} — ${dateStr}</p>
                </div>
            `;
        }).join('');
    }

    // Libellés de statut affichés (bilingues, cohérents avec data-i18n)
    // en fonction du code_statut_ticket renvoyé par /api/mes-tickets.
    function espaceStatutLabel(codeStatut) {
        const t = translations[currentLang] || translations.fr;
        const map = { recu: t['espace.statutRecu'], en_cours: t['espace.statutEnCours'], resolu: t['espace.statutResolu'] };
        return map[codeStatut] || codeStatut;
    }
    function espaceStatutBadgeClass(codeStatut) {
        if (codeStatut === 'resolu') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (codeStatut === 'en_cours') return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-blue-50 text-blue-700 border-blue-200'; // recu
    }


    function evaluerCorrespondancePassword() {
        const val = document.getElementById('espace-register-password').value;
        const confirmEl = document.getElementById('espace-register-password-confirm');
        const bar = document.getElementById('espace-password-match-bar');
        if (!confirmEl || !bar) return;
        const confirm = confirmEl.value;

        if (!confirm) {
            bar.style.width = '0%';
            bar.className = 'h-full w-0 bg-gray-300 transition-all duration-200';
            return;
        }

        // Rouge dès la première divergence de caractère, quelle que soit
        // sa position -- pas d'attente jusqu'à la fin de la saisie.
        let divergence = false;
        for (let i = 0; i < confirm.length; i++) {
            if (confirm[i] !== val[i]) { divergence = true; break; }
        }

        if (divergence) {
            bar.style.width = '100%';
            bar.className = 'h-full transition-all duration-200 bg-red-500';
            return;
        }

        const pct = val.length ? Math.min(100, (confirm.length / val.length) * 100) : 0;
        bar.style.width = pct + '%';
        bar.className = 'h-full transition-all duration-200 ' + (pct >= 100 ? 'bg-emerald-500' : 'bg-blue-400');
    }

    function espaceSwitchTab(tab) {
        const tabLogin = document.getElementById('espace-tab-login');
        const tabRegister = document.getElementById('espace-tab-register');
        const formLogin = document.getElementById('espace-login-form');
        const formRegister = document.getElementById('espace-register-form');

        const activeClasses = ['bg-white', 'text-navy', 'shadow-sm'];
        const inactiveClasses = ['text-gray-500'];

        if (tab === 'register') {
            formLogin.classList.add('hidden');
            formRegister.classList.remove('hidden');
            tabRegister.classList.add(...activeClasses);
            tabRegister.classList.remove(...inactiveClasses);
            tabLogin.classList.remove(...activeClasses);
            tabLogin.classList.add(...inactiveClasses);
        } else {
            formRegister.classList.add('hidden');
            formLogin.classList.remove('hidden');
            tabLogin.classList.add(...activeClasses);
            tabLogin.classList.remove(...inactiveClasses);
            tabRegister.classList.remove(...activeClasses);
            tabRegister.classList.add(...inactiveClasses);
        }
    }

    async function espaceLogout() {
        try {
            await fetch('/api/deconnexion', { method: 'POST', credentials: 'include' });
        } catch (err) {
            console.error('Espace Client — erreur de déconnexion :', err);
        }
        const t = translations[currentLang] || translations.fr;
        showToast(t['espace.logoutSuccess'], 'success');
        await espaceRefreshState();
    }
