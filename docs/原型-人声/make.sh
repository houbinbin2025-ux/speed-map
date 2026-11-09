#!/bin/bash
# 试听验证样本：系统语音占位（不是 Gemini），只验 iPhone 能放哪种格式、静音开关下响不响
set -e
cd "$(dirname "$0")"
say -v Tingting -o zh.aiff "小狐狸有 13 颗松果，送出 11 颗。还剩几颗？"
say -v Samantha -o en.aiff "Little Sheep has 2 apples. Little Cat has 4 times as many. How many does Little Cat have?"
for l in zh en; do
  ffmpeg -v error -y -i $l.aiff -ac 1 -c:a libopus -b:a 16k -application voip $l.webm
  ffmpeg -v error -y -i $l.aiff -ac 1 -ar 22050 -c:a libmp3lame -b:a 32k $l.mp3
  ffmpeg -v error -y -i $l.aiff -ac 1 -ar 24000 -c:a aac -b:a 24k $l.mp4
done
ls -l *.webm *.mp3 *.mp4 | awk '{print $5, $9}'
