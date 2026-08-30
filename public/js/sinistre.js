// ===================================================================
// sinistre.js -- Fiche simplifiee de declaration de sinistre.
// Raccordee a POST /api/tickets depuis le 22/08/2026 (systeme de
// tickets de la session myspace.html), avec repli sur une reference
// locale si l'appel echoue -- aucune declaration jamais perdue.
//
// CHARGE APRES ui-commun.js (showToast) et dictionnaire-langues.js
// (currentLang).
//
// Extrait d'index.html le 25/08/2026.
// ===================================================================

    function openSinistreModal() {
        const modal = document.getElementById('sinistreModal');
        if (modal) modal.classList.remove('hidden');
        const dateInput = document.getElementById('sinistre-date');
        if (dateInput && !dateInput.value) {
            dateInput.max = new Date().toISOString().split('T')[0]; // jamais une date future
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }


    // Ferme #sinistreModal sans envoyer.
    function closeSinistreModal() {
        const modal = document.getElementById('sinistreModal');
        if (modal) modal.classList.add('hidden');
    }


    // Référence de repli, générée côté client -- n'est utilisée QUE si
    // l'appel à POST /api/tickets échoue (cf. submitSinistre) : la vraie
    // référence définitive (DSIN-...) vient du serveur, jamais de cette
    // fonction en fonctionnement normal.
    function generateSinistreRef() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
        return `SIN-${stamp}`;
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
            waSuivi: '💡 Pour suivre ce dossier en ligne, rendez-vous sur mutuelleproassurances.com/suivi-ticket.html avec ce même e-mail ou ce même téléphone — aucun compte n\'est nécessaire.',
            emailSuivi: '💡 Pour suivre ce dossier en ligne, rendez-vous sur <a href="https://mutuelleproassurances.com/suivi-ticket.html">mutuelleproassurances.com/suivi-ticket.html</a> avec ce même e-mail ou ce même téléphone — aucun compte n\'est nécessaire.',
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
            waSuivi: '💡 To track this case online, go to mutuelleproassurances.com/suivi-ticket.html with this same email or phone number — no account needed.',
            emailSuivi: '💡 To track this case online, go to <a href="https://mutuelleproassurances.com/suivi-ticket.html">mutuelleproassurances.com/suivi-ticket.html</a> with this same email or phone number — no account needed.',
            emailSubject: 'Claim Declaration',
            emailIntro: 'New claim declaration received via the website.',
            successMsg: (ref) => `Declaration sent — reference ${ref}. Keep this number, it will allow tracking of your case.`,
            errorMsg: 'The WhatsApp declaration was prepared successfully, but sending the email failed. Your reference remains valid: ',
        },
    };


    // Cœur de la fiche de sinistre : valide les champs, crée le ticket
    // (POST /api/tickets, système de la session myspace.html -- voir
    // SESSIONS_LIEES_MUTUELLEPRO.md), envoie WhatsApp + e-mail avec la
    // référence obtenue. Repli sur generateSinistreRef si le serveur de
    // tickets est injoignable -- aucune déclaration jamais perdue.
    async function submitSinistre() {
        const t = SINISTRE_I18N[currentLang] || SINISTRE_I18N.fr;

        const branche = document.getElementById('sinistre-branche');
        const brancheLabel = branche.options[branche.selectedIndex].text;
        const police = document.getElementById('sinistre-police').value.trim();
        const date = document.getElementById('sinistre-date').value;
        const description = document.getElementById('sinistre-description').value.trim();
        const nom = document.getElementById('sinistre-nom').value.trim();
        const email = document.getElementById('sinistre-email').value.trim();
        const prefix = document.getElementById('sinistre-phone-prefix').value;
        const phone = document.getElementById('sinistre-phone').value.trim();

        if (!date || !description || !nom || !email || !phone) {
            showToast(t.champsManquants, 'warning');
            return;
        }

        // Garde anti-double-clic -- pas une vraie limitation de débit (ça
        // doit être fait côté serveur, sur /api/tickets, actuellement sans
        // protection confirmée par la session myspace.html le 22/08/2026 --
        // juste un filet local contre un double envoi accidentel pendant
        // que la requête est en cours.
        const boutonEnvoi = document.getElementById('sinistre-submit-btn');
        if (boutonEnvoi) boutonEnvoi.disabled = true;

        const telephone = `${prefix}${phone}`;
        const now = new Date();
        const dateStr = now.toLocaleDateString(t.locale, { day: '2-digit', month: 'long', year: 'numeric' });

        // --- Étape 1 : création du ticket (source de vérité pour la
        // référence) -- raccordement du 22/08/2026, suite aux réponses de
        // la session myspace.html. Si cet appel échoue (serveur de tickets
        // indisponible, etc.), on NE PERD JAMAIS la déclaration : repli sur
        // une référence générée localement, WhatsApp/e-mail partent quand
        // même -- mieux vaut une référence non traçable qu'une déclaration
        // perdue.
        let ref = generateSinistreRef();
        let refEstTraçable = false;
        try {
            const respTicket = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'sinistre',
                    email: email,
                    telephone: telephone,
                    contenu: { branche: brancheLabel, police: police || null, date, description, nom },
                }),
            });
            const dataTicket = await respTicket.json();
            if (respTicket.ok && dataTicket.succes && dataTicket.code_ticket) {
                ref = dataTicket.code_ticket;
                refEstTraçable = true;
            } else {
                console.warn('Création de ticket refusée, repli sur référence locale :', dataTicket);
            }
        } catch (err) {
            console.error('Erreur de connexion à /api/tickets, repli sur référence locale :', err);
        }

        // --- Message WhatsApp ---
        const lignesWa = [
            t.waTitle, '',
            `${t.waRef} ${ref}`,
            `${t.waBranche} ${brancheLabel}`,
        ];
        if (police) lignesWa.push(`${t.waPolice} ${police}`);
        lignesWa.push(`${t.waDate} ${date}`, '', t.waDesc, description, '', t.waClient, nom, `${t.waPhone} ${telephone}`, '');
        // Le rappel "créez un compte avec ce même e-mail/téléphone pour le
        // suivi" n'a de sens que si la référence vient vraiment du système
        // de tickets -- pas pour une référence de repli purement locale.
        if (refEstTraçable) lignesWa.push(t.waSuivi);
        lignesWa.push(t.waFooter);
        const messageWa = lignesWa.join('\n');

        window.open(`https://wa.me/237697717334?text=${encodeURIComponent(messageWa)}`, '_blank');

        // --- E-mail (memo HTML, meme endpoint que le devis -- generique) ---
        const memoHtml = [
            `<strong>${t.emailIntro}</strong><br><br>`,
            `${t.waRef} <strong>${ref}</strong><br>`,
            `${t.waBranche} ${brancheLabel}<br>`,
            police ? `${t.waPolice} ${police}<br>` : '',
            `${t.waDate} ${date}<br><br>`,
            `${t.waDesc}<br>${description.replace(/\n/g, '<br>')}<br><br>`,
            `${t.waClient}<br>${nom}<br>${email}<br>${t.waPhone} ${telephone}`,
            refEstTraçable ? `<br><br>${t.emailSuivi}` : '',
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
        } finally {
            if (boutonEnvoi) boutonEnvoi.disabled = false;
        }

        closeSinistreModal();
        document.getElementById('sinistre-form').reset();
    }

    // Mémorise la branche pour laquelle l'étape 3 a été débloquée (passage
    // effectif par l'étape 2). Si l'utilisateur change de branche, l'accès
    // direct à l'étape 3 doit se reverrouiller : les champs "Détails du
    // Risque" affichés ne correspondraient plus à la nouvelle branche tant
    // qu'on n'y est pas repassé.
