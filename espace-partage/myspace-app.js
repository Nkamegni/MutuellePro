/*
 * myspace-app.js — Couche DONNÉES/ÉTAT partagée
 * Extraite de myspace.html (référence 29/08/2026), section [DONNÉES/ÉTAT].
 * Importée par les 3 bootstraps (espace-client, espace-personnel, espace-partenaire).
 * NE CONTIENT AUCUNE LOGIQUE SPÉCIFIQUE À UN RÔLE — voir Addendum 1 du
 * document d'architecture pour la répartition données/état vs présentation.
 *
 * Statut : extraction Phase 1 — fonctions marquées [DONNÉES/ÉTAT] dans la
 * copie de référence annotée. Les fonctions [PRÉSENTATION-*] restent à
 * porter dans les modules de présentation de chaque rôle (Phase 2, non
 * traitée dans cette livraison).
 */

// --- État de session partagé --------------------------------------------
let sessionClient = null;
let sessionStaff = null;
let sessionPartenaire = null;

// --- Traduction (anticipation bilinguisme — cahier des charges Q6) ------
// Retourne le français en dur pour l'instant ; un seul point à modifier
// le jour où l'anglais sera construit (fichier de clés centralisé à venir).
function traduire(cle, textesParDefaut) {
    return (textesParDefaut && textesParDefaut[cle]) || cle;
}

// --- Convention d'erreur partagée (cahier des charges Q8) ----------------
// Remplace les appels alert() dispersés dans le code d'origine — un seul
// point à faire évoluer (ex. vers une bannière non bloquante plus tard).
function afficherErreur(message) {
    // Implémentation minimale de portage — à raccorder à un composant
    // visuel commun lors du portage de la présentation (Phase 2).
    alert(message || 'Une erreur est survenue.');
}

// --- Vérification des 3 sessions (rôle déterminé par le PWA appelant) ---
async function verifierSessions() {
    try {
        const respClient = await fetch('/api/session', { credentials: 'include' });
        sessionClient = respClient.status === 200 ? await respClient.json() : null;
    } catch (e) { sessionClient = null; }

    try {
        const respStaff = await fetch('/api/staff/session', { credentials: 'include' });
        sessionStaff = respStaff.status === 200 ? await respStaff.json() : null;
    } catch (e) { sessionStaff = null; }

    try {
        const respPartenaire = await fetch('/api/partenaire/session', { credentials: 'include' });
        sessionPartenaire = respPartenaire.status === 200 ? await respPartenaire.json() : null;
    } catch (e) { sessionPartenaire = null; }

    if (!sessionClient && !sessionStaff && !sessionPartenaire) {
        window.dispatchEvent(new CustomEvent('myspace:non-connecte'));
    } else {
        window.dispatchEvent(new CustomEvent('myspace:connecte', {
            detail: { sessionClient, sessionStaff, sessionPartenaire }
        }));
    }
}

async function deconnexionTout() {
    try {
        if (sessionClient) await fetch('/api/deconnexion', { method: 'POST', credentials: 'include' });
        if (sessionStaff) await fetch('/api/staff/deconnexion', { method: 'POST', credentials: 'include' });
        if (sessionPartenaire) await fetch('/api/partenaire/deconnexion', { method: 'POST', credentials: 'include' });
    } catch (err) { console.error(err); }
    sessionClient = null; sessionStaff = null; sessionPartenaire = null;
    window.dispatchEvent(new CustomEvent('myspace:non-connecte'));
}

// --- Navigation générique entre pages internes à un rôle -----------------
function afficherPage(nomPage) {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('visible'));
    document.querySelectorAll('.menu-item').forEach((b) => b.classList.remove('actif'));
    const page = document.getElementById('page-' + nomPage);
    const bouton = document.querySelector(`.menu-item[data-page="${nomPage}"]`);
    if (page) page.classList.add('visible');
    if (bouton) bouton.classList.add('actif');
    if (nomPage === 'securite' || nomPage === 'profil') viderTousLesChampsMotDePasse();
    if (window.innerWidth <= 768) {
        const menu = document.getElementById('menu-lateral');
        const overlay = document.getElementById('overlay-mobile');
        if (menu) menu.classList.remove('ouvert');
        if (overlay) overlay.style.display = 'none';
    }
}

