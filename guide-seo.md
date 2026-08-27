# Guide : Soumettre SchoolManager BF aux moteurs de recherche

## 🟢 ÉTAPE 1 : Google Search Console

### 1.1 Créer un compte
1. Va sur **https://search.google.com/search-console**
2. Connecte-toi avec ton compte Google
3. Clique sur **"+ Ajouter une propriété"**
4. Choisis **"Préfixe d'URL"** et entre : `https://schoolmanager-bf.github.io`
5. Clique sur **"Continuer"**

### 1.2 Vérifier la propriété
Google te propose plusieurs méthodes. La plus simple pour GitHub Pages :

**Méthode HTML (recommandée) :**
1. Choisis **"Balise HTML"**
2. Google te donne un code comme : `<meta name="google-site-verification" content="XXXXXX" />`
3. **Envoie-moi le code** et je l'ajoute au site
4. Clique sur **"Vérifier"**

### 1.3 Soumettre le sitemap
1. Dans le menu gauche, clique sur **"Sitemaps"**
2. Entre : `sitemap.xml`
3. Clique sur **"Soumettre"**
4. ✅ Google va crawler tes 7 pages sous 24-48h

### 1.4 Demander l'indexation
1. En haut, utilise l'outil **"Demander l'indexation"**
2. Entre l'URL de ta page d'accueil : `https://schoolmanager-bf.github.io`
3. Répète pour les pages importantes (verification.html, faq.html)

---

## 🔵 ÉTAPE 2 : Bing Webmaster Tools

### 2.1 Créer un compte
1. Va sur **https://www.bing.com/webmasters**
2. Connecte-toi avec un compte Microsoft, Google ou Facebook
3. Clique sur **"Ajouter votre site"**
4. Entre : `https://schoolmanager-bf.github.io`
5. Clique sur **"Ajouter"**

### 2.2 Vérifier la propriété
**Méthode XML File (recommandée) :**
1. Bing te donne un fichier comme `BingSiteAuth.xml`
2. **Télécharge-le** et envoie-le moi, je le mets dans le dossier du site
3. Clique sur **"Vérifier"**

### 2.3 Soumettre le sitemap
1. Va dans **"Sitemaps"** (menu gauche)
2. Entre : `https://schoolmanager-bf.github.io/sitemap.xml`
3. Clique sur **"Soumettre"**

---

## 🟡 ÉTAPE 3 : Yandex (optionnel - Russie/Afrique)

1. Va sur **https://webmaster.yandex.com**
2. Ajoute `https://schoolmanager-bf.github.io`
3. Vérifie via fichier HTML ou meta tag
4. Soumets le sitemap

---

## 📊 ÉTAPE 4 : IndexNow (instantané)

IndexNow ping Bing, Yandex et Seznam automatiquement. Je peux ajouter un script :

```
https://api.indexnow.org/indexnow?url=...
```

---

## ⏱️ Délais d'indexation

| Moteur | Délai moyen | Action |
|--------|-------------|--------|
| Google | 24-72h | Sitemap soumis + demande d'indexation |
| Bing | 24-48h | Sitemap soumis |
| DuckDuckGo | 1-2 semaines | Utilise l'index Bing |
| Yahoo | 1-2 semaines | Utilise l'index Bing |

---

## 📋 Contact

**Bénéwendé Dieudonné Tassembédo**
- 📞 +226 77 67 69 31
- 📧 dieudonnetassembedo07@gmail.com
- 💬 WhatsApp: https://wa.me/22677676931
