const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("CampusFind backend is working!");
});

app.listen(3000, () => {
  console.log("CampusFind backend running on port 3000");
});