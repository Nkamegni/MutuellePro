// Essais de lib/cotation.js avec une base simulée (aucune base réelle ici).
// Lancer : node tests/cotation.test.js
const assert = require('assert');
const { cotationAutomobile, construireAppelRc, calculerFractionnement, ErreurCotation } = require('../lib/cotation');

function jours(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1; }
function ajouterMois(iso, n) { // comportement PostgreSQL : fin de mois si le jour n'existe pas
    const [y, m, d] = iso.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1 + n, 1)); const dernier = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    t.setUTCDate(Math.min(d, dernier)); return t.toISOString().slice(0, 10);
}
const PALIERS = [[1, 60, 20], [61, 120, 40], [121, 180, 60], [181, 240, 80], [241, 365, 100]];

function fausseBase({ rc, dta } = {}) {
    const appels = [];
    return { appels, async query(sql, p) {
        appels.push({ sql, p });
        if (sql.includes('generate_series')) {
            let n = 1; while (n < 12 && !(ajouterMois(p[0], n) > p[1])) n++;
            return { rows: [{ nb_mois: n }] };
        }
        if (sql.includes('AS jours')) return { rows: [{ jours: jours(p[0], p[1]) }] };
        if (sql.includes('site.bareme_fractionnement')) {
            const l = PALIERS.find(([a, b]) => p[0] >= a && p[0] <= b);
            return { rows: l ? [{ palier: `${l[0]}-${l[1]}`, pourcentage: l[2] }] : [] };
        }
        if (sql.includes('fn_calculer_prime_rc_automobile')) return { rows: rc === undefined ? [] : [rc] };
        if (sql.includes('site.bareme_dta')) return { rows: dta ? [dta] : [] };
        throw new Error('requête inattendue : ' + sql.slice(0, 60));
    } };
}
const RC = { prime_base: '100000', surprime_matiere_inflam: '0', prime_totale: '100000', id_tarif: 7, id_bareme_base: 11,
             id_bareme_surprime: null, source_page: 4, force_fiscale_utilisee: 9, cylindree_utilisee: null, avertissements: [] };
const base = { categorieCode: '01', puissanceCv: 9, genreVehicule: 'VEHICULE', dateEffet: '2026-10-15', dateExpiration: '2027-10-14' };
let ok = 0; const test = async (nom, f) => { await f(); ok++; console.log('OK  ' + nom); };

