import UIKit
import WebKit
import AVFoundation

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: scene)
        window.rootViewController = WebController()
        window.makeKeyAndVisible()
        self.window = window
    }
}

/// 进度的本地副本：网页存储被系统清掉时，下次启动原样恢复（进度绝不能丢）
enum ProgressBackup {
    static let url = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("progress-backup.json")

    static func load() -> String? {
        guard let data = try? Data(contentsOf: url),
              (try? JSONSerialization.jsonObject(with: data)) is [String: String] else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// 主存档缺失或损坏的快照不写入：好的副本不能被坏数据冲掉。返回是否写入
    static func save(_ json: String) -> Bool {
        guard var data = json.data(using: .utf8),
              var map = try? JSONSerialization.jsonObject(with: data) as? [String: String],
              let main = map["speedmap.v2"]?.data(using: .utf8),
              (try? JSONSerialization.jsonObject(with: main)) is [String: Any] else { return false }
        // 碎片单独存一个键：它坏了不能冲掉副本里好的那份，也不能让主进度停更
        if let gems = map["speedmap.gems"]?.data(using: .utf8), !((try? JSONSerialization.jsonObject(with: gems)) is [String: Any]) {
            let old = (try? Data(contentsOf: url)).flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: String] }
            map["speedmap.gems"] = old?["speedmap.gems"]
            guard let fixed = try? JSONSerialization.data(withJSONObject: map) else { return false }
            data = fixed
        }
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        return (try? data.write(to: url, options: .atomic)) != nil
    }
}

