const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");
const _ = require("lodash");

const { PORT = 3000, HOST = "localhost" } = process.env;

const app = express();
app.listen(PORT, () => console.log(`app started at http://${HOST}:${PORT}`));

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
    });
  } else {
    res.json({
      success: false,
    });
  }
});

app.get("/exists/:username", (req, res) => {
  const { username } = req.params;
  const user = users.find((u) => u.username === username);
  res.json({
    exists: user !== undefined,
  });
});
