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

const CLIENTS = {}; 


const USERS = {}; 


const delay = (s) => new Promise(r => setTimeout(r, 1000 * s));
function createHandlerMessage(hash, id_post, channel, chat){
  return async function(event){
    const message = event.message;
    if (Number(message.chatId.valueOf()) !== chat) return;
    if (message.fwdFrom && message.fwdFrom.channelPost && message.fwdFrom.fromId.className === "PeerChannel" && Number(message.fwdFrom.fromId.channelId) === channel) {
      delay(USERS[hash][id_post].delay).then( async () => {
        await CLIENTS[hash].sendMessage(chat, {
          file: USERS[hash][id_post].post_image,
          message: USERS[hash][id_post].post_text,
          parseMode: "html",
          replyTo: message.id
        });
      })   
      }
  }
}


async function startApp({ session, hash, posts  }) {
  try {
    USERS[hash] = {};
    CLIENTS[hash] = new TelegramClient(new StringSession(session), API_ID, API_HASH, { connectionRetries: 5 });
    await CLIENTS[hash].start();
    
    for(const post of posts){
      USERS[hash][post.id] = post;
      await runNotifucation(post);
    }

    async function runNotifucation(post) {
      try{
        USERS[hash][post.id].handler = createHandlerMessage(hash, post.id, post.channel, post.chat);
        CLIENTS[hash].addEventHandler( USERS[hash][post.id].handler, new NewMessage({ chats: [post.chat] }));
        console.log(USERS);
      }
      catch(e){
        console.log(e);
      }
    }

  } catch (err) {
    console.log(session);
    //dataBase.deleteOne({ session })
    console.error("❌ Непредвиденная ошибка:", err);
  }
}

dataBase.find({}).then(res => {
   res.forEach(user => {
    startApp(user) 
  });
});




app.post('/add-post', async (req, res) => {
  const { post_editor, hash } = req.body;
  try{
    if(USERS[hash]){
      USERS[hash][post_editor.id] = post_editor;  
      USERS[hash][post_editor.id].handler = createHandlerMessage(hash, post_editor.id, post_editor.channel, post_editor.chat);
      CLIENTS[hash].addEventHandler( USERS[hash][post_editor.id].handler, new NewMessage({ chats: [post_editor.chat] }));
    }
    else{
      const user = await dataBase.findOne({ hash });
      startApp(user);
    }
    console.log(USERS[hash]);
  }
  catch(e){
    console.log(e);
  }
  res.json({ type: 200 });
});


app.post('/update-post', async (req, res) => {
  const { post_editor, hash } = req.body;
  USERS[hash][post_editor.id] = post_editor;
  res.json({ type: 200 });
});


app.post('/delete-post', async (req, res) => {
  const { hash_post, hash } = req.body;
  CLIENTS[hash].removeEventHandler(USERS[hash][hash_post].handler, new NewMessage({ chats: [USERS[hash][hash_post].chat] }));
  delete USERS[hash][hash_post]
  res.json({ type: 200 });
});

  //const slay = [ { chat: -1002398372400, channel: 2106543498 } ];
  //const hardBoost = [ { chat: -1002922935842, channel: 2862610675 } ];
    

// app.post('/add-account', async (req, res) => {
//   const { session } = req.body;
//   startApp(session);
//   res.json({ type: 200 });
// });


app.listen(3055, (err) => {
  err ? err : console.log("STARTED SERVER");
});
