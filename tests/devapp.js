const express = require('express')

const app = express();

app.get("/", (req, res) => {
  res.send({ hello: "world" });
});

app.post("/", (req, res) => {
  res.send({ hello: "world" });
});

app.post("/api", (req, res) => {
  res.send({ hello: "world" });
});

app.listen(7500, () => {
  console.info("Express dev server listening on port 7500");
});
