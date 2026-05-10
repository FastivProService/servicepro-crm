# ServicePro CRM

DEMO https://fastivproservice.github.io/servicepro-crm/


Легка CRM-система для сервісного центру (frontend-only). Працює без бекенду: всі дані зберігаються локально в `localStorage`.

## Що вміє система

- Облік замовлень: створення, редагування, статуси, історія, Kanban
- Робота з клієнтами: картка клієнта, кілька телефонів, нотатки, чорний список
- Склад та запчастини: залишки, резерв/списання, серійні номери
- Каталог послуг та розрахунок вартості ремонту
- Фінанси: транзакції, аналітика, звіти
- Налаштування ролей і доступів
- Друк документів (A4/58мм) + HTML-конструктор шаблонів
- SMS/Telegram інтеграція (в т.ч. Telegram Bot API)
- Чек-листи робіт із шаблонами

---

## Технології

- HTML5 + CSS3
- JavaScript (ES Modules)
- Tailwind CSS
- Chart.js
- Font Awesome
- LocalStorage як сховище даних

---

## Запуск

### Варіант 1 (швидко)
Просто відкрийте `index.html` у браузері.

### Варіант 2 (рекомендовано)
Запустіть локальний сервер, наприклад:

```bash
npx serve .
```

---

## Структура проєкту

```text
.
├── index.html
├── css/
│   └── styles.css
└── js/
    ├── app.js
    └── modules/
        ├── auth.js
        ├── database.js
        ├── router.js
        ├── ui.js
        ├── dashboard.js
        ├── orders.js
        ├── clients.js
        ├── services.js
        ├── inventory.js
        ├── finance.js
        ├── salaries.js
        ├── automation.js
        ├── notifications.js
        ├── activityLog.js
        ├── activityLogPage.js
        ├── settings.js
        ├── usersSettings.js
        ├── statusesSettings.js
        ├── roleSettings.js
        ├── adminConfig.js
        ├── printEditor.js
        └── documentEditor.js
```

---

## Коротко про ключові модулі

- **`app.js`** — старт застосунку, ініціалізація, прив’язка глобальних дій
- **`database.js`** — локальна БД, seed-дані, міграції, CRUD
- **`router.js`** — маршрутизація між екранами
- **`orders.js`** — повний цикл замовлення
  - чек-лист робіт
  - шаблони чек-листів
  - фото до/після
  - історія змін
  - друк документів
- **`automation.js`** — автоматизація та інтеграції
  - автодії по замовленнях
  - резервні копії
  - лог інтеграцій
  - Telegram-відправка (webhook + Bot API)
- **`notifications.js`** — UI налаштування сповіщень та шаблонів повідомлень
- **`settings.js`** — головний хаб налаштувань
- **`usersSettings.js`** — окрема сторінка керування користувачами
- **`statusesSettings.js`** — окрема сторінка керування статусами замовлень
- **`roleSettings.js`** — ролі/права доступу
- **`printEditor.js`, `documentEditor.js`** — налаштування друку і шаблонів документів

---

## Актуальні маршрути

| Route | Призначення |
|---|---|
| `dashboard` | Дашборд |
| `orders` | Список замовлень |
| `newOrder` | Створення нового замовлення |
| `kanban` | Kanban-дошка замовлень |
| `clients` | Клієнти |
| `inventory` | Склад |
| `services` | Послуги |
| `finance` | Фінанси |
| `salaries` | Зарплати |
| `settings` | Головна сторінка налаштувань |
| `usersSettings` | Користувачі |
| `statusesSettings` | Статуси замовлень |
| `roleSettings` | Ролі та права |
| `notifications` | SMS / Telegram |
| `adminConfig` | Адмін-конфігурація |
| `printEditor` | Редактор полів друку |
| `documentEditor` | Редактор HTML-документів |
| `activityLog` | Журнал дій |

---

## Інтеграція Telegram

У модулі **SMS / Telegram** можна налаштувати:

1. **Telegram Bot API** (рекомендовано)
   - `telegramBotToken`
   - `telegramChatId`
2. Або fallback через `telegramWebhook`

