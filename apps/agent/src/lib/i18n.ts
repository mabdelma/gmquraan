export const LOCALES = ["en", "zh", "es", "fr", "ar", "pt", "ru", "de", "ja", "hi", "it"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English", zh: "中文", es: "Español", fr: "Français", ar: "العربية",
  pt: "Português", ru: "Русский", de: "Deutsch", ja: "日本語", hi: "हिन्दी", it: "Italiano",
};

export type AgentMessages = {
  title: string;
  desc: string;
  talk: string;
  connecting: string;
  end: string;
  liveHint: string;
  powered: string;
  matching: string;
  noMatches: string;
  view: string;
  comparison: string;
  roi: string;
  net: string;
  value: string;
  cost: string;
  market: string;
  count: string;
  from: string;
  upTo: string;
  received: string;
  sendFailed: string;
  sendFailedBody: string;
  tryAgain: string;
  thanks: string; // includes {name} {email}
  reward: string;
  rewardBody: string; // includes {d} {c}
  pricing: string;
  contactPrice: string;
  formTitle: string;
  formName: string;
  formEmail: string;
  formMsg: string;
  formSend: string;
  formSending: string;
  dir: "ltr" | "rtl";
};

const en: AgentMessages = {
  title: "Unskinned Solutions Advisor",
  desc: "Connect and explore our digital solutions in real time.",
  talk: "🎙 Talk to the advisor",
  connecting: "Connecting…",
  end: "■ End call",
  liveHint: "● Live — speak now. Ask me to compare solutions, project ROI, or book a demo.",
  powered: "Your microphone audio streams directly to the model over an encrypted connection; the server only mints a short-lived token.",
  matching: "Matching solutions",
  noMatches: "No matches yet — try describing your need differently.",
  view: "View on Unskinned →",
  comparison: "Comparison",
  roi: "ROI projection",
  net: "Net",
  value: "Value",
  cost: "Cost",
  market: "Market snapshot",
  count: "solutions",
  from: "from",
  upTo: "up to",
  received: "Request received",
  sendFailed: "Could not send",
  sendFailedBody: "Your request did not reach us. Please email us directly and we will pick it up.",
  tryAgain: "Try again",
  thanks: "Thanks {name}! Our team will reach out to {email}.",
  reward: "Unskinned Reseller Reward",
  rewardBody: "Buyers save {d}% with a reseller code; resellers earn {c}% commission on every sale and renewal.",
  pricing: "See pricing →",
  contactPrice: "Contact for pricing",
  formTitle: "Request a demo",
  formName: "Your name",
  formEmail: "Your email",
  formMsg: "What do you need? (optional)",
  formSend: "Send request",
  formSending: "Sending…",
  dir: "ltr",
};

const es: AgentMessages = { ...en, sendFailed: "No se pudo enviar", sendFailedBody: "Tu solicitud no llegó. Escríbenos directamente y la atenderemos.", tryAgain: "Reintentar", title: "Asesor de Soluciones Unskinned", desc: "Conéctate y explora nuestras soluciones digitales en tiempo real.", talk: "🎙 Hablar con el asesor", connecting: "Conectando…", end: "■ Finalizar", liveHint: "● En vivo — habla ahora. Pídeme comparar soluciones, proyectar el ROI o agendar una demo.", powered: "El audio de tu micrófono se transmite cifrado al modelo; el servidor solo emite un token temporal.", matching: "Soluciones que coinciden", noMatches: "Sin coincidencias — describe tu necesidad de otra forma.", view: "Ver en Unskinned →", comparison: "Comparación", roi: "Proyección de ROI", net: "Neto", value: "Valor", cost: "Costo", market: "Resumen del mercado", count: "soluciones", from: "desde", upTo: "hasta", received: "Solicitud recibida", thanks: "¡Gracias {name}! Nuestro equipo contactará a {email}.", reward: "Recompensa de Revendedor Unskinned", rewardBody: "Los compradores ahorran {d}% con un código; los revendedores ganan {c}% de comisión en cada venta y renovación.", pricing: "Ver precios →", contactPrice: "Consultar precio", formTitle: "Solicitar una demo", formName: "Tu nombre", formEmail: "Tu correo", formMsg: "¿Qué necesitas? (opcional)", formSend: "Enviar solicitud", formSending: "Enviando…" };

