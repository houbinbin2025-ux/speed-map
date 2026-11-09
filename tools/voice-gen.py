#!/usr/bin/env python3
"""人声朗读：用 Gemini 语音合成把 voice/corpus*.json 里的句子生成成音频 voice/a/<key>.webm（Opus 单声道）。

用法（密钥只从环境变量读，不打印、不写文件）：
  GEMINI_API_KEY=$(jq -r .GEMINI_API_KEY ~/.shared-env.json) python3 tools/voice-gen.py voice/corpus-sample.json
可选环境变量：VOICE_MODEL（默认 gemini-2.5-flash-preview-tts）、VOICE_ZH / VOICE_EN（音色名）、VOICE_KBPS（默认 16）
已生成的文件跳过，可以断点续跑；失败的句子记在 voice/failed.json，网页会回到系统语音。
"""
import base64, json, os, subprocess, sys, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = os.environ.get('GEMINI_API_KEY', '')
MODEL = os.environ.get('VOICE_MODEL', 'gemini-2.5-flash-preview-tts')
VOICE = {'zh-CN': os.environ.get('VOICE_ZH', 'Kore'), 'en-US': os.environ.get('VOICE_EN', 'Kore')}
KBPS = os.environ.get('VOICE_KBPS', '16')
STYLE = {  # 读法提示：给小学低年级孩子读题，数字按中文读
    'zh-CN': '用亲切、清楚、稍慢的语速，给小学一年级的孩子读这道数学题，数字按普通话读法：',
    'en-US': 'Read this math question to a first-grade child, warm, clear and a little slow: ',
}


def tts(lang, text):
    body = {
        'contents': [{'parts': [{'text': STYLE[lang] + text}]}],
        'generationConfig': {'responseModalities': ['AUDIO'],
                             'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': VOICE[lang]}}}},
    }
    req = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
        data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY})
    with urllib.request.urlopen(req, timeout=90) as r:
        d = json.load(r)
    part = d['candidates'][0]['content']['parts'][0]['inlineData']
    return base64.b64decode(part['data'])  # 24kHz 16 位单声道 PCM


def encode(pcm, out):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', '-',
                    '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse',
                    '-c:a', 'libopus', '-b:a', KBPS + 'k', '-application', 'voip', out], input=pcm, check=True)


def main():
    if not KEY:
        sys.exit('缺 GEMINI_API_KEY 环境变量')
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'voice', 'corpus.json')
    items = json.load(open(src))
    os.makedirs(os.path.join(ROOT, 'voice', 'a'), exist_ok=True)
    failed, done, t0 = [], 0, time.time()
    for i, it in enumerate(items):
        out = os.path.join(ROOT, 'voice', 'a', it['key'] + '.webm')
        if os.path.exists(out):
            continue
        for attempt in range(4):
            try:
                encode(tts(it['lang'], it['text']), out)
                done += 1
                break
            except urllib.error.HTTPError as e:
                code = e.code
                if code == 429 or code >= 500:
                    time.sleep(10 * (attempt + 1))
                    continue
                failed.append({**it, 'err': f'HTTP {code}'})
                break
            except Exception as e:  # 返回里没音频等
                if attempt == 3:
                    failed.append({**it, 'err': type(e).__name__})
                time.sleep(3)
        else:
            failed.append({**it, 'err': '重试用完'})
        if (i + 1) % 50 == 0:
            print(f'{i + 1}/{len(items)}  新生成 {done}  失败 {len(failed)}  {time.time() - t0:.0f}s', flush=True)
    json.dump(failed, open(os.path.join(ROOT, 'voice', 'failed.json'), 'w'), ensure_ascii=False, indent=1)
    size = sum(os.path.getsize(os.path.join(ROOT, 'voice', 'a', f)) for f in os.listdir(os.path.join(ROOT, 'voice', 'a')))
    print(f'完成：新生成 {done}，失败 {len(failed)}，音频目录共 {size / 1e6:.1f}MB')


if __name__ == '__main__':
    main()