Є кнопка тестової відправки повідомлення.

---

## Дані, що зберігаються локально

Основний ключ в `localStorage`: `servicePro_v2`.

Всередині — таблиці типу:
- `orders`, `clients`, `services`, `inventory`
- `users`, `roleConfig`, `orderStatuses`
- `messageTemplates`, `checklistTemplates`
- `automationConfig`, `integrationLogs`, `backups`
- `printConfig`, `documentTemplates`

---

## Важливо

- Це офлайн/frontend-рішення, без серверної авторизації.
- Для production рекомендується винести зберігання та інтеграції на бекенд.
- Якщо UI поводиться нестабільно після оновлень — очистіть старі дані `localStorage` або виконайте міграцію через актуальну версію `database.js`.

---

## Синхронізація між пристроями через NGINX + Node.js API + PostgreSQL/MariaDB

Реалізовано backend-варіант (рекомендовано), де:
- **NGINX** віддає фронтенд і проксуює API,
- **Node.js + Express** обслуговує `GET/PUT /api/state`,
- **PostgreSQL або MariaDB** зберігає єдиний стан CRM.

### 1) Запуск backend API

```bash
cd backend
npm install
copy .env.example .env
```

У `.env` задайте:
- `DB_CLIENT=postgres` або `DB_CLIENT=mariadb`
- параметри підключення до БД
- `SYNC_API_KEY` (опціонально, але бажано)

#### Якщо у вас MariaDB в Docker (як ви надіслали)

Ваш сервіс:

```yaml
db:
  image: mariadb:11
  environment:
    MYSQL_ROOT_PASSWORD: root
    MYSQL_DATABASE: crm
    MYSQL_USER: crm
    MYSQL_PASSWORD: crm
  volumes:
    - db:/var/lib/mysql
```

Тоді для `backend/.env` використайте:

```env
DB_CLIENT=mariadb
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DB=crm
MYSQL_USER=crm
MYSQL_PASSWORD=crm
```

> Якщо Node API також у Docker в тій самій мережі compose, тоді `MYSQL_HOST=db`.

Запуск:

```bash
npm start
```

API буде доступний за замовчуванням на `http://localhost:4000`.

### 2) Налаштування NGINX (ідея)

NGINX має:
- віддавати статичний фронтенд,
- проксувати `/api/` на Node.js (`http://127.0.0.1:4000`).

Приклад location для API:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:4000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 3) Налаштування CRM у UI

Відкрийте **Налаштування → SMS / Telegram повідомлення** та в секції синхронізації:

1. Увімкніть **"Віддалену синхронізацію"**
2. Вкажіть:
   - `URL API стану`: наприклад `https://your-domain/api/state`
   - `API Key`: якщо задано `SYNC_API_KEY` на backend
   - `Інтервал sync`: наприклад 30 сек
3. Натисніть **"Зберегти налаштування"**
4. Натисніть **"Sync зараз"**

### 4) Безпека

- Обовʼязково використовуйте HTTPS.
- Задайте `SYNC_API_KEY` на сервері та в клієнті.
- Додатково рекомендовано: обмеження за IP / VPN / Basic Auth на рівні NGINX.

---

## Швидкий старт через Docker Compose (nginx + api + mariadb)

У проєкті додано готові файли:
- `docker-compose.yml`
- `backend/Dockerfile`
- `nginx/default.conf`

### Запуск

```bash
docker compose up -d --build
```

Після запуску:
- CRM фронтенд: `http://SERVER_IP/`
- API health: `http://SERVER_IP/health` (або напряму контейнер `api:4000/health`)

### Важливо перед використанням

1. В `docker-compose.yml` змініть:
   - `MYSQL_ROOT_PASSWORD`
   - `MYSQL_PASSWORD`
   - `SYNC_API_KEY`
2. У CRM (Налаштування → SMS/Telegram → Синхронізація):
   - URL: `http://SERVER_IP/api/state` (або HTTPS домен)
   - API key: значення `SYNC_API_KEY`

### Корисні команди

```bash
docker compose logs -f api
docker compose ps
docker compose down
```
