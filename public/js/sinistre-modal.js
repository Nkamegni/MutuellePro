    // -------------------------------------------------------------
    // DÉCLARATION DE SINISTRE -- fiche simplifiée (19/08/2026). Réutilise
    // le mécanisme de référence + envoi WhatsApp/email déjà éprouvé sur
    // le devis, mais en autonome (pas de dépendance à MEMO_I18N, pour ne
    // rien risquer de casser sur le flux devis existant). En attendant le
    // vrai système de comptes/tickets (Volet 2), cette référence reste le
    // seul moyen de suivi -- à conserver par le client.
    // -------------------------------------------------------------
    function openSinistreModal() {
        const modal = document.getElementById('sinistreModal');
        if (modal) modal.classList.remove('hidden');
        const dateInput = document.getElementById('sinistre-date');
        if (dateInput && !dateInput.value) {
            dateInput.max = new Date().toISOString().split('T')[0]; // jamais une date future
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }

    function closeSinistreModal() {
        const modal = document.getElementById('sinistreModal');
        if (modal) modal.classList.add('hidden');
    }


    function generateSinistreRef() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
        return `SIN-${stamp}`;
    }

    async function submitSinistre() {
        const t = SINISTRE_I18N[currentLang] || SINISTRE_I18N.fr;

        const branche = document.getElementById('sinistre-branche');
        const brancheLabel = branche.options[branche.selectedIndex].text;
        const police = document.getElementById('sinistre-police').value.trim();
        const date = document.getElementById('sinistre-date').value;
        const description = document.getElementById('sinistre-description').value.trim();
        const nom = document.getElementById('sinistre-nom').value.trim();
        const prefix = document.getElementById('sinistre-phone-prefix').value;
        const phone = document.getElementById('sinistre-phone').value.trim();
        const email = document.getElementById('sinistre-email').value.trim();

        if (!date || !description || !nom || !phone || !email) {
            showToast(t.champsManquants, 'warning');
            return;
        }

        const ref = generateSinistreRef();
        const telephone = `${prefix}${phone}`;
        const now = new Date();
        const dateStr = now.toLocaleDateString(t.locale, { day: '2-digit', month: 'long', year: 'numeric' });

        // --- Message WhatsApp ---
        const lignesWa = [
            t.waTitle, '',
            `${t.waRef} ${ref}`,
            `${t.waBranche} ${brancheLabel}`,
        ];
        if (police) lignesWa.push(`${t.waPolice} ${police}`);
        lignesWa.push(
            `${t.waDate} ${date}`, '',
            t.waDesc, description, '',
            t.waClient,
            nom,
            `${t.waPhone} ${telephone}`,
            `📧 ${email}`,
            `🗂️ Situation du compte : ${situationCompteLigne(email)}`, '',
            t.waFooter
        );
        const messageWa = lignesWa.join('\n');

        // Même numéro WhatsApp central que le reste du site (section
        // Assistance) -- pas de champ "whatsapp" par agence dans
        // agencesData (seul "tel" existe), donc pas de routage par agence
        // ici, volontairement simple comme le reste de cette fiche.
        window.open(`https://wa.me/237697717334?text=${encodeURIComponent(messageWa)}`, '_blank');

        // Ticket backend (Helpdesk Volet 2, site.tickets) — en parallèle,
        // jamais bloquant (voir commentaire de creerTicketBackend).
        creerTicketBackend('sinistre', email, telephone, {
            branche: brancheLabel,
            police: police || undefined,
            date_sinistre: date,
            description,
            ref_memo: ref,
        });

        // --- E-mail (memo HTML, meme endpoint que le devis -- generique) ---
        const memoHtml = [
            `<strong>${t.emailIntro}</strong><br><br>`,
            `${t.waRef} <strong>${ref}</strong><br>`,
            `${t.waBranche} ${brancheLabel}<br>`,
            police ? `${t.waPolice} ${police}<br>` : '',
            `${t.waDate} ${date}<br><br>`,
            `${t.waDesc}<br>${description.replace(/\n/g, '<br>')}<br><br>`,
            `${t.waClient}<br>${nom}<br>${t.waPhone} ${telephone}<br>Email : ${email}<br>Situation du compte : ${situationCompteLigne(email)}`,
        ].join('');

        try {
            const formData = new FormData();
            formData.append('memo_complet', memoHtml);
            formData.append('subject', `${t.emailSubject} ${ref} — ${brancheLabel}`);
            const resp = await fetch('/api/send-quote-email', { method: 'POST', body: formData });
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || 'Echec envoi email');
            showToast(t.successMsg(ref), 'success');
        } catch (err) {
            console.error('Erreur envoi email sinistre:', err);
            showToast(t.errorMsg + ref, 'warning');
        }

        closeSinistreModal();
        document.getElementById('sinistre-form').reset();
    }
