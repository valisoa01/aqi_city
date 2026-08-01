# AQI Dashboard — React

Dashboard React (Vite + Recharts) qui affiche les données AQI de votre warehouse Neon,
via une fonction serverless Vercel (`/api/aqi.js`) qui interroge la base directement
en HTTP (pas besoin de backend séparé).

## Schéma attendu

```
fact_aqi(fact_id, city_id, time_id, aqi, pm25, pm10, no2, o3)
dim_city(city_id, city, country, latitude, longitude)
dim_time(time_id, timestamp_utc, date, hour, day_of_week, is_weekend)
```

Si vos noms de colonnes diffèrent, adaptez la requête dans `api/aqi.js`.

## 1. Installation locale

```bash
npm install
cp .env.example .env
# éditez .env et mettez votre vraie DATABASE_URL (connexion Neon)
```

## 2. Lancer en local

Le frontend seul (sans API) :
```bash
npm run dev
```

Pour tester l'API `/api/aqi` en local, installez la CLI Vercel et utilisez `vercel dev`
à la place de `npm run dev` — ça fait tourner le frontend ET les fonctions serverless
ensemble :
```bash
npm install -g vercel
vercel dev
```

## 3. Déployer sur Vercel

```bash
npm install -g vercel
vercel login
vercel
```

Puis, **dans le dashboard Vercel** (pas dans le code !) :
- Allez dans votre projet → Settings → Environment Variables
- Ajoutez `DATABASE_URL` avec votre vraie connexion Neon
- Redéployez (`vercel --prod`)

Votre dashboard sera accessible à une URL publique du type `https://votre-projet.vercel.app`.

## Sécurité

- `DATABASE_URL` ne doit **jamais** être commit dans le repo Git (`.env` est dans `.gitignore`)
- Utilisez un utilisateur Postgres en lecture seule si possible pour la connexion utilisée ici,
  plutôt que le compte owner complet
# aqi_city