const ar: AgentMessages = { ...en, sendFailed: "تعذّر الإرسال", sendFailedBody: "لم يصل طلبك. راسلنا مباشرةً وسنتابعه.", tryAgain: "إعادة المحاولة", title: "مستشار حلول Unskinned", desc: "تواصل واستكشف حلولنا الرقمية مباشرةً.", talk: "🎙 تحدّث إلى المستشار", connecting: "جارٍ الاتصال…", end: "■ إنهاء", liveHint: "● مباشر — تحدّث الآن. اطلب مقارنة الحلول أو حساب العائد أو حجز عرض توضيحي.", powered: "يُبث صوت الميكروفون مشفّرًا إلى النموذج؛ الخادم يصدر رمزًا مؤقتًا فقط.", matching: "حلول مطابقة", noMatches: "لا نتائج بعد — جرّب وصف حاجتك بطريقة أخرى.", view: "عرض على Unskinned ←", comparison: "مقارنة", roi: "توقّع العائد", net: "الصافي", value: "القيمة", cost: "التكلفة", market: "لمحة عن السوق", count: "حلول", from: "من", upTo: "حتى", received: "تم استلام الطلب", thanks: "شكرًا {name}! سيتواصل فريقنا مع {email}.", reward: "مكافأة موزّعي Unskinned", rewardBody: "يوفّر المشترون {d}% برمز موزّع؛ ويكسب الموزّعون عمولة {c}% على كل عملية بيع وتجديد.", pricing: "عرض الأسعار ←", contactPrice: "تواصل لمعرفة السعر", formTitle: "اطلب عرضًا توضيحيًا", formName: "اسمك", formEmail: "بريدك الإلكتروني", formMsg: "ماذا تحتاج؟ (اختياري)", formSend: "إرسال الطلب", formSending: "جارٍ الإرسال…", dir: "rtl" };

const fr: AgentMessages = { ...en, sendFailed: "Échec de l'envoi", sendFailedBody: "Votre demande ne nous est pas parvenue. Écrivez-nous directement et nous la traiterons.", tryAgain: "Réessayer", title: "Conseiller Solutions Unskinned", desc: "Connectez-vous et explorez nos solutions numériques en temps réel.", talk: "🎙 Parler au conseiller", connecting: "Connexion…", end: "■ Terminer", liveHint: "● En direct — parlez. Demandez de comparer des solutions, projeter le ROI ou réserver une démo.", powered: "Le son de votre micro est transmis chiffré au modèle ; le serveur n'émet qu'un jeton temporaire.", matching: "Solutions correspondantes", noMatches: "Aucun résultat — décrivez votre besoin autrement.", view: "Voir sur Unskinned →", comparison: "Comparaison", roi: "Projection du ROI", net: "Net", value: "Valeur", cost: "Coût", market: "Aperçu du marché", count: "solutions", from: "à partir de", upTo: "jusqu'à", received: "Demande reçue", thanks: "Merci {name} ! Notre équipe contactera {email}.", reward: "Récompense Revendeur Unskinned", rewardBody: "Les acheteurs économisent {d}% avec un code ; les revendeurs gagnent {c}% de commission sur chaque vente et renouvellement.", pricing: "Voir les tarifs →", contactPrice: "Nous contacter pour le prix", formTitle: "Demander une démo", formName: "Votre nom", formEmail: "Votre e-mail", formMsg: "De quoi avez-vous besoin ? (facultatif)", formSend: "Envoyer la demande", formSending: "Envoi…" };