function viderTousLesChampsMotDePasse() {
    document.querySelectorAll('input[type="password"]').forEach((champ) => { champ.value = ''; });
}

// --- Échappement HTML (sécurité — contenu externe avant innerHTML) -------
function echapperHtml(texte) {
    const div = document.createElement('div');
    div.textContent = texte == null ? '' : String(texte);
    return div.innerHTML;
}

// --- Vraisemblance d'email externe ---------------------------------------
function emailEstVraisemblable(email) {
    if (!email) return false;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
    if (!regex.test(email)) return false;
    if (email.includes('..')) return false;
    return true;
}

function verifierVraisemblanceChamp(idChamp, idMessage) {
    const valeur = document.getElementById(idChamp).value.trim();
    const messageEl = document.getElementById(idMessage);
    if (!valeur) {
        messageEl.textContent = '⚠️ Cette adresse est vide.';
        messageEl.style.cssText = 'font-size:11px; color:#dc2626; margin:2px 0 12px; display:block;';
        return;
    }
    if (!emailEstVraisemblable(valeur)) {
        messageEl.textContent = '⚠️ Cette adresse ne semble pas valide — vérifiez l\'orthographe.';
        messageEl.style.cssText = 'font-size:11px; color:#dc2626; margin:2px 0 12px; display:block;';
        return;
    }
    messageEl.style.display = 'none';
}

// --- Utilitaires génériques de force de mot de passe ----------------------
function barreMdp(idInput, idBarre) {
    const val = document.getElementById(idInput).value;
    const barre = document.getElementById(idBarre);
    let score = 0;
    if (val.length >= 10) score++;
    if (/[a-zA-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^a-zA-Z0-9]/.test(val)) score++;
    const pct = val.length ? (score / 4) * 100 : 0;
    barre.style.width = pct + '%';
    barre.style.backgroundColor = score <= 1 ? '#f87171' : score === 2 ? '#fb923c' : score === 3 ? '#facc15' : '#10b981';
}

function barreCorrespondance(idNouveau, idConfirm, idBarre) {
    const val = document.getElementById(idNouveau).value;
    const confirm = document.getElementById(idConfirm).value;
    const barre = document.getElementById(idBarre);
    if (!confirm) { barre.style.width = '0%'; barre.style.backgroundColor = '#d1d5db'; return; }
    let divergence = false;
    for (let i = 0; i < confirm.length; i++) { if (confirm[i] !== val[i]) { divergence = true; break; } }
    if (divergence) { barre.style.width = '100%'; barre.style.backgroundColor = '#ef4444'; return; }
    const pct = val.length ? Math.min(100, (confirm.length / val.length) * 100) : 0;
    barre.style.width = pct + '%';
    barre.style.backgroundColor = pct >= 100 ? '#10b981' : '#60a5fa';
}

// --- Hors-ligne (cahier des charges Q8) -----------------------------------
function initSurveillanceHorsLigne(afficherBanniere) {
    const majEtat = () => afficherBanniere(!navigator.onLine);
    window.addEventListener('online', majEtat);
    window.addEventListener('offline', majEtat);
    majEtat();
}

// --- Détection de mise à jour du service worker (cahier des charges Q7) --
function initDetectionMiseAJour(registration, afficherBanniereMaj) {
    if (!registration) return;

    if (registration.waiting) afficherBanniereMaj(registration);

    registration.addEventListener('updatefound', () => {
        const nouveauWorker = registration.installing;
        if (!nouveauWorker) return;
        nouveauWorker.addEventListener('statechange', () => {
            if (nouveauWorker.state === 'installed' && navigator.serviceWorker.controller) {
                afficherBanniereMaj(registration);
            }
        });
    });

    // Vérification active périodique — les lots sont irréguliers, on ne
    // peut pas compter uniquement sur le comportement par défaut du
    // navigateur (vérification à la navigation seulement).
    setInterval(() => registration.update(), 45 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
    });
}

function appliquerMiseAJour(registration) {
    if (!registration || !registration.waiting) return;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
}

export {
    verifierSessions, deconnexionTout, afficherPage, viderTousLesChampsMotDePasse,
    echapperHtml, emailEstVraisemblable, verifierVraisemblanceChamp,
    barreMdp, barreCorrespondance, traduire, afficherErreur,
    initSurveillanceHorsLigne, initDetectionMiseAJour, appliquerMiseAJour,
};
