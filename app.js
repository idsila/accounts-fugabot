require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events/index.js");

const API_ID = +process.env.API_ID;
const API_HASH = process.env.API_HASH;
const dataBase = require('./dataBase.js');

app.use(cors({ methods: ["GET", "POST"] }));
app.use(express.json());

async function startApp(session) {
  try {
    const stringSession = new StringSession(session);
    const client = new TelegramClient(stringSession, API_ID, API_HASH, { connectionRetries: 5 });
    await client.start();
    
    const coomentGroup = { chat: -1002922935842, channel: 2862610675 };

    //const commentGroupsId = [ { chat: -1002398372400, channel: 2106543498 } ];
    
    await runNotifucation(coomentGroup);

    async function runNotifucation(commentGroupId) {
      try{
        client.addEventHandler(async (event) => {
          const message = event.message;
          if (Number(message.chatId.valueOf()) !== commentGroupId.chat) return;
          if (message.fwdFrom && message.fwdFrom.channelPost &&
           message.fwdFrom.fromId.className === "PeerChannel" &&
            Number(message.fwdFrom.fromId.channelId) === commentGroupId.channel) {
              const { post_image, post_text } = await dataBase.findOne({ session });
              await client.sendMessage(commentGroupId.chat, {
                file: post_image,
                message: post_text,
                parseMode: "html",
                replyTo: message.id,
              });
            }
        }, new NewMessage({ chats: [commentGroupId.chat] }));
      }
      catch(e){
        console.log(e);
      }
    }

  } catch (err) {
    console.log(session);
    console.error("❌ Непредвиденная ошибка:", err);
  }
}

dataBase.find({}).then(res => {
  console.log(res)
  res.forEach(user => {
    startApp(user.session);  
  })
})

app.post('/add-account', async (req, res) => {
  const { session } = req.body;
  startApp(session);
  res.json({ type: 200 });
});


app.listen(3055, (err) => {
  err ? err : console.log("STARTED SERVER");
});