const de: AgentMessages = { ...en, sendFailed: "Senden fehlgeschlagen", sendFailedBody: "Ihre Anfrage hat uns nicht erreicht. Schreiben Sie uns direkt, wir kümmern uns darum.", tryAgain: "Erneut versuchen", title: "Unskinned Lösungsberater", desc: "Verbinden Sie sich und entdecken Sie unsere digitalen Lösungen in Echtzeit.", talk: "🎙 Mit dem Berater sprechen", connecting: "Verbinde…", end: "■ Beenden", liveHint: "● Live — sprechen Sie. Bitten Sie mich, Lösungen zu vergleichen, ROI zu projizieren oder eine Demo zu buchen.", powered: "Ihr Mikrofon-Audio wird verschlüsselt an das Modell gestreamt; der Server stellt nur ein kurzlebiges Token aus.", matching: "Passende Lösungen", noMatches: "Noch keine Treffer — beschreiben Sie Ihren Bedarf anders.", view: "Auf Unskinned ansehen →", comparison: "Vergleich", roi: "ROI-Prognose", net: "Netto", value: "Wert", cost: "Kosten", market: "Marktübersicht", count: "Lösungen", from: "ab", upTo: "bis", received: "Anfrage erhalten", thanks: "Danke {name}! Unser Team meldet sich bei {email}.", reward: "Unskinned Reseller-Prämie", rewardBody: "Käufer sparen {d}% mit einem Reseller-Code; Reseller verdienen {c}% Provision bei jedem Verkauf und jeder Verlängerung.", pricing: "Preise ansehen →", contactPrice: "Preis anfragen", formTitle: "Demo anfragen", formName: "Ihr Name", formEmail: "Ihre E-Mail", formMsg: "Was brauchen Sie? (optional)", formSend: "Anfrage senden", formSending: "Senden…" };

const pt: AgentMessages = { ...en, sendFailed: "Não foi possível enviar", sendFailedBody: "Seu pedido não chegou até nós. Envie um e-mail e cuidaremos disso.", tryAgain: "Tentar novamente", title: "Consultor de Soluções Unskinned", desc: "Conecte-se e explore nossas soluções digitais em tempo real.", talk: "🎙 Falar com o consultor", connecting: "Conectando…", end: "■ Encerrar", liveHint: "● Ao vivo — fale agora. Peça para comparar soluções, projetar o ROI ou agendar uma demo.", powered: "O áudio do seu microfone é transmitido criptografado ao modelo; o servidor só emite um token temporário.", matching: "Soluções correspondentes", noMatches: "Sem resultados — descreva sua necessidade de outra forma.", view: "Ver na Unskinned →", comparison: "Comparação", roi: "Projeção de ROI", net: "Líquido", value: "Valor", cost: "Custo", market: "Resumo do mercado", count: "soluções", from: "a partir de", upTo: "até", received: "Pedido recebido", thanks: "Obrigado {name}! Nossa equipe entrará em contato com {email}.", reward: "Recompensa de Revendedor Unskinned", rewardBody: "Compradores economizam {d}% com um código; revendedores ganham {c}% de comissão em cada venda e renovação.", pricing: "Ver preços →", contactPrice: "Consultar preço", formTitle: "Solicitar uma demo", formName: "Seu nome", formEmail: "Seu e-mail", formMsg: "Do que você precisa? (opcional)", formSend: "Enviar pedido", formSending: "Enviando…" };