(async () => {
    await test('hors pool, 1 an (365 j) : palier 100 %, prime nette = annuité', async () => {
        const c = await cotationAutomobile(fausseBase({ rc: RC }), base);
        assert.strictEqual(c.rc.fractionnement.pourcentage, 100); assert.strictEqual(c.rc.prime_nette_periode, 100000);
    });
    await test('hors pool, 60 jours = 20 %, 61 jours = 40 %', async () => {
        const a = await cotationAutomobile(fausseBase({ rc: RC }), { ...base, dateExpiration: '2026-12-13' }); // 60 j
        const b = await cotationAutomobile(fausseBase({ rc: RC }), { ...base, dateExpiration: '2026-12-14' }); // 61 j
        assert.strictEqual(a.rc.fractionnement.jours, 60); assert.strictEqual(a.rc.prime_nette_periode, 20000);
        assert.strictEqual(b.rc.fractionnement.jours, 61); assert.strictEqual(b.rc.prime_nette_periode, 40000);
    });
    await test('hors pool : 6 mois calendaires (15/10 -> 14/04) = 182 j = palier 80 %', async () => {
        const c = await cotationAutomobile(fausseBase({ rc: RC }), { ...base, dateExpiration: '2027-04-14' });
        assert.strictEqual(c.rc.fractionnement.jours, 182); assert.strictEqual(c.rc.fractionnement.pourcentage, 80);
    });
    await test('pool 04A : 15/01 -> 14/02 = 1 mois = 1/12, sans plafond 105 %', async () => {
        const c = await cotationAutomobile(fausseBase({ rc: RC }), { ...base, categorieCode: '04A', dateEffet: '2026-01-15', dateExpiration: '2026-02-14' });
        assert.strictEqual(c.rc.fractionnement.mode, 'MENSUEL_CALENDAIRE'); assert.strictEqual(c.rc.fractionnement.nb_mois, 1);
        assert.strictEqual(c.rc.prime_nette_periode, Math.round(100000 / 12));
    });
    await test('pool : mois entamé = mois entier (15/01 -> 15/02 = 2 mois)', async () => {
        const c = await cotationAutomobile(fausseBase({ rc: RC }), { ...base, categorieCode: '04B', dateEffet: '2026-01-15', dateExpiration: '2026-02-15' });
        assert.strictEqual(c.rc.fractionnement.nb_mois, 2);
    });
    await test('barème de fractionnement lu à la date d\'effet (jamais CURRENT_DATE)', async () => {
        const db = fausseBase({ rc: RC }); await cotationAutomobile(db, base);
        const q = db.appels.find((a) => a.sql.includes('site.bareme_fractionnement'));
        assert.ok(!q.sql.includes('CURRENT_DATE')); assert.strictEqual(q.p[1], '2026-10-15');
    });
    await test('tarif absent : annuité 0, tarif_absent, jamais présentable comme prix', async () => {
        const c = await cotationAutomobile(fausseBase({ rc: { ...RC, prime_base: null, prime_totale: null, avertissements: ['aucune ligne de base'] } }), base);
        assert.strictEqual(c.rc.annuite, 0); assert.strictEqual(c.rc.tarif_absent, true); assert.strictEqual(c.presentable_comme_prix, false);
        assert.ok(c.avertissements.includes('aucune ligne de base'));
    });
    await test('fonction sans ligne : traité comme tarif absent', async () => {
        const c = await cotationAutomobile(fausseBase({}), base); assert.strictEqual(c.rc.tarif_absent, true);
    });
    await test('détail honnête : DR, IAC/IPT, majorations non calculés ; complete = false', async () => {
        const c = await cotationAutomobile(fausseBase({ rc: RC }), base);
        assert.strictEqual(c.complete, false);
        for (const code of ['DEFENSE_RECOURS', 'IAC_IPT']) assert.strictEqual(c.calcule.garanties.find((g) => g.code === code).calcule, false);
        assert.strictEqual(c.calcule.modificateurs.find((m) => m.code === 'MAJORATIONS_ART9').calcule, false);
        assert.strictEqual(c.calcule.garanties.find((g) => g.code === 'RC').calcule, true);
    });
    await test('appel RC : notation nommée, seuls les paramètres renseignés (p_energie par défaut préservé)', async () => {
        const { sql, valeurs } = construireAppelRc({ categorieCode: '01', puissanceCv: 9, dateEffet: '2026-10-15' });
        assert.ok(sql.includes('p_categorie_code => $1') && sql.includes('p_force_fiscale => $2') && sql.includes('p_date_effet => $3'));
        assert.ok(!sql.includes('p_energie')); assert.deepStrictEqual(valeurs, ['01', 9, '2026-10-15']);
        assert.ok(construireAppelRc({ categorieCode: '01', energie: 'DIESEL' }).sql.includes('p_energie => $2'));
    });
    await test('DTA par barème : montant et tranche de CV renvoyés', async () => {
        const c = await cotationAutomobile(fausseBase({ rc: RC, dta: { code_categorie: '01', libelle: 'Hors Transports Communs 01, 8-13 CV', montant: '50000', cv_min: 8, cv_max: 13 } }), base);
        assert.deepStrictEqual(c.dta, { statut: 'du', montant: 50000, categorie: '01', libelle: 'Hors Transports Communs 01, 8-13 CV', tranche: { cv_min: 8, cv_max: 13 } });
    });
    await test('DTA : aucune recherche de véhicule (pas de lecture de site.mouvements)', async () => {
        const db = fausseBase({ rc: RC }); await cotationAutomobile(db, { ...base, vin: 'JTMHV05J404123456' });
        assert.ok(!db.appels.some((a) => a.sql.includes('site.mouvements')));
    });
    await test('DTA sans genre : non calculée, sans erreur', async () => {
        const c = await cotationAutomobile(fausseBase({ rc: RC }), { ...base, genreVehicule: null }); assert.strictEqual(c.dta.statut, 'non_calculee');
    });
    await test('VIN normalisé A-Z/0-9 ; flotte 99 refusée ; dates incohérentes refusées', async () => {
        const db = fausseBase({ rc: RC }); await cotationAutomobile(db, { ...base, vin: 'jt-mh v05j 404' });
        assert.ok(db.appels.find((a) => a.sql.includes('fn_calculer')).p.includes('JTMHV05J404'));
        await assert.rejects(cotationAutomobile(fausseBase({ rc: RC }), { ...base, categorieCode: '99' }), ErreurCotation);
        await assert.rejects(cotationAutomobile(fausseBase({ rc: RC }), { ...base, dateExpiration: '2026-10-01' }), ErreurCotation);
        await assert.rejects(cotationAutomobile(fausseBase({ rc: RC }), { ...base, puissanceCv: 'abc' }), ErreurCotation);
    });
    console.log(`\n${ok} essais réussis`);
})().catch((e) => { console.error('ÉCHEC :', e.message); process.exit(1); });
