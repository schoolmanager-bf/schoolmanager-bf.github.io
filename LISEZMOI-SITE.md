# 🌐 Site web SchoolManager BF — Guide de mise en ligne

Ce dossier contient le **site web du projet** (organisation GitHub : `schoolmanager-bf`) :
- `index.html` — la page d'accueil animée (présentation + téléchargement)
- `verification.html` — la page de vérification des QR codes (utilisable par les parents, même à la maison)
- `download/` — l'installateur SchoolManager 1.7.0 à télécharger
  (⚠️ l'outil de génération des licences est PRIVÉ : il n'est jamais publié sur le site,
  il est fourni uniquement à l'administration de l'établissement)

## 🚀 Option A — GitHub Pages (gratuit, recommandé — DÉJÀ FAIT ✅)

1. Le site est actuellement sur le dépôt **`dieudo07/dieudo07.github.io`** : **`https://dieudo07.github.io/`**
2. Pour l'héberger sous l'organisation `schoolmanager-bf` :
   - Créez le dépôt `schoolmanager-bf/schoolmanager-bf.github.io` dans l'organisation,
   - déplacez-y tout le contenu de ce dossier (`index.html`, `verification.html`, `download/`, `assets/`),
   - puis **Settings → Pages** : « Deploy from a branch » → `main` → `/ (root)`.
3. Le site sera alors en ligne à **`https://schoolmanager-bf.github.io/`**.
4. Pensez ensuite à mettre à jour l'adresse de vérification dans SchoolManager (Paramètres → Sécurité des documents).

## 🚀 Option B — Netlify Drop (gratuit, sans Git)

1. Ouvrez https://app.netlify.com/drop
2. Glissez-déposez le contenu de ce dossier.
3. L'adresse publique s'affiche (ex. `https://schoolmanager-xxxx.netlify.app`).
4. Vous pouvez la personnaliser dans Netlify → Domain settings.

## 🚀 Option C — N'importe quel hébergement web (FTP)

Téléversez le contenu du dossier à la racine de votre espace web.
Le site doit être accessible à une adresse type : `https://votre-domaine.com/`

## 📲 Activer la vérification à la maison dans SchoolManager

Une fois le site en ligne :

1. Dans SchoolManager, ouvrez **Paramètres → Sécurité des documents**.
2. Dans le champ **« Adresse personnalisée (optionnel) »**, saisissez :
   - Site actuel : `https://dieudo07.github.io/verification.html`
   - Après migration : `https://schoolmanager-bf.github.io/verification.html`
   - (ou l'adresse Netlify/hébergement équivalente, **terminant par `verification.html`**)
3. Cliquez sur **« 💾 Enregistrer »**.
4. **Régénérez les bulletins et reçus** : leurs QR pointeront désormais vers le site public.

👉 Résultat : un parent scanne le QR avec n'importe quel téléphone, **où qu'il soit**
(même à la maison, sans Wi-Fi de l'école) → la page s'ouvre → ✅ AUTHENTIQUE ou ❌ FALSIFIÉ,
avec les informations de l'élève.

## 🧪 Tester

- Avant mise en ligne : ouvrez `index.html` en local — tout fonctionne sans serveur.
- Page de vérification : ouvrez `verification.html` puis utilisez le bouton
  **« 🧪 QR bulletin valide (démo) »** → ✅ AUTHENTIQUE.
- Après mise en ligne : scannez un QR d'un **nouveau document** (régénéré) avec votre téléphone.

## ⚠️ Notes de sécurité

- La page de vérification ne stocke **aucune donnée** : tout se calcule dans le navigateur.
- La clé secrète de l'école reste dans le QR (empreinte) — la vérification compare l'empreinte,
  elle ne révèle jamais la clé.
- Si l'école change sa clé (Paramètres → Sécurité), les parents doivent saisir la nouvelle clé
  dans le champ « Clé de sécurité » de la page — ou mieux : régénérer les documents.