const ru: AgentMessages = { ...en, sendFailed: "Не удалось отправить", sendFailedBody: "Ваш запрос не дошёл. Напишите нам напрямую, и мы им займёмся.", tryAgain: "Повторить", title: "Консультант решений Unskinned", desc: "Подключитесь и изучите наши цифровые решения в реальном времени.", talk: "🎙 Поговорить с консультантом", connecting: "Подключение…", end: "■ Завершить", liveHint: "● В эфире — говорите. Попросите сравнить решения, рассчитать ROI или записаться на демо.", powered: "Аудио с микрофона передаётся модели по зашифрованному каналу; сервер выдаёт лишь временный токен.", matching: "Подходящие решения", noMatches: "Пока нет совпадений — опишите задачу иначе.", view: "Открыть на Unskinned →", comparison: "Сравнение", roi: "Прогноз ROI", net: "Чистыми", value: "Ценность", cost: "Затраты", market: "Обзор рынка", count: "решений", from: "от", upTo: "до", received: "Запрос получен", thanks: "Спасибо, {name}! Наша команда свяжется с {email}.", reward: "Награда реселлера Unskinned", rewardBody: "Покупатели экономят {d}% по коду; реселлеры получают {c}% комиссии с каждой продажи и продления.", pricing: "Посмотреть цены →", contactPrice: "Запросить цену", formTitle: "Запросить демо", formName: "Ваше имя", formEmail: "Ваш e-mail", formMsg: "Что вам нужно? (необязательно)", formSend: "Отправить запрос", formSending: "Отправка…" };

const zh: AgentMessages = { ...en, sendFailed: "发送失败", sendFailedBody: "您的请求未送达。请直接发邮件给我们，我们会跟进。", tryAgain: "重试", title: "Unskinned 解决方案顾问", desc: "实时连接并探索我们的数字解决方案。", talk: "🎙 与顾问对话", connecting: "连接中…", end: "■ 结束", liveHint: "● 实时——请讲。可让我比较方案、预测投资回报或预约演示。", powered: "您的麦克风音频通过加密连接直接传输至模型；服务器仅签发短期令牌。", matching: "匹配的解决方案", noMatches: "暂无匹配——请换种方式描述需求。", view: "在 Unskinned 查看 →", comparison: "对比", roi: "投资回报预测", net: "净值", value: "价值", cost: "成本", market: "市场概览", count: "个方案", from: "起价", upTo: "最高", received: "请求已收到", thanks: "谢谢 {name}！我们的团队将联系 {email}。", reward: "Unskinned 分销奖励", rewardBody: "买家使用分销码可省 {d}%；分销商每笔销售及续费可赚 {c}% 佣金。", pricing: "查看价格 →", contactPrice: "联系咨询价格", formTitle: "预约演示", formName: "您的姓名", formEmail: "您的邮箱", formMsg: "您有什么需求？（可选）", formSend: "发送请求", formSending: "发送中…" };

const ja: AgentMessages = { ...en, sendFailed: "送信できませんでした", sendFailedBody: "リクエストが届きませんでした。直接メールをお送りください。対応いたします。", tryAgain: "再試行", title: "Unskinned ソリューションアドバイザー", desc: "接続して、当社のデジタルソリューションをリアルタイムで体験。", talk: "🎙 アドバイザーと話す", connecting: "接続中…", end: "■ 終了", liveHint: "● ライブ — どうぞお話しください。ソリューション比較、ROI試算、デモ予約も承ります。", powered: "マイク音声は暗号化されてモデルに直接送信され、サーバーは短期トークンのみ発行します。", matching: "一致するソリューション", noMatches: "一致なし — 別の言い方でニーズをお聞かせください。", view: "Unskinned で見る →", comparison: "比較", roi: "ROI 予測", net: "純額", value: "価値", cost: "コスト", market: "市場スナップショット", count: "件", from: "最低", upTo: "最高", received: "リクエストを受け付けました", thanks: "{name} さん、ありがとうございます！担当が {email} にご連絡します。", reward: "Unskinned リセラー特典", rewardBody: "コード利用で購入者は {d}% お得、リセラーは販売・更新ごとに {c}% の報酬。", pricing: "料金を見る →", contactPrice: "価格はお問い合わせ", formTitle: "デモを申し込む", formName: "お名前", formEmail: "メールアドレス", formMsg: "ご要望は？（任意）", formSend: "送信する", formSending: "送信中…" };

