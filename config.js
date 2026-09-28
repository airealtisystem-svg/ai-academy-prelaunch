window.PRELAUNCH_CONFIG = {
  LANDING_VERSION: 'V1',

  WEBHOOK_URL: 'https://n8n.ai-realtor-spb.ru/webhook/ai-academy-prelaunch',
  REQUEST_TIMEOUT_MS: 15000,

  LEAD: {
    SOURCE: 'prelaunch_landing',
    OFFER: 'ai_academy_early_access',
  },

  BRAND_NAME: 'AI Academy',

  PRICING: {
    CURRENCY: 'RUB',
    FULL_PRICE: 92300,  // полная стоимость (показывается зачёркнутой рядом с предлагаемой)
    EARLY_PRICE: 64610, // цена раннего списка — предлагается по умолчанию
    TEST_PRICE: null,   // цена ценового теста — только по ссылке с ?price=test (не задана)
    EARLY_DISCOUNT_PERCENT: 30, // справочно; на странице скидка считается из FULL / EARLY и сверяется тестом
    VARIANTS: { early: 'EARLY_PRICE', full: 'FULL_PRICE', test: 'TEST_PRICE' },
    DEFAULT_VARIANT: 'early',
    LABELS: {
      EARLY_PRICE: 'Ранний список',
      FULL_PRICE: 'Стоимость участия',
      TEST_PRICE: 'Ранний список',
    },
  },

  DURATION: '≈ 14 дней',
  START_WINDOW: 'ориентировочно 8 октября 2026',

  PRIVACY_URL: null,

  ANALYTICS: {
    YANDEX_METRIKA_ID: null,
    DEBUG: false, // true — события дублируются в console
  },
};
