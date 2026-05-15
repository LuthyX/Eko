# Eko

```
Eko
├─ backend
│  ├─ app
│  │  ├─ core
│  │  │  ├─ config.py
│  │  │  ├─ database.py
│  │  │  └─ security.py
│  │  ├─ main.py
│  │  ├─ models
│  │  │  ├─ user.py
│  │  │  └─ wallet.py
│  │  ├─ routers
│  │  │  ├─ auth.py
│  │  │  ├─ credit.py
│  │  │  ├─ health.py
│  │  │  ├─ match.py
│  │  │  ├─ score.py
│  │  │  └─ webhooks.py
│  │  ├─ schemas
│  │  │  ├─ auth.py
│  │  │  ├─ credit.py
│  │  │  ├─ match.py
│  │  │  └─ score.py
│  │  ├─ seeds
│  │  │  ├─ seed_traders.py
│  │  │  └─ __init__.py
│  │  └─ services
│  │     ├─ credit.py
│  │     ├─ ekoscore.py
│  │     ├─ matching.py
│  │     ├─ ml_artifacts
│  │     │  ├─ isolation_forest.pkl
│  │     │  ├─ risk_classifier.pkl
│  │     │  └─ scaler.pkl
│  │     ├─ squad.py
│  │     ├─ wallet.py
│  │     └─ __init__.py
│  ├─ eko.db
│  ├─ README.md
│  └─ requirements.txt
├─ jobseeker-app
│  └─ README.md
├─ README.md
└─ trader-app
   ├─ .eslintrc.cjs
   ├─ .vercelignore
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ postcss.config.js
   ├─ README.md
   ├─ src
   │  ├─ api
   │  │  ├─ client.js
   │  │  └─ services.js
   │  ├─ App.jsx
   │  ├─ components
   │  │  ├─ Layout.jsx
   │  │  └─ UI.jsx
   │  ├─ context
   │  │  └─ AppContext.jsx
   │  ├─ index.css
   │  ├─ main.jsx
   │  └─ pages
   │     ├─ ApplicantsPage.jsx
   │     ├─ DashboardPage.jsx
   │     ├─ EarningsPage.jsx
   │     ├─ EkoCreditPage.jsx
   │     ├─ EkoScorePage.jsx
   │     ├─ JobCompletePage.jsx
   │     ├─ JobProgressPage.jsx
   │     ├─ JobsNearYouPage.jsx
   │     ├─ LenderPortalPage.jsx
   │     ├─ MyApplicationsPage.jsx
   │     ├─ MyPostingsPage.jsx
   │     ├─ RepaymentTrackerPage.jsx
   │     ├─ TraderDetailPage.jsx
   │     └─ WalletPage.jsx
   ├─ tailwind.config.js
   ├─ vercel.json
   └─ vite.config.js

```
```
Eko
├─ backend
│  ├─ app
│  │  ├─ core
│  │  │  ├─ config.py
│  │  │  ├─ database.py
│  │  │  └─ security.py
│  │  ├─ main.py
│  │  ├─ models
│  │  │  ├─ user.py
│  │  │  └─ wallet.py
│  │  ├─ routers
│  │  │  ├─ auth.py
│  │  │  ├─ credit.py
│  │  │  ├─ health.py
│  │  │  ├─ match.py
│  │  │  ├─ score.py
│  │  │  └─ webhooks.py
│  │  ├─ schemas
│  │  │  ├─ auth.py
│  │  │  ├─ credit.py
│  │  │  ├─ match.py
│  │  │  └─ score.py
│  │  ├─ seeds
│  │  │  ├─ seed_traders.py
│  │  │  └─ __init__.py
│  │  └─ services
│  │     ├─ credit.py
│  │     ├─ ekoscore.py
│  │     ├─ matching.py
│  │     ├─ ml_artifacts
│  │     │  ├─ isolation_forest.pkl
│  │     │  ├─ risk_classifier.pkl
│  │     │  └─ scaler.pkl
│  │     ├─ squad.py
│  │     ├─ wallet.py
│  │     └─ __init__.py
│  ├─ eko.db
│  ├─ README.md
│  └─ requirements.txt
├─ jobseeker-app
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ postcss.config.js
│  ├─ public
│  │  ├─ favicon.svg
│  │  └─ icons.svg
│  ├─ README.md
│  ├─ src
│  │  ├─ api
│  │  │  └─ client.js
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  ├─ hero.png
│  │  │  ├─ react.svg
│  │  │  └─ vite.svg
│  │  ├─ components
│  │  │  ├─ AuthPage.jsx
│  │  │  ├─ JobSeekerOnboarding.jsx
│  │  │  ├─ JobsNearYouPage.jsx
│  │  │  └─ MyApplications.jsx
│  │  ├─ index.css
│  │  └─ main.jsx
│  ├─ tailwind.config.js
│  └─ vite.config.js
├─ README.md
└─ trader-app
   ├─ .eslintrc.cjs
   ├─ .vercelignore
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ postcss.config.js
   ├─ README.md
   ├─ src
   │  ├─ api
   │  │  ├─ client.js
   │  │  └─ services.js
   │  ├─ App.jsx
   │  ├─ components
   │  │  ├─ Layout.jsx
   │  │  └─ UI.jsx
   │  ├─ context
   │  │  └─ AppContext.jsx
   │  ├─ index.css
   │  ├─ main.jsx
   │  └─ pages
   │     ├─ ApplicantsPage.jsx
   │     ├─ DashboardPage.jsx
   │     ├─ EarningsPage.jsx
   │     ├─ EkoCreditPage.jsx
   │     ├─ EkoScorePage.jsx
   │     ├─ JobCompletePage.jsx
   │     ├─ JobProgressPage.jsx
   │     ├─ JobsNearYouPage.jsx
   │     ├─ LenderPortalPage.jsx
   │     ├─ MyApplicationsPage.jsx
   │     ├─ MyPostingsPage.jsx
   │     ├─ RepaymentTrackerPage.jsx
   │     ├─ TraderDetailPage.jsx
   │     └─ WalletPage.jsx
   ├─ tailwind.config.js
   ├─ vercel.json
   └─ vite.config.js

```
```
Eko
├─ backend
│  ├─ app
│  │  ├─ core
│  │  │  ├─ config.py
│  │  │  ├─ database.py
│  │  │  └─ security.py
│  │  ├─ main.py
│  │  ├─ models
│  │  │  ├─ user.py
│  │  │  └─ wallet.py
│  │  ├─ routers
│  │  │  ├─ auth.py
│  │  │  ├─ credit.py
│  │  │  ├─ health.py
│  │  │  ├─ match.py
│  │  │  ├─ score.py
│  │  │  └─ webhooks.py
│  │  ├─ schemas
│  │  │  ├─ auth.py
│  │  │  ├─ credit.py
│  │  │  ├─ match.py
│  │  │  └─ score.py
│  │  ├─ seeds
│  │  │  ├─ seed_traders.py
│  │  │  └─ __init__.py
│  │  └─ services
│  │     ├─ credit.py
│  │     ├─ ekoscore.py
│  │     ├─ matching.py
│  │     ├─ ml_artifacts
│  │     │  ├─ isolation_forest.pkl
│  │     │  ├─ risk_classifier.pkl
│  │     │  └─ scaler.pkl
│  │     ├─ squad.py
│  │     ├─ wallet.py
│  │     └─ __init__.py
│  ├─ eko.db
│  ├─ README.md
│  └─ requirements.txt
├─ jobseeker-app
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ postcss.config.js
│  ├─ public
│  │  ├─ favicon.svg
│  │  └─ icons.svg
│  ├─ README.md
│  ├─ src
│  │  ├─ api
│  │  │  └─ client.js
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  ├─ hero.png
│  │  │  ├─ react.svg
│  │  │  └─ vite.svg
│  │  ├─ components
│  │  │  ├─ AuthPage.jsx
│  │  │  ├─ JobSeekerOnboarding.jsx
│  │  │  ├─ JobsNearYouPage.jsx
│  │  │  └─ MyApplications.jsx
│  │  ├─ index.css
│  │  └─ main.jsx
│  ├─ tailwind.config.js
│  └─ vite.config.js
├─ README.md
└─ trader-app
   ├─ .eslintrc.cjs
   ├─ .vercelignore
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ postcss.config.js
   ├─ README.md
   ├─ src
   │  ├─ api
   │  │  ├─ client.js
   │  │  └─ services.js
   │  ├─ App.jsx
   │  ├─ components
   │  │  ├─ Layout.jsx
   │  │  └─ UI.jsx
   │  ├─ context
   │  │  └─ AppContext.jsx
   │  ├─ index.css
   │  ├─ main.jsx
   │  └─ pages
   │     ├─ ApplicantsPage.jsx
   │     ├─ DashboardPage.jsx
   │     ├─ EarningsPage.jsx
   │     ├─ EkoCreditPage.jsx
   │     ├─ EkoScorePage.jsx
   │     ├─ JobCompletePage.jsx
   │     ├─ JobProgressPage.jsx
   │     ├─ JobsNearYouPage.jsx
   │     ├─ LenderPortalPage.jsx
   │     ├─ MyApplicationsPage.jsx
   │     ├─ MyPostingsPage.jsx
   │     ├─ RepaymentTrackerPage.jsx
   │     ├─ TraderDetailPage.jsx
   │     └─ WalletPage.jsx
   ├─ tailwind.config.js
   ├─ vercel.json
   └─ vite.config.js

```