const hi: AgentMessages = { ...en, sendFailed: "भेजा नहीं जा सका", sendFailedBody: "आपका अनुरोध हम तक नहीं पहुँचा। कृपया सीधे ईमेल करें, हम आगे बढ़ाएँगे।", tryAgain: "पुनः प्रयास करें", title: "Unskinned समाधान सलाहकार", desc: "जुड़ें और हमारे डिजिटल समाधान वास्तविक समय में देखें।", talk: "🎙 सलाहकार से बात करें", connecting: "कनेक्ट हो रहा है…", end: "■ समाप्त करें", liveHint: "● लाइव — अभी बोलें। समाधान तुलना, ROI अनुमान या डेमो बुक करने को कहें।", powered: "आपका माइक ऑडियो एन्क्रिप्टेड कनेक्शन से मॉडल तक जाता है; सर्वर केवल अल्पकालिक टोकन देता है।", matching: "मिलते-जुलते समाधान", noMatches: "अभी कोई मेल नहीं — अपनी ज़रूरत अलग तरह से बताएं।", view: "Unskinned पर देखें →", comparison: "तुलना", roi: "ROI अनुमान", net: "शुद्ध", value: "मूल्य", cost: "लागत", market: "बाज़ार झलक", count: "समाधान", from: "से", upTo: "तक", received: "अनुरोध प्राप्त हुआ", thanks: "धन्यवाद {name}! हमारी टीम {email} पर संपर्क करेगी।", reward: "Unskinned रीसेलर इनाम", rewardBody: "कोड से खरीदार {d}% बचाते हैं; रीसेलर हर बिक्री व नवीनीकरण पर {c}% कमीशन कमाते हैं।", pricing: "मूल्य देखें →", contactPrice: "मूल्य हेतु संपर्क करें", formTitle: "डेमो का अनुरोध करें", formName: "आपका नाम", formEmail: "आपका ईमेल", formMsg: "आपको क्या चाहिए? (वैकल्पिक)", formSend: "अनुरोध भेजें", formSending: "भेजा जा रहा है…" };

const it: AgentMessages = { ...en, sendFailed: "Invio non riuscito", sendFailedBody: "La tua richiesta non ci è arrivata. Scrivici direttamente e ce ne occuperemo.", tryAgain: "Riprova", title: "Consulente Soluzioni Unskinned", desc: "Connettiti ed esplora le nostre soluzioni digitali in tempo reale.", talk: "🎙 Parla con il consulente", connecting: "Connessione…", end: "■ Termina", liveHint: "● In diretta — parla pure. Chiedimi di confrontare soluzioni, stimare il ROI o prenotare una demo.", powered: "L'audio del tuo microfono viene trasmesso cifrato al modello; il server emette solo un token temporaneo.", matching: "Soluzioni corrispondenti", noMatches: "Nessun risultato — prova a descrivere la tua esigenza in modo diverso.", view: "Vedi su Unskinned →", comparison: "Confronto", roi: "Proiezione ROI", net: "Netto", value: "Valore", cost: "Costo", market: "Panoramica di mercato", count: "soluzioni", from: "da", upTo: "fino a", received: "Richiesta ricevuta", thanks: "Grazie {name}! Il nostro team contatterà {email}.", reward: "Ricompensa Rivenditore Unskinned", rewardBody: "Gli acquirenti risparmiano il {d}% con un codice rivenditore; i rivenditori guadagnano il {c}% di commissione su ogni vendita e rinnovo.", pricing: "Vedi i prezzi →", contactPrice: "Contattaci per il prezzo", formTitle: "Richiedi una demo", formName: "Il tuo nome", formEmail: "La tua email", formMsg: "Di cosa hai bisogno? (facoltativo)", formSend: "Invia richiesta", formSending: "Invio…" };

const DICTS: Record<Locale, AgentMessages> = { en, zh, es, fr, ar, pt, ru, de, ja, hi, it };

export function getAgentMessages(locale: Locale): AgentMessages {
  return DICTS[locale] ?? en;
}
