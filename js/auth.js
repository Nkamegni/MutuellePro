
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
    function preCheckCompteExistant(identifiant) {
        if (!identifiant || compteExistantCache[identifiant] !== undefined) return;
        compteExistantCache[identifiant] = null; // marque "en cours" pour éviter les doublons
        fetch(`/api/verifier-compte?identifiant=${encodeURIComponent(identifiant)}`)
            .then((r) => r.json())
            .then((data) => {
                compteExistantCache[identifiant] = data.succes ? data.existe : null;
            })
            .catch(() => {
                compteExistantCache[identifiant] = null;
            });
    }

    // Ligne "Situation du compte" combinée (existence du compte + statut
    // initial du ticket, toujours "Reçu" à ce stade puisque le ticket
    // vient d'être créé — voir site.statut_ticket, id=1 par défaut).
    function situationCompteLigne(identifiant) {
        const t = translations[currentLang] || translations.fr;
        const existe = compteExistantCache[identifiant];
        const compteLabel = existe === true ? t['espace.statutClientInscrit']
            : existe === false ? t['espace.statutNouveauContact']
            : t['espace.statutAVerifier'];
        return `${compteLabel} — ${t['espace.statutRecu']}`;
    }
