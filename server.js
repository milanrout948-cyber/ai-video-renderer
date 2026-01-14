import express from "express";
import { exec } from "child_process";
import fs from "fs";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

async function download(url, filename) {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(filename);
  await new Promise((resolve) => {
    res.body.pipe(fileStream);
    res.body.on("end", resolve);
  });
}

app.post("/render", async (req, res) => {
  try {
    const { voiceUrl, musicUrl, videoUrl, type } = req.body;

    await download(voiceUrl, "voice.mp3");
    await download(musicUrl, "music.mp3");
    await download(videoUrl, "video.mp4");

    const output = type === "short" ? "short.mp4" : "long.mp4";
    const scale = type === "short" ? "1080:1920" : "1920:1080";

    const cmd = `
      ffmpeg -y -i video.mp4 -i voice.mp3 -i music.mp3 \
      -filter_complex "[2:a]volume=0.15[a2];[1:a][a2]amix=inputs=2[a];[0:v]scale=${scale}[v]" \
      -map "[v]" -map "[a]" -shortest ${output}
    `;

    exec(cmd, (error) => {
      if (error) return res.status(500).send("FFmpeg error");
      res.json({ file: output });
    });

  } catch (e) {
    res.status(500).send("Render failed");
  }
});

app.listen(10000, () => console.log("Renderer running on port 10000"));
