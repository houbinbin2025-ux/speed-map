import UIKit
import WebKit

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
        guard let data = json.data(using: .utf8),
              let map = try? JSONSerialization.jsonObject(with: data) as? [String: String],
              let main = map["speedmap.v2"]?.data(using: .utf8),
              (try? JSONSerialization.jsonObject(with: main)) is [String: Any] else { return false }
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        return (try? data.write(to: url, options: .atomic)) != nil
    }
}

final class WebController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {
    private var web: WKWebView!
    private let turnCover = UIView()

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(self, name: "backup")
        config.userContentController.add(self, name: "clip")
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
        default: break
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url, !url.isFileURL, url.scheme != "about" else { return decisionHandler(.allow) }
        // 内容都在包内；外部链接（如 kongmine:// 上报）交给系统
        UIApplication.shared.open(url)
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
          var keys = function () { return Object.keys(localStorage).filter(function (k) { return k.indexOf('speedmap') === 0; }); };
          try {
            // 主存档缺失或损坏才恢复；清空进度会保留主存档，不会被恢复回来
            if (saved && (main === null || bad)) {
              if (bad) localStorage.setItem('speedmap.v2.broken', main);
              Object.keys(saved).forEach(function (k) {
                if (k.slice(-7) === '.broken') return;
                if (k === 'speedmap.v2' || localStorage.getItem(k) === null) localStorage.setItem(k, saved[k]);
              });
            }
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
        })();
        """
    }
}
