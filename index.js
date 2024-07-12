import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Question from './module/Question.js';
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const admins = [881912596];  
let isAnon = {};

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));


bot.onText(/\/start/, (msg) => {


  bot.sendMessage(msg.chat.id, "Istalgan savolingizni /savol yoki /anonim buyrug'i orqali yo'llashingiz mumkun. Iltimos, savolingizni bitta xabarda yo'llang");
});

bot.onText(/\/savol/, (msg) => {
  if(admins.includes(msg.chat.id)){
    bot.sendMessage(msg.chat.id, 'Siz admin siz.')
  }else{ 
    bot.sendMessage(msg.chat.id, "Savol rejimiga o'tdingiz, savolingizni yo'llashingiz mumkun. Savol yo'llash bo'yicha qo'llanma: https://nometa.xyz/uz.html");
    isAnon[msg.chat.id] = false;
  }
});

bot.onText(/\/anonim/, (msg) => {
  if(admins.includes(msg.chat.id)){
    bot.sendMessage(msg.chat.id, 'Siz admin siz.')
  }else{ 
    bot.sendMessage(msg.chat.id, "Anonim savol rejimiga o'tdingiz, savolingizni yo'llashingiz mumkun. Savol yo'llash bo'yicha qo'llanma: https://nometa.xyz/uz.html");
    isAnon[msg.chat.id] = true;
  }
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if(admins.includes(chatId)) return;

  if (text.startsWith('/')) return;  

  const anonymous = isAnon[chatId] || false;

  const newQuestion = new Question({
    question: text,
    from: anonymous ? 'Anonim' : (msg.from.username || msg.from.first_name),
    chatId,
    answered: false,
  });

  newQuestion.save().then(() => {
    bot.sendMessage(chatId, "Savolingiz qabul qilindi, muallif javob berishini kuting :)");

    admins.forEach(adminId => {
      bot.sendMessage(adminId, `Yangi savol (${newQuestion.id}) \n ${anonymous ? 'Anonim' : msg.from.username ? `@${msg.from.username}` : msg.from.first_name}: ${text}`);
    });
  }).catch(err => {
    console.error('Error saving question:', err);
    bot.sendMessage(chatId, "Savolingizni qabul qilishda xatolik yuz berdi.");
  });
});

bot.onText(/\/javob (\S+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const questionId = match[1];
  const answer = match[2];

  if (!admins.includes(chatId)) {
    bot.sendMessage(chatId, "Bu buyruq faqat adminlar uchun.");
    return;
  }

  try {
    const question = await Question.findById(questionId);
    if (!question) {
      bot.sendMessage(chatId, "Savol topilmadi.");
      return;
    }

    bot.sendMessage(question.chatId, `Savolingizga javob: ${answer}`);

    question.answered = true;
    await question.save();

    bot.sendMessage(chatId, "Javob yuborildi.");
  } catch (err) {
    console.error('Error answering question:', err);
    bot.sendMessage(chatId, "Javobni yuborishda xatolik yuz berdi.");
  }
});


bot.onText(/\/questions/, (msg) => {
  const chatId = msg.chat.id;

  if (!admins.includes(chatId)) {
    bot.sendMessage(chatId, "Bu buyruq faqat adminlar uchun.");
  }else{
    Question.find({ answered: false }).then(questions => {
      if (questions.length === 0) {
        bot.sendMessage(chatId, "Savol topilmadi.");
        return;
      }
  
      questions.forEach(question => {
        bot.sendMessage(admins[0], `Id(${question.id}) ${question.from}: ${question.question}`);
      });
    });
  }

})


if (!process.env.TELEGRAM_TOKEN) {
  console.error('TELEGRAM_TOKEN environment variable is missing');
  process.exit(1);
}
