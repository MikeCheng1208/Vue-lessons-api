const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const _ = require("lodash");
const htmlContent = require("./html.js");
const cityJson = require("./city.json");
const coursesJson = require("./courses.json");

const { PORT = 9527, HOST = "localhost" } = process.env;

const app = express();
app.listen(PORT, () => console.log(`app started at http://${HOST}:${PORT}`));

app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true, limit: "200kb" }));
app.use(cors());

const users = [
  {
    username: "scars",
    password: "1234567",
    name: "姚偉揚",
  },
  {
    username: "charlie",
    password: "7654321",
    name: "查理",
  },
  {
    username: "mike",
    password: "7654321",
    name: "成智遠",
  },
];

const lessons = [];
let images = [];
const IMAGES_LIMIT = 5;

const saveImage = (dataURL) => {
  if (dataURL.indexOf("http") === 0) {
    return dataURL;
  }

  const [head, body] = dataURL.split(",");
  const [, ext = ""] = head.match(/^data:image\/(.+);base64$/) || [];

  const hash = crypto.createHash("md5").update(body).digest("hex");
  const filename = `${hash}.${ext}`;

  images.push({ filename, body });
  images = images.slice(-IMAGES_LIMIT);

  images[filename] = body;

  return `https://vue-lessons-api.herokuapp.com/img/${filename}`;
};

app.get("/img/:filename", (req, res) => {
  const { filename } = req.params;
  const [, ext] = filename.split(".");
  const img = images.find((m) => m.filename === filename);
  if (img) {
    const data = Buffer.from(img.body, "base64");
    res.set("Content-Type", `image/${ext}`);
    res.send(data);
  } else {
    res.send("Image outdated. please re-upload");
  }
});

app
  .route("/")
  .post((req, res) => {
    const image = saveImage(req.body.image);
    const data = _.omit(req.body, "image");
    const id = lessons.length;
    const lesson = _.assign(data, { id, image });
    lessons.push(lesson);
    res.json({ id });
  })
  .get((req, res) => {
    res.json(lessons);
  });

app
  .route("/:id")
  .get((req, res) => {
    res.json(lessons.find((n) => n.id == req.params.id));
  })
  .put((req, res) => {
    const image = saveImage(req.body.image);
    const data = _.omit(req.body, "image");
    const id = req.params.id;
    const lesson = _.find(lessons, { id });
    if (!lesson) {
      res.json({ success: false });
    } else {
      _.assign(lesson, data, { image });
      res.json({ success: true });
    }
  });

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (user) {
    res.json({
      success: true,
      name: user.name,
      token: "636b6030-3ee3-11eb-b378-0242ac130002",
    });
  } else {
    res.json({
      success: false,
    });
  }
});

app.post("/testToken", (req, res) => {
  const token = req.headers.authorization;
  let statue_code = 200;
  const content = {};
  if (token === "636b6030-3ee3-11eb-b378-0242ac130002") {
    content["success"] = "ok";
  } else {
    statue_code = 403;
    content["error_message"] = "無效的 token";
  }
  res.status(statue_code).send(content);
});

app.get("/exists/:username", (req, res) => {
  const { username } = req.params;
  const user = users.find((u) => u.username === username);
  res.json({
    exists: user !== undefined,
  });
});
// ================================================================
app.get("/photo/list", (req, res) => {
  if (req.query.status === "error") {
    res.status(403).send({ error_msg: "未知的錯誤" });
    return;
  }
  res.json([
    { url: "https://picsum.photos/500/300?random=1" },
    { url: "https://picsum.photos/500/300?random=2" },
    { url: "https://picsum.photos/500/300?random=3" },
    { url: "https://picsum.photos/500/300?random=4" },
    { url: "https://picsum.photos/500/300?random=5" },
    { url: "https://picsum.photos/500/300?random=6" },
    { url: "https://picsum.photos/500/300?random=7" },
  ]);
});
app.get("/dom/content", (req, res) => {
  res.json({ html: htmlContent });
});
// ================================================================

app.get("/city/list", (req, res) => {
  res.json(cityJson);
});
const userAuth = [
  {
    username: "mike",
    password: "123456789",
    sex: "boy",
    email: "qwer@gmail.com",
    age: "12",
    terms: false,
  },
];

app.post("/auth/registered", (req, res) => {
  const { username, password, sex, email, age, terms } = req.body;
  const user_email = userAuth.find((u) => u.email === email);
  const user_name = userAuth.find((u) => u.username === username);
  const regex = /^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4})*$/;
  const errMsg = {};
  if (password.length < 6) {
    errMsg["password"] = "密碼長度須超過6個字元";
  }
  if (username === "") {
    errMsg["username"] = "使用者名稱不得為空";
  }
  if (password === "") {
    errMsg["password"] = "密碼不得為空";
  }
  if (email === "") {
    errMsg["email"] = "email不得為空";
  }
  if (!regex.test(email)) {
    errMsg["email"] = "請輸入正確的email格式";
  }
  if (user_email) {
    errMsg["email"] = "此email已註冊過";
  }
  if (user_name) {
    errMsg["username"] = "此使用者名稱已註冊過";
  }
  let status_code = Object.keys(errMsg).length === 0 ? 200 : 403;
  const content = {
    success: status_code === 200,
  };
  if (status_code === 200) {
    content["data"] = { username, password, sex, email, age, terms };
  } else {
    content["error_message"] = errMsg;
  }
  res.status(status_code).send(content);
});

// =================================================================
app.get("/courses/list", (req, res) => {
  res.json(coursesJson);
});

app.get("/courses/:id", (req, res) => {
  const { id } = req.params;
  const isId = ["286", "419", "418"].includes(id);
  const status_code = isId ? 200 : 403;
  const content = {};
  if (status_code === 200) {
    content["data"] = coursesJson.filter((item) => `${item.id}` === id);
  } else {
    content["error_message"] = "找不到此課程";
  }
  res.status(status_code).send(content);
});

// =================================================================

const seoMap = {
  home: {
    title: "Nuxt3 高效入門全攻略",
    description:
      "最棒的Nuxt3的線上課程、Nust3、Vue3、JavaScript、線上課程、程式",
    ogImage: "https://picsum.photos/500/300?random=1",
  },
  about: {
    title: "關於我們-Nuxt3 高效入門全攻略",
    description:
      "關於我們、最棒的Nuxt3的線上課程、Nust3、Vue3、JavaScript、線上課程、程式",
    ogImage: "https://picsum.photos/500/300?random=2",
  },
  user: {
    title: "USER - Nuxt3 高效入門全攻略",
    description:
      "USER、最棒的Nuxt3的線上課程、Nust3、Vue3、JavaScript、線上課程、程式",
    ogImage: "https://picsum.photos/500/300?random=3",
  },
};

app.get("/seo/:metatage", (req, res) => {
  const { metatage } = req.params;
  res.json(seoMap[metatage]);
});

// ====投票用 API=============================================================
const voteList = {
  vue: {
    path: `https://vue-lessons-api.vercel.app/images/Vue.svg`,
    name: "vue",
    count: 0,
  },
  react: {
    path: `https://vue-lessons-api.vercel.app/images/React.svg`,
    name: "react",
    count: 0,
  },
  angular: {
    path: `https://vue-lessons-api.vercel.app/images/Angular.svg`,
    name: "angular",
    count: 0,
  },
};

app.get("/vote/list", (req, res) => {
  res.json(voteList);
});

app.post("/vote/add", (req, res) => {
  const { type } = req.body;
  voteList[type].count++;
  res.json(voteList);
});
