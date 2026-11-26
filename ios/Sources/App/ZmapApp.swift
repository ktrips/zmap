import SwiftUI
import WebKit
import GameKit
import UserNotifications

enum Config {
    /// Firebase Hosting の公開先。カスタムドメインを変えたらここも変える。
    static let baseURL = URL(string: "https://zmap.ktrips.net/")!
    static let dailyURL = URL(string: "?daily=1", relativeTo: baseURL)!.absoluteURL
    /// App Store Connect → Game Center で作るランキングの ID(デイリーは毎日リセットの「繰り返し」ランキング)
    static let leaderboardDaily = "zmap.daily"
    static let leaderboardBest = "zmap.best"
}

@main
struct ZmapApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @StateObject private var router = Router.shared

    var body: some Scene {
        WindowGroup {
            WebView(url: router.url, generation: router.generation)
                .ignoresSafeArea()
                .onAppear { GameCenter.authenticate() }
        }
    }
}

/// 表示する URL。通知をタップしたときにデイリー問題へ切り替える。
final class Router: ObservableObject {
    static let shared = Router()
    @Published private(set) var url = Config.baseURL
    @Published private(set) var generation = 0

    func open(_ u: URL) {
        url = u
        generation += 1
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        DispatchQueue.main.async { Router.shared.open(Config.dailyURL) }
        completionHandler()
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }
}

struct WebView: UIViewRepresentable {
    let url: URL
    let generation: Int

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "zmap")
        config.allowsInlineMediaPlayback = true
        let w = WKWebView(frame: .zero, configuration: config)
        w.navigationDelegate = context.coordinator
        w.uiDelegate = context.coordinator
        #if DEBUG
        if #available(iOS 16.4, *) { w.isInspectable = true }
        #endif
        context.coordinator.generation = generation
        w.load(URLRequest(url: url))
        return w
    }

    func updateUIView(_ w: WKWebView, context: Context) {
        if context.coordinator.generation != generation {
            context.coordinator.generation = generation
            w.load(URLRequest(url: url))
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        var generation = 0

        /// Web(demo/native.js)からの呼び出し: { type: "haptic" | "score" | "leaderboard" | "share" | "askReminder", ... }
        func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let m = message.body as? [String: Any], let type = m["type"] as? String else { return }
            switch type {
            case "haptic": Haptics.play(m["kind"] as? String ?? "light")
            case "score":
                if let v = (m["value"] as? NSNumber)?.intValue { GameCenter.submit(v, daily: (m["daily"] as? Bool) ?? false) }
            case "leaderboard": GameCenter.show()
            case "share":
                if let text = m["text"] as? String { Share.present(text) }
            case "askReminder": Reminder.askOnce()
            default: break
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let u = action.request.url else { return decisionHandler(.allow) }
            // 地図の利用規約やプライバシーポリシー内のリンクなど、外部サイトは Safari で開く
            if action.navigationType == .linkActivated, u.host != Config.baseURL.host {
                UIApplication.shared.open(u)
                return decisionHandler(.cancel)
            }
            decisionHandler(.allow)
        }

        /// target="_blank" のリンク(Google Map の「利用規約」など)も Safari で開く
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let u = action.request.url { UIApplication.shared.open(u) }
            return nil
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            guard let top = topViewController() else { return completionHandler() }
            top.present(a, animated: true)
        }

        /// 電波がないときに真っ白にしない
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            let retry = webView.url ?? Config.baseURL
            webView.loadHTMLString("""
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <body style="font:17px -apple-system;text-align:center;padding:30vh 24px;color:#6b7785">
            <p>読み込めませんでした。<br>電波の状態を確認してください。</p>
            <button style="font:inherit;padding:10px 24px" onclick="location.href='\(retry.absoluteString)'">もう一度</button>
            </body>
            """, baseURL: nil)
        }
    }
}

func topViewController() -> UIViewController? {
    var vc = UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.keyWindow }.first?.rootViewController
    while let p = vc?.presentedViewController { vc = p }
    return vc
}

enum Haptics {
    static func play(_ kind: String) {
        switch kind {
        case "success": UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "error": UINotificationFeedbackGenerator().notificationOccurred(.error)
        default: UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }
}

enum GameCenter {
    static func authenticate() {
        GKLocalPlayer.local.authenticateHandler = { vc, _ in
            if let vc { topViewController()?.present(vc, animated: true) }
        }
    }

    /// value は合計点の10倍(Game Center のスコアは整数のため)。表示は App Store Connect の書式で小数1桁にする。
    static func submit(_ value: Int, daily: Bool) {
        guard GKLocalPlayer.local.isAuthenticated else { return }
        let ids = daily ? [Config.leaderboardDaily, Config.leaderboardBest] : [Config.leaderboardBest]
        GKLeaderboard.submitScore(value, context: 0, player: GKLocalPlayer.local, leaderboardIDs: ids) { _ in }
    }

    static func show() {
        guard GKLocalPlayer.local.isAuthenticated else { return authenticate() }
        GKAccessPoint.shared.trigger(state: .leaderboards) {}
    }
}

enum Share {
    static func present(_ text: String) {
        guard let top = topViewController() else { return }
        let vc = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        vc.popoverPresentationController?.sourceView = top.view
        top.present(vc, animated: true)
    }
}

/// デイリー問題の通知(毎朝9時、端末内で予約)。初めて遊び終えたときに1回だけ許可を聞く。
enum Reminder {
    private static let askedKey = "reminderAsked"

    static func askOnce() {
        guard !UserDefaults.standard.bool(forKey: askedKey) else { return }
        UserDefaults.standard.set(true, forKey: askedKey)
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { ok, _ in
            if ok { schedule() }
        }
    }

    static func schedule() {
        let content = UNMutableNotificationContent()
        content.title = "今日の zmap"
        content.body = "新しいデイリー問題が出ました。郵便番号から場所を当てよう"
        content.sound = .default
        var at = DateComponents()
        at.hour = 9
        let trigger = UNCalendarNotificationTrigger(dateMatching: at, repeats: true)
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "daily", content: content, trigger: trigger))
    }
}