final class WebController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler, UIGestureRecognizerDelegate {
    private var web: WKWebView!
    private let turnCover = UIView()

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(self, name: "backup")
        config.userContentController.add(self, name: "clip")
        config.userContentController.add(self, name: "speak")
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        installBootScript()
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.isOpaque = false
        web.backgroundColor = UIColor(red: 0.11, green: 0.12, blue: 0.14, alpha: 1)
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }
        #endif
        let pinch = UIPinchGestureRecognizer(target: self, action: #selector(handlePinch(_:)))
        pinch.cancelsTouchesInView = false   // 不抢页面自己的触摸
        pinch.delegate = self
        web.addGestureRecognizer(pinch)
        view = UIView()
        view.backgroundColor = .black
        view.addSubview(web)
        buildTurnCover()
        view.addSubview(turnCover)
    }

    /// 竖着拿时盖一层提示。网页始终按横屏尺寸排版，不重排，答题状态不受影响
    private func buildTurnCover() {
        turnCover.backgroundColor = UIColor(red: 0.11, green: 0.12, blue: 0.14, alpha: 1)
        let icon = UIImageView(image: UIImage(systemName: "rotate.right",
                                              withConfiguration: UIImage.SymbolConfiguration(pointSize: 72, weight: .semibold)))
        icon.tintColor = UIColor(white: 0.92, alpha: 1)
        let label = UILabel()
        label.text = "把 iPad 横过来"
        label.font = .systemFont(ofSize: 34, weight: .bold)
        label.textColor = UIColor(white: 0.92, alpha: 1)
        let stack = UIStackView(arrangedSubviews: [icon, label])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 24
        stack.translatesAutoresizingMaskIntoConstraints = false
        turnCover.addSubview(stack)
        NSLayoutConstraint.activate([stack.centerXAnchor.constraint(equalTo: turnCover.centerXAnchor),
                                     stack.centerYAnchor.constraint(equalTo: turnCover.centerYAnchor)])
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let bounds = view.bounds
        web.frame = CGRect(x: 0, y: 0, width: max(bounds.width, bounds.height), height: min(bounds.width, bounds.height))
        turnCover.frame = bounds
        turnCover.isHidden = bounds.width > bounds.height
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        loadPage()
    }

    private func loadPage() {
        let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web")!
        web.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
    }

    /// 启动脚本内联了副本，副本更新后要换新；否则重载页面时会写回旧数据
    private func installBootScript() {
        let controller = web.configuration.userContentController
        controller.removeAllUserScripts()
        controller.addUserScript(WKUserScript(source: Self.bootScript(), injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    /// 两指捏合调界面大小；是否生效、落到哪一档由页面脚本决定
    @objc private func handlePinch(_ pinch: UIPinchGestureRecognizer) {
        if web.url?.path.contains("/world/") == true { return }   // 方块世界有自己的双指缩放，不改数学岛的界面大小
        let phase: String
        switch pinch.state {
        case .began: phase = "begin"
        case .changed: phase = "change"
        default: return
        }
        web.evaluateJavaScript("window.__kongPinch && window.__kongPinch('\(phase)', \(pinch.scale)); void 0", completionHandler: nil)
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer,
                           shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { true }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    // 写字时从屏幕边缘划过，先交给页面，不直接触发系统手势
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .all }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let text = message.body as? String else { return }
        switch message.name {
        case "backup": if ProgressBackup.save(text) { installBootScript() }
        case "clip": UIPasteboard.general.string = text
        case "speak": speak(text)
        default: break
        }
    }

    /// 朗读题目：内嵌网页的语音不可靠，用系统语音（离线可用、不受静音键影响）。空字符串 = 停止
    private let speech = AVSpeechSynthesizer()
    private func speak(_ json: String) {
        speech.stopSpeaking(at: .immediate)
        guard let data = json.data(using: .utf8),
              let m = try? JSONSerialization.jsonObject(with: data) as? [String: String],
              let text = m["text"], !text.isEmpty else { return }
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        let u = AVSpeechUtterance(string: text)
        u.voice = AVSpeechSynthesisVoice(language: m["lang"] ?? "zh-CN")
        u.rate = AVSpeechUtteranceDefaultSpeechRate * 0.9
        speech.speak(u)
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url, !url.isFileURL, url.scheme != "about" else { return decisionHandler(.allow) }
        // 内容都在包内；外部链接（如 kongmine:// 上报）交给系统。矿场没装时告诉页面
        UIApplication.shared.open(url) { [weak webView] ok in
            if !ok, url.scheme == "kongmine" { webView?.evaluateJavaScript("window.__kongEarnFailed && window.__kongEarnFailed(); void 0", completionHandler: nil) }
        }
        decisionHandler(.cancel)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        loadPage()   // 进程崩溃后 webView.url 可能为空，reload 不可靠
    }

    /// 启动脚本：恢复进度、定时写副本、接入系统剪贴板（file:// 下网页剪贴板不可靠）
    private static func bootScript() -> String {
        """
        (function () {
          var saved = \(ProgressBackup.load() ?? "null");
          var main = localStorage.getItem('speedmap.v2'), bad = false;
          if (main !== null) { try { JSON.parse(main); } catch (e) { bad = true; } }
          var keys = function () { return Object.keys(localStorage).filter(function (k) { return k.indexOf('speedmap') === 0 || k.indexOf('mc_') === 0; }); };
          try {
            // 主存档缺失或损坏才恢复；清空进度会保留主存档，不会被恢复回来
            if (saved && (main === null || bad)) {
              if (bad) localStorage.setItem('speedmap.v2.broken', main);
              Object.keys(saved).forEach(function (k) {
                if (k.slice(-7) === '.broken') return;
                if (k === 'speedmap.v2' || localStorage.getItem(k) === null) localStorage.setItem(k, saved[k]);
              });
            }
            // 碎片单独存：只有它缺失或损坏时也从副本恢复
            var gems = localStorage.getItem('speedmap.gems'), gemsBad = gems === null;
            if (gems !== null) { try { var g = JSON.parse(gems); gemsBad = !g || typeof g !== 'object' || Array.isArray(g); } catch (e) { gemsBad = true; } }
            if (saved && gemsBad && saved['speedmap.gems']) localStorage.setItem('speedmap.gems', saved['speedmap.gems']);
            // 方块世界的存档（mc_ 开头）也进副本：缺了就恢复
            if (saved) Object.keys(saved).forEach(function (k) { if (k.indexOf('mc_') === 0 && localStorage.getItem(k) === null) localStorage.setItem(k, saved[k]); });
          } catch (e) {}
          var last = '';
          var push = function () {
            try {
              var map = {};
              keys().forEach(function (k) { map[k] = localStorage.getItem(k); });
              var text = JSON.stringify(map);
              if (text !== last) { last = text; webkit.messageHandlers.backup.postMessage(text); }
            } catch (e) {}
          };
          setInterval(push, 15000);
          addEventListener('pagehide', push);
          // 监听 window：等页面自己的切后台保存跑完，再写副本
          addEventListener('visibilitychange', function () { if (document.hidden) push(); });
          Object.defineProperty(navigator, 'clipboard', {value: {writeText: function (t) {
            webkit.messageHandlers.clip.postMessage(String(t));
            return Promise.resolve();
          }}});

          // 界面大小：页面逻辑宽度变大，界面元素变小、可用空间变大。只存本机，不进进度
          var ZOOMS = [100, 90, 80, 70, 60], ZKEY = 'kongmath.zoom';
          var getZoom = function () {
            var z = 100;
            try { z = +localStorage.getItem(ZKEY); } catch (e) {}
            return ZOOMS.indexOf(z) < 0 ? 100 : z;
          };
          var applyZoom = function (meta) {
            meta.content = meta.content.replace(/width=\\d+/, 'width=' + Math.round(932 * 100 / getZoom()));
          };
          window.__kongK = function () { return getZoom() / 100; };   // 岛和家的场景按它缩小（见 sync-web.sh）
          var findMeta = function () { return document.querySelector('meta[name=viewport]'); };
          var watch = new MutationObserver(function () {
            var meta = findMeta();
            if (meta) { watch.disconnect(); applyZoom(meta); }
          });
          watch.observe(document, {childList: true, subtree: true});
          var markZoom = function () {}, settle = 0;
          var setZoom = function (z) {
            var meta = findMeta();
            if (!meta || z === getZoom()) return;
            try { localStorage.setItem(ZKEY, String(z)); } catch (err) { return; }
            applyZoom(meta); markZoom();
            // 系统改完逻辑宽度不一定及时发 resize，岛和家的场景靠它重排，这里补发
            clearTimeout(settle);
            settle = setTimeout(function () { dispatchEvent(new Event('resize')); }, 150);
          };
          // 两指捏合：答题和手写时不响应，防止手掌误触
          var NO_PINCH = '#play:not([hidden]),#qplay:not([hidden]),#calib:not([hidden]),#demo:not([hidden])';
          var pinchBase = 0;
          window.__kongPinch = function (phase, scale) {
            if (phase === 'begin') {
              pinchBase = document.querySelector(NO_PINCH) ? 0 : getZoom();
              // 捏合不算拖动：取消场景正在进行的拖动，画面不跟着手指跑
              if (pinchBase) ['wVp', 'h_vp'].forEach(function (id) {
                var vp = document.getElementById(id);
                if (vp && vp.getClientRects().length) vp.dispatchEvent(new Event('pointercancel'));
              });
            }
            if (!pinchBase) return;
            var want = pinchBase * scale;
            setZoom(ZOOMS.reduce(function (a, b) { return Math.abs(b - want) < Math.abs(a - want) ? b : a; }));
          };
          addEventListener('DOMContentLoaded', function () {
            var grid = document.querySelector('#parent .pgrid'), meta = findMeta();
            if (!grid || !meta) return;
            var panel = document.createElement('div');
            panel.className = 'panel';
            panel.innerHTML = '<div class="ptitle">界面大小</div><div class="seg" id="segZoom">' + ZOOMS.map(function (z) {
              return '<button type="button" data-zoom="' + z + '">' + z + '%</button>';
            }).join('') + '</div>';
            markZoom = function () {
              panel.querySelectorAll('[data-zoom]').forEach(function (b) {
                b.classList.toggle('on', +b.dataset.zoom === getZoom());
              });
            };
            panel.addEventListener('click', function (e) {
              var b = e.target.closest('[data-zoom]');
              if (b) setZoom(+b.dataset.zoom);
            });
            grid.insertBefore(panel, grid.children[1] || null);
            markZoom();
          });
        })();
        """
    }
}
