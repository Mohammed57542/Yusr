import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;

function saveChat(userId, role, content) {
  db.prepare('INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)').run(userId || null, role, content);
}

function pricesText() {
  try {
    const sections = ['junior', 'senior'];
    const labels = { junior: 'قسم ٨-١٠', senior: 'قسم ١١-١٢' };
    const planNames = { single: 'مادة واحدة', triple: '3 مواد', all: 'جميع المواد' };
    let out = 'اشتراكات منصة يسر السنوية حسب قسمك: 💳\n\n';
    for (const s of sections) {
      const rows = db.prepare('SELECT * FROM plans WHERE section = ? AND active = 1 ORDER BY id').all(s);
      out += `${labels[s]}:\n`;
      if (!rows.length) {
        out += '📘 مادة واحدة (15 ر.ع) • 📚 3 مواد (38 ر.ع) • 🎓 جميع المواد (79 ر.ع)\n';
        continue;
      }
      for (const p of rows) {
        out += `📘 ${p.key === 'single' ? 'مادة واحدة' : planNames[p.key] || p.name} (${p.price} ر.ع)\n`;
      }
    }
    out += '\nأو اختر بحرية أي عدد من المواد (عدد المواد × سعر المادة).\n\nادخل من صفحة الاشتراكات للبدء!';
    return out;
  } catch {
    return 'تفضل بزيارة صفحة الاشتراكات في المنصة للحصول على أحدث الأسعار والعروض 💳';
  }
}

function localAssistant(message) {
  const m = message.toLowerCase();
  const intro = 'أنا مساعد يسر الذكي 💡\n';
  const canHelp = '\n\nأقدر أساعدك في:\n📚 شرح الدروس\n❓ توليد أسئلة تدريبية\n📝 تلخيص المواضيع\n🎯 خطة مذاكرة\n💡 نصائح للتفوق';

  if (m.includes('سؤال') || m.includes('اسألني') || m.includes('اختبرني') || m.includes('تمرين')) {
    const q = db.prepare('SELECT * FROM questions ORDER BY RANDOM() LIMIT 1').get();
    if (q) {
      const opts = JSON.parse(q.options);
      const lines = opts.map((o, i) => `${['أ', 'ب', 'ج', 'د'][i]}) ${o}`).join('\n');
      return intro + 'تفضل هذا السؤال التدريبي:\n\n❓ ' + q.question + '\n\n' + lines + '\n\nأجبني ثم سأصحح لك إجابتك!';
    }
  }

  if (m.includes('خطة') && m.includes('مذاكر')) {
    return intro + 'إليك خطة مذاكرة فعّالة 📖\n\n1️⃣ حدد أهدافك الأسبوعية (3 أهداف واضحة)\n2️⃣ خصص ساعة يومياً لكل مادة أساسية\n3️⃣ استخدم تقنية بومودورو: 25 دقيقة تركيز + 5 دقائق راحة\n4️⃣ راجع الدروس بأسلوب الاسترجاع النشط\n5️⃣ حل اختبارات وهمية أسبوعياً\n\n🔑 النجاح في التكرار الذكي، ولا تنسَ النوم الكافي!';
  }

  if (m.includes('ملخص') || m.includes('لخص') || m.includes('تلخيص')) {
    return intro + 'لألخص لك أي درس، أخبرني بأي درس تريد تلخيصه من الصفوف (٨-١٢).\n\nيمكنك مثلًا كتابة: "لخص درس المعادلات التربيعية"';
  }

  if (m.includes('math') || m.includes('رياضيات') || m.includes('معادلة')) {
    return intro + 'أقدر أشرح لك مواضيع الرياضيات خطوة بخطوة 📐\n\nجرّب أن تسألني مثلًا:\n- "اشرح حل المعادلات التربيعية"\n- "ما مشتقة س^3؟"\n- "اشرح النسبة والتناسب مع مثال"\n\nأعطني سؤالاً محدداً وسأشرحه بوضوح مع مثال محلول.';
  }

  if (m.includes('فيزياء') || m.includes('نيوتن')) {
    return intro + 'الفيزياء ممتعة! ⚛️\n\nقوانين نيوتن الثلاثة ببساطة:\n1️⃣ قانون القصور: الجسم يبقى على حالته ما لم تؤثر عليه قوة\n2️⃣ القانون الثاني: القوة = الكتلة × التسارع\n3️⃣ القانون الثالث: لكل فعل رد فعل مساوٍ له في المقدار ومعاكس له في الاتجاه\n\nتريد مثالاً محلولاً؟ اسألني!';
  }

  if (m.includes('كيمياء') || m.includes('ذرة')) {
    return intro + 'الكيمياء عالم جميل! ⚗️\n\nأشياء أساسية تتعلق بالذرة:\n- البروتون (شحنة +)\n- النيوترون (شحنة متعادلة)\n- الإلكترون (شحنة -)\n\nفي الذرة المتعادلة: عدد البروتونات = عدد الإلكترونات.\nاسألني عن أي موضوع كيميائي وسأشرحه.';
  }

  if (m.includes('سلام') || m.includes('مرحبا') || m.includes('اهلا') || m.includes('هلا')) {
    return intro + 'أهلاً وسهلاً بك! 👋\nأنا مساعدك التعليمي الذكي من منصة يسر.\n' + canHelp;
  }

  if (m.includes('اشتراك') || m.includes('سعر') || m.includes('باقة')) {
    return intro + pricesText();
  }

  return intro + 'فهمت سؤالك، دعني أساعدك 💪\nسأجيب بناءً على ما هو متاح في قاعدة البيانات التعليمية.\n' + canHelp;
}

async function aiResponse(message, history) {
  if (OPENAI_API_KEY) {
    const messages = [
      { role: 'system', content: 'أنت مساعد تعليمي عربي لمنصة يسر التعليمية العُمانية للصفوف ٨-١٢ وفق المنهج العُماني. أجب بالعربية بوضوح وبشكل تعليمي مبسط.' },
      ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 500 }),
      });
      const data = await resp.json();
      if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
    } catch { /* fallback to local */ }
  }
  return localAssistant(message);
}

router.post('/chat', requireAuth, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'يرجى كتابة رسالة' });

  saveChat(req.user.id, 'user', message);
  const history = db.prepare('SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY id DESC LIMIT 20').all(req.user.id).reverse();

  const reply = await aiResponse(message, history);
  saveChat(req.user.id, 'assistant', reply);
  res.json({ reply });
});

router.get('/history', requireAuth, (req, res) => {
  const history = db.prepare('SELECT role, content, created_at FROM chat_history WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(req.user.id).reverse();
  res.json(history);
});

export default router